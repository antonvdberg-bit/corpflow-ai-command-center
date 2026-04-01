Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-FactoryMasterToken {
  $t = $env:MASTER_ADMIN_KEY
  if ([string]::IsNullOrWhiteSpace($t)) { $t = $env:ADMIN_PIN }
  if ([string]::IsNullOrWhiteSpace($t)) { return $null }
  return $t.Trim()
}

function Get-BaseUrl {
  $u = $env:CORPFLOW_PROD_BASE_URL
  if ([string]::IsNullOrWhiteSpace($u)) { $u = "https://corpflowai.com" }
  $u = $u.Trim()
  if ($u.EndsWith("/")) { $u = $u.Substring(0, $u.Length - 1) }
  return $u
}

function Invoke-JsonPost {
  param(
    [Parameter(Mandatory=$true)][string]$Url,
    [Parameter(Mandatory=$true)][hashtable]$Headers,
    [Parameter(Mandatory=$true)]$BodyObject
  )
  $bodyJson = ($BodyObject | ConvertTo-Json -Depth 20)
  return Invoke-RestMethod -Method Post -Uri $Url -Headers $Headers -Body $bodyJson -ContentType "application/json"
}

$token = Get-FactoryMasterToken
if (-not $token) {
  Write-Error "Missing factory master token. Set MASTER_ADMIN_KEY (preferred) or ADMIN_PIN in your environment, then re-run."
  exit 2
}

$base = Get-BaseUrl
$headers = @{
  "Content-Type" = "application/json"
  "x-session-token" = $token
}

Write-Host "CorpFlow demo tenant onboarding"
Write-Host "Base URL: $base"
Write-Host "Auth: MASTER_ADMIN_KEY/ADMIN_PIN from environment (not printed)"
Write-Host ""

Write-Host "1) Ensuring Postgres schema..."
$schema = Invoke-JsonPost -Url "$base/api/factory/postgres/ensure-schema" -Headers $headers -BodyObject @{}
Write-Host "   ok: $($schema.ok)"
if ($schema.ok -ne $true) {
  Write-Error ("ensure-schema failed: " + ($schema | ConvertTo-Json -Depth 10))
  exit 1
}

$tenants = @(
  @{ tenant_id = "legal-demo";       slug = "legal-demo";       name = "Legal Demo";       fqdn = "legal.corpflowai.com";      host = "legal.corpflowai.com" },
  @{ tenant_id = "medical-demo";     slug = "medical-demo";     name = "Medical Demo";     fqdn = "medical.corpflowai.com";    host = "medical.corpflowai.com" },
  @{ tenant_id = "luxe-maurice";     slug = "luxe-maurice";     name = "Luxe Maurice";     fqdn = "luxe.corpflowai.com";       host = "luxe.corpflowai.com" },
  @{ tenant_id = "compliance-demo";  slug = "compliance-demo";  name = "Compliance Demo";  fqdn = "compliance.corpflowai.com"; host = "compliance.corpflowai.com" }
)

Write-Host ""
Write-Host "2) Onboarding tenants + hostname mappings..."

foreach ($t in $tenants) {
  $tid = [string]$t.tenant_id
  $host = [string]$t.host
  Write-Host ""
  Write-Host " - Tenant: $tid"
  Write-Host "   Host:   $host"

  $onboard = Invoke-JsonPost -Url "$base/api/cmp/router?action=tenant-onboard" -Headers $headers -BodyObject @{
    tenant_id = $t.tenant_id
    slug      = $t.slug
    name      = $t.name
    fqdn      = $t.fqdn
  }
  if ($onboard.ok -ne $true) {
    Write-Error ("tenant-onboard failed for " + $tid + ": " + ($onboard | ConvertTo-Json -Depth 10))
    exit 1
  }

  $map = Invoke-JsonPost -Url "$base/api/cmp/router?action=tenant-hostname-upsert" -Headers $headers -BodyObject @{
    tenant_id = $t.tenant_id
    host      = $host
    mode      = "tenant"
    enabled   = $true
  }
  if ($map.ok -ne $true) {
    Write-Error ("tenant-hostname-upsert failed for " + $tid + ": " + ($map | ConvertTo-Json -Depth 10))
    exit 1
  }

  Write-Host "   onboard: ok"
  Write-Host "   mapping: ok"
}

Write-Host ""
Write-Host "Done."
Write-Host "Next: open each demo site hostname and verify /change shows only that tenant's tickets."

