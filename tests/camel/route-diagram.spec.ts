/**
 * tests/camel/route-diagram.spec.ts
 *
 * Cluster      : Camel Management
 * Scenario     : Camel Chart – Route Diagram
 * Status       : TODO: REFACTOR & MIGRATE
 *
 * MERGE APPLIED: All three diagram scenarios share a single beforeEach that
 * opens the Route Diagram tab.  Each assertion is a separate it() for clear
 * CI failure attribution.  Visual regression caught with toHaveScreenshot().
 */
import { test, expect } from '../../fixtures'
import { CamelPage } from '../../pages/camel-page'

test.describe('Camel Route Diagram', () => {
  let camel: CamelPage
  let routeId: string

  test.beforeEach(async ({ page, routeFixture }) => {
    routeId = routeFixture.routeId
    camel = new CamelPage(page)
    await camel.goto()
    await camel.selectRoute(routeId)
    await camel.openRouteDiagramTab()
  })

  test('route diagram is presented (SVG is visible)', async () => {
    await expect(camel.routeDiagramSvg).toBeVisible()
  })

  test('route nodes do not overlay each other', async () => {
    await camel.assertNoDiagramOverlay()
  })

  test('no route duplications exist in the diagram', async ({ page }) => {
    await camel.assertNoDuplicateRouteNodes(routeId)
  })

  test('diagram matches visual snapshot', async ({ page }) => {
    await expect(camel.routeDiagramSvg).toHaveScreenshot(`route-diagram-${routeId}.png`)
  })
})
