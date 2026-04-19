$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$bundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$systemNode = Get-Command node -ErrorAction SilentlyContinue

if (Test-Path $bundledNode) {
  $nodeExe = $bundledNode
} elseif ($systemNode) {
  $nodeExe = $systemNode.Source
} else {
  throw "Node.js was not found. Install Node or use the bundled Codex runtime."
}

Push-Location $scriptDir
try {
  & $nodeExe ".\server.mjs"
} finally {
  Pop-Location
}
