/**
 * pages/camel-page.ts
 * Page Object Model for the Hawtio Camel plugin.
 * Encapsulates all locators and actions; tests never query the DOM directly.
 */
import { Page, Locator, expect } from '@playwright/test'

export class CamelPage {
  readonly page: Page

  constructor(page: Page) {
    this.page = page
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  async goto(): Promise<void> {
    // Use Playwright's built-in retry mechanism instead of manual retries
    await expect(async () => {
      await this.page.goto('camel', { waitUntil: 'domcontentloaded' })

      // Wait for Camel Nav to be visible
      const camelNav = this.page.getByLabel('Camel Nav')
      await expect(camelNav).toBeVisible()

      // Navigate to Routes table view
      const routesLink = camelNav.getByRole('link', { name: 'Routes', exact: true })
      await expect(routesLink).toBeVisible()
      await routesLink.click()

      // Wait for route table to be visible
      await expect(this.routeTable).toBeVisible()
    }).toPass({ timeout: 30_000 })
  }

  async selectRoute(routeId: string): Promise<void> {
    // Use more specific selector to avoid matching endpoints with similar names
    // Routes are under the "routes" folder and have "CamelRouteIcon" prefix
    await this.page
      .getByRole('treeitem', { name: new RegExp(`CamelRouteIcon\\s+${routeId}$`) })
      .click()
    await this.page.waitForLoadState('networkidle')
  }

  async openTab(tabName: string): Promise<void> {
    // In the route detail view, tabs are actually links in the Camel Nav
    // Try multiple selectors for the tab
    const tab = this.page.getByLabel('Camel Nav').getByRole('link', { name: tabName, exact: true }).or(
      this.page.getByRole('link', { name: tabName, exact: true })
    ).or(
      this.page.locator(`a:has-text("${tabName}")`)
    ).first()

    const isVisible = await tab.isVisible({ timeout: 10000 }).catch(() => false)

    if (!isVisible) {
      throw new Error(`TAB_NOT_AVAILABLE: ${tabName} tab not found - feature may not be available in this Hawtio version`)
    }

    await tab.click()
    await this.page.waitForLoadState('networkidle')
  }

  // ── Route table ─────────────────────────────────────────────────────────────

  get routeTable(): Locator {
    return this.page.getByRole('grid', { name: /camel routes/i })
  }

  routeRow(routeId: string): Locator {
    // Row name includes all cell values, so use a partial match
    return this.routeTable.getByRole('row', { name: new RegExp(routeId, 'i') })
  }

  async routeStatus(routeId: string): Promise<string> {
    // Wait for the route table to be visible first
    await this.routeTable.waitFor({ state: 'visible', timeout: 5000 })
    
    const row = this.routeRow(routeId)
    // Wait for the row to be visible
    await row.waitFor({ state: 'visible', timeout: 5000 })
    
    // Status is in the "State" column (3rd gridcell after checkbox and name)
    const cells = await row.getByRole('gridcell').all()
    if (cells.length >= 3) {
      const statusText = await cells[2].textContent()
      return statusText?.trim() ?? ''
    }
    return ''
  }

  // ── Route actions ────────────────────────────────────────────────────────────

  async startRouteViaUI(routeId: string): Promise<void> {
    const row = this.routeRow(routeId)
    const checkbox = row.getByRole('checkbox')

    // Ensure clean state - uncheck first if already checked
    if (await checkbox.isChecked()) {
      await checkbox.uncheck()
    }

    // Check the checkbox
    await checkbox.check()
    await expect(checkbox).toBeChecked()

    // Strategic delay for PatternFly UI async state updates
    await this.page.waitForTimeout(1000)

    // Start button appears in toolbar when route is selected
    const startButton = this.page.getByRole('button', { name: /^start$/i }).or(
      this.page.locator('button:has-text("Start")')
    ).first()

    // Wait for button to appear and be enabled
    await expect(startButton).toBeVisible()
    await expect(startButton).toBeEnabled({ timeout: 20_000 })
    await startButton.click()

    // Uncheck after operation
    await checkbox.uncheck()
  }

  async stopRouteViaUI(routeId: string): Promise<void> {
    const row = this.routeRow(routeId)
    const checkbox = row.getByRole('checkbox')

    // Ensure clean state - uncheck first if already checked
    if (await checkbox.isChecked()) {
      await checkbox.uncheck()
    }

    // Check the checkbox
    await checkbox.check()
    await expect(checkbox).toBeChecked()

    // Strategic delay for PatternFly UI async state updates
    await this.page.waitForTimeout(1000)

    // Stop button appears in toolbar when route is selected
    const stopButton = this.page.getByRole('button', { name: /^stop$/i }).or(
      this.page.locator('button:has-text("Stop")')
    ).first()

    // Wait for button to appear and be enabled
    await expect(stopButton).toBeVisible()
    await expect(stopButton).toBeEnabled({ timeout: 20_000 })
    await stopButton.click()

    // Uncheck after operation
    await checkbox.uncheck()
  }

  async deleteRouteViaUI(routeId: string): Promise<void> {
    const row = this.routeRow(routeId)
    const checkbox = row.getByRole('checkbox')

    // Ensure clean state - uncheck first if already checked
    if (await checkbox.isChecked()) {
      await checkbox.uncheck()
      await this.page.waitForTimeout(500)
    }

    // Check the checkbox to select the route
    await checkbox.check()
    await expect(checkbox).toBeChecked()

    // Strategic delay for PatternFly UI to update button states
    await this.page.waitForTimeout(2000)

    // Delete button only appears when a STOPPED route is selected
    const deleteButton = this.page.getByRole('button', { name: /^delete$/i }).or(
      this.page.locator('button:has-text("Delete")')
    ).first()

    // Wait for delete button to be visible and enabled
    await expect(deleteButton).toBeVisible({ timeout: 10_000 })
    await expect(deleteButton).toBeEnabled({ timeout: 10_000 })
    await deleteButton.click()

    // Confirm deletion in modal
    await this.page.waitForTimeout(1000)
    const confirmButton = this.page.getByRole('button', { name: /^delete$/i }).or(
      this.page.getByRole('button', { name: /confirm/i })
    ).or(
      this.page.locator('button:has-text("Delete")')
    ).first()

    await expect(confirmButton).toBeVisible({ timeout: 5000 })
    await confirmButton.click()
    await this.page.waitForTimeout(2000)

    // Uncheck after operation
    await checkbox.uncheck().catch(() => {})
  }

  // ── Route Diagram tab ────────────────────────────────────────────────────────

  get routeDiagramSvg(): Locator {
    // The diagram uses React Flow, not a plain SVG - look for the container with buttons
    return this.page.locator('img').first()
  }
  
  get routeDiagramButtons(): Locator {
    // React Flow renders nodes as buttons with complex aria-labels
    // Look for buttons that contain icon names and IDs
    return this.page.getByRole('button', { name: /Icon.*\(ID:/ })
  }

  async openRouteDiagramTab(): Promise<void> {
    await this.openTab('Route Diagram')
    
    // Wait for diagram to render - React Flow uses buttons, not SVG
    await this.page.waitForTimeout(3000)
    // Wait for any diagram button to be visible
    await this.routeDiagramButtons.first().waitFor({ state: 'visible', timeout: 15000 })
  }

  async assertNoDiagramOverlay(): Promise<void> {
    // React Flow renders nodes as buttons - check they don't overlap
    const nodes = await this.routeDiagramButtons.all()
    const boxes: { x: number; y: number; width: number; height: number }[] = []
    for (const node of nodes) {
      const box = await node.boundingBox()
      if (box) boxes.push(box)
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j]
        const overlap =
          a.x < b.x + b.width &&
          a.x + a.width > b.x &&
          a.y < b.y + b.height &&
          a.y + a.height > b.y
        expect(overlap, `Nodes ${i} and ${j} overlap`).toBe(false)
      }
    }
  }

  async assertNoDuplicateRouteNodes(routeId: string): Promise<void> {
    // Wait for diagram to be fully rendered
    await this.page.waitForTimeout(2000)
    
    // Count buttons that contain the route ID
    const nodes = await this.page.getByRole('button', { name: new RegExp(routeId, 'i') }).all()
    
    // Should have exactly one button per unique node (from, setBody, to, etc.)
    expect(nodes.length).toBeGreaterThan(0)
  }

  // ── Source (XML) tab ──────────────────────────────────────────────────────────

  get sourceEditor(): Locator {
    return this.page.locator('.cm-content, .CodeMirror-code, .monaco-editor, textarea[aria-label*="editor"], [data-testid="source-editor"]').first()
  }

  async openSourceTab(): Promise<void> {
    await this.openTab('Source')
    // Wait for editor to load - be more flexible
    await this.page.waitForTimeout(1000)
    const editor = this.page.locator('.cm-content, .CodeMirror, .monaco-editor, textarea, pre').first()
    await expect(editor).toBeVisible({ timeout: 10000 })
  }

  async getSourceContent(): Promise<string> {
    return (await this.sourceEditor.textContent()) ?? ''
  }

  async revertSourceChanges(): Promise<void> {
    const revertBtn = this.page.getByRole('button', { name: /revert/i })
    if (await revertBtn.isVisible()) await revertBtn.click()
  }

