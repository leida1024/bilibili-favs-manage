param(
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [string[]] $BrowserArgs,
    [string] $ScriptPath
)

$ErrorActionPreference = 'Stop'
$projectProfile = Join-Path $env:USERPROFILE '.agent-browser\profiles\bilibili-favs-manage'
$chromeExecutable = Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'
if (-not (Test-Path -LiteralPath $chromeExecutable)) {
    throw "Chrome executable not found: $chromeExecutable"
}
if ($ScriptPath) {
    if ($BrowserArgs) { throw 'Use either -ScriptPath or -BrowserArgs.' }
    # The npm PowerShell shim does not forward pipeline stdin to its native child.
    # Resolve that installed binary explicitly so multiline scripts are executed.
    $browserCommand = Get-Command agent-browser -ErrorAction Stop
    $browserBinary = Join-Path (Split-Path $browserCommand.Source -Parent) 'node_modules\agent-browser\bin\agent-browser-win32-x64.exe'
    if (-not (Test-Path -LiteralPath $browserBinary)) {
        throw "Native agent-browser binary not found: $browserBinary"
    }
    # Windows command lines cannot hold a full userscript; send UTF-8 via stdin.
    $OutputEncoding = [Text.UTF8Encoding]::new($false)
    Get-Content -LiteralPath $ScriptPath -Raw -Encoding UTF8 |
        & $browserBinary --session bili-favs-dev --profile $projectProfile --executable-path $chromeExecutable --headed eval --stdin
    exit $LASTEXITCODE
}
if (-not $BrowserArgs -or $BrowserArgs.Count -eq 0) {
    $BrowserArgs = @('tab')
}
& agent-browser --session bili-favs-dev --profile $projectProfile --executable-path $chromeExecutable --headed @BrowserArgs
exit $LASTEXITCODE
