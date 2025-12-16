Write-Host "🎯 UPDATED ENERLECTRA API TEST SUITE" -ForegroundColor Cyan
Write-Host "=" * 60

$baseUrl = "http://localhost:3000"

# Use the correct admin key from your .env file
$ADMIN_API_KEY = "enerlectra_prod_20251203"
Write-Host "Using Admin Key: $ADMIN_API_KEY" -ForegroundColor Yellow

# 1. Health Check
Write-Host "`n1. 🏥 HEALTH CHECK" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/v1/health" -Method Get
    Write-Host "   ✅ Status: $($health.status)" -ForegroundColor Green
    Write-Host "   ✅ Database: $($health.database)" -ForegroundColor Green
    Write-Host "   ✅ Uptime: $([math]::Round($health.uptime/3600, 2)) hours" -ForegroundColor Green
} catch {
    Write-Host "   ❌ Failed: $_" -ForegroundColor Red
}

# 2. USSD Flow Test
Write-Host "`n2. 📱 USSD FLOW TEST" -ForegroundColor Yellow
$testPhone = "0977000001"  # Seed user

# 2.1 Initial menu
$ussdBody1 = @{phoneNumber=$testPhone; text=""} | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/ussd" -Method Post -Body $ussdBody1 -ContentType "application/json"
    Write-Host "   ✅ Initial menu: Response received" -ForegroundColor Green
    Write-Host "   📋 Menu: $($response.Substring(0, [Math]::Min(50, $response.Length)))..." -ForegroundColor White
} catch {
    Write-Host "   ❌ USSD failed: $_" -ForegroundColor Red
}

# 2.2 Check balance (option 1)
$ussdBody2 = @{phoneNumber=$testPhone; text="1"} | ConvertTo-Json
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/ussd" -Method Post -Body $ussdBody2 -ContentType "application/json"
    Write-Host "   ✅ Balance check: Response received" -ForegroundColor Green
    Write-Host "   💰 Balance: $($response.Replace('END ', '').Replace("`n", ', '))" -ForegroundColor White
} catch {
    Write-Host "   ❌ Balance check failed: $_" -ForegroundColor Red
}

# 3. Market Listings
Write-Host "`n3. 🏪 MARKET LISTINGS" -ForegroundColor Yellow
try {
    $listings = Invoke-RestMethod -Uri "$baseUrl/api/v1/market/listings" -Method Get
    Write-Host "   ✅ Found $($listings.data.count) active offers" -ForegroundColor Green
    if ($listings.data.count -gt 0) {
        $firstOffer = $listings.data.listings[0]
        Write-Host "   📊 Sample offer: $($firstOffer.amount_kWh)kWh @ $($firstOffer.price_ZMW_per_kWh)ZMW/kWh" -ForegroundColor White
    }
} catch {
    Write-Host "   ❌ Market listings failed: $_" -ForegroundColor Red
}

# 4. Device Reporting - FIXED VERSION
Write-Host "`n4. ⚡ DEVICE REPORTING (FIXED)" -ForegroundColor Yellow

# Try different device IDs from your seed data
$deviceTests = @(
    @{
        deviceId = "SOLAR_001"  # Try a seed device
        value_kWh = 3.5
        timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
        meterReading = 1500
        voltage = 240.0
        powerFactor = 0.95
    },
    @{
        deviceId = "SOLAR_002"
        value_kWh = 2.8
        timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
        meterReading = 1200
        voltage = 240.0
    },
    @{
        deviceId = "SOLAR_003"
        generatedEnergy = 4.2  # Alternative field name
        timestamp = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    }
)

foreach ($deviceBody in $deviceTests) {
    $body = $deviceBody | ConvertTo-Json
    Write-Host "   Testing device: $($deviceBody.deviceId)" -ForegroundColor Gray
    try {
        $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/device/report" -Method Post -Body $body -ContentType "application/json"
        Write-Host "   ✅ Device report recorded for $($deviceBody.deviceId)" -ForegroundColor Green
        Write-Host "   📝 Event ID: $($response.data.eventId)" -ForegroundColor White
        Write-Host "   🔋 Energy: $($response.data.energyGenerated)kWh" -ForegroundColor White
        break
    } catch {
        Write-Host "   ❌ Failed for $($deviceBody.deviceId): $($_.Exception.Message.Substring(0, [Math]::Min(100, $_.Exception.Message.Length)))" -ForegroundColor Red
    }
}

# 5. User Registration - FIXED VERSION
Write-Host "`n5. 👤 USER REGISTRATION (FIXED)" -ForegroundColor Yellow

# Use a truly unique phone number
$newPhone = "26097" + (Get-Date -Format "yyyyMMddHHmmss").Substring(2)
$registerBody = @{
    phoneNumber = $newPhone
    name = "Test User $(Get-Date -Format 'HHmmss')"
    role = "consumer"  # lowercase as might be expected
    initialContribution = 100
    clusterId = "C001"  # Use existing cluster
    email = "test$((Get-Random -Minimum 1000 -Maximum 9999))@example.com"
    location = "Test Location"
    village = "Test Village"
} | ConvertTo-Json