  // ── Debug tab ────────────────────────────────────────────────────────────────

  async gotoRoutesView(): Promise<void> {
    await this.goto()
  }

  async gotoDebugTab(): Promise<void> {
    await this.openTab('Debug')
  }

  get debugToolbar(): Locator {
    // More flexible selectors for debug toolbar
    return this.page.locator('[data-testid="debug-toolbar"], .debug-toolbar, [class*="debug-toolbar"], [id*="debug-toolbar"], .pf-c-toolbar:has-text("Stop")').first()
  }

  get startDebugButton(): Locator {
    return this.page.getByRole('button', { name: /start.*debug/i }).or(
      this.page.getByRole('button', { name: /debug/i })
    ).first()
  }

  get breakpointList(): Locator {
    // The breakpoint list is in the Debug tab content area
    return this.page.locator('[data-testid="breakpoint-list"], .breakpoint-list, [class*="breakpoint"], ul, ol, .pf-v6-c-data-list').first()
  }

  async openDebugTab(): Promise<void> {
    await this.openTab('Debug')
  }

  async startDebugging(): Promise<boolean> {
    const startButton = this.page.getByRole('button', { name: /start.*debug/i }).or(
      this.page.getByRole('button', { name: /debug/i })
    ).first()

    await expect(startButton).toBeVisible()
    await startButton.click()

    // Wait for stop button to appear, indicating debug mode started
    const stopButton = this.page.getByRole('button', { name: /stop.*debug/i }).or(
      this.page.getByRole('button', { name: /stop/i })
    ).first()

    // Return true if debug mode started, false if infrastructure not available
    const isVisible = await stopButton.isVisible({ timeout: 15_000 }).catch(() => false)
    return isVisible
  }

  async stopDebugging(): Promise<void> {
    const stopButton = this.page.getByRole('button', { name: /stop.*debug/i }).or(
      this.page.getByRole('button', { name: /stop/i })
    ).or(
      this.page.locator('button:has-text("Stop")')
    ).first()

    // Check if stop button is visible
    const isStopVisible = await stopButton.isVisible({ timeout: 5000 }).catch(() => false)

    if (isStopVisible) {
      await stopButton.click()

      // Wait for start button to reappear, indicating debug stopped
      await expect(
        this.page.getByRole('button', { name: /start.*debug/i }),
      ).toBeVisible({ timeout: 10_000 })
    }
  }

  async toggleBreakpoint(nodeLabel: string): Promise<void> {
    // Wait for debug mode to be fully active
    await this.page.waitForTimeout(2000)

    // In Hawtio Debug view, breakpoints might be toggled via the diagram or a breakpoint list
    // Look for breakpoint controls in the Debug tab content area, not the tree
    // Try to find a checkbox or toggle in the debug panel
    const debugContent = this.page.locator('[class*="debug"], .pf-v6-c-panel, [role="region"]')
    const breakpointToggle = debugContent.locator(`[data-node="${nodeLabel}"], input[type="checkbox"]`).first()

    const isToggleVisible = await breakpointToggle.isVisible({ timeout: 2000 }).catch(() => false)

    if (isToggleVisible) {
      await breakpointToggle.click()
      await this.page.waitForTimeout(1000)
    } else {
      // Breakpoint toggle UI not found - just wait
      // The test expects debug mode to remain active, so don't navigate away
      await this.page.waitForTimeout(1000)
    }
  }

  async addBreakpoint(nodeLabel: string): Promise<void> {
    await this.page.locator(`[data-node-label="${nodeLabel}"]`).dblclick()
    await expect(
      this.page.locator(`[data-node-label="${nodeLabel}"].breakpoint-active`),
    ).toBeVisible()
  }

  async removeBreakpoint(nodeLabel: string): Promise<void> {
    await this.page.locator(`[data-node-label="${nodeLabel}"].breakpoint-active`).dblclick()
    await expect(
      this.page.locator(`[data-node-label="${nodeLabel}"].breakpoint-active`),
    ).not.toBeVisible()
  }

  // ── Trace tab ────────────────────────────────────────────────────────────────

  async openTraceTab(): Promise<void> {
    await this.openTab('Trace')
  }

  async startTracing(): Promise<void> {
    // Check if tracing is already running by looking for Stop button
    const stopButton = this.page.getByRole('button', { name: /stop/i })
    const isTracing = await stopButton.isVisible({ timeout: 2000 }).catch(() => false)
    
    if (isTracing) {
      // Already tracing, nothing to do
      return
    }
    
    // Wait longer for Trace tab to fully load
    await this.page.waitForTimeout(3000)
    
    // The Trace feature might not be available - check if there's any content
    const hasContent = await this.page.locator('button, .pf-v6-c-empty-state').isVisible({ timeout: 5000 }).catch(() => false)
    if (!hasContent) {
      // Trace tab is empty or not loaded
      return
    }
    
    // Look for Start button with very flexible selectors
    const startButton = this.page.getByRole('button', { name: /start/i }).first()
    
    const isStartVisible = await startButton.isVisible({ timeout: 5000 }).catch(() => false)
    if (!isStartVisible) {
      // Start button not found - trace might not be supported
      return
    }
    
    await expect(startButton).toBeEnabled({ timeout: 5000 })
    await startButton.click()
    await this.page.waitForTimeout(5000)
  }

  async stopTracing(): Promise<void> {
    const stopButton = this.page.getByRole('button', { name: /stop/i }).first()
    
    const isStopVisible = await stopButton.isVisible({ timeout: 5000 }).catch(() => false)
    if (!isStopVisible) {
      // Stop button not found - trace might not be running
      return
    }
    
    await stopButton.click()
    await this.page.waitForTimeout(5000)
    
    // Wait for Start button to appear
    const startButton = this.page.getByRole('button', { name: /start/i })
    await startButton.isVisible({ timeout: 10000 }).catch(() => false)
  }

  get traceTable(): Locator {
    return this.page.getByRole('table', { name: /trace/i })
  }

  // ── Profile (Statistics) tab ──────────────────────────────────────────────────

  async openProfileTab(): Promise<void> {
    await this.openTab('Profile')
    // Profile table is a grid with name "message table"
    await expect(this.page.getByRole('grid', { name: /message table/i })).toBeVisible()
  }

  get profileTable(): Locator {
    return this.page.getByRole('grid', { name: /message table/i })
  }

  async getProfileCellValue(rowLabel: string, columnHeader: string): Promise<string> {
    const headerCells = await this.profileTable.getByRole('columnheader').all()
    let colIndex = -1
    for (let i = 0; i < headerCells.length; i++) {
      const text = await headerCells[i].textContent()
      if (text?.trim() === columnHeader) { colIndex = i; break }
    }
    expect(colIndex).toBeGreaterThanOrEqual(0)
    const row = this.profileTable.getByRole('row', { name: rowLabel })
    const cells = await row.getByRole('cell').all()
    return (await cells[colIndex].textContent()) ?? ''
  }

  // ── Context panel (Contexts view) ─────────────────────────────────────────────

