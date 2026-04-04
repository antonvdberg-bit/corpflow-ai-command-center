# POST ensure-schema (factory master auth).
#
#   $env:MASTER_ADMIN_KEY = "exact-value-from-vercel-production"
#   .\scripts\ensure-postgres-schema.ps1 -BaseUrl "https://corpflowai.com"
#
# The value must match Production: MASTER_ADMIN_KEY or ADMIN_PIN, or the same keys
# inside CORPFLOW_RUNTIME_CONFIG_JSON on Vercel (not Preview-only unless you use a preview URL).

param(
  [Parameter(Mandatory = $false)]
  [string] $BaseUrl = "",

  [Parameter(Mandatory = $false)]
  [string] $MasterKey = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$key = $MasterKey
if ([string]::IsNullOrWhiteSpace($key)) {
  $key = $env:MASTER_ADMIN_KEY
}
if ([string]::IsNullOrWhiteSpace($key)) {
  $key = $env:ADMIN_PIN
}
if ([string]::IsNullOrWhiteSpace($key)) {
  Write-Host "ERROR: Set MASTER_ADMIN_KEY or ADMIN_PIN in the environment, or pass -MasterKey." -ForegroundColor Red
  exit 2
}

$key = $key.Trim()

$base = $BaseUrl
if ([string]::IsNullOrWhiteSpace($base)) {
  $base = $env:CORPFLOW_PROD_BASE_URL
}
if ([string]::IsNullOrWhiteSpace($base)) {
  Write-Host 'ERROR: Pass -BaseUrl "https://corpflowai.com" or set CORPFLOW_PROD_BASE_URL.' -ForegroundColor Red
  exit 2
}

$base = $base.Trim().TrimEnd('/')
$url = "$base/api/factory/postgres/ensure-schema"

function Invoke-EnsureSchema {
  param(
    [hashtable] $Hdr
  )
  return Invoke-RestMethod -Method Post -Uri $url -Headers $Hdr -Body '{}' -ContentType 'application/json'
}

Write-Host "POST $url" -ForegroundColor Cyan

$headersX = @{
  'Content-Type'    = 'application/json'
  'x-session-token' = $key
}
$headersBearer = @{
  'Content-Type'  = 'application/json'
  'Authorization' = "Bearer $key"
}

function Write-403Help {
  Write-Host "" -ForegroundColor Yellow
  Write-Host "403 = server did not accept your token. Fix one of these:" -ForegroundColor Yellow
  Write-Host "  1) Vercel -> Project -> Settings -> Environment Variables -> PRODUCTION" -ForegroundColor White
  Write-Host "     Set MASTER_ADMIN_KEY or ADMIN_PIN to a strong secret. Redeploy if you just added it." -ForegroundColor White
  Write-Host "  2) If you use CORPFLOW_RUNTIME_CONFIG_JSON, that JSON must include MASTER_ADMIN_KEY or ADMIN_PIN." -ForegroundColor White
  Write-Host "  3) The string you paste in PowerShell must match that value exactly (no extra spaces; copy from Vercel)." -ForegroundColor White
  Write-Host "  4) Or log in at $base/login as factory admin; then use the browser flow that calls ensure-schema (admin session)." -ForegroundColor White
  Write-Host ""
}

try {
  $r = $null
  try {
    $r = Invoke-EnsureSchema -Hdr $headersX
  } catch {
    $tryBearer = $false
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      $code = [int]$_.Exception.Response.StatusCode
      if ($code -eq 403) {
        $tryBearer = $true
      }
    }
    if (-not $tryBearer) {
      throw
    }
    Write-Host "x-session-token rejected (403); retrying with Authorization: Bearer ..." -ForegroundColor DarkYellow
    $r = Invoke-EnsureSchema -Hdr $headersBearer
  }

  if ($r.ok -eq $true) {
    Write-Host 'OK: ensure-schema succeeded.' -ForegroundColor Green
    $r | ConvertTo-Json -Depth 6
    exit 0
  }
  Write-Host 'FAILED: response did not have ok=true' -ForegroundColor Red
  $r | ConvertTo-Json -Depth 10
  exit 1
} catch {
  Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.ErrorDetails.Message) {
    Write-Host $_.ErrorDetails.Message
  }
  if ($_.Exception.Response -and $_.Exception.Response.StatusCode -eq [System.Net.HttpStatusCode]::Forbidden) {
    Write-403Help
  }
  exit 1
}
