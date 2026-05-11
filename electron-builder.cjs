/**
 * electron-builder config for macOS CI publish.
 * Usage: pnpm exec electron-builder --mac --publish always --config electron-builder.cjs
 *
 * Publish target : Cloudflare R2 (S3-compatible)
 * Env vars required:
 *   AWS_ACCESS_KEY_ID        (= R2_RELEASES_ACCESS_KEY_ID)
 *   AWS_SECRET_ACCESS_KEY    (= R2_RELEASES_SECRET_ACCESS_KEY)
 *   R2_RELEASES_ACCOUNT_ID
 *   R2_RELEASES_BUCKET
 */

module.exports = {
  appId: 'com.novafinder.app',
  productName: 'NovaFinder',
  compression: 'maximum',
  asar: true,
  removePackageScripts: true,
  afterPack: 'scripts/afterPack.js',
  afterSign: 'scripts/notarize.cjs',

  mac: {
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] },
      { target: 'zip', arch: ['x64', 'arm64'] },
    ],
    artifactName: '${productName}-${version}-mac-${arch}.${ext}',
    category: 'public.app-category.utilities',
    icon: 'assets/icon.icns',
    minimumSystemVersion: '11.0',
    hardenedRuntime: true, // required for Apple notarization
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
  },

  dmg: {
    writeUpdateInfo: false,
  },

  files: [
    'out/**/*',
    '!**/{.DS_Store,.idea,.vscode,*.md,*.map,*.test.*,__tests__,test,tests,coverage}',
    '!**/node_modules/*/{LICENSE*,README*,CHANGELOG*,HISTORY*,readme*,history*}',
    '!**/node_modules/*/*.{md,markdown,d.ts.map}',
    '!**/node_modules/.bin',
    '!**/node_modules/**/{*.flow,*.ts,tsconfig.json}',
  ],

  extraResources: [
    { from: 'assets/icon.png', to: 'icon.png' },
  ],

  publish: {
    provider: 's3',
    bucket: process.env.R2_RELEASES_BUCKET,
    endpoint: `https://${process.env.R2_RELEASES_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    region: 'auto',
    acl: null, // R2 does not support ACLs
  },
}