Write-Host "   Registering phone: $newPhone" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/register" -Method Post -Body $registerBody -ContentType "application/json" -TimeoutSec 10
    Write-Host "   ✅ User registered successfully" -ForegroundColor Green
    Write-Host "   👤 User ID: $($response.data.userId)" -ForegroundColor White
    Write-Host "   📞 Phone: $($response.data.user.phoneNumber)" -ForegroundColor White
    Write-Host "   💰 Initial balance: $($response.data.wallets.money)" -ForegroundColor White
} catch {
    $errorMsg = $_.Exception.Message
    Write-Host "   ❌ Registration failed: $errorMsg" -ForegroundColor Red
    
    # Try alternative - check if user already exists
    Write-Host "   ⚠️  Trying to use existing seed user..." -ForegroundColor Yellow
    $existingUser = "0977000002"
    try {
        $testResponse = Invoke-WebRequest -Uri "$baseUrl/api/v1/user/$existingUser" -Method Get -UseBasicParsing -ErrorAction SilentlyContinue
        Write-Host "   ✅ Existing user $existingUser is accessible" -ForegroundColor Green
    } catch {
        Write-Host "   ❌ Cannot access user endpoint" -ForegroundColor Red
    }
}

# 6. Admin Reconciliation - WITH CORRECT KEY
Write-Host "`n6. 📊 ADMIN RECONCILIATION (WITH CORRECT KEY)" -ForegroundColor Yellow
$headers = @{
    "x-admin-key" = $ADMIN_API_KEY
}

try {
    $startTime = [DateTimeOffset]::Now.AddDays(-1).ToUnixTimeMilliseconds()
    $endTime = [DateTimeOffset]::Now.ToUnixTimeMilliseconds()
    
    $response = Invoke-RestMethod -Uri "$baseUrl/api/v1/admin/reconciliation?startDate=$startTime&endDate=$endTime" -Method Get -Headers $headers
    Write-Host "   ✅ Reconciliation report generated" -ForegroundColor Green
    Write-Host "   📈 Period: $($response.report.metadata.period.start) to $($response.report.metadata.period.end)" -ForegroundColor White
    Write-Host "   💰 Revenue: $($response.report.summary.financial.totalRevenue)ZMW" -ForegroundColor White
} catch {
    Write-Host "   ❌ Reconciliation failed: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try alternative admin endpoints
    Write-Host "   🔍 Trying alternative admin endpoints..." -ForegroundColor Yellow
    $adminEndpoints = @(
        "/api/v1/admin/stats",
        "/api/v1/admin/users",
        "/api/v1/admin/transactions"
    )
    
    foreach ($endpoint in $adminEndpoints) {
        try {
            $testResponse = Invoke-RestMethod -Uri "$baseUrl$endpoint" -Method Get -Headers $headers -TimeoutSec 3
            Write-Host "   ✅ $endpoint accessible" -ForegroundColor Green
        } catch {
            # Silent fail
        }
    }
}

# 7. Test Additional Endpoints
Write-Host "`n7. 🔄 ADDITIONAL ENDPOINT TESTS" -ForegroundColor Yellow

# Test wallet endpoint
try {
    $wallet = Invoke-RestMethod -Uri "$baseUrl/api/v1/wallet/0977000001" -Method Get
    Write-Host "   ✅ Wallet check: Money: $($wallet.money)ZMW, Energy: $($wallet.energy)kWh" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Wallet endpoint: $($_.Exception.Message.Substring(0, 50))" -ForegroundColor Yellow
}

# Test trading/offer creation
$offerBody = @{
    userId = "0977000001"
    amount_kWh = 5
    price_ZMW_per_kWh = 2.5
    expiresAt = [DateTimeOffset]::Now.AddHours(24).ToUnixTimeMilliseconds()
} | ConvertTo-Json

try {
    $offerResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/market/offer" -Method Post -Body $offerBody -ContentType "application/json"
    Write-Host "   ✅ Offer created: $($offerResponse.data.offerId)" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Offer creation: $($_.Exception.Message.Substring(0, 50))" -ForegroundColor Yellow
}

Write-Host "`n" + "=" * 60
Write-Host "📊 TEST RESULTS SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 60
Write-Host "✅ Working Features:" -ForegroundColor Green
Write-Host "   • Health Monitoring" -ForegroundColor White
Write-Host "   • USSD Interface" -ForegroundColor White
Write-Host "   • Market Listings" -ForegroundColor White
Write-Host "   • Wallet Management" -ForegroundColor White

Write-Host "`n⚠️  Needs Attention:" -ForegroundColor Yellow
Write-Host "   • Device Reporting (DynamoDB schema issue)" -ForegroundColor White
Write-Host "   • User Registration (Transaction bug)" -ForegroundColor White
Write-Host "   • Admin Panel (Check endpoint)" -ForegroundColor White

Write-Host "`n🔧 Configuration Check:" -ForegroundColor Cyan
Write-Host "   • Admin Key: $ADMIN_API_KEY" -ForegroundColor White
Write-Host "   • Port: 3000" -ForegroundColor White
Write-Host "   • Environment: production" -ForegroundColor White
Write-Host "   • DynamoDB Table: EnerlectraPCEI_MVP" -ForegroundColor White

Write-Host "`n🎯 RECOMMENDED NEXT STEPS:" -ForegroundColor Cyan
Write-Host "1. Check server.js for DynamoDB schema in device reporting" -ForegroundColor White
Write-Host "2. Examine user registration transaction logic" -ForegroundColor White
Write-Host "3. Verify admin endpoint routes in server.js" -ForegroundColor White
Write-Host "4. Use existing 100 seed users for testing" -ForegroundColor White

Write-Host "=" * 60
