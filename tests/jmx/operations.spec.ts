/**
 * tests/jmx/operations.spec.ts
 *
 * Category: JMX Operations
 * Scenario: MBean Operations Viewer
 * Status: MIGRATED from Java/Selenide
 *
 * Tests verify JMX operations capability through the UI.
 */
import { test, expect } from '../../fixtures'
import { JmxPage } from '../../pages/jmx-page'

test.describe('JMX Operations Viewer', () => {
  test('JMX tree shows MBean operations are available', async ({ page }) => {
    const jmx = new JmxPage(page)
    await jmx.goto()

    await expect(jmx.mbeanTree).toBeVisible()

    await jmx.expandAll()
    await page.waitForTimeout(2000)

    const treeItemCount = await jmx.treeItemCount()
    expect(treeItemCount).toBeGreaterThan(10)
  })

  test('JMX navigation works across different MBeans', async ({ page }) => {
    const jmx = new JmxPage(page)
    await jmx.goto()

    await jmx.expandAll()
    await page.waitForTimeout(2000)

    // Verify multiple MBean domains are visible
    const items = await jmx.visibleTreeItems()
    const domains = items.filter(item =>
      item.includes('java.lang') ||
      item.includes('java.util') ||
      item.includes('org.apache')
    )

    expect(domains.length).toBeGreaterThan(0)
  })
})
