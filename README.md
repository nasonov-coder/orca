# Orca Plus

A personal, unofficial build of [Orca](https://github.com/stablyai/orca). Not affiliated with or
supported by its authors: report Orca bugs upstream only if they reproduce in the official app.

Each release here is an upstream release tag plus one patch, packaged as a separate app
(`Orca Plus`, its own bundle id and data folder) that installs next to the official one and
updates itself from this repository. Apple silicon only.

## What the patch adds

A `Claude · <email>` row in the agent launch menu for every saved Claude account other than the
selected one. It opens a Claude terminal on that account without switching the selected account.

## Layout

| Path | What it is |
|---|---|
| `plus/patches/` | The feature patch, applied to the upstream release tag |
| `plus/rebrand.mjs` | Renames the app identity, data folder and update source at build time |
| `plus/electron-builder.plus.cjs` | Upstream's packaging config under the Orca Plus name |
| `plus/AGENT.md` | What the patch must keep doing, for the agent that refits it |
| `.github/workflows/plus-release.yml` | Watches upstream releases, builds, signs, notarizes, publishes |

The other branches mirror upstream.
