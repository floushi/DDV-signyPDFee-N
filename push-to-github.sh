#!/bin/bash

# Script to push local files to GitHub

# Check if Git is installed
if ! command -v git &> /dev/null; then
    echo "Git is not installed. Please install Git first."
    exit 1
fi

# Check if .git directory exists
if [ ! -d ".git" ]; then
    echo "Initializing Git repository..."
    git init
else
    echo "Git repository already initialized."
fi

# Check if remote origin exists
if ! git remote | grep -q "origin"; then
    echo "Please enter your GitHub username:"
    read username
    echo "Please enter your repository name:"
    read repo_name
    
    git remote add origin "https://github.com/$username/$repo_name.git"
    echo "Added remote origin: https://github.com/$username/$repo_name.git"
else
    echo "Remote origin already exists."
    echo "Current remote origin: $(git remote get-url origin)"
    
    echo "Do you want to change the remote origin? (y/n)"
    read change_remote
    
    if [ "$change_remote" = "y" ] || [ "$change_remote" = "Y" ]; then
        echo "Please enter your GitHub username:"
        read username
        echo "Please enter your repository name:"
        read repo_name
        
        git remote set-url origin "https://github.com/$username/$repo_name.git"
        echo "Changed remote origin to: https://github.com/$username/$repo_name.git"
    fi
fi

# Add files to staging area
echo "Adding files to staging area..."
git add .

# Commit changes
echo "Please enter a commit message (e.g., 'Initial commit'):"
read commit_message

if [ -z "$commit_message" ]; then
    commit_message="Update files"
fi

git commit -m "$commit_message"

# Determine default branch name
default_branch=$(git symbolic-ref --short HEAD 2>/dev/null)
if [ -z "$default_branch" ]; then
    default_branch="main"
fi

# Push to GitHub
echo "Pushing to GitHub..."
echo "Using branch: $default_branch"

git push -u origin "$default_branch"

# Check if push was successful
if [ $? -eq 0 ]; then
    echo "Successfully pushed to GitHub!"
    echo "Your repository is now available at: $(git remote get-url origin)"
    
    echo "Do you want to set up Cloud Build integration now? (y/n)"
    read setup_cloud_build
    
    if [ "$setup_cloud_build" = "y" ] || [ "$setup_cloud_build" = "Y" ]; then
        echo "Please follow these steps to set up Cloud Build integration:"
        echo "1. Go to Cloud Build in the Google Cloud Console"
        echo "2. Connect your GitHub repository: $(git remote get-url origin)"
        echo "3. Create a build trigger for your repository"
        echo "4. The cloudbuild.yaml file in your repository will be used to configure the build and deployment process"
        echo "5. Remember to configure your environment variables in the Cloud Run service settings, not in your code repository"
    fi
else
    echo "Failed to push to GitHub. Please check the error message above."
    echo "You might need to authenticate with GitHub using a Personal Access Token."
    echo "See github-push-guide.md for more information."
fi
