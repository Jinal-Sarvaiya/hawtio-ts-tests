/**
 * tests/preferences/user-settings.spec.ts
 *
 * Cluster      : Panel – Preferences
 * Scenario     : User Settings Persistence
 * Status       : TODO: REFACTOR
 *
 * Each tab validates different settings; kept separate.
 * afterEach resets all hawtio-prefixed localStorage keys so no state leaks
 * to other workers.
 */
import { test, expect } from '../../fixtures'
import { PreferencesPage, type PreferenceTab } from '../../pages/preferences-page'

const TABS: PreferenceTab[] = [
  'Home',
  'Console Logs',
  'Connect',
  'Camel',
  'Server Logs',
]

test.describe('User Settings Persistence', () => {
  let prefs: PreferencesPage

  test.beforeEach(async ({ page }) => {
    prefs = new PreferencesPage(page)
    await prefs.goto()
  })

  test.afterEach(async () => {
    await prefs.resetToDefaults()
  })

  for (const tab of TABS) {
    test(`"${tab}" preferences tab is accessible and renders content`, async ({ page }) => {
      const panel = await prefs.tabContent(tab)
      // Panel should render at least one form control or heading
      const controls = panel.locator('input, select, button, h2, h3')
      await expect(controls.first()).toBeVisible()
    })
  }

  test('settings persist within the same browser context', async ({ page }) => {
    // Open the Camel tab and toggle a setting (using checkbox, not switch)
    await prefs.openTab('Camel')
    const toggle = page.getByRole('checkbox').first()
    const initialState = await toggle.isChecked()
    await toggle.click()
    expect(await toggle.isChecked()).toBe(!initialState)

    // Reload the page – setting should still reflect the changed value
    await page.reload()
    await prefs.goto()
    await prefs.openTab('Camel')
    await expect(page.getByRole('checkbox').first()).toBeChecked({ checked: !initialState })
  })
})
