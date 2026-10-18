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
    # Windows command lines cannot hold a full userscript; send UTF-8 via stdin.
    $OutputEncoding = [Text.UTF8Encoding]::new($false)
    Get-Content -LiteralPath $ScriptPath -Raw -Encoding UTF8 |
        & agent-browser --session bili-favs-dev --profile $projectProfile --executable-path $chromeExecutable --headed eval --stdin
    exit $LASTEXITCODE
}
if (-not $BrowserArgs -or $BrowserArgs.Count -eq 0) {
    $BrowserArgs = @('tab')
}
& agent-browser --session bili-favs-dev --profile $projectProfile --executable-path $chromeExecutable --headed @BrowserArgs
exit $LASTEXITCODE
