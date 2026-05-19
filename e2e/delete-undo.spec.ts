import { test, expect } from './fixtures'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

// End-to-end coverage focuses on the wiring: keyboard → IPC → UI refresh →
// history record. The actual trash-and-restore round trip is fully covered
// by unit tests in src/tests/store/historyStore.test.ts (the macOS Trash
// API is per-volume and doesn't honor a redirected HOME, so an e2e
// restore round trip would be flaky to assert against).
test('⌘⌫ removes the file from disk, the list, and records a trash op', async ({ firstWindow, workspace }) => {
  await firstWindow.evaluate((p: string) => {
    ;(window as unknown as { __novaTest: { navigateTo: (id: 'left' | 'right', p: string) => void } })
      .__novaTest.navigateTo('left', p)
  }, workspace)

  const target = firstWindow.locator('[data-path$="/alpha.txt"]')
  await expect(target).toBeVisible({ timeout: 5000 })
  await target.click()

  const selected = await firstWindow.evaluate(() =>
    (window as unknown as { __novaTest: { getPane: (id: 'left') => { selection: string[] } } })
      .__novaTest.getPane('left').selection,
  )
  expect(selected).toHaveLength(1)
  expect(selected[0]).toMatch(/alpha\.txt$/)

  await firstWindow.keyboard.press('Meta+Backspace')

  // Row vanishes from the UI
  await expect(target).toHaveCount(0, { timeout: 5000 })
  // …and the underlying file is gone
  expect(existsSync(join(workspace, 'alpha.txt'))).toBe(false)

  // History records a trash op pointing at the original src
  const past = await firstWindow.evaluate(() =>
    (window as unknown as {
      __novaTest: { getHistory: () => { past: { kind: string; pairs?: { src: string }[] }[] } }
    }).__novaTest.getHistory().past,
  )
  const last = past[past.length - 1]
  expect(last.kind).toBe('trash')
  expect(last.pairs?.[0]?.src).toMatch(/alpha\.txt$/)
})
