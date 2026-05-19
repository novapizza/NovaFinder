import { test, expect } from './fixtures'

test('navigates to a folder and lists its files', async ({ firstWindow, workspace }) => {
  await firstWindow.evaluate((p: string) => {
    ;(window as unknown as { __novaTest: { navigateTo: (id: 'left' | 'right', p: string) => void } })
      .__novaTest.navigateTo('left', p)
  }, workspace)

  // Wait for entries to render
  await expect(firstWindow.locator('[data-path]').first()).toBeVisible({ timeout: 5000 })

  // Each file we seeded should appear
  const items = firstWindow.locator('[data-path]')
  await expect(items).toHaveCount(4) // alpha.txt, beta.txt, gamma.md, subdir

  await expect(firstWindow.locator('[data-path$="/alpha.txt"]')).toBeVisible()
  await expect(firstWindow.locator('[data-path$="/beta.txt"]')).toBeVisible()
  await expect(firstWindow.locator('[data-path$="/gamma.md"]')).toBeVisible()
  await expect(firstWindow.locator('[data-path$="/subdir"]')).toBeVisible()
})
