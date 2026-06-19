/**
 * pages/help-page.ts
 * Page Object Model for the Hawtio Help panel.
 */
import { Page, expect } from '@playwright/test'

export class HelpPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto(): Promise<void> {
    // Navigate to help page using relative URL (baseURL is http://localhost:8080/hawtio/)
    await this.page.goto('help', { waitUntil: 'networkidle' })
    
    // Wait for Help page heading to be visible (use exact match to avoid multiple matches)
    await expect(this.page.getByRole('heading', { name: 'Help', exact: true }).first()).toBeVisible({ timeout: 10000 })
  }

  async openTab(tabName: string): Promise<void> {
    // Help page uses navigation links in the Help Nav, not tabs
    // Need to be specific to avoid global navigation links
    await this.page.getByLabel('Help Nav').getByRole('link', { name: tabName, exact: true }).click()
    await this.page.waitForLoadState('networkidle')
  }

  async tabHasContent(tabName: string): Promise<boolean> {
    // Navigate to the help section
    await this.openTab(tabName)
    // Check if the main content area has text
    const main = this.page.locator('main')
    const text = await main.textContent()
    return (text?.trim().length ?? 0) > 100 // Reasonable content threshold
  }

  /** Clicks an external link and asserts the target URL matches expectedUrlPattern. */
  async assertLinkRedirect(linkText: string, expectedUrlPattern: RegExp): Promise<void> {
    const [newPage] = await Promise.all([
      this.page.context().waitForEvent('page'),
      this.page.getByRole('link', { name: linkText }).click(),
    ])
    await newPage.waitForLoadState()
    expect(newPage.url()).toMatch(expectedUrlPattern)
    await newPage.close()
  }
}

// Made with Bob
