// Orca Plus: upstream's packaging config under another app name, for Apple silicon only.
const base = require('../config/electron-builder.config.cjs')

const [owner, repo] = (process.env.ORCA_PLUS_RELEASE_REPO ?? 'nasonov-coder/orca').split('/')
const hasSigningIdentity =
  process.env.ORCA_MAC_RELEASE === '1' || Boolean(process.env.CSC_LINK || process.env.CSC_NAME)

const ARTIFACT_NAME = 'orca-plus-${arch}.${ext}'

module.exports = {
  ...base,
  productName: 'Orca Plus',
  // `orca://` links stay with the official app.
  protocols: [],
  // The package name is the data folder name: ~/Library/Application Support/orca-plus.
  extraMetadata: { ...base.extraMetadata, name: 'orca-plus' },
  files: [...base.files, '!plus{,/**/*}'],
  // One name without spaces for both: GitHub renames an asset with a space, the update manifest does not.
  dmg: { ...base.dmg, artifactName: ARTIFACT_NAME },
  mac: {
    ...base.mac,
    artifactName: ARTIFACT_NAME,
    target: ['dmg', 'zip'].map((target) => ({ target, arch: ['arm64'] })),
    ...(hasSigningIdentity ? {} : { identity: '-' })
  },
  publish: { provider: 'github', owner, repo, releaseType: 'release' }
}