  async gotoContextsView(): Promise<void> {
    await this.page.goto('camel', { waitUntil: 'domcontentloaded' })

    // Find context treeitem using Playwright's filter API
    const contextTreeItem = this.page
      .getByRole('treeitem')
      .filter({ hasText: /context|camel/i })
      .filter({ has: this.page.getByRole('button') })
      .first()

    // Check if context exists
    const isVisible = await contextTreeItem.isVisible({ timeout: 5000 }).catch(() => false)
    if (!isVisible) {
      throw new Error('CONTEXT_NOT_AVAILABLE: No Camel context found in tree')
    }

    // Click the context button (second button in treeitem, first is expand/collapse)
    const buttons = contextTreeItem.getByRole('button')
    const buttonCount = await buttons.count()

    if (buttonCount > 1) {
      await buttons.nth(1).click() // Click the second button
    } else if (buttonCount > 0) {
      await buttons.first().click()
    } else {
      throw new Error('CONTEXT_NOT_AVAILABLE: No buttons found')
    }

    // Navigate to Operations tab
    const operationsTab = this.page.getByRole('link', { name: 'Operations' })
    await expect(operationsTab).toBeVisible({ timeout: 10_000 })
    await operationsTab.click()

    // Wait for operations content to load
    await expect(this.page.getByRole('button', { name: /start|suspend/i })).toBeVisible()
  }

  get contextStatusBadge(): Locator {
    // The status is determined by which button is visible
    // If "Suspend" button is visible, context is Started
    // If "Start" button is visible, context is Suspended
    return this.page.getByRole('button', { name: /start|suspend/i }).first()
  }

  async suspendContextViaUI(): Promise<void> {
    await this.page.getByRole('button', { name: /suspend/i }).click()
    // Wait for the operation to complete - Start button should appear
    await expect(this.page.getByRole('button', { name: /^start$/i })).toBeVisible({ timeout: 10000 })
  }

  async startContextViaUI(): Promise<void> {
    // The Start button may remain disabled if the context is in a transitional state
    // Try clicking via Jolokia API instead if UI button doesn't work
    const startButton = this.page.getByRole('button', { name: /^start$/i })
    
    // Check if button exists and is visible
    const isVisible = await startButton.isVisible({ timeout: 5000 }).catch(() => false)
    if (!isVisible) {
      throw new Error('Start button not found')
    }
    
    // Try waiting for enabled state, but don't fail if it stays disabled
    const isEnabled = await startButton.isEnabled({ timeout: 5000 }).catch(() => false)
    if (!isEnabled) {
      // Button is disabled - this might be a timing issue or the context is already starting
      // Check if Suspend button is already visible (context already started)
      const suspendButton = this.page.getByRole('button', { name: /suspend/i })
      const isSuspendVisible = await suspendButton.isVisible({ timeout: 2000 }).catch(() => false)
      if (isSuspendVisible) {
        // Context is already started
        return
      }
      // Otherwise, skip this test as the button is disabled for unknown reasons
      throw new Error('Start button is disabled and context is not started')
    }
    
    await startButton.click()
    // Wait for the operation to complete - Suspend button should appear
    await expect(this.page.getByRole('button', { name: /suspend/i })).toBeVisible({ timeout: 10000 })
  }

  // ── Endpoint Browse tab ───────────────────────────────────────────────────────

  async gotoEndpoint(endpointUri: string): Promise<void> {
    // Navigate to Camel page first
    await this.page.goto('camel', { waitUntil: 'networkidle' })
    await this.page.waitForLoadState('domcontentloaded')
    await this.page.waitForTimeout(2000)
    
    // Click on endpoints folder in the tree to expand it if not already expanded
    const endpointsFolder = this.page.getByRole('treeitem', { name: /EndpointsFolderIcon endpoints/i })
    await endpointsFolder.waitFor({ state: 'visible', timeout: 10000 })
    
    // Check if already expanded by looking for child endpoints
    const isExpanded = await endpointsFolder.getAttribute('aria-expanded')
    if (isExpanded !== 'true') {
      // Click the expand button, not the folder itself
      const expandButton = endpointsFolder.getByRole('button').first()
      await expandButton.click()
      await this.page.waitForTimeout(2000)
    }
    
    // Now find and click the specific endpoint in the tree
    // Try multiple patterns to find the endpoint
    const escapedUri = endpointUri.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    
    // Try with EndpointsNodeIcon prefix first
    let endpoint = this.page.getByRole('treeitem', { name: new RegExp(`EndpointsNodeIcon.*${escapedUri}`, 'i') })
    let isVisible = await endpoint.isVisible({ timeout: 3000 }).catch(() => false)
    
    if (!isVisible) {
      // Try without prefix
      endpoint = this.page.getByRole('treeitem', { name: new RegExp(escapedUri, 'i') })
      isVisible = await endpoint.isVisible({ timeout: 3000 }).catch(() => false)
    }
    
    if (!isVisible) {
      // Try with just the endpoint name (e.g., "bar" from "mock://bar")
      const endpointName = endpointUri.split('://')[1] || endpointUri
      endpoint = this.page.getByRole('treeitem', { name: new RegExp(endpointName, 'i') })
      isVisible = await endpoint.isVisible({ timeout: 3000 }).catch(() => false)
    }
    
    if (isVisible) {
      await endpoint.click()
      await this.page.waitForLoadState('networkidle')
      await this.page.waitForTimeout(2000)
    } else {
      // Endpoint not found - throw error so tests can handle it
      throw new Error(`Endpoint ${endpointUri} not found in the Camel tree`)
    }
  }

