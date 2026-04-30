# CI/CD Setup Guide

Complete guide to set up the CI/CD pipeline for the Stellar Freelance Platform.

## 📋 Prerequisites

Before setting up CI/CD, ensure you have:

- [ ] GitHub repository created
- [ ] Stellar testnet account with XLM balance
- [ ] Stellar mainnet account (for production)
- [ ] Vercel account (optional, for frontend hosting)
- [ ] Admin access to repository settings

## 🔧 Step-by-Step Setup

### Step 1: Configure GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

#### Required Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `STELLAR_SECRET_KEY` | Deployer account secret key | From your Stellar wallet |
| `SOROBAN_RPC_URL` | Soroban RPC endpoint | `https://soroban-testnet.stellar.org` |
| `NETWORK_PASSPHRASE` | Network passphrase | `Test SDF Network ; September 2015` |
| `HORIZON_URL` | Horizon API endpoint | `https://horizon-testnet.stellar.org` |

#### Optional Secrets (for Vercel deployment)

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `VERCEL_TOKEN` | Vercel deployment token | Vercel Account Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel organization ID | Vercel Project Settings |
| `VERCEL_PROJECT_ID` | Vercel project ID | Vercel Project Settings |

#### Optional Secrets (for code coverage)

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `CODECOV_TOKEN` | Codecov upload token | Codecov.io project settings |

### Step 2: Create GitHub Environments

1. Go to **Settings** → **Environments**
2. Click **New environment**

#### Create Testnet Environment

- **Name**: `testnet`
- **Protection rules**: None (allow automatic deployment)
- **Environment secrets**: Add testnet-specific secrets if different from repository secrets

#### Create Mainnet Environment

- **Name**: `mainnet`
- **Protection rules**:
  - ✅ Required reviewers: Add 2+ reviewers
  - ✅ Wait timer: 10 minutes
  - ✅ Deployment branches: Only `main`
- **Environment secrets**: Add mainnet-specific secrets:
  - `STELLAR_SECRET_KEY` (mainnet account)
  - `SOROBAN_RPC_URL`: `https://soroban-rpc.stellar.org`
  - `NETWORK_PASSPHRASE`: `Public Global Stellar Network ; September 2015`
  - `HORIZON_URL`: `https://horizon.stellar.org`

### Step 3: Configure Workflow Permissions

1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**:
   - Select **Read and write permissions**
   - ✅ Enable **Allow GitHub Actions to create and approve pull requests**
3. Click **Save**

### Step 4: Enable GitHub Actions

1. Go to **Actions** tab
2. If prompted, click **I understand my workflows, go ahead and enable them**
3. Verify all workflows are listed:
   - ✅ CI
   - ✅ CD - Deploy
   - ✅ Release
   - ✅ Code Quality
   - ✅ Performance Testing
   - ✅ Dependency Updates
   - ✅ Workflow Status

### Step 5: Test CI Pipeline

1. Create a test branch:
   ```bash
   git checkout -b test/ci-setup
   ```

2. Make a small change:
   ```bash
   echo "# CI/CD Test" >> .github/test.md
   git add .
   git commit -m "test: verify CI pipeline"
   git push origin test/ci-setup
   ```

3. Create a Pull Request
4. Verify all CI checks run:
   - ✅ Lint & Format
   - ✅ Contract Tests
   - ✅ Frontend Tests
   - ✅ Frontend Build
   - ✅ E2E Tests
   - ✅ Security Scan

### Step 6: Test CD Pipeline (Testnet)

1. Merge the test PR to `main`:
   ```bash
   git checkout main
   git merge test/ci-setup
   git push origin main
   ```

2. Go to **Actions** → **CD - Deploy**
3. Verify deployment runs automatically
4. Check deployment summary for contract IDs
5. Update your `.env.local` with deployed contract IDs

### Step 7: Configure Branch Protection

1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Branch name pattern: `main`
4. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (1+)
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Select required status checks:
     - `Lint & Format`
     - `Contract Tests`
     - `Frontend Tests`
     - `Frontend Build`
     - `E2E Tests`
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings
5. Click **Create**

### Step 8: Set Up Vercel (Optional)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Link project:
   ```bash
   cd frontend
   vercel link
   ```

3. Get project details:
   ```bash
   vercel project ls
   ```

4. Add Vercel secrets to GitHub (from Step 1)

5. Test deployment:
   ```bash
   vercel deploy
   ```

### Step 9: Set Up Codecov (Optional)

