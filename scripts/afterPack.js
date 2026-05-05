// electron-builder afterPack hook: strip non-English locales from the bundled
// Electron framework to shrink the .app and .dmg. macOS .lproj folders.
// Each locale ~200KB; ~50 locales removed → ~10MB saved.
const fs = require('fs')
const path = require('path')

const KEEP = new Set(['en.lproj', 'en_GB.lproj', 'Base.lproj'])

function rmLocales(dir) {
  if (!fs.existsSync(dir)) return 0
  let removed = 0
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.lproj')) continue
    if (KEEP.has(name)) continue
    fs.rmSync(path.join(dir, name), { recursive: true, force: true })
    removed++
  }
  return removed
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return
  const appOutDir = context.appOutDir
  const appName = context.packager.appInfo.productFilename
  const appPath = path.join(appOutDir, `${appName}.app`)
  const fwBase = path.join(appPath, 'Contents/Frameworks/Electron Framework.framework')

  // Electron Framework: Resources/<locale>.lproj
  const fwResources = path.join(fwBase, 'Versions/A/Resources')
  const fwRemoved = rmLocales(fwResources)

  // App bundle: Contents/Resources/<locale>.lproj
  const appResources = path.join(appPath, 'Contents/Resources')
  const appRemoved = rmLocales(appResources)

  console.log(`[afterPack] removed ${fwRemoved} framework locales, ${appRemoved} app locales`)
}