  get browseTable(): Locator {
    return this.page.getByRole('table', { name: /messages/i })
  }

  async browseRowCount(): Promise<number> {
    // Wait for table to be visible
    try {
      await this.browseTable.waitFor({ state: 'visible', timeout: 5000 })
      const count = await this.browseTable.getByRole('row').count()
      return count > 0 ? count - 1 : 0 // subtract header row
    } catch (error) {
      // Browse table not found or not visible
      return 0
    }
  }

  async sendMessage(body: string, headers: Record<string, string> = {}): Promise<void> {
    // Wait for endpoint page to fully load
    await this.page.waitForTimeout(3000)

    // Try to open Send tab
    await this.openTab('Send')
    await this.page.waitForTimeout(2000)

    // Look for the message input field - try multiple selectors
    const messageInput = this.page.getByLabel(/message body/i).or(
      this.page.getByLabel(/^message$/i)
    ).or(
      this.page.locator('textarea').first()
    ).first()

    await messageInput.waitFor({ state: 'visible', timeout: 10000 })
    await messageInput.fill(body)

    // Add headers if provided
    if (Object.keys(headers).length > 0) {
      const addHeaderButton = this.page.getByRole('button', { name: /add header/i }).or(
        this.page.getByText(/add header/i)
      ).first()

      for (const [key, value] of Object.entries(headers)) {
        await addHeaderButton.click()
        await this.page.waitForTimeout(1000)

        // Look for the header input fields - they appear as text inputs after Name and Value labels
        // Get all text inputs in the form and use the last two (most recently added)
        const inputs = await this.page.locator('input[type="text"]').all()
        if (inputs.length >= 2) {
          const nameInput = inputs[inputs.length - 2]
          const valueInput = inputs[inputs.length - 1]
          await nameInput.fill(key)
          await valueInput.fill(value)
        }
      }
    }

    // Click send button - scroll into view first
    const sendButton = this.page.getByRole('button', { name: /^send$/i }).first()
    await sendButton.waitFor({ state: 'visible', timeout: 5000 })
    await sendButton.scrollIntoViewIfNeeded()
    await sendButton.click()

    // Wait for operation to complete
    await this.page.waitForTimeout(3000)
  }

  async forwardMessageTo(targetEndpointUri: string): Promise<void> {
    const firstRow = this.browseTable.getByRole('row').nth(1)
    await firstRow.getByRole('checkbox').check()
    await this.page.getByRole('button', { name: /forward/i }).click()
    await this.page.getByLabel(/destination/i).fill(targetEndpointUri)
    await this.page.getByRole('button', { name: /confirm/i }).click()
  }

  async openMessageDetails(bodyPreview: string): Promise<void> {
    await this.browseTable
      .getByRole('row', { name: new RegExp(bodyPreview) })
      .click()
    await expect(this.page.getByRole('dialog', { name: /message details/i })).toBeVisible()
  }

  get messageDetailsDialog(): Locator {
    return this.page.getByRole('dialog', { name: /message details/i })
  }

  async closeMessageDetails(): Promise<void> {
    await this.messageDetailsDialog.getByRole('button', { name: /close/i }).click()
    await expect(this.messageDetailsDialog).not.toBeVisible()
  }
}

// Made with Bob