1. Go to [Codecov.io](https://codecov.io)
2. Sign in with GitHub
3. Add your repository
4. Copy the upload token
5. Add `CODECOV_TOKEN` to GitHub secrets
6. Coverage reports will appear on PRs

### Step 10: Test Release Workflow

1. Create a version tag:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

2. Go to **Actions** → **Release**
3. Verify release workflow runs
4. Check **Releases** page for new release
5. Download and verify artifacts

## ✅ Verification Checklist

After setup, verify:

- [ ] All secrets configured correctly
- [ ] Testnet and mainnet environments created
- [ ] Workflow permissions set to read/write
- [ ] All workflows enabled and visible
- [ ] CI pipeline runs on PR creation
- [ ] CD pipeline deploys to testnet on merge
- [ ] Branch protection rules active on main
- [ ] Status badges show in README
- [ ] Release workflow creates GitHub releases
- [ ] Dependency update workflow scheduled
- [ ] Code quality checks run on PRs

## 🔍 Testing the Complete Pipeline

### Test 1: Feature Development

```bash
# Create feature branch
git checkout -b feature/test-pipeline

# Make changes
echo "console.log('test');" >> frontend/lib/test.ts

# Commit and push
git add .
git commit -m "feat: add test feature"
git push origin feature/test-pipeline

# Create PR and verify:
# ✅ CI runs automatically
# ✅ All checks pass
# ✅ Coverage report posted
# ✅ Bundle size analyzed
```

### Test 2: Deployment

```bash
# Merge to main
git checkout main
git merge feature/test-pipeline
git push origin main

# Verify:
# ✅ CD workflow triggers
# ✅ Contracts deploy to testnet
# ✅ Frontend deploys to Vercel
# ✅ Deployment summary created
```

### Test 3: Release

```bash
# Create release tag
git tag v0.2.0
git push origin v0.2.0

# Verify:
# ✅ Release workflow runs
# ✅ GitHub release created
# ✅ Artifacts uploaded
# ✅ Changelog generated
```

## 🐛 Troubleshooting

### Issue: Workflows not running

**Solution:**
1. Check if Actions are enabled: Settings → Actions → General
2. Verify workflow files are in `.github/workflows/`
3. Check workflow syntax with [GitHub Actions validator](https://rhysd.github.io/actionlint/)

### Issue: Secret not found

**Solution:**
1. Verify secret name matches exactly (case-sensitive)
2. Check secret is in correct scope (repository vs environment)
3. Re-add the secret if needed

### Issue: Deployment fails

**Solution:**
1. Check deployer account has sufficient XLM
2. Verify RPC endpoint is accessible
3. Check secret key format (starts with 'S', 56 characters)
4. Review deployment logs for specific errors

### Issue: Permission denied

**Solution:**
1. Settings → Actions → General
2. Set Workflow permissions to "Read and write"
3. Enable "Allow GitHub Actions to create and approve pull requests"

### Issue: Branch protection blocking merge

**Solution:**
1. Ensure all required checks pass
2. Get required approvals
3. Resolve all conversations
4. Update branch with latest main

## 📊 Monitoring

### GitHub Actions Dashboard

Monitor workflows at:
```
https://github.com/YOUR_USERNAME/YOUR_REPO/actions
```

### Key Metrics to Track

- ✅ CI success rate
- ⏱️ Average workflow duration
- 📊 Code coverage trends
- 🐛 Failed deployments
- 📦 Bundle size changes

### Setting Up Notifications

1. Go to **Settings** → **Notifications**
2. Enable notifications for:
   - Failed workflows
   - Deployment status
   - Security alerts

## 🔄 Maintenance

### Weekly Tasks

- [ ] Review dependency update PRs
- [ ] Check security scan results
- [ ] Monitor workflow performance
- [ ] Review failed workflows

### Monthly Tasks

- [ ] Update workflow versions
- [ ] Review and optimize caching
- [ ] Audit secrets and permissions
- [ ] Update documentation

### Quarterly Tasks

- [ ] Review CI/CD costs
- [ ] Optimize workflow efficiency
- [ ] Update tooling versions
- [ ] Security audit

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/reference/workflow-syntax-for-github-actions)
- [Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)

## 🎉 Success!

Your CI/CD pipeline is now fully configured! 

Next steps:
1. Review [CICD.md](.github/CICD.md) for detailed workflow documentation
2. Check [DEVELOPER_GUIDE.md](.github/DEVELOPER_GUIDE.md) for development workflows
3. Start building features with automated testing and deployment!

---

Need help? Open an issue or contact the DevOps team.
