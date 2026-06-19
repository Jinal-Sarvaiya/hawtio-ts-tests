/**
 * tests/camel/route-profile.spec.ts
 *
 * Cluster      : Camel Management
 * Scenario     : Route Statistics (Profile tab)
 * Status       : TODO: REFACTOR & MIGRATE
 *
 * MERGE INTO SINGLE SPEC (all three Scenario Outlines read the same table):
 *   - statsFixture resets counters via Jolokia resetStats() in beforeEach.
 *   - test.each() replaces redundant Scenario Outlines.
 *   - All tests are stateless reads; no ordering dependency.
 */
import { test, expect } from '../../fixtures'
import { CamelPage } from '../../pages/camel-page'

const ALL_COLUMNS = ['ID', 'Count', 'Last', 'Delta', 'Mean', 'Min', 'Max', 'Total', 'Self']
const NUMERIC_COLUMNS = ['Count', 'Last', 'Delta', 'Mean', 'Min', 'Max', 'Total', 'Self']
const EXPECTED_IDS = ['setBody2', 'subject1Route']

test.describe('Route Profile (Statistics)', () => {
  let camel: CamelPage

  test.beforeEach(async ({ page, statsFixture }) => {
    camel = new CamelPage(page)
    await camel.goto()
    await camel.selectRoute(statsFixture.routeId)

    try {
      await camel.openProfileTab()
    } catch (error: any) {
      if (error.message?.includes('TAB_NOT_AVAILABLE')) {
        test.skip(true, 'Profile tab not available in this Hawtio version')
      }
      throw error
    }
  })

  // ── Column presence ─────────────────────────────────────────────────────────

  for (const col of ALL_COLUMNS) {
    test(`Profile column "${col}" is not empty`, async () => {
      const header = camel.profileTable.getByRole('columnheader', { name: col })
      await expect(header).toBeVisible()

      // Every data row should have a non-empty cell for this column
      const rows = await camel.profileTable.getByRole('row').all()
      for (const row of rows.slice(1)) {
        // skip header row
        const cells = await row.getByRole('gridcell').all()
        const headers = await camel.profileTable.getByRole('columnheader').all()
        const idx = headers.findIndex(async h => (await h.textContent())?.trim() === col)
        if (idx >= 0 && idx < cells.length) {
          const text = await cells[idx].textContent()
          expect(text?.trim().length).toBeGreaterThan(0)
        }
      }
    })
  }

  // ── Numeric column validation ───────────────────────────────────────────────

  for (const col of NUMERIC_COLUMNS) {
    test(`Profile column "${col}" contains integer values`, async () => {
      const rows = await camel.profileTable.getByRole('row').all()
      const headerCells = await camel.profileTable.getByRole('columnheader').all()
      let colIndex = -1
      for (let i = 0; i < headerCells.length; i++) {
        if ((await headerCells[i].textContent())?.trim() === col) {
          colIndex = i
          break
        }
      }
      expect(colIndex).toBeGreaterThanOrEqual(0)

      for (const row of rows.slice(1)) {
        const cells = await row.getByRole('gridcell').all()
        const value = (await cells[colIndex]?.textContent())?.trim() ?? ''
        // Allow negative integers (e.g., -1 for Delta column)
        expect(value).toMatch(/^-?\d+$/)
      }
    })
  }

  // ── Specific route IDs ──────────────────────────────────────────────────────

  test(`Profile table contains row with ID "setBody2"`, async ({ statsFixture }) => {
    // Note: this ID is from the original Camel application route definitions.
    // The fixture route uses a generated ID, so this test targets the static
    // application routes present in the running Hawtio instance.
    const row = camel.profileTable.getByRole('row', { name: 'setBody2' })
    await expect(row).toBeVisible()
  })

  // Test for simple route - should exist in the sample application
  test(`Profile table contains row with ID "simple"`, async ({ statsFixture }) => {
    const row = camel.profileTable.getByRole('row', { name: 'simple' })
    await expect(row).toBeVisible()
  })
})
