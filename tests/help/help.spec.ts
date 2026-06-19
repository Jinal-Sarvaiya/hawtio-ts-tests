/**
 * tests/help/help.spec.ts
 *
 * Cluster      : Panel – About & Help
 * Scenario     : Help & Documentation
 * Status       : TODO: MIGRATE (1:1 migration – already independent)
 *
 * Stateless link validation; no fixtures required.
 * Grouped in one describe block for organisation only.
 */
import { test, expect } from '../../fixtures'
import { HelpPage } from '../../pages/help-page'

// Help page sections based on actual Hawtio UI
const HELP_SECTIONS = ['Home', 'Preferences', 'Camel', 'JMX']

test.describe('Help & Documentation', () => {
  let help: HelpPage

  test.beforeEach(async ({ page }) => {
    help = new HelpPage(page)
    await help.goto()
  })

  for (const section of HELP_SECTIONS) {
    test(`"${section}" help section is accessible and contains data`, async () => {
      const hasContent = await help.tabHasContent(section)
      expect(hasContent).toBe(true)
    })
  }

  test('Help page displays navigation links', async ({ page }) => {
    await help.goto()
    // Verify main help navigation is visible
    await expect(page.getByRole('navigation', { name: /help nav/i })).toBeVisible()
    // Verify at least one help link is present
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
  })

  test('Help sections are navigable', async ({ page }) => {
    await help.goto()
    await help.openTab('Camel')
    // Verify we navigated to Camel help
    await expect(page).toHaveURL(/\/hawtio\/help\/camel/)
  })
})
