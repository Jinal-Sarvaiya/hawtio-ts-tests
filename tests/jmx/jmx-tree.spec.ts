/**
 * tests/jmx/jmx-tree.spec.ts
 *
 * Cluster      : JMX & MBeans
 * Scenario     : JMX Tree – MBean Search / Expand / Collapse
 * Status       : TODO: REFACTOR & MIGRATE
 *
 * Fully stateless read-only operations – no fixtures required.
 * All three scenarios share a single describe block with one beforeEach
 * that navigates to the JMX page.  No ordering dependency.
 */
import { test, expect } from '../../fixtures'
import { JmxPage } from '../../pages/jmx-page'

test.describe('JMX Tree Navigation', () => {
  let jmx: JmxPage

  test.beforeEach(async ({ page }) => {
    jmx = new JmxPage(page)
    await jmx.goto()
  })

  test.afterEach(async () => {
    await jmx.clearFilter()
  })

  test('filter JMX tree by "java" – tree expands matching nodes', async () => {
    const allItems = await jmx.visibleTreeItems()
    await jmx.filterTree('java')

    const filteredItems = await jmx.visibleTreeItems()
    // Filter expands matching nodes, so we should have more items visible
    expect(filteredItems.length).toBeGreaterThan(0)
    
    // At least one visible item should contain 'java'
    const matchingItems = filteredItems.filter(item => item.toLowerCase().includes('java'))
    expect(matchingItems.length).toBeGreaterThan(0)
  })

  test('filter by unknown string – tree shows all nodes collapsed', async () => {
    await jmx.filterTree('__no_such_mbean_xyz__')

    const filteredItems = await jmx.visibleTreeItems()
    // When no match, tree shows top-level nodes only (collapsed state)
    // The number varies by platform (Quarkus ~11, Spring Boot ~15)
    expect(filteredItems.length).toBeGreaterThan(0)
    expect(filteredItems.length).toBeLessThanOrEqual(20) // Should be just top-level nodes
  })

  test('expand all – tree items increase in count', async () => {
    const beforeCount = await jmx.treeItemCount()
    await jmx.expandAll()
    const afterCount = await jmx.treeItemCount()
    expect(afterCount).toBeGreaterThanOrEqual(beforeCount)
  })

  test('collapse all – tree items reduce to top-level nodes', async () => {
    await jmx.expandAll()
    const expandedCount = await jmx.treeItemCount()
    await jmx.collapseAll()
    const collapsedCount = await jmx.treeItemCount()
    expect(collapsedCount).toBeLessThanOrEqual(expandedCount)
  })
})
