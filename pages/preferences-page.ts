/**
 * pages/preferences-page.ts
 * Page Object Model for the Hawtio Preferences panel.
 */
import { Page, Locator, expect } from '@playwright/test'

export type PreferenceTab = 'Home' | 'Console Logs' | 'Connect' | 'Camel' | 'Server Logs'

export class PreferencesPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto(): Promise<void> {
    await this.page.goto('preferences', { waitUntil: 'networkidle' })
    await this.page.waitForLoadState('domcontentloaded')
  }

  async openTab(tab: PreferenceTab): Promise<void> {
    // Preferences use links in a navigation, not tabs
    await this.page.getByLabel('Preferences Nav').getByRole('link', { name: tab, exact: true }).click()
    await this.page.waitForLoadState('networkidle')
  }

  async tabContent(tab: PreferenceTab): Promise<Locator> {
    await this.openTab(tab)
    // Content is in the main area, not a tabpanel
    return this.page.locator('main')
  }

  /** Resets all preferences to defaults via localStorage – called in afterEach. */
  async resetToDefaults(): Promise<void> {
    await this.page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('hawtio'))
      keys.forEach(k => localStorage.removeItem(k))
    })
  }
}

// Made with Bob
