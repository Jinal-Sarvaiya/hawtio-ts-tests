/**
 * tests/runtime/runtime-info.spec.ts
 *
 * Category: Runtime & System
 * Scenario: Runtime Information Viewer
 * Status: MIGRATED from Java/Selenide
 *
 * Tests for viewing JVM runtime information via JMX UI.
 */
import { test, expect } from '../../fixtures'
import { JmxPage } from '../../pages/jmx-page'

test.describe('Runtime Information Viewer', () => {
  test('runtime info is accessible via JMX tree', async ({ page }) => {
    const jmx = new JmxPage(page)
    await jmx.goto()

    // Verify JMX tree loads
    await expect(jmx.mbeanTree).toBeVisible()

    // Expand to find Runtime MBean
    await jmx.expandAll()
    await page.waitForTimeout(2000)

    const items = await jmx.visibleTreeItems()
    const hasRuntime = items.some(item => item.toLowerCase().includes('runtime'))

    expect(hasRuntime).toBe(true)
  })
})
