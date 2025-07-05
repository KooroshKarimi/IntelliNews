#!/bin/bash

# IntelliNews Release Script
# This script helps you create a new release for the IntelliNews project

set -e

echo "🚀 IntelliNews Release Script"
echo "=============================="

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check if we're on the main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Error: You must be on the main branch to create a release"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Check if working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Working directory is not clean. Please commit or stash your changes."
    git status --short
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull origin main

# Show current versions
echo ""
echo "📋 Current versions:"
echo "- IntelliNews: $(node -p "require('./intellinews/package.json').version")"
echo "- Backend: $(node -p "require('./backend/package.json').version")"
echo "- Frontend: $(node -p "require('./frontend/package.json').version")"

# Check if version type is provided as argument
if [ $# -eq 1 ]; then
    VERSION_TYPE=$1
    if [ "$VERSION_TYPE" != "patch" ] && [ "$VERSION_TYPE" != "minor" ] && [ "$VERSION_TYPE" != "major" ]; then
        echo "❌ Invalid version type. Use: patch, minor, or major"
        exit 1
    fi
else
    echo ""
    echo "Select version bump type:"
    echo "1) patch (bug fixes)"
    echo "2) minor (new features)"
    echo "3) major (breaking changes)"
    echo ""
    read -p "Enter your choice (1-3): " choice

    case $choice in
        1)
            VERSION_TYPE="patch"
            ;;
        2)
            VERSION_TYPE="minor"
            ;;
        3)
            VERSION_TYPE="major"
            ;;
        *)
            echo "❌ Invalid choice. Exiting."
            exit 1
            ;;
    esac
fi

echo ""
echo "🔄 Selected: $VERSION_TYPE release"
echo ""
read -p "Do you want to proceed with the release? (y/N): " confirm

if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "❌ Release cancelled."
    exit 0
fi

# Option 1: Trigger GitHub Actions workflow
if command -v gh > /dev/null 2>&1; then
    echo "🚀 Triggering GitHub Actions release workflow..."
    gh workflow run release.yml --field version_type=$VERSION_TYPE
    echo "✅ Release workflow triggered successfully!"
    echo "📊 Check the progress at: https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[/:]//g' | sed 's/.git$//')/actions"
else
    echo "⚠️  GitHub CLI (gh) not found. You can:"
    echo "1. Install GitHub CLI: https://cli.github.com/"
    echo "2. Trigger the release manually from GitHub Actions tab"
    echo "3. Use the workflow_dispatch event with version_type: $VERSION_TYPE"
fi