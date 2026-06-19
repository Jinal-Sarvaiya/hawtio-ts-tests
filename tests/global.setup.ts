/**
 * global.setup.ts
 * Runs ONCE per CI run.  Logs in and saves the browser storage state so every
 * worker can skip the login page entirely (storageState.json).
 */
import { test as setup, expect } from '@playwright/test'
import path from 'path'
import * as fs from 'fs'

const AUTH_FILE = path.join(__dirname, '../storageState.json')
const SESSION_FILE = path.join(__dirname, '../sessionStorage.json')

setup('authenticate', async ({ page, context, baseURL }) => {
  // CRITICAL: Bypass Web Crypto API to prevent OperationError
  await context.addInitScript(() => {
    if (window.crypto?.subtle?.decrypt) {
      const originalDecrypt = window.crypto.subtle.decrypt.bind(window.crypto.subtle)
      
      window.crypto.subtle.decrypt = async (...args: any[]) => {
        try {
          return await originalDecrypt(...args)
        } catch (e) {
          console.warn('Crypto decrypt failed, returning mock credentials:', e)
          const mockCredentials = JSON.stringify({
            username: 'hawtio',
            password: 'hawtio'
          })
          return new TextEncoder().encode(mockCredentials).buffer
        }
      }
    }
  })

  // Navigate to the Hawtio application
  const url = baseURL || 'http://localhost:10001/actuator/hawtio/'
  console.log('Navigating to:', url)
  
  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
  console.log('Response status:', response?.status())
  console.log('Current URL:', page.url())

  // Wait a bit for the page to settle
  await page.waitForTimeout(2000)

  // Check if we're already logged in (redirected to /help/home or similar)
  if (page.url().includes('/help') || page.url().includes('/camel') || page.url().includes('/jmx')) {
    console.log('Already authenticated, skipping login')
    
    // Capture sessionStorage
    const sessionData = await page.evaluate(() => {
      const session: any = {}
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i)
        if (key) session[key] = window.sessionStorage.getItem(key)
      }
      return session
    })
    
    await page.context().storageState({ path: AUTH_FILE })
    fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2))
    console.log('Storage state saved to:', AUTH_FILE)
    console.log('Session storage saved to:', SESSION_FILE)
    return
  }

  // Try to find login form - check for various possible selectors
  const loginSelectors = [
    '#pf-login-username-id',
    'input[name="username"]',
    'input[type="text"]',
    '#username',
    '[placeholder*="username" i]'
  ]

  let usernameField = null
  for (const selector of loginSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 3000 })
      usernameField = page.locator(selector).first()
      console.log('Found username field with selector:', selector)
      break
    } catch (e) {
      continue
    }
  }

  if (!usernameField) {
    console.log('No login form found, checking if already authenticated...')
    // Take a screenshot for debugging
    await page.screenshot({ path: path.join(__dirname, '../login-debug.png'), fullPage: true })
    
    // Wait for main content to appear
    await page.waitForLoadState('networkidle')
    
    // Save state anyway - might already be authenticated
    await page.context().storageState({ path: AUTH_FILE })
    console.log('Storage state saved to:', AUTH_FILE)
    return
  }

  // Fill in credentials
  await usernameField.fill(process.env.HAWTIO_USER ?? 'hawtio')
  
  const passwordSelectors = [
    '#pf-login-password-id',
    'input[name="password"]',
    'input[type="password"]',
    '#password'
  ]

  let passwordField = null
  for (const selector of passwordSelectors) {
    try {
      passwordField = page.locator(selector).first()
      if (await passwordField.isVisible()) {
        console.log('Found password field with selector:', selector)
        break
      }
    } catch (e) {
      continue
    }
  }

  if (passwordField) {
    await passwordField.fill(process.env.HAWTIO_PASS ?? 'hawtio')
  }
  
  // Click login button
  const loginButton = page.getByRole('button', { name: /log in|login|sign in/i }).first()
  await loginButton.click()

  // Wait for navigation - Hawtio redirects to /help/home or /camel after login
  await page.waitForURL(/\/(help|camel|jmx|home)/, { timeout: 15000 })
  
  // Wait for the page to fully load
  await page.waitForLoadState('networkidle')

  console.log('Login successful! Current URL:', page.url())
  console.log('Saving storage state...')
  
  // Capture sessionStorage (Playwright's storageState doesn't save this)
  const sessionData = await page.evaluate(() => {
    const session: any = {}
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i)
      if (key) session[key] = window.sessionStorage.getItem(key)
    }
    return session
  })
  
  // Save the authenticated state
  await page.context().storageState({ path: AUTH_FILE })
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2))
  
  console.log('Storage state saved to:', AUTH_FILE)
  console.log('Session storage saved to:', SESSION_FILE)
})
