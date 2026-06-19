/**
 * tests/jmx/attributes.spec.ts
 *
 * Category: JMX Operations
 * Scenario: MBean Attributes Viewer
 * Status: MIGRATED from Java/Selenide
 *
 * Tests verify JMX attribute viewing capability through the UI.
 */
import { test, expect } from '../../fixtures'
import { JmxPage } from '../../pages/jmx-page'

test.describe('JMX Attributes Viewer', () => {
  test('JMX tree allows MBean browsing', async ({ page }) => {
    const jmx = new JmxPage(page)
    await jmx.goto()

    // Verify JMX tree exists
    await expect(jmx.mbeanTree).toBeVisible()

    // Expand tree and verify MBeans are browsable
    await jmx.expandAll()
    await page.waitForTimeout(2000)

    const treeItemCount = await jmx.treeItemCount()
    expect(treeItemCount).toBeGreaterThan(10)
  })

  test('MBean tree can be filtered', async ({ page }) => {
    const jmx = new JmxPage(page)
    await jmx.goto()

    // Filter tree
    await jmx.filterTree('java.lang')
    await page.waitForTimeout(1000)

    // Verify filtering works
    const items = await jmx.visibleTreeItems()
    const matchingItems = items.filter(item => item.toLowerCase().includes('java'))
    expect(matchingItems.length).toBeGreaterThan(0)
  })

  test('MBean tree expand/collapse works', async ({ page }) => {
    const jmx = new JmxPage(page)
    await jmx.goto()

    const initialCount = await jmx.treeItemCount()

    // Expand all
    await jmx.expandAll()
    await page.waitForTimeout(1000)
    const expandedCount = await jmx.treeItemCount()
    expect(expandedCount).toBeGreaterThan(initialCount)

    // Collapse all
    await jmx.collapseAll()
    await page.waitForTimeout(1000)
    const collapsedCount = await jmx.treeItemCount()
    expect(collapsedCount).toBeLessThan(expandedCount)
  })
})
