Write-Host "Testing uploads directory and permissions..." -ForegroundColor Cyan

$backendDir = Join-Path $PSScriptRoot "backend"
$uploadsDir = Join-Path $backendDir "uploads"

Write-Host "Backend directory: $backendDir"
Write-Host "Uploads directory: $uploadsDir"

# Check if uploads directory exists
if (-not (Test-Path $uploadsDir)) {
    Write-Host "Creating uploads directory..." -ForegroundColor Yellow
    New-Item -Path $uploadsDir -ItemType Directory -Force | Out-Null
    Write-Host "Uploads directory created." -ForegroundColor Green
} else {
    Write-Host "Uploads directory exists." -ForegroundColor Green
}

# Test write permissions
$testFile = Join-Path $uploadsDir "test.txt"
try {
    "Test file content" | Out-File -FilePath $testFile -Force
    Write-Host "Successfully wrote to test file." -ForegroundColor Green
    
    # Read the file back
    $content = Get-Content -Path $testFile -Raw
    Write-Host "Successfully read test file." -ForegroundColor Green
    
    # Delete the test file
    Remove-Item -Path $testFile -Force
    Write-Host "Successfully deleted test file." -ForegroundColor Green
    
} catch {
    Write-Host "Error with file operations: $_" -ForegroundColor Red
    
    # Try to fix permissions
    Write-Host "Attempting to fix permissions..." -ForegroundColor Yellow
    try {
        $acl = Get-Acl $uploadsDir
        $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($currentUser, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
        $acl.SetAccessRule($rule)
        Set-Acl $uploadsDir $acl
        Write-Host "Permissions updated." -ForegroundColor Green
    } catch {
        Write-Host "Failed to update permissions: $_" -ForegroundColor Red
    }
}

# List all files in the uploads directory
Write-Host "Files in uploads directory:" -ForegroundColor Yellow
Get-ChildItem -Path $uploadsDir | ForEach-Object {
    Write-Host "  - $($_.Name) ($($_.Length) bytes)"
}

# Check if server.js is correctly configured
$serverJsPath = Join-Path $backendDir "server.js"
if (Test-Path $serverJsPath) {
    $serverContent = Get-Content -Path $serverJsPath -Raw
    if ($serverContent -match "app\.use\('/uploads'") {
        Write-Host "server.js has uploads static route configuration." -ForegroundColor Green
    } else {
        Write-Host "WARNING: server.js may not have proper uploads directory configuration." -ForegroundColor Red
    }
} else {
    Write-Host "server.js not found!" -ForegroundColor Red
}

Write-Host "Upload directory test completed." -ForegroundColor Cyan 