Write-Host "📊 Testing Admin Dashboard..." -ForegroundColor Cyan
Write-Host "=" * 60

$headers = @{
    "x-admin-key" = "enerlectra_prod_2025"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/v1/admin/reconciliation" `
        -Method Get `
        -Headers $headers
    Write-Host "✅ Admin Report Generated:" -ForegroundColor Green
    Write-Host "   Total Revenue: $($response.report.summary.financial.totalRevenue) ZMW" -ForegroundColor White
    Write-Host "   Energy Traded: $($response.report.summary.energy.totalTraded) kWh" -ForegroundColor White
    Write-Host "   Carbon Saved: $($response.report.summary.environmental.carbonSaved) kg CO2" -ForegroundColor White
} catch {
    Write-Host "❌ Admin Error: $($_.Exception.Message)" -ForegroundColor Red
}
