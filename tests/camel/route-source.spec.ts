/**
 * tests/camel/route-source.spec.ts
 *
 * Cluster      : Camel Management
 * Scenario     : Camel Source – Edit XML
 * Status       : TODO: REFACTOR & MIGRATE
 *
 * KEPT SEPARATE (two distinct navigation scopes):
 *   1. All-routes view  – camel_routes.feature
 *   2. Single-route view – camel_specific_route.feature
 *
 * Each test has its own beforeEach; afterEach reverts any editor changes.
 * No ordering dependency with other specs after fixture isolation.
 */
import { test, expect } from '../../fixtures'
import { CamelPage } from '../../pages/camel-page'

test.describe('Camel Source (all-routes view)', () => {
  test('Source editor is not empty at the routes level', async ({
    page,
    routeFixture,
  }) => {
    const camel = new CamelPage(page)

    // Navigate to the all-routes Source tab (no specific route selected)
    await camel.goto()
    await camel.openSourceTab()

    const content = await camel.getSourceContent()
    expect(content.trim().length).toBeGreaterThan(0)
    expect(content).toContain('<routes')
  })
})

test.describe('Camel Source (single-route view)', () => {
  test('Source editor is not empty at the single-route level', async ({
    page,
    routeFixture,
  }) => {
    const { routeId } = routeFixture
    const camel = new CamelPage(page)

    await camel.goto()
    await camel.selectRoute(routeId)
    await camel.openSourceTab()

    const content = await camel.getSourceContent()
    expect(content.trim().length).toBeGreaterThan(0)
    expect(content).toContain(routeId)
  })

  test.afterEach(async ({ page }) => {
    const camel = new CamelPage(page)
    await camel.revertSourceChanges()
  })
})
