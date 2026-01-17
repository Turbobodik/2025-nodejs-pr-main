# Test Error Logging - This will generate errors to test logging

$BASE_URL = "http://localhost:3000"
$API_URL = "$BASE_URL/api"

Write-Host "=== Testing Error Logging ===" -ForegroundColor Cyan
Write-Host "This script will trigger various errors to test logging" -ForegroundColor Yellow
Write-Host ""

# Get a token first
Write-Host "Step 1: Getting auth token..." -ForegroundColor Yellow
$loginBody = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody
    
    $token = $loginResponse.token
    $headers = @{ Authorization = "Bearer $token" }
    Write-Host "[OK] Got token" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Could not get token" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 1: 404 Error (warns - should be in combined, not error)
Write-Host "Test 1: Triggering 404 (warn level)..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$API_URL/students/99999" -Method Get -Headers $headers
} catch {
    Write-Host "[INFO] 404 triggered (warn level)" -ForegroundColor Gray
}
Write-Host ""

# Test 2: Unauthorized (warns - should be in combined, not error)
Write-Host "Test 2: Triggering 401 (warn level)..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$API_URL/students" -Method Get
} catch {
    Write-Host "[INFO] 401 triggered (warn level)" -ForegroundColor Gray
}
Write-Host ""

# Test 3: Invalid endpoint (should log error)
Write-Host "Test 3: Triggering invalid endpoint (should cause error)..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$API_URL/invalid-endpoint-that-does-not-exist" -Method Get -Headers $headers
} catch {
    Write-Host "[INFO] Invalid endpoint triggered" -ForegroundColor Gray
}
Write-Host ""

# Test 4: Trigger actual error via simple test endpoint (no auth required)
Write-Host "Test 4: Triggering actual error via /api/test/error-simple endpoint..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$API_URL/test/error-simple" -Method Get
} catch {
    $errorResponse = $_.ErrorDetails.Message
    if ($errorResponse) {
        $parsed = $errorResponse | ConvertFrom-Json
        Write-Host "[OK] Error triggered successfully!" -ForegroundColor Green
        Write-Host "Response: $($parsed | ConvertTo-Json)" -ForegroundColor Gray
    } else {
        Write-Host "[INFO] Error endpoint triggered" -ForegroundColor Gray
    }
}
Write-Host ""

# Test 5: Trigger actual error via authenticated test endpoint
Write-Host "Test 5: Triggering actual error via /api/test/error endpoint (with auth)..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "$API_URL/test/error" -Method Post -Headers $headers
} catch {
    $errorResponse = $_.ErrorDetails.Message
    if ($errorResponse) {
        $parsed = $errorResponse | ConvertFrom-Json
        Write-Host "[OK] Error triggered successfully!" -ForegroundColor Green
        Write-Host "Response: $($parsed | ConvertTo-Json)" -ForegroundColor Gray
    } else {
        Write-Host "[INFO] Error endpoint triggered" -ForegroundColor Gray
    }
}
Write-Host ""

Write-Host "=== Tests Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "IMPORTANT: Error log files are only created in PRODUCTION mode!" -ForegroundColor Yellow
Write-Host "Make sure your server is running with: NODE_ENV=production" -ForegroundColor Yellow
Write-Host ""
Write-Host "Now check your log files:" -ForegroundColor Cyan
Write-Host "  - logs/combined-*.log should have warnings AND errors" -ForegroundColor Yellow
Write-Host "  - logs/error-*.log should now contain ERROR entries! (production mode only)" -ForegroundColor Green
Write-Host ""
Write-Host "To view error log:" -ForegroundColor Cyan
Write-Host "  Get-Content logs\error-$(Get-Date -Format 'yyyy-MM-dd').log" -ForegroundColor Yellow
Write-Host ""
Write-Host "If error log doesn't exist, restart server with:" -ForegroundColor Cyan
Write-Host "  `$env:NODE_ENV='production'; npm start" -ForegroundColor Yellow