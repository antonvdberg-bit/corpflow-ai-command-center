Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Read-PrivateValue {
    param([Parameter(Mandatory = $true)][string]$Prompt)

    $secureValue = Read-Host $Prompt -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    }
}

function Invoke-MatrixRequest {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][hashtable]$Body,
        [Parameter(Mandatory = $true)][string]$HeaderValue,
        [Parameter(Mandatory = $true)][int[]]$ExpectedStatuses
    )

    try {
        $response = Invoke-WebRequest `
            -Uri $script:WebhookUrl `
            -Method Post `
            -Headers @{ "x-corpflow-automation-forward-secret" = $HeaderValue } `
            -ContentType "application/json" `
            -Body ($Body | ConvertTo-Json -Depth 12 -Compress) `
            -UseBasicParsing
        $status = [int]$response.StatusCode
    }
    catch {
        if ($null -ne $_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        }
        else {
            throw
        }
    }

    if ($ExpectedStatuses -notcontains $status) {
        throw "$Name returned HTTP $status; expected $($ExpectedStatuses -join ' or ')."
    }
    Write-Host ("PASS HTTP {0}: {1}" -f $status, $Name)
}

$script:WebhookUrl = Read-PrivateValue "Paste the NEW TEST workflow Production URL"
$secretBytes = New-Object byte[] 32
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $random.GetBytes($secretBytes)
}
finally {
    $random.Dispose()
}
$testSecret = [Convert]::ToBase64String($secretBytes)
$secretBytes = $null
Set-Clipboard -Value $testSecret
Read-Host "A fresh test Header Auth value is copied. Paste it into the n8n test credential, save and publish ONLY the test workflow, then press Enter here" | Out-Null
$runId = [Guid]::NewGuid().ToString("N")
$now = [DateTimeOffset]::UtcNow.ToString("o")

try {
    Write-Host "Running issue #611 test matrix. The old production workflow must remain inactive."

    Invoke-MatrixRequest `
        -Name "invalid authentication rejected" `
        -HeaderValue "intentionally-invalid-issue-611" `
        -ExpectedStatuses @(401, 403) `
        -Body @{
            id = "auth-$runId"
            envelope = "corpflow.ops_alert.v1"
            kind = "production_validation_failure"
            message = "This must not reach Telegram."
        }

    Invoke-MatrixRequest `
        -Name "valid lead (expect one populated Telegram message)" `
        -HeaderValue $testSecret `
        -ExpectedStatuses @(200) `
        -Body @{
            schema = "corpflow.automation.envelope.v1"
            id = "lead-event-$runId"
            occurred_at = $now
            event_type = "corpflow.lead_rescue.intake_received"
            correlation_id = "lead-$runId"
            payload = @{
                lead_id = "lead-$runId"
                admin_detail_url = "/admin/lead-rescue/lead-$runId"
                prospect = @{
                    business_name = "TEST Issue 611 Lead"
                    contact_name = "Alex Test"
                }
            }
        }

    Invoke-MatrixRequest `
        -Name "valid alert (expect one populated Telegram message)" `
        -HeaderValue $testSecret `
        -ExpectedStatuses @(200) `
        -Body @{
            id = "alert-event-$runId"
            envelope = "corpflow.ops_alert.v1"
            at = $now
            kind = "production_validation_failure"
            ticket_id = "test-ticket-$runId"
            message = "TEST Issue 611 alert - operator review required."
        }

    Invoke-MatrixRequest `
        -Name "missing text (expect zero Telegram messages)" `
        -HeaderValue $testSecret `
        -ExpectedStatuses @(200) `
        -Body @{
            id = "missing-text-$runId"
            envelope = "corpflow.ops_alert.v1"
            at = $now
            kind = "production_validation_failure"
            message = "   "
        }

    Invoke-MatrixRequest `
        -Name "unknown event (expect zero Telegram messages)" `
        -HeaderValue $testSecret `
        -ExpectedStatuses @(200) `
        -Body @{
            schema = "corpflow.automation.envelope.v1"
            id = "unknown-$runId"
            occurred_at = $now
            event_type = "cmp.operator.switched_tenant"
            payload = @{}
        }

    $duplicateBody = @{
        id = "duplicate-$runId"
        envelope = "corpflow.ops_alert.v1"
        at = $now
        kind = "client_approval_needed"
        ticket_id = "duplicate-ticket-$runId"
        message = "TEST Issue 611 duplicate - only one message is allowed."
    }
    Invoke-MatrixRequest `
        -Name "duplicate event first delivery (expect one Telegram message)" `
        -HeaderValue $testSecret `
        -ExpectedStatuses @(200) `
        -Body $duplicateBody
    Invoke-MatrixRequest `
        -Name "duplicate event replay (expect zero additional messages)" `
        -HeaderValue $testSecret `
        -ExpectedStatuses @(200) `
        -Body $duplicateBody

    Write-Host "Waiting 61 seconds so the burst test starts with a fresh rate window..."
    Start-Sleep -Seconds 61

    for ($index = 1; $index -le 12; $index += 1) {
        Invoke-MatrixRequest `
            -Name "burst event $index of 12" `
            -HeaderValue $testSecret `
            -ExpectedStatuses @(200) `
            -Body @{
                id = "burst-$runId-$index"
                envelope = "corpflow.ops_alert.v1"
                at = $now
                kind = "production_validation_failure"
                ticket_id = "burst-ticket-$index"
                message = "TEST Issue 611 burst $index of 12."
            }
    }

    Write-Host ""
    Write-Host "HTTP matrix complete."
    Write-Host "Expected Telegram total: 8 messages."
    Write-Host "  valid lead=1; valid alert=1; missing text=0; unknown=0;"
    Write-Host "  duplicate pair=1 maximum; 12-event burst=5 maximum."
    Write-Host "Keep the test workflow separate from production and deactivate it after evidence capture."
}
finally {
    Set-Clipboard -Value ""
    $testSecret = $null
    $script:WebhookUrl = $null
}
