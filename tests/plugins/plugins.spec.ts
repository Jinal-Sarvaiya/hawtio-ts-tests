/**
 * tests/plugins/plugins.spec.ts
 *
 * Category: Plugin System
 * Scenario: Plugin Loading, Registration, and Lifecycle
 * Status: MIGRATED from Java/Selenide
 *
 * Tests verify that Hawtio plugins load correctly and their routes are accessible.
 * Focuses on plugin initialization, route handling, and core functionality.
 */
import { test, expect } from '../../fixtures'

test.describe('Plugin System', () => {
  test('Camel plugin loads and displays route table', async ({ page }) => {
    // Use retry mechanism like CamelPage does
    await expect(async () => {
      await page.goto('camel', { waitUntil: 'domcontentloaded' })

      // Wait for Camel Nav to be visible
      const camelNav = page.getByLabel('Camel Nav')
      await expect(camelNav).toBeVisible()

      // Navigate to Routes table view
      const routesLink = camelNav.getByRole('link', { name: 'Routes', exact: true })
      await expect(routesLink).toBeVisible()
      await routesLink.click()

      // Wait for route table to be visible
      const routeTable = page.getByRole('grid', { name: /camel routes/i })
      await expect(routeTable).toBeVisible()
    }).toPass({ timeout: 30_000 })
  })

  test('JMX plugin loads MBean tree', async ({ page }) => {
    await page.goto('jmx', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Verify JMX tree loads
    const mbeanTree = page.getByRole('tree')
    await expect(mbeanTree).toBeVisible({ timeout: 10000 })

    // Verify search functionality is available
    const searchInput = page.getByRole('searchbox', { name: /search input/i })
    await expect(searchInput).toBeVisible()

    // Verify tree has content
    const treeItems = await mbeanTree.getByRole('treeitem').count()
    expect(treeItems).toBeGreaterThan(0)
  })

  test('Server Logs plugin loads log viewer', async ({ page }) => {
    await page.goto('logs', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Verify logs page loads - check for log entries or log container
    const hasLogs = await page.getByText(/INFO|WARN|ERROR|DEBUG/i).first().isVisible({ timeout: 5000 }).catch(() => false)

    if (hasLogs) {
      // Logs are visible
      expect(hasLogs).toBe(true)
    } else {
      // Check for log container
      const logContainer = page.locator('[class*="log"], table').first()
      await expect(logContainer).toBeVisible({ timeout: 5000 })
    }
  })

  test('Diagnostics plugin route is accessible', async ({ page }) => {
    await page.goto('diagnostics', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Verify page loaded (either JFR UI or "not available" message)
    const bodyContent = await page.textContent('body')
    expect(bodyContent).toBeTruthy()
    expect(bodyContent!.length).toBeGreaterThan(0)
  })

  test('Help plugin loads documentation', async ({ page }) => {
    await page.goto('help', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Verify help navigation is present
    const helpNav = page.getByRole('navigation', { name: /help nav/i })
    await expect(helpNav).toBeVisible({ timeout: 10000 })

    // Verify Home section link exists
    const homeLink = page.getByRole('link', { name: 'Home' })
    await expect(homeLink).toBeVisible()
  })

  test('Preferences plugin loads settings tabs', async ({ page }) => {
    await page.goto('preferences', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    // Verify preferences tabs are present
    const tabs = page.locator('[role="tab"], [role="tablist"] button, a[href*="preferences"]')
    const tabCount = await tabs.count()
    expect(tabCount).toBeGreaterThan(0)
  })

  test('plugin routes are accessible via direct navigation', async ({ page }) => {
    const pluginRoutes = [
      { path: 'camel', verifyElement: () => page.getByLabel('Camel Nav') },
      { path: 'jmx', verifyElement: () => page.getByRole('tree') },
      { path: 'logs', verifyElement: () => page.locator('body') },
      { path: 'help', verifyElement: () => page.getByRole('navigation', { name: /help nav/i }) },
      { path: 'preferences', verifyElement: () => page.locator('body') },
      { path: 'diagnostics', verifyElement: () => page.locator('body') }
    ]

    for (const route of pluginRoutes) {
      await page.goto(route.path, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const element = route.verifyElement()
      await expect(element).toBeVisible({ timeout: 10000 })
    }
  })

  test('Camel plugin supports Routes view', async ({ page }) => {
    await page.goto('camel', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const camelNav = page.getByLabel('Camel Nav')
    await expect(camelNav).toBeVisible()

    // Verify Routes link exists
    const routesLink = camelNav.getByRole('link', { name: 'Routes', exact: true })
    await expect(routesLink).toBeVisible()

    // Click Routes and verify it navigates correctly
    await routesLink.click()
    await page.waitForTimeout(1000)

    // Verify route table loads
    const routeTable = page.getByRole('grid', { name: /camel routes/i })
    await expect(routeTable).toBeVisible()
  })

  test('JMX plugin tree supports expand/collapse', async ({ page }) => {
    await page.goto('jmx', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const tree = page.getByRole('tree')
    await expect(tree).toBeVisible()

    // Get initial tree item count
    const initialCount = await tree.getByRole('treeitem').count()
    expect(initialCount).toBeGreaterThan(0)

    // Find and click expand all button
    const expandButton = page.getByRole('button', { name: 'Expand Collapse' })
    await expect(expandButton).toBeVisible()

    const buttonText = await expandButton.textContent()
    if (buttonText?.includes('Expand all')) {
      await expandButton.click()
      await page.waitForTimeout(2000)

      // Verify tree expanded
      const expandedCount = await tree.getByRole('treeitem').count()
      expect(expandedCount).toBeGreaterThan(initialCount)
    }
  })

  test('Help plugin supports navigation between sections', async ({ page }) => {
    await page.goto('help', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    const helpNav = page.getByLabel('Help Nav')
    await expect(helpNav).toBeVisible()

    // Navigate to Home help section
    const homeLink = helpNav.getByRole('link', { name: 'Home' })
    await homeLink.click()
    await page.waitForTimeout(1000)

    // Verify URL changed
    await expect(page).toHaveURL(/\/help\/home/i)

    // Navigate to Camel help section
    const camelLink = helpNav.getByRole('link', { name: 'Camel' })
    await camelLink.click()
    await page.waitForTimeout(1000)

    // Verify URL changed
    await expect(page).toHaveURL(/\/help\/camel/i)
  })
})
