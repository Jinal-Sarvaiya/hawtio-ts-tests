/**
 * tests/camel/trace-lifecycle.spec.ts
 *
 * Cluster      : Camel Management
 * Scenario     : Trace Management
 * Status       : TODO: REFACTOR & MIGRATE
 *
 * ORDERING DEPENDENCY resolved via traceFixture:
 *   - beforeEach: provisioned route + trace set to OFF via Jolokia.
 *   - afterEach: trace disabled and route removed (in fixture teardown).
 *
 * Both it() blocks can run independently in any order.
 * Kept as two separate tests for granular CI failure attribution.
 */
import { test, expect } from '../../fixtures'
import { CamelPage } from '../../pages/camel-page'

test.describe('Camel Trace Lifecycle', () => {
  test('stop tracing – trace table and diagram disappear', async ({
    page,
    traceFixture,
  }) => {
    const { routeId } = traceFixture
    const camel = new CamelPage(page)

    await camel.goto()
    await camel.selectRoute(routeId)

    try {
      await camel.openTraceTab()
    } catch (error: any) {
      if (error.message?.includes('TAB_NOT_AVAILABLE')) {
        test.skip(true, 'Trace tab not available in this Hawtio version')
      }
      throw error
    }

    await camel.startTracing()
    await camel.stopTracing()
  })

  test('start tracing – trace table and diagram are shown', async ({
    page,
    traceFixture,
  }) => {
    const { routeId } = traceFixture
    const camel = new CamelPage(page)

    // PRE-STEP: fixture guarantees trace is OFF – navigate and start
    await camel.goto()
    await camel.selectRoute(routeId)

    try {
      await camel.openTraceTab()
    } catch (error: any) {
      if (error.message?.includes('TAB_NOT_AVAILABLE')) {
        test.skip(true, 'Trace tab not available in this Hawtio version')
      }
      throw error
    }

    await camel.startTracing()
  })
})
