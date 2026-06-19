/**
 * pages/jfr-page.ts
 * Page Object Model for the Hawtio JFR (Java Flight Recorder) diagnostics panel.
 */
import { Page, Locator, expect } from '@playwright/test'

export class JfrPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto(): Promise<void> {
    await this.page.goto('diagnostics/jfr', { waitUntil: 'domcontentloaded', timeout: 30000 })

    // Check if JFR content is available using expect which auto-retries
    const content = this.page.locator('h1, h2, h3, button, .pf-v6-c-page__main-section, [class*="jfr"], [class*="diagnostic"]').first()

    const hasContent = await content.isVisible({ timeout: 10000 }).catch(() => false)
    if (!hasContent) {
      throw new Error('JFR_NOT_AVAILABLE: JFR diagnostics page has no content - feature may not be enabled in the JVM')
    }
  }

  async startRecording(configName?: string): Promise<void> {
    if (configName) {
      const configSelect = this.page.getByLabel(/configuration/i).or(
        this.page.locator('select[name*="config"]')
      ).first()

      const isSelectVisible = await configSelect.isVisible({ timeout: 5000 }).catch(() => false)
      if (isSelectVisible) {
        await configSelect.selectOption(configName)
      }
    }

    // Look for the start button
    const startButton = this.page.getByRole('button', { name: /start/i }).or(
      this.page.locator('button:has-text("Start")')
    ).first()

    // Check if start button is visible - if not, JFR is not available
    const isStartVisible = await startButton.isVisible({ timeout: 10000 }).catch(() => false)

    if (!isStartVisible) {
      throw new Error('JFR_NOT_AVAILABLE: JFR Start button not found - feature may not be enabled in the JVM')
    }

    await expect(startButton).toBeEnabled()
    await startButton.click()

    // Wait for stop button to appear, indicating recording started
    const stopButton = this.page.getByRole('button', { name: /stop/i })
    await expect(stopButton).toBeVisible({ timeout: 10_000 })
  }

  async stopRecording(): Promise<Locator> {
    const stopButton = this.page.getByRole('button', { name: /stop/i }).or(
      this.page.locator('button:has-text("Stop")')
    ).first()

    await expect(stopButton).toBeVisible()
    await stopButton.click()

    // Look for download link - it appears after stopping
    const downloadLocator = this.page.getByTestId('jfr-download-link').or(
      this.page.locator('a[href$=".jfr"], a[download*=".jfr"]')
    ).first()

    await expect(downloadLocator).toBeVisible({ timeout: 20_000 })
    return downloadLocator
  }

  async assertValidJfrFile(downloadLocator: Locator): Promise<void> {
    const href = await downloadLocator.getAttribute('href')
    expect(href).toMatch(/\.jfr$/)
  }
}
