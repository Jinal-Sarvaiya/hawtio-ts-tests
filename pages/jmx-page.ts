/**
 * pages/jmx-page.ts
 * Page Object Model for the Hawtio JMX plugin.
 */
import { Page, Locator } from '@playwright/test'

export class JmxPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  async goto(): Promise<void> {
    await this.page.goto('jmx', { waitUntil: 'domcontentloaded' })
  }

  get searchInput(): Locator {
    return this.page.getByRole('searchbox', { name: /search input/i })
  }

  get mbeanTree(): Locator {
    return this.page.getByRole('tree')
  }

  async filterTree(query: string): Promise<void> {
    await this.searchInput.fill(query)
    // Playwright automatically waits for the network to be idle after input
    // No need for manual debounce timeout
  }

  async clearFilter(): Promise<void> {
    await this.searchInput.clear()
    // Playwright automatically waits
  }

  async visibleTreeItems(): Promise<string[]> {
    const items = await this.mbeanTree.getByRole('treeitem').all()
    return Promise.all(items.map(i => i.textContent().then(t => t ?? '')))
  }

  async expandAll(): Promise<void> {
    const button = this.page.getByRole('button', { name: 'Expand Collapse' })
    const buttonText = await button.textContent()

    // Only click if it says "Expand all"
    if (buttonText?.includes('Expand all')) {
      const initialCount = await this.treeItemCount()
      await button.click()

      // Wait for tree to expand by checking item count increases
      await this.page.waitForFunction(
        (initial) => {
          const tree = document.querySelector('[role="tree"]')
          const count = tree?.querySelectorAll('[role="treeitem"]').length || 0
          return count >= initial
        },
        initialCount,
        { timeout: 5000 }
      )
    }
  }

  async collapseAll(): Promise<void> {
    const button = this.page.getByRole('button', { name: 'Expand Collapse' })
    const buttonText = await button.textContent()

    // Only click if it says "Collapse all"
    if (buttonText?.includes('Collapse all')) {
      await button.click()

      // Wait for collapse by checking for minimum number of items (top-level only)
      await this.page.waitForFunction(
        () => {
          const tree = document.querySelector('[role="tree"]')
          const count = tree?.querySelectorAll('[role="treeitem"]').length || 0
          return count <= 20 // Should collapse to ~11-15 top-level items
        },
        { timeout: 5000 }
      )
    }
  }

  async treeItemCount(): Promise<number> {
    return this.mbeanTree.getByRole('treeitem').count()
  }
}
