# Installs the Gradianto Nature Green theme into an Obsidian vault.
#
# Usage:
#   .\install.ps1                          # install into the vault Obsidian has open
#   .\install.ps1 -VaultPath "D:\Notes"    # install into a specific vault
#   .\install.ps1 -SetTheme                # also select the theme in appearance.json
param(
  [string]$VaultPath,
  [switch]$SetTheme
)

$ErrorActionPreference = "Stop"
$themeName = "Gradianto Nature Green"
$source = $PSScriptRoot

if (-not (Test-Path (Join-Path $source "theme.css"))) {
  throw "theme.css is missing. Run 'node scripts/build.js' first."
}

if (-not $VaultPath) {
  $config = Join-Path $env:APPDATA "obsidian\obsidian.json"
  if (Test-Path $config) {
    $json = Get-Content $config -Raw -Encoding UTF8 | ConvertFrom-Json
    $open = $json.vaults.PSObject.Properties.Value |
      Where-Object { $_.open } |
      Select-Object -First 1
    if ($open) { $VaultPath = $open.path }
  }
}

if (-not $VaultPath) {
  throw "No open vault found. Pass -VaultPath 'C:\path\to\vault'."
}

$obsidianDir = Join-Path $VaultPath ".obsidian"
if (-not (Test-Path $obsidianDir)) {
  throw "Not an Obsidian vault (no .obsidian folder): $VaultPath"
}

$target = Join-Path $obsidianDir "themes\$themeName"
New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item (Join-Path $source "theme.css") (Join-Path $target "theme.css") -Force
Copy-Item (Join-Path $source "manifest.json") (Join-Path $target "manifest.json") -Force

Write-Host "Installed: $target"

if ($SetTheme) {
  $appearancePath = Join-Path $obsidianDir "appearance.json"
  $appearance = if (Test-Path $appearancePath) {
    Get-Content $appearancePath -Raw -Encoding UTF8 | ConvertFrom-Json
  } else {
    [pscustomobject]@{}
  }

  if ($appearance.PSObject.Properties.Name -contains "cssTheme") {
    $appearance.cssTheme = $themeName
  } else {
    $appearance | Add-Member -NotePropertyName cssTheme -NotePropertyValue $themeName
  }

  $json = $appearance | ConvertTo-Json -Depth 20
  [System.IO.File]::WriteAllText($appearancePath, $json, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Selected in appearance.json: $themeName"
  Write-Host "If Obsidian is running, pick the theme in Settings -> Appearance instead (it rewrites this file on exit)."
} else {
  Write-Host "Select it in Obsidian: Settings -> Appearance -> Themes -> $themeName"
}
