# Save this as enerlectra-tests.ps1
param(
    [string]$Action = "help",
    [int]$Count = 10
)

$baseUrl = "http://localhost:3000"

function Show-Menu {
    Write-Host "=== ENERLECTRA TEST SUITE ===" -ForegroundColor Cyan
    Write-Host "Available commands:" -ForegroundColor Yellow
    Write-Host "  .\enerlectra-tests.ps1 health        - Health check"
    Write-Host "  .\enerlectra-tests.ps1 quick         - Quick test all endpoints"
    Write-Host "  .\enerlectra-tests.ps1 stress        - Full stress test"
    Write-Host "  .\enerlectra-tests.ps1 load -Count 20 - Load test with N requests"
    Write-Host "  .\enerlectra-tests.ps1 api           - Test specific API"
    Write-Host "  .\enerlectra-tests.ps1 fix           - Fix API issues"
    Write-Host "  .\enerlectra-tests.ps1 help          - Show this menu"
}

function Test-Health {
    Write-Host "Health Check..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/health" -ErrorAction Stop
        Write-Host "✅ API is healthy!" -ForegroundColor Green
        Write-Host "Status: $($response.status)" -ForegroundColor Cyan
        Write-Host "Database: $($response.database)" -ForegroundColor Cyan
        Write-Host "Uptime: $($response.uptime) seconds" -ForegroundColor Cyan
    } catch {
        Write-Host "❌ Health check failed: $_" -ForegroundColor Red
    }
}

function Test-Quick {
    Write-Host "Quick Test..." -ForegroundColor Yellow
    
    $endpoints = @(
        @{ Name = "Health"; Path = "/api/v1/health" },
        @{ Name = "Root"; Path = "/" },
        @{ Name = "Market Listings"; Path = "/api/v1/market/listings" },
        @{ Name = "Debug Users"; Path = "/api/v1/debug/users" },
        @{ Name = "Debug Devices"; Path = "/api/v1/debug/devices" },
        @{ Name = "Seed Data"; Path = "/api/v1/debug/seed-data" }
    )
    
    foreach ($endpoint in $endpoints) {
        try {
            $response = Invoke-RestMethod -Uri "$baseUrl$($endpoint.Path)" -ErrorAction SilentlyContinue
            Write-Host "✅ $($endpoint.Name)" -ForegroundColor Green
        } catch {
            Write-Host "❌ $($endpoint.Name)" -ForegroundColor Red
        }
    }
}

function Test-Load {
    param($RequestCount = 10)
    
    Write-Host "Load Testing with $RequestCount concurrent requests..." -ForegroundColor Yellow
    
    $success = 0
    $failed = 0
    
    1..$RequestCount | ForEach-Object -Parallel {
        $id = $_
        try {
            Invoke-RestMethod -Uri "http://localhost:3000/api/v1/health" -ErrorAction Stop | Out-Null
            return @{ Id = $id; Success = $true }
        } catch {
            return @{ Id = $id; Success = $false }
        }
    } -ThrottleLimit $RequestCount | ForEach-Object {
        if ($_.Success) { $success++ } else { $failed++ }
    }
    
    Write-Host "Results:" -ForegroundColor Yellow
    Write-Host "  Successful: $success" -ForegroundColor Green
    Write-Host "  Failed: $failed" -ForegroundColor Red
    Write-Host "  Success Rate: $(($success/$RequestCount*100).ToString('0.0'))%" -ForegroundColor Cyan
}

function Fix-API {
    Write-Host "Fixing API..." -ForegroundColor Yellow
    
    # Check package.json
    $content = Get-Content package.json -Raw
    if (-not ($content -match '"type": "module"')) {
        Write-Host "Adding type: module to package.json..." -ForegroundColor Yellow
        $lines = $content -split "`n"
        $newLines = @()
        foreach ($line in $lines) {
            $newLines += $line
            if ($line -match '"description": "Enerlectra - The Energy Internet Backend API",') {
                $newLines += '  "type": "module",'
            }
        }
        $newContent = $newLines -join "`n"
        $newContent | Set-Content package.json -Encoding UTF8
        Write-Host "✓ Updated package.json" -ForegroundColor Green
    } else {
        Write-Host "✓ package.json already has type: module" -ForegroundColor Green
    }
    
    # Restart PM2
    Write-Host "Restarting PM2..." -ForegroundColor Yellow
    pm2 delete enerlectra-api 2>$null
    pm2 start server.js --name "enerlectra-api"
    pm2 save
    Write-Host "✓ PM2 restarted" -ForegroundColor Green
    
    # Test
    Start-Sleep -Seconds 3
    Test-Health
}

# Main execution
switch ($Action.ToLower()) {
    "health" { Test-Health }
    "quick" { Test-Quick }
    "load" { Test-Load -RequestCount $Count }
    "stress" { 
        Test-Health
        Test-Quick
        Test-Load -RequestCount 20
    }
    "fix" { Fix-API }
    "api" { 
        Test-Health
        Test-Quick
    }
    default { Show-Menu }
}