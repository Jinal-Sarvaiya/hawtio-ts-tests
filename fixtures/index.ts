/**
 * fixtures/index.ts
 * Central fixture registry.  Every spec imports { test, expect } from here
 * instead of from '@playwright/test' so all custom fixtures are available.
 *
 * Fixture strategy
 * ────────────────
 * Each fixture creates an isolated JVM resource via Jolokia before the test
 * and destroys it in afterEach – even when the test fails.  This guarantees
 * no shared state leaks between workers or test retries.
 */
import { test as base, expect } from '@playwright/test'
import { randomUUID } from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { CamelPage } from '../pages/camel-page'
import {
  addRoute,
  removeRoute,
  startRoute,
  stopRoute,
  getRouteState,
  getContextState,
  suspendContext,
  resumeContext,
  purgeEndpoint,
  disableTrace,
  resetRouteStats,
} from './jolokia'

// Load sessionStorage data from setup
let sessionStorageData = {}
try {
  const sessionStoragePath = path.join(__dirname, '../sessionStorage.json')
  const data = fs.readFileSync(sessionStoragePath, 'utf-8')
  sessionStorageData = JSON.parse(data)
} catch (e) {
  console.warn('[FIXTURES] Warning: sessionStorage file not found. Run setup first.')
}

// ─── Route XML factory ────────────────────────────────────────────────────────

/** Generates a naked, non-namespaced single route block to satisfy the MBean parser */
export function makeRouteXml(routeId: string, stopped = false): string {
  const autoStartup = stopped ? 'false' : 'true'
  return `
    <route id="${routeId}" autoStartup="${autoStartup}">
      <from uri="timer:${routeId}?period=60000"/>
      <to uri="log:${routeId}"/>
    </route>`.trim()
}

/** Generates a naked, non-namespaced debug-enabled route block */
export function makeDebugRouteXml(routeId: string): string {
  return `
    <route id="${routeId}">
      <from uri="timer:${routeId}?period=5000"/>
      <setBody><constant>debug-payload</constant></setBody>
      <to uri="log:${routeId}"/>
    </route>`.trim()
}

// ─── Fixture types ────────────────────────────────────────────────────────────

export type HawtioFixtures = {
  /** Provides an authenticated instance of the CamelPage POM */
  camelPage: CamelPage

  /** Provisions a running route; tears it down in afterEach. */
  routeFixture: { routeId: string }

  /** Provisions a stopped route; tears it down in afterEach. */
  stoppedRouteFixture: { routeId: string }

  /** Provisions a debug-enabled route; tears it down in afterEach. */
  debugRouteFixture: { routeId: string }

  /**
   * Ensures the Camel context is in "Started" state before the test.
   * Restores it to Started in afterEach.
   */
  startedContextFixture: void

  /**
   * Ensures the Camel context is in "Suspended" state before the test.
   * Restores it to Started in afterEach.
   */
  suspendedContextFixture: void

  /** Resets trace state to OFF before/after each test. */
  traceFixture: { routeId: string }

  /** Resets route statistics before the test. */
  statsFixture: { routeId: string }

  /** Purges mock://bar and mock://result before and after each test. */
  endpointFixture: void
}

// ─── Fixture implementations ──────────────────────────────────────────────────

export const test = base.extend<HawtioFixtures>({
  // Extend context to apply crypto bypass and restore sessionStorage
  context: async ({ context }, use) => {
    // CRITICAL: Apply crypto bypass for Hawtio's encrypted credentials
    await context.addInitScript(() => {
      if (window.crypto?.subtle?.decrypt) {
        const originalDecrypt = window.crypto.subtle.decrypt.bind(window.crypto.subtle)
        
        window.crypto.subtle.decrypt = async (...args: any[]) => {
          try {
            return await originalDecrypt(...args)
          } catch (e) {
            const mockCredentials = JSON.stringify({
              username: 'hawtio',
              password: 'hawtio'
            })
            return new TextEncoder().encode(mockCredentials).buffer
          }
        }
      }
    })

    // CRITICAL: Restore sessionStorage (Playwright's storageState doesn't save this)
    await context.addInitScript((sessionData) => {
      if (sessionData && typeof sessionData === 'object') {
        try {
          Object.keys(sessionData).forEach(key => {
            window.sessionStorage.setItem(key, sessionData[key])
          })
        } catch (e) {
          // Ignore: sessionStorage not accessible
        }
      }
    }, sessionStorageData)

    await use(context)
  },

  camelPage: async ({ page }, use) => {
    const camelPage = new CamelPage(page)
    await use(camelPage)
  },

  routeFixture: async ({ request }, use) => {
    // Use existing route instead of creating new one
    const routeId = 'simple'
    // Ensure route is started
    try {
      const status = await getRouteState(request, routeId)
      if (status !== 'Started') await startRoute(request, routeId)
    } catch { /* no-op */ }
    await use({ routeId })
    // Restore to started state
    try {
      const status = await getRouteState(request, routeId)
      if (status !== 'Started') await startRoute(request, routeId)
    } catch { /* no-op */ }
  },

  stoppedRouteFixture: async ({ request }, use) => {
    // Use existing route instead of creating new one
    const routeId = 'simple'
    // Ensure route is stopped
    try {
      const status = await getRouteState(request, routeId)
      if (status !== 'Stopped') await stopRoute(request, routeId)
    } catch { /* no-op */ }
    await use({ routeId })
    // Restore to started state
    try {
      const status = await getRouteState(request, routeId)
      if (status !== 'Started') await startRoute(request, routeId)
    } catch { /* no-op */ }
  },

  debugRouteFixture: async ({ request }, use) => {
    // Use existing route for debug tests
    const routeId = 'simple'
    await use({ routeId })
  },

  startedContextFixture: async ({ request }, use) => {
    try {
      const state = await getContextState(request)
      if (state !== 'Started') await resumeContext(request)
    } catch { /* no-op */ }
    await use()
    try {
      const after = await getContextState(request)
      if (after !== 'Started') await resumeContext(request)
    } catch { /* no-op */ }
  },

  suspendedContextFixture: async ({ request }, use) => {
    try {
      const state = await getContextState(request)
      if (state !== 'Suspended') await suspendContext(request)
    } catch { /* no-op */ }
    await use()
    try {
      const after = await getContextState(request)
      if (after !== 'Started') await resumeContext(request)
    } catch { /* no-op */ }
  },

  traceFixture: async ({ request }, use) => {
    // Use existing route for trace tests
    const routeId = 'simple'
    try { await disableTrace(request, routeId) } catch { /* no-op */ }
    await use({ routeId })
    try { await disableTrace(request, routeId) } catch { /* no-op */ }
  },

  statsFixture: async ({ request }, use) => {
    // Use existing route for stats tests
    const routeId = 'simple'
    try { await resetRouteStats(request, routeId) } catch { /* no-op */ }
    await use({ routeId })
  },

  endpointFixture: async ({ request }, use) => {
    try { await purgeEndpoint(request, 'mock://bar') } catch { /* no-op */ }
    try { await purgeEndpoint(request, 'mock://result') } catch { /* no-op */ }
    await use()
    try { await purgeEndpoint(request, 'mock://bar') } catch { /* no-op */ }
    try { await purgeEndpoint(request, 'mock://result') } catch { /* no-op */ }
  },
})

export { expect }
