# Pushing Local Files to GitHub

This guide will help you push your local files to the GitHub repository: https://github.com/floushi/DDV-signyPDFee

## Prerequisites

- Git installed on your computer
- A GitHub account with access to the repository
- Authentication set up for GitHub (username/password or personal access token)

## Option 1: Using the PowerShell Script (Recommended)

We've created a PowerShell script that automates the process of pushing to GitHub:

1. Run the script in PowerShell:
   ```
   .\push-to-github.ps1
   ```

2. Follow the prompts to commit and push your changes
   
3. The script will automatically use the correct repository: https://github.com/floushi/DDV-signyPDFee

## Option 2: Manual Steps

If you prefer to do it manually, follow these steps:

### 1. Initialize Git in your local directory (if not already done)

```bash
git init
```

### 2. Add the specific GitHub repository as a remote

```bash
git remote add origin https://github.com/floushi/DDV-signyPDFee.git
```

Or if the remote already exists but points to a different repository:

```bash
git remote set-url origin https://github.com/floushi/DDV-signyPDFee.git
```

### 3. Add your files to the staging area

```bash
git add .
```

This will add all files except those specified in `.gitignore`.

### 4. Commit your changes

```bash
git commit -m "Initial commit"
```

### 5. Push to GitHub

If this is a new repository:

```bash
git push -u origin main
```

Note: If your default branch is called "master" instead of "main", use:

```bash
git push -u origin master
```

### 6. Verify on GitHub

Go to your GitHub repository in a web browser to verify that your files have been pushed successfully.

## Troubleshooting

### If your local branch has a different name than the remote branch

You might need to specify the branch name:

```bash
git push -u origin local-branch-name:remote-branch-name
```

### If you get a "rejected" error

This usually happens when the remote repository has changes that you don't have locally. You can try:

```bash
git pull --rebase origin main
git push origin main
```

### If you're asked for credentials

You might need to authenticate with GitHub. The recommended way is to use a Personal Access Token:

1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate a new token with appropriate permissions
3. Use this token as your password when prompted

## Setting Up GitHub Integration with Cloud Build

After pushing your code to GitHub, you can set up Cloud Build to automatically build and deploy your application:

1. Go to Cloud Build in the Google Cloud Console
2. Connect your GitHub repository
3. Create a build trigger for your repository
4. The `cloudbuild.yaml` file in your repository will be used to configure the build and deployment process

Remember to configure your environment variables in the Cloud Run service settings, not in your code repository.
