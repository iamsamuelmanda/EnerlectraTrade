Write-Host "🧪 Testing Enerlectra Production API..." -ForegroundColor Cyan
Write-Host "=" * 60

$baseUrl = "http://localhost:3000"

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/v1/health" -Method Get -TimeoutSec 5
    Write-Host "   ✅ Health: $($health.status)" -ForegroundColor Green
    Write-Host "   ✅ Database: $($health.database)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Debug Endpoints
Write-Host "`n2. Testing Debug Endpoints..." -ForegroundColor Yellow
try {
    $debug = Invoke-RestMethod -Uri "$baseUrl/api/v1/debug/seed-data" -Method Get -TimeoutSec 5
    Write-Host "   ✅ Total Items in DB: $($debug.data.totalItems)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Debug endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Market Listings
Write-Host "`n3. Testing Market..." -ForegroundColor Yellow
try {
    $market = Invoke-RestMethod -Uri "$baseUrl/api/v1/market/listings" -Method Get -TimeoutSec 5
    Write-Host "   ✅ Active offers: $($market.data.count)" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Market failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n" + "=" * 60
Write-Host "🎉 Test Complete!" -ForegroundColor Green
Write-Host "🔗 Base URL: $baseUrl" -ForegroundColor White
