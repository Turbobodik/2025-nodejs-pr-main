# API Testing Script for pr-6 (PowerShell)

$BASE_URL = "http://localhost:3000"
$API_URL = "$BASE_URL/api"

Write-Host "=== API Testing Script ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Register a new user (or login if exists)
Write-Host "Test 1: Register a new user" -ForegroundColor Yellow
$testEmail = "test@example.com"
$testPassword = "password123"

$registerBody = @{
    name = "Test"
    surname = "User"
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

$token = $null
try {
    $registerResponse = Invoke-RestMethod -Uri "$API_URL/auth/register" `
        -Method Post `
        -ContentType "application/json" `
        -Body $registerBody
    
    $registerResponse | ConvertTo-Json -Depth 3
    $token = $registerResponse.token
    
    if ($token) {
        Write-Host "[OK] Registration successful" -ForegroundColor Green
        $tokenPreview = if ($token.Length -gt 50) { $token.Substring(0, 50) + "..." } else { $token }
        Write-Host "Token: $tokenPreview" -ForegroundColor Gray
    }
} catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
    if ($errorResponse.error -like "*already exists*") {
        Write-Host "[INFO] User already exists, trying to login instead..." -ForegroundColor Yellow
        
        # Try to login instead
        $loginBody = @{
            email = $testEmail
            password = $testPassword
        } | ConvertTo-Json
        
        try {
            $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" `
                -Method Post `
                -ContentType "application/json" `
                -Body $loginBody
            
            $token = $loginResponse.token
            if ($token) {
                Write-Host "[OK] Login successful (user already existed)" -ForegroundColor Green
                $tokenPreview = if ($token.Length -gt 50) { $token.Substring(0, 50) + "..." } else { $token }
                Write-Host "Token: $tokenPreview" -ForegroundColor Gray
            }
        } catch {
            Write-Host "[FAIL] Both registration and login failed" -ForegroundColor Red
            Write-Host "Error: $_" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "[FAIL] Registration failed: $_" -ForegroundColor Red
        exit 1
    }
}

if (-not $token) {
    Write-Host "[FAIL] No token received" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Login (separate test)
Write-Host "Test 2: Login" -ForegroundColor Yellow
$loginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody
    
    $loginResponse | ConvertTo-Json -Depth 3
    $loginToken = $loginResponse.token
    
    if ($loginToken) {
        $token = $loginToken
        Write-Host "[OK] Login successful" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Login failed - no token received" -ForegroundColor Red
    }
} catch {
    Write-Host "[FAIL] Login error: $_" -ForegroundColor Red
    $errorDetails = $_.ErrorDetails.Message
    if ($errorDetails) {
        Write-Host "Details: $errorDetails" -ForegroundColor Gray
    }
}
Write-Host ""

# Test 3: Get all students (requires auth)
Write-Host "Test 3: Get all students" -ForegroundColor Yellow
$headers = @{
    Authorization = "Bearer $token"
}

try {
    $studentsResponse = Invoke-RestMethod -Uri "$API_URL/students" `
        -Method Get `
        -Headers $headers
    
    $studentsResponse | ConvertTo-Json -Depth 3
    Write-Host "[OK] Get students successful" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Get students failed: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: Invalid request (should log error)
Write-Host "Test 4: Invalid request (should log error)" -ForegroundColor Yellow
try {
    $invalidResponse = Invoke-RestMethod -Uri "$API_URL/students/999" `
        -Method Get `
        -Headers $headers
    
    $invalidResponse | ConvertTo-Json -Depth 3
    Write-Host "[INFO] Invalid request returned response" -ForegroundColor Gray
} catch {
    Write-Host "[INFO] Error as expected: $_" -ForegroundColor Gray
}
Write-Host ""

# Test 5: Unauthorized request (should log warning)
Write-Host "Test 5: Unauthorized request" -ForegroundColor Yellow
try {
    $unauthResponse = Invoke-RestMethod -Uri "$API_URL/students" -Method Get
    $unauthResponse | ConvertTo-Json -Depth 3
} catch {
    Write-Host "[INFO] Unauthorized as expected: $_" -ForegroundColor Gray
}
Write-Host ""

Write-Host "=== API Tests Complete ===" -ForegroundColor Green
