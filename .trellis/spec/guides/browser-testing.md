# Dedicated browser and local injection

## Decision and current setup

On 2026-10-18 the user requested a persistent independent Chrome profile and logged into Bilibili there. They explicitly requested developer-console style injection of local JS and no Greasy Fork changes during development.

- Browser: installed Google Chrome, separate from the user's default profile.
- Agent-browser session: `bili-favs-dev`.
- Local profile: `%USERPROFILE%\.agent-browser\profiles\bilibili-favs-manage` (outside this repository).
- Executable: `%ProgramFiles%\Google\Chrome\Application\chrome.exe`.
- Entry point: `& ./.trellis/scripts/browser.ps1 -BrowserArgs @('open', 'https://www.bilibili.com/')`.

The helper passes the same session, profile, executable, and headed-mode flags on every invocation. Do not mix this session with `--auto-connect`, `--cdp`, or `--profile Default`; do not start another session against the same profile directory. Do not copy the default Chrome profile or export cookies into Git. Persistence removes the repeated default-browser connection prompt; a website can still expire its login and require reauthentication.

## Normal commands

```powershell
& ./.trellis/scripts/browser.ps1 -BrowserArgs @('tab')
& ./.trellis/scripts/browser.ps1 -BrowserArgs @('snapshot', '-i')
& ./.trellis/scripts/browser.ps1 -BrowserArgs @('open', 'https://space.bilibili.com/3353026/favlist?fid=902279226&ftype=create')
```

Pass arguments explicitly with `-BrowserArgs @(...)`; a bare `-b` can be interpreted by PowerShell as an abbreviation of the parameter name. Read the agent-browser skill before automation. Inspect tabs first; preserve the page while the user is logging in. Avoid whole-page snapshots of private favorites when an aggregate DOM check suffices.

## Inject a development build

Run `npm run build` in the repository. On a loaded Bilibili space/favorites page, read the generated IIFE and execute it through the browser's JavaScript evaluation interface (equivalent to pasting it into DevTools):

```powershell
& ./.trellis/scripts/browser.ps1 -ScriptPath './dist/BilibiliFavsManage.user.js'
```

`-ScriptPath` pipes UTF-8 through `eval --stdin`, avoiding Windows command-line length limits for the full build. For short aggregate checks, `-BrowserArgs @('eval', '-b', $checkBase64)` is supported. Before injection, check whether pending cross-page state exists without printing its contents; do not inject into an unexpected pending operation.

`src/main.js` owns lifecycle cleanup; check for an existing installation/lifecycle before reinjection, and refresh before a fresh test if needed. Console injection runs in the page realm and has no GM APIs; `StateManager` uses localStorage. This validates page behavior but does not replace Tampermonkey sandbox testing. A full navigation loses injected code; re-inject on each destination when testing cross-page flow. Do not claim that one-page console injection verifies automatic navigation recovery.

Keep the private browser open for ongoing testing. When finished using it, close only this named session cleanly with the helper's `close` command to flush profile state. Never close the user's default Chrome. If startup fails, run `agent-browser doctor --offline --quick`, check the profile lock, and resolve the named session; do not delete the profile or repeatedly create replacements.

## Test scope

- Use `examples/panel-preview.html` and jsdom fixtures for reproducible UI and batch tests, including failure/interruption paths.
- On the real account, check startup, navigation, rendering, and read-only information. Do not click batch copy, delete, or unsubscribe unless the user explicitly designates test objects and authorizes that operation.
- Screenshots for README use fictional data. Store any required private evidence outside Git, and record only sanitized aggregate results in tasks.
- Never dump cookies, localStorage, authorization headers, Webhook secrets, or account contents into logs or task files.
