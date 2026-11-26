# Orca Plus: what a new upstream release must not break

Orca Plus is upstream Orca (`stablyai/orca`) at a release tag, plus one feature patch in
`plus/patches/`, built under another app name by `plus/rebrand.mjs` and
`plus/electron-builder.plus.cjs`. The release workflow checks out upstream at the tag, puts this
repository under `.plus/`, applies the patch, runs the rename step, builds, signs and publishes.

This file is for the agent the workflow runs on every new upstream release. Your job is to keep
the two things below working, and to change only what the new release requires. Most releases
need no change, and "nothing to change" is then the right result.

## 1. The feature patch

The agent launch menu (the `+` menu of the tab bar) gets one extra row per saved Claude account
other than the selected one: `Claude · <email>`. The row opens a Claude terminal on that account.
The selected account does not change, and other panes keep their account.

How it works:

1. `CLAUDE_PINNED_ACCOUNT_ENV` (`ORCA_CLAUDE_PINNED_ACCOUNT`) is declared in
   `src/shared/agent-accounts/claude/claude-profile-routing.ts`.
2. Renderer: `useClaudeAccountLaunchChoices` in
   `src/renderer/src/components/agent/launch-menu/claude-account-launch-choices.tsx` builds the
   rows from `settings.claudeManagedAccounts`. `AgentMenuItems.tsx` passes them to the picker menu
   as `choices` and renders them in the plain dropdown branch.
3. A row launches `{ kind: 'cli', agent: 'claude', claudeAccountId }`. `launch-agent-in-new-tab.ts`
   puts the account id into the new tab's startup env under `CLAUDE_PINNED_ACCOUNT_ENV`.
4. Main: `withClaudeProfileTerminalEnv` in `claude-profile-installed-router.ts` reads that env
   value and passes it to `ClaudeProfileRouter.terminalEnv`. For a saved account the router
   returns `CLAUDE_CONFIG_DIR` set to the account's folder and no
   `ORCA_CLAUDE_INJECTED_CONFIG_DIR`. Without that marker the `claude` shell function
   (`src/shared/shell/launch/agents/claude-shell-function.ts`) keeps the pane's own folder over
   the selected account.

`claude-profile-router-pinned.test.ts` covers step 4.

## 2. The rename step

`plus/rebrand.mjs` rewrites the checkout right before the build so that Orca Plus installs next
to the official app and never touches its data:

- bundle id `com.stablyai.orca` → `com.nasonovcoder.orcaplus`, and upstream's Apple team id →
  ours, in every tracked text file under `src`, `config`, `native`, `resources`;
- the fallback data folder literal `'orca'` → `'orca-plus'` in the files it lists;
- the updater's release URLs (`stablyai/orca/releases` under `src/main/updater` and
  `src/shared/updater`) → this repository, so the app updates from here and never offers
  upstream's builds;
- the `orca` shell launcher's executable name.

`plus/electron-builder.plus.cjs` wraps upstream's `config/electron-builder.config.cjs`: product
name `Orca Plus`, package name `orca-plus` (this names the data folder), no `orca://` scheme,
arm64 only, artifacts named `orca-plus-arm64.{dmg,zip}`.

## What to review on a new release

When the workflow gives you a previous release tag, look at what upstream changed since it.
The whole diff is large: start from `git diff --stat <previous> <new>` and read closely only what
touches the areas below.

For the patch:

- the files the patch changes, and the code that calls them;
- how a terminal agent launch gets its environment (`pendingStartup.env`, spawn preflight,
  `withClaudeProfileTerminalEnv`), and how the `claude` shell function picks the config folder:
  a change there can leave the patch applying cleanly and silently doing nothing;
- the agent launch menu and picker (`AgentMenuItems.tsx`, `AgentLaunchPickerMenu.tsx`): a
  reworked menu can drop the extra rows without a conflict;
- upstream shipping its own way to launch on a non-selected account. Then the patch is obsolete.

For the rename step:

- new places that hard-code the bundle id, the team id, the `orca` data folder, the app or
  executable name (`Orca.app`, `Contents/MacOS/Orca`), or `stablyai/orca` release and update URLs
  outside the two updater folders;
- changes in `config/electron-builder.config.cjs`: targets, artifact names, `publish`,
  `protocols`, `extraMetadata`, new environment variables or files a release build now requires;
- changes in upstream's macOS release workflow (`.github/workflows/release-mac-build.yml`) and
  the scripts it calls: a new or changed build step that `.plus/.github/workflows/plus-release.yml`
  should mirror. You cannot edit that workflow; describe the needed change in the report.

## Rules

- Change as few upstream lines as you can: every changed upstream line is a future conflict.
- Upstream lints file length (300 counted lines) and runs Prettier. `claude-profile-router.ts` is
  near the limit, so keep the change there to a few lines.
- Do not add features, refactor, or "improve" upstream code. Do not widen the patch to new launch
  paths unless it is needed to keep the described behaviour.
- If upstream ships the same feature itself, or removes a mechanism the patch depends on (the
  `choices` prop of the picker menu, the pointer file and the `claude` shell function, the
  startup env of a new tab), do not invent a replacement: report `blocked`.
- You may edit: files under `src/` (leave them uncommitted, the workflow turns them into the
  patch), `.plus/plus/rebrand.mjs`, `.plus/plus/electron-builder.plus.cjs`, and this file when it
  no longer matches the code. Nothing else: no workflows, no lockfiles, no upstream config.
- Before you finish, `pnpm run typecheck` and
  `pnpm exec vitest run src/main/claude-accounts/profiles/routing/claude-profile-router-pinned.test.ts`
  must pass. The workflow runs both again, then runs the rename step, and discards your work if
  any of them fails.

## The report

Write `plus-report.md` in the repository root. The workflow shows it in the run summary and in
the release notes, and reads its first line.

```
Verdict: ok | adapted | blocked

## What changed upstream that matters
## What I changed
## Needs a human
```

- `ok`: nothing had to change. `adapted`: you changed the patch or the tooling.
  `blocked`: the release must not be built until a human decides; the workflow then stops.
- Name files and say why, in a few lines. Leave a section out when it is empty.
- "Needs a human" is for what you could not or must not do: a workflow change, an upstream
  feature that makes the patch obsolete, a risk you could not verify.
