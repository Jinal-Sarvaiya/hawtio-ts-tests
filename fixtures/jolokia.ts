/**
 * jolokia.ts
 * Thin TypeScript wrapper around Hawtio's /jolokia endpoint.
 * Used exclusively inside Playwright fixtures to create / destroy JVM resources
 * programmatically – no browser UI required.
 */
import { APIRequestContext } from '@playwright/test'

// Use the same base URL as playwright.config.ts
const BASE = process.env.HAWTIO_URL ?? 'http://localhost:10001/actuator/hawtio/'
// Remove trailing slash for Jolokia endpoint
const JOLOKIA = `${BASE.replace(/\/$/, '')}/jolokia`

export interface JolokiaResponse {
  status: number
  value: unknown
  error?: string
}

// ─── Low-level helpers ───────────────────────────────────────────────────────

export async function jolokiaRead(
  request: APIRequestContext,
  mbean: string,
  attribute: string,
): Promise<unknown> {
  const res = await request.get(
    `${JOLOKIA}/read/${encodeURIComponent(mbean)}/${attribute}`,
    {
      headers: {
        'Origin': BASE, // Prevents Jolokia 403 Cross-Origin restrictions
      },
    }
  )
  const body: JolokiaResponse = await res.json()
  assertOk(body)
  return body.value
}

export async function jolokiaExec(
  request: APIRequestContext,
  mbean: string,
  operation: string,
  args: unknown[] = [],
): Promise<unknown> {
  const res = await request.post(JOLOKIA, {
    data: { type: 'exec', mbean, operation, arguments: args },
    headers: {
      'Origin': BASE, // Prevents Jolokia 403 Cross-Origin restrictions
    },
  })
  const body: JolokiaResponse = await res.json()
  assertOk(body)
  return body.value
}

// ─── Camel Route helpers ─────────────────────────────────────────────────────

const CAMEL_CONTEXT_PATTERN = 'org.apache.camel:context=*,type=context,name=*'

export async function getCamelContextMBean(
  request: APIRequestContext,
): Promise<string> {
  const res = await request.get(
    `${JOLOKIA}/search/${encodeURIComponent(CAMEL_CONTEXT_PATTERN)}`,
    {
      headers: {
        'Origin': BASE, // Prevents Jolokia 403 Cross-Origin restrictions
      },
    }
  )
  const body = await res.json()
  assertOk(body)
  const names = body.value as string[]
  if (!names.length) throw new Error('No CamelContext MBean found')
  return names[0]
}

export async function addRoute(
  request: APIRequestContext,
  routeXml: string,
): Promise<void> {
  const ctx = await getCamelContextMBean(request)
  await jolokiaExec(request, ctx, 'addOrUpdateRoutesFromXml(java.lang.String)', [routeXml])
}

export async function removeRoute(
  request: APIRequestContext,
  routeId: string,
): Promise<void> {
  const ctx = await getCamelContextMBean(request)
  await jolokiaExec(request, ctx, 'removeRoute(java.lang.String)', [routeId])
}

export async function startRoute(
  request: APIRequestContext,
  routeId: string,
): Promise<void> {
  const mbean = await getRouteMBean(request, routeId)
  await jolokiaExec(request, mbean, 'start()')
}

export async function stopRoute(
  request: APIRequestContext,
  routeId: string,
): Promise<void> {
  const mbean = await getRouteMBean(request, routeId)
  await jolokiaExec(request, mbean, 'stop()')
}

export async function getRouteState(
  request: APIRequestContext,
  routeId: string,
): Promise<string> {
  const mbean = await getRouteMBean(request, routeId)
  return (await jolokiaRead(request, mbean, 'State')) as string
}

export async function getRouteMBean(
  request: APIRequestContext,
  routeId: string,
): Promise<string> {
  const pattern = `org.apache.camel:context=*,type=routes,name="${routeId}"`
  const res = await request.get(
    `${JOLOKIA}/search/${encodeURIComponent(pattern)}`,
    {
      headers: {
        'Origin': BASE, // Prevents Jolokia 403 Cross-Origin restrictions
      },
    }
  )
  const body = await res.json()
  assertOk(body)
  const names = body.value as string[]
  if (!names.length) throw new Error(`Route MBean not found: routeId=${routeId}`)
  return names[0]
}

export async function resetRouteStats(
  request: APIRequestContext,
  routeId: string,
): Promise<void> {
  const mbean = await getRouteMBean(request, routeId)
  await jolokiaExec(request, mbean, 'reset(java.lang.Boolean)', [true])
}

// ─── Camel Context state ─────────────────────────────────────────────────────

export async function suspendContext(request: APIRequestContext): Promise<void> {
  const ctx = await getCamelContextMBean(request)
  await jolokiaExec(request, ctx, 'suspend()')
}

export async function resumeContext(request: APIRequestContext): Promise<void> {
  const ctx = await getCamelContextMBean(request)
  await jolokiaExec(request, ctx, 'resume()')
}

export async function getContextState(request: APIRequestContext): Promise<string> {
  const ctx = await getCamelContextMBean(request)
  return (await jolokiaRead(request, ctx, 'State')) as string
}

// ─── Trace ───────────────────────────────────────────────────────────────────

export async function enableTrace(request: APIRequestContext, routeId: string): Promise<void> {
  const mbean = await getRouteMBean(request, routeId)
  await jolokiaExec(request, mbean, 'enableMessageHistory()')
}

export async function disableTrace(request: APIRequestContext, routeId: string): Promise<void> {
  const mbean = await getRouteMBean(request, routeId)
  await jolokiaExec(request, mbean, 'disableMessageHistory()')
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

export async function purgeEndpoint(
  request: APIRequestContext,
  endpointUri: string,
): Promise<void> {
  const pattern = `org.apache.camel:context=*,type=endpoints,name="${encodeURIComponent(endpointUri)}"`
  const res = await request.get(
    `${JOLOKIA}/search/${encodeURIComponent(pattern)}`,
    {
      headers: {
        'Origin': BASE, // Prevents Jolokia 403 Cross-Origin restrictions
      },
    }
  )
  const body = await res.json()
  assertOk(body)
  const names = body.value as string[]
  for (const mbean of names) {
    await jolokiaExec(request, mbean, 'purgeQueue()')
  }
}

// ─── Guard ───────────────────────────────────────────────────────────────────

function assertOk(body: JolokiaResponse): void {
  if (body.status !== 200) {
    throw new Error(`Jolokia error (status ${body.status}): ${body.error}`)
  }
}
