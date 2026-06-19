/**
 * tests/runtime/threads.spec.ts
 *
 * Category: Runtime & System
 * Scenario: Thread Viewer and Monitoring
 * Status: MIGRATED from Java/Selenide
 *
 * Tests for viewing JVM threads via JMX UI.
 */
import { test, expect } from '../../fixtures'
import { JmxPage } from '../../pages/jmx-page'

test.describe('Thread Viewer', () => {
  test('threading info is accessible via JMX tree', async ({ page }) => {
    const jmx = new JmxPage(page)
    await jmx.goto()

    // Verify JMX tree loads
    await expect(jmx.mbeanTree).toBeVisible()

    // Expand to find Threading MBean
    await jmx.expandAll()
    await page.waitForTimeout(2000)

    const items = await jmx.visibleTreeItems()
    const hasThreading = items.some(item => item.toLowerCase().includes('thread'))

    expect(hasThreading).toBe(true)
  })
})
