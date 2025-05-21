Write-Host "Starting uploads directory fix script..." -ForegroundColor Cyan

# Define paths
$backendDir = Join-Path $PSScriptRoot "backend"
$uploadsDir = Join-Path $backendDir "uploads"

Write-Host "Backend directory: $backendDir"
Write-Host "Uploads directory: $uploadsDir"

# Check if backend directory exists
if (-not (Test-Path $backendDir)) {
    Write-Host "Error: Backend directory not found at $backendDir" -ForegroundColor Red
    exit 1
}

# Create uploads directory if it doesn't exist
if (-not (Test-Path $uploadsDir)) {
    Write-Host "Creating uploads directory..." -ForegroundColor Yellow
    try {
        New-Item -Path $uploadsDir -ItemType Directory -Force | Out-Null
        Write-Host "Uploads directory created successfully." -ForegroundColor Green
    }
    catch {
        Write-Host "Error creating uploads directory: $_" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "Uploads directory exists." -ForegroundColor Green
}

# Test write permissions
$testFile = Join-Path $uploadsDir "test-file.txt"
try {
    "This is a test file" | Out-File -FilePath $testFile -Force
    Write-Host "Successfully wrote test file." -ForegroundColor Green
    
    # Clean up
    Remove-Item -Path $testFile -Force
    Write-Host "Successfully removed test file." -ForegroundColor Green
}
catch {
    Write-Host "Error writing to uploads directory: $_" -ForegroundColor Red
    Write-Host "Trying to fix permissions..." -ForegroundColor Yellow
    
    try {
        # Grant full control to the current user
        $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
        $acl = Get-Acl $uploadsDir
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($currentUser, "FullControl", "ContainerInherit,ObjectInherit", "None", "Allow")
        $acl.SetAccessRule($rule)
        Set-Acl $uploadsDir $acl
        
        Write-Host "Permissions updated. Testing again..." -ForegroundColor Yellow
        
        # Test again
        "This is a test file" | Out-File -FilePath $testFile -Force
        Write-Host "Successfully wrote test file after permission fix." -ForegroundColor Green
        
        # Clean up
        Remove-Item -Path $testFile -Force
        Write-Host "Successfully removed test file." -ForegroundColor Green
    }
    catch {
        Write-Host "Failed to fix permissions: $_" -ForegroundColor Red
        Write-Host "Please manually ensure the uploads directory is writable." -ForegroundColor Red
        exit 1
    }
}

# List files in the uploads directory
Write-Host "Files in uploads directory:" -ForegroundColor Cyan
try {
    $files = Get-ChildItem -Path $uploadsDir
    if ($files.Count -eq 0) {
        Write-Host "No files found in uploads directory." -ForegroundColor Yellow
    }
    else {
        $files | ForEach-Object { Write-Host " - $($_.Name)" }
    }
}
catch {
    Write-Host "Error listing files: $_" -ForegroundColor Red
}

Write-Host "Uploads directory fix completed." -ForegroundColor Green
Write-Host "You can now run the backend server with 'cd backend && npm run dev'" -ForegroundColor Cyan 