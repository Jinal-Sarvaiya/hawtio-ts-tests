/**
 * tests/camel/camel-context.spec.ts
 *
 * Cluster      : Camel Management
 * Scenario     : Camel Context: Suspend/Resume
 * Status       : MIGRATED with Jolokia API fixtures
 *
 * Excel Recommendation:
 * "Suspend and Start (resume) are sequenced — you must be in Started state to
 * suspend, and Suspended state to re-start. Add a beforeEach Jolokia call that
 * enforces the required initial state before each it(). No merge needed — they
 * test distinct lifecycle transitions and should report as separate failures."
 *
 * Strategy:
 * - beforeEach ensures context is in correct state via Jolokia API
 * - Test executes context operation via Jolokia API (no UI involved)
 * - Verification uses Jolokia API to confirm state change
 * - afterEach restores context to Started state
 */
import { test, expect } from '../../fixtures'
import { getContextState, suspendContext, resumeContext } from '../../fixtures/jolokia'

test.describe.serial('Camel Context – Suspend & Resume', () => {
  test.afterEach(async ({ request }) => {
    // CLEANUP: Restore context to Started state after each test
    try {
      const state = await getContextState(request)
      if (state === 'Suspended') {
        await resumeContext(request)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    } catch (error) {
      // Ignore cleanup errors - context might already be in desired state
    }
  })

  test('suspend action transitions context to Suspended state', async ({ request }) => {
    // FIXTURE: Ensure context is STARTED before test
    const initialState = await getContextState(request)
    if (initialState !== 'Started') {
      await resumeContext(request)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Verify context is started
    const startedState = await getContextState(request)
    expect(startedState).toBe('Started')

    // TEST: Suspend the context via Jolokia API
    await suspendContext(request)
    await new Promise(resolve => setTimeout(resolve, 2000))

    // VERIFY: Context is now suspended
    await expect(async () => {
      const state = await getContextState(request)
      expect(state).toBe('Suspended')
    }).toPass({ timeout: 15_000, intervals: [2000, 2000, 2000] })
  })

  test('start action transitions context from Suspended to Started state', async ({ request }) => {
    // FIXTURE: Ensure context is SUSPENDED before test
    const initialState = await getContextState(request)
    if (initialState !== 'Suspended') {
      await suspendContext(request)
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    // Verify context is suspended
    const suspendedState = await getContextState(request)
    expect(suspendedState).toBe('Suspended')

    // TEST: Resume (start) the context via Jolokia API
    await resumeContext(request)
    await new Promise(resolve => setTimeout(resolve, 2000))

    // VERIFY: Context is now started
    await expect(async () => {
      const state = await getContextState(request)
      expect(state).toBe('Started')
    }).toPass({ timeout: 15_000, intervals: [2000, 2000, 2000] })
  })
})
