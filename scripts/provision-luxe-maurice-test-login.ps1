#Requires -Version 5.1
<#
.SYNOPSIS
  Creates/updates Luxe Mauritius tenant login (PIN-less): email + generated password in production Postgres.

.DESCRIPTION
  1. Set POSTGRES_URL to the SAME string as Vercel (Settings → Environment Variables → POSTGRES_URL).
  2. Run this script from the repo root (or anywhere — it cds to repo root).
  3. Enter the staff email when prompted (or set CORPFLOW_TEST_EMAIL first to skip the prompt).
  4. Copy the printed password once into your password manager, then use it on https://lux.corpflowai.com/login

.EXAMPLE
  $env:POSTGRES_URL = "<paste from Vercel — do not commit this>"
  .\scripts\provision-luxe-maurice-test-login.ps1

.EXAMPLE
  $env:POSTGRES_URL = "<paste>"
  $env:CORPFLOW_TEST_EMAIL = "jan@example.com"
  .\scripts\provision-luxe-maurice-test-login.ps1
#>
param(
  [Parameter(Mandatory = $false)]
  [string] $Email = $env:CORPFLOW_TEST_EMAIL
)

$ErrorActionPreference = 'Stop'

if (-not $env:POSTGRES_URL -or [string]::IsNullOrWhiteSpace($env:POSTGRES_URL)) {
  Write-Host ''
  Write-Host 'ERROR: POSTGRES_URL is not set in this PowerShell session.' -ForegroundColor Red
  Write-Host 'Copy the value from Vercel → your project → Settings → Environment Variables → POSTGRES_URL, then run:' -ForegroundColor Yellow
  Write-Host '  $env:POSTGRES_URL = "postgresql://..."' -ForegroundColor Cyan
  Write-Host '  .\scripts\provision-luxe-maurice-test-login.ps1' -ForegroundColor Cyan
  Write-Host ''
  exit 1
}

# Prisma requires a URL whose first token is postgresql:// or postgres:// (trim / strip stray quotes).
$pg = $env:POSTGRES_URL.Trim()
while (
  ($pg.StartsWith('"') -and $pg.EndsWith('"')) -or
  ($pg.StartsWith("'") -and $pg.EndsWith("'"))
) {
  $pg = $pg.Substring(1, $pg.Length - 2).Trim()
}
if ($pg.StartsWith('prisma+postgres://', [System.StringComparison]::OrdinalIgnoreCase)) {
  $pg = 'postgresql://' + $pg.Substring('prisma+postgres://'.Length)
}
$env:POSTGRES_URL = $pg
if (-not ($pg.StartsWith('postgresql://') -or $pg.StartsWith('postgres://'))) {
  Write-Host ''
  Write-Host 'ERROR: POSTGRES_URL must start with postgresql:// or postgres://' -ForegroundColor Red
  Write-Host 'First 64 chars (check for typos or wrong variable):' -ForegroundColor Yellow
  $preview = if ($pg.Length -gt 64) { $pg.Substring(0, 64) + '…' } else { $pg }
  Write-Host "  $preview"
  Write-Host 'Copy the full connection string from Vercel (Env or Postgres integration), not a host name alone.' -ForegroundColor Yellow
  if ($env:DATABASE_URL -and ($env:DATABASE_URL.Trim().StartsWith('postgresql://') -or $env:DATABASE_URL.Trim().StartsWith('postgres://'))) {
    Write-Host 'Tip: DATABASE_URL looks valid — try: $env:POSTGRES_URL = $env:DATABASE_URL' -ForegroundColor Cyan
  }
  Write-Host ''
  exit 1
}

if ([string]::IsNullOrWhiteSpace($Email)) {
  $Email = Read-Host 'Email for tenant login (e.g. jan@luxemaurice.com)'
}

$Email = $Email.Trim().ToLowerInvariant()
if ([string]::IsNullOrWhiteSpace($Email)) {
  Write-Host 'ERROR: Email is required.' -ForegroundColor Red
  exit 1
}

$TenantId = 'luxe-maurice'
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $RepoRoot

Write-Host ''
Write-Host "Tenant: $TenantId" -ForegroundColor Green
Write-Host "Email:  $Email" -ForegroundColor Green
Write-Host ''

& node scripts/provision-tenant-test-access.mjs --tenant=$TenantId --username=$Email --gen-password
$exit = $LASTEXITCODE
if ($exit -ne 0) { exit $exit }

Write-Host ''
Write-Host 'Next: open https://lux.corpflowai.com/login and sign in with that email and the password printed above.' -ForegroundColor Cyan
Write-Host ''
