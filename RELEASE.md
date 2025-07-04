# IntelliNews Release Process

This document explains how to create a new release for the IntelliNews project.

## Overview

The IntelliNews project uses automated releases through GitHub Actions. Each release:
- Automatically bumps version numbers across all components
- Runs tests and builds
- Creates a Git tag
- Generates release notes
- Deploys to production (Google Cloud Run)

## Current Versions

- **IntelliNews App**: 0.1.0
- **Backend**: 1.0.0  
- **Frontend**: 0.1.0

## Creating a Release

### Option 1: Using the Release Script (Recommended)

1. Make sure you're on the `main` branch with a clean working directory
2. Run the release script:
   ```bash
   ./release.sh
   ```
3. Follow the interactive prompts to select the version bump type
4. The script will trigger the GitHub Actions workflow

### Option 2: Manual GitHub Actions Trigger

1. Go to the GitHub repository
2. Click on "Actions" tab
3. Select "Release" workflow
4. Click "Run workflow"
5. Choose the version bump type (patch/minor/major)
6. Click "Run workflow"

### Option 3: Using npm scripts

From the `intellinews` directory, you can run:
```bash
npm run release        # Interactive release
npm run release:patch  # Patch release (bug fixes)
npm run release:minor  # Minor release (new features)
npm run release:major  # Major release (breaking changes)
```

## Version Bump Types

- **patch**: Bug fixes and small improvements (0.1.0 → 0.1.1)
- **minor**: New features, backward compatible (0.1.0 → 0.2.0)
- **major**: Breaking changes (0.1.0 → 1.0.0)

## Release Workflow

The automated release process performs the following steps:

1. **Quality Checks**
   - Runs all tests
   - Builds the application
   - Validates dependencies

2. **Version Management**
   - Bumps version in all package.json files
   - Creates a Git commit with the version changes
   - Creates and pushes a Git tag

3. **Release Creation**
   - Generates automatic changelog from Git commits
   - Creates a GitHub Release with release notes
   - Includes version information for all components

4. **Deployment**
   - Deploys the new version to Google Cloud Run
   - Updates the production environment with the new version

## Prerequisites

- Write access to the repository
- All tests must pass
- Clean working directory (no uncommitted changes)
- Must be on the `main` branch

## Release Notes

Release notes are automatically generated from Git commit messages. To ensure good release notes:

- Write clear, descriptive commit messages
- Use conventional commit format when possible:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation
  - `chore:` for maintenance tasks

## Troubleshooting

### Release Fails During Tests
- Check the GitHub Actions logs
- Fix any failing tests
- Retry the release

### Permission Errors
- Ensure you have write access to the repository
- Check that the `GITHUB_TOKEN` has appropriate permissions

### Deployment Failures
- Verify Google Cloud credentials are correctly configured
- Check the Cloud Run service configuration
- Review deployment logs in Google Cloud Console

## Manual Rollback

If a release needs to be rolled back:

1. Identify the previous working version tag
2. Deploy the previous version manually:
   ```bash
   git checkout <previous-tag>
   # Trigger deployment workflow or deploy manually
   ```
3. Consider creating a hotfix release if needed

## Support

For issues with the release process, please:
1. Check the GitHub Actions logs
2. Review this documentation
3. Contact the development team
4. Create an issue in the repository