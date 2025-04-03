# PowerShell script to push local files to GitHub

# Check if Git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git is not installed. Please install Git first." -ForegroundColor Red
    exit 1
}

# Check if .git directory exists
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
} else {
    Write-Host "Git repository already initialized." -ForegroundColor Green
}

# Set the specific GitHub repository
$targetRepo = "https://github.com/floushi/DDV-signyPDFee.git"

# Check if remote origin exists
$remoteExists = git remote | Where-Object { $_ -eq "origin" }
if (-not $remoteExists) {
    Write-Host "Adding remote origin: $targetRepo" -ForegroundColor Yellow
    git remote add origin $targetRepo
    Write-Host "Added remote origin: $targetRepo" -ForegroundColor Green
} else {
    $currentRemote = git remote get-url origin
    Write-Host "Remote origin already exists." -ForegroundColor Green
    Write-Host "Current remote origin: $currentRemote" -ForegroundColor Cyan
    
    if ($currentRemote -ne $targetRepo) {
        Write-Host "Changing remote origin to: $targetRepo" -ForegroundColor Yellow
        git remote set-url origin $targetRepo
        Write-Host "Changed remote origin to: $targetRepo" -ForegroundColor Green
    } else {
        Write-Host "Remote origin is already set to the correct repository." -ForegroundColor Green
    }
}

# Add files to staging area
Write-Host "Adding files to staging area..." -ForegroundColor Yellow
git add .

# Commit changes
$commit_message = Read-Host "Please enter a commit message (e.g., 'Initial commit')"

if ([string]::IsNullOrEmpty($commit_message)) {
    $commit_message = "Update files"
}

git commit -m $commit_message

# Determine default branch name
$default_branch = git symbolic-ref --short HEAD 2>$null
if ([string]::IsNullOrEmpty($default_branch)) {
    $default_branch = "main"
}

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
Write-Host "Using branch: $default_branch" -ForegroundColor Cyan

git push -u origin $default_branch

# Check if push was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "Successfully pushed to GitHub!" -ForegroundColor Green
    $currentRemote = git remote get-url origin
    Write-Host "Your repository is now available at: $currentRemote" -ForegroundColor Cyan
    
    $setup_cloud_build = Read-Host "Do you want to set up Cloud Build integration now? (y/n)"
    
    if ($setup_cloud_build -eq "y" -or $setup_cloud_build -eq "Y") {
        Write-Host "Please follow these steps to set up Cloud Build integration:" -ForegroundColor Yellow
        Write-Host "1. Go to Cloud Build in the Google Cloud Console" -ForegroundColor Cyan
        Write-Host "2. Connect your GitHub repository: $currentRemote" -ForegroundColor Cyan
        Write-Host "3. Create a build trigger for your repository" -ForegroundColor Cyan
        Write-Host "4. The cloudbuild.yaml file in your repository will be used to configure the build and deployment process" -ForegroundColor Cyan
        Write-Host "5. Remember to configure your environment variables in the Cloud Run service settings, not in your code repository" -ForegroundColor Cyan
    }
} else {
    Write-Host "Failed to push to GitHub. Please check the error message above." -ForegroundColor Red
    Write-Host "You might need to authenticate with GitHub using a Personal Access Token." -ForegroundColor Yellow
    Write-Host "See github-push-guide.md for more information." -ForegroundColor Yellow
}
