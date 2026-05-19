import { test as base, _electron as electron, type ElectronApplication, type Page } from '@playwright/test'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

// Per-test fixtures:
//   - `app`        : a freshly launched Electron instance with isolated HOME
//   - `firstWindow`: the main BrowserWindow's Page
//   - `workspace`  : a temp dir prefilled with a handful of files for nav tests
//
// Each test gets its own HOME so renames/deletes/tags don't bleed across
// runs and don't touch the developer's real ~/.Trash, ~/.config, etc.
type Fixtures = {
  app: ElectronApplication
  firstWindow: Page
  workspace: string
}

const projectRoot = resolve(__dirname, '..')
const mainEntry = join(projectRoot, 'out', 'main', 'index.js')

export const test = base.extend<Fixtures>({
  app: async ({}, use) => {
    const homeDir = mkdtempSync(join(tmpdir(), 'novafinder-home-'))
    mkdirSync(join(homeDir, '.Trash'), { recursive: true })
    // Strip ELECTRON_RUN_AS_NODE if it leaked in from the developer's
    // shell — when set, the Electron binary behaves like plain Node and
    // rejects Chromium flags (Playwright relies on --remote-debugging-port).
    const cleanEnv: NodeJS.ProcessEnv = { ...process.env, HOME: homeDir }
    delete cleanEnv.ELECTRON_RUN_AS_NODE
    const app = await electron.launch({
      args: [mainEntry],
      cwd: projectRoot,
      env: cleanEnv,
      timeout: 60_000,
    })
    // Log renderer/main errors during tests so failures aren't opaque
    app.on('console', (msg) => {
      if (msg.type() === 'error') console.error('[electron-console]', msg.text())
    })
    app.process().stderr?.on('data', (b) => process.stderr.write(`[electron-stderr] ${b}`))
    await use(app)
    await app.close().catch(() => {})
    rmSync(homeDir, { recursive: true, force: true })
  },

  firstWindow: async ({ app }, use) => {
    const win = await app.firstWindow()
    await win.waitForLoadState('domcontentloaded')
    await use(win)
  },

  workspace: async ({}, use) => {
    const dir = mkdtempSync(join(tmpdir(), 'novafinder-ws-'))
    writeFileSync(join(dir, 'alpha.txt'), 'alpha contents')
    writeFileSync(join(dir, 'beta.txt'), 'beta contents')
    writeFileSync(join(dir, 'gamma.md'), '# gamma')
    mkdirSync(join(dir, 'subdir'))
    writeFileSync(join(dir, 'subdir', 'nested.txt'), 'nested')
    await use(dir)
    rmSync(dir, { recursive: true, force: true })
  },
})

export { expect } from '@playwright/test'
