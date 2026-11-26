#!/usr/bin/env node
// Orca Plus: rewrites the upstream app identity in the working tree right before a build.
// Run it on a throwaway checkout; its output is never committed.
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const UPSTREAM_APP_ID = 'com.stablyai.orca'
const UPSTREAM_TEAM_ID = '6CX3WHS9HZ'
const UPSTREAM_REPO = 'stablyai/orca'
const APP_ID = process.env.ORCA_PLUS_APP_ID ?? 'com.nasonovcoder.orcaplus'
const TEAM_ID = process.env.ORCA_PLUS_MAC_TEAM_ID || null
const RELEASE_REPO = process.env.ORCA_PLUS_RELEASE_REPO ?? 'nasonov-coder/orca'
const PRODUCT_NAME = 'Orca Plus'
const DATA_DIR = 'orca-plus'

const TEXT = /\.(ts|tsx|js|cjs|mjs|json|swift|plist|sh|yml|yaml|m|mm|h|c|cc|cpp|rs|toml|entitlements|rb)$/
const CLI_LAUNCHER = 'resources/darwin/bin/orca'
const EXTENSIONLESS = new Set([CLI_LAUNCHER])

// Files whose fallback data folder is a literal 'orca' path segment.
const DATA_DIR_FILES = [
  'src/cli/runtime/profile/metadata.ts',
  'src/main/codex/configuration/homes/codex-home-paths.ts',
  'src/shared/remote-runtime/serve-supervisor/serve-bundle-coordination.ts'
]
// The updater reads releases from here; left alone it would offer upstream's builds.
const UPDATER_DIRS = ['src/main/updater/', 'src/shared/updater/']

const escapeSlashes = (value) => value.replaceAll('/', '\\/')
const isUpdaterSource = (file) =>
  UPDATER_DIRS.some((dir) => file.startsWith(dir)) && !/\.test\.tsx?$/.test(file)

function rewrite(file, change) {
  const before = readFileSync(file, 'utf8')
  const after = change(before)
  if (after !== before) {
    writeFileSync(file, after)
  }
  return after !== before
}

const renameIdentity = (text) => {
  const renamed = text.split(UPSTREAM_APP_ID).join(APP_ID)
  return TEAM_ID ? renamed.split(UPSTREAM_TEAM_ID).join(TEAM_ID) : renamed
}

const pointUpdaterAtFork = (text) =>
  text
    .split(`${UPSTREAM_REPO}/releases`)
    .join(`${RELEASE_REPO}/releases`)
    .split(`${escapeSlashes(UPSTREAM_REPO)}\\/releases`)
    .join(`${escapeSlashes(RELEASE_REPO)}\\/releases`)
    .split(`MAIN_RELEASE_REPO = '${UPSTREAM_REPO}'`)
    .join(`MAIN_RELEASE_REPO = '${RELEASE_REPO}'`)

const files = execFileSync('git', ['ls-files', '-z', 'src', 'config', 'native', 'resources'], {
  encoding: 'utf8',
  maxBuffer: 1 << 28
})
  .split('\0')
  .filter((file) => file && (TEXT.test(file) || EXTENSIONLESS.has(file)))

let idFiles = 0
let updaterFiles = 0
for (const file of files) {
  if (rewrite(file, renameIdentity)) {
    idFiles++
  }
  if (isUpdaterSource(file) && rewrite(file, pointUpdaterAtFork)) {
    updaterFiles++
  }
}
if (idFiles === 0) {
  throw new Error(`No file mentions ${UPSTREAM_APP_ID}: upstream moved its app id, update rebrand.mjs`)
}
if (updaterFiles === 0) {
  throw new Error(`The updater no longer names ${UPSTREAM_REPO}/releases: update rebrand.mjs`)
}
const stillUpstream = files.filter(
  (file) =>
    isUpdaterSource(file) && /stablyai[\\/]+orca[\\/]+releases/.test(readFileSync(file, 'utf8'))
)
if (stillUpstream.length > 0) {
  throw new Error(`The updater still points at upstream releases: ${stillUpstream.join(', ')}`)
}

for (const file of DATA_DIR_FILES) {
  if (!rewrite(file, (text) => text.replace(/(['"])orca\1(\s*\))/g, `$1${DATA_DIR}$1$2`))) {
    throw new Error(`${file} no longer names the 'orca' data folder: update rebrand.mjs`)
  }
}

// The `orca` shell command starts the app by its executable name.
if (!rewrite(CLI_LAUNCHER, (text) => text.split('/MacOS/Orca"').join(`/MacOS/${PRODUCT_NAME}"`))) {
  throw new Error(`${CLI_LAUNCHER} no longer starts Contents/MacOS/Orca: update rebrand.mjs`)
}

console.log(
  `[rebrand] ${APP_ID} in ${idFiles} files; updater reads ${RELEASE_REPO} (${updaterFiles} files); ` +
    `data folder ${DATA_DIR}; team ${TEAM_ID ?? 'unchanged'}`
)
