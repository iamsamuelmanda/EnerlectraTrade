Write-Host "📱 Testing USSD Interface..." -ForegroundColor Cyan
Write-Host "=" * 60

$ussdBody = @{
    phoneNumber = "0977000001"
    text = "1"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/ussd" `
        -Method Post `
        -Body $ussdBody `
        -ContentType "application/json"
    Write-Host "✅ USSD Response:" -ForegroundColor Green
    $response
} catch {
    Write-Host "❌ USSD Error: $($_.Exception.Message)" -ForegroundColor Red
}
