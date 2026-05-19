import { test, expect } from './fixtures'

test('app launches with main UI rendered', async ({ firstWindow }) => {
  // Title is set in BrowserWindow options or defaults to package productName
  await expect(firstWindow).toHaveTitle(/NovaFinder|Nova/i)

  // Sidebar is part of every session — Favorites group is always present
  const sidebar = firstWindow.locator('aside, [class*="sidebar"]').first()
  await expect(sidebar).toBeVisible()

  // File list area should mount
  const fileList = firstWindow.locator('[class*="overflow-y-auto"]').first()
  await expect(fileList).toBeVisible()

  // Test bridge is wired
  const hasBridge = await firstWindow.evaluate(() => '__novaTest' in window)
  expect(hasBridge).toBe(true)
})
