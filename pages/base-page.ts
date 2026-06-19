/**
 * pages/base-page.ts
 * Base Page Object for Hawtio SPA navigation
 */
import { Page } from '@playwright/test'

export class BasePage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  /**
   * Navigate to a Hawtio route within the SPA
   * Hawtio uses client-side routing, so we can't use page.goto() for sub-routes
   */
  async navigateToRoute(route: string): Promise<void> {
    const currentUrl = this.page.url()
    
    // If we're not on the Hawtio main page, navigate there first
    if (!currentUrl.includes('/hawtio')) {
      await this.page.goto('/hawtio/')
      await this.page.waitForLoadState('networkidle')
    }
    
    // Ensure route starts with /hawtio/
    const fullRoute = route.startsWith('/hawtio/') ? route : `/hawtio${route.startsWith('/') ? route : '/' + route}`
    
    // Use client-side navigation by updating the URL
    // Hawtio React app uses browser history API
    await this.page.evaluate((path) => {
      window.history.pushState({}, '', path)
      // Trigger a popstate event to notify React Router
      window.dispatchEvent(new PopStateEvent('popstate'))
    }, fullRoute)
    
    // Wait for navigation to complete
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Wait for the Hawtio application to be fully loaded
   */
  async waitForHawtioReady(): Promise<void> {
    // Wait for the main app container
    await this.page.waitForSelector('#root, [data-testid="hawtio-app"]', { timeout: 10000 })
    await this.page.waitForLoadState('networkidle')
  }
}

// Made with Bob
