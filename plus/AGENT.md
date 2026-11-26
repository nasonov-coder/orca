# Orca Plus patch: what it must keep doing

Orca Plus is upstream Orca (`stablyai/orca`) at a release tag, plus one feature patch in
`plus/patches/`. This file is for the agent that repairs the patch when it stops applying to a
new upstream release.

## The feature

The agent launch menu (the `+` menu of the tab bar) gets one extra row per saved Claude account
other than the selected one: `Claude · <email>`. The row opens a Claude terminal on that account.
The selected account does not change, and other panes keep their account.

## How it works

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
   `ORCA_CLAUDE_INJECTED_CONFIG_DIR`. Without that marker the `claude` shell function keeps the
   pane's own folder over the selected account.

`claude-profile-router-pinned.test.ts` covers step 4.

## Rules for a repair

- Keep the behaviour above. Change as few upstream lines as you can: every changed upstream line
  is a future conflict.
- Upstream lints file length (300 counted lines) and runs Prettier. `claude-profile-router.ts` is
  near the limit, so keep the change there to a few lines.
- If upstream ships the same feature itself, or removes a mechanism the patch depends on (the
  `choices` prop of the picker menu, the pointer file and the `claude` shell function, the
  startup env of a new tab), do not invent a replacement. Stop and say so in your final message.
- Edit only files under `src/`. Do not touch `plus/`, `.plus/`, workflows or lockfiles.
- Before you finish, `pnpm run typecheck` and
  `pnpm exec vitest run src/main/claude-accounts/profiles/routing/claude-profile-router-pinned.test.ts`
  must pass. The workflow runs both again and discards your work if either fails.
