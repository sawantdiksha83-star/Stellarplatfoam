# CI/CD Pipeline Documentation

This document describes the CI/CD pipeline for the Stellar Freelance Platform.

## 🔄 Workflows Overview

### 1. CI (Continuous Integration) - `.github/workflows/ci.yml`

**Triggers:**
- Push to any branch
- Pull requests to `main` or `develop`

**Jobs:**
- **Lint & Format**: ESLint, TypeScript checks, Rust formatting, Clippy
- **Contract Tests**: Run Rust tests for payment and escrow contracts
- **Frontend Tests**: Run Jest unit tests with coverage
- **Frontend Build**: Build Next.js application
- **E2E Tests**: Run Playwright end-to-end tests
- **Security Scan**: NPM audit and Cargo audit

**Status:** Required checks for PR merging

### 2. CD (Continuous Deployment) - `.github/workflows/cd.yml`

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch

**Jobs:**
- **Deploy Contracts**: Build and deploy smart contracts to Stellar
- **Deploy Frontend**: Build and deploy frontend to Vercel
- **Notify**: Send deployment notifications

**Environments:**
- `testnet` (default)
- `mainnet` (manual trigger only)

### 3. Release - `.github/workflows/release.yml`

**Triggers:**
- Push tags matching `v*.*.*` (e.g., v1.0.0)
- Manual workflow dispatch

**Jobs:**
- Build contracts and frontend
- Create GitHub release with artifacts
- Generate changelog
- Upload WASM files and deployment scripts

### 4. Dependency Updates - `.github/workflows/dependency-update.yml`

**Triggers:**
- Schedule: Every Monday at 9 AM UTC
- Manual workflow dispatch

**Jobs:**
- Update NPM dependencies
- Update Cargo dependencies
- Create automated PRs with updates

### 5. Code Quality - `.github/workflows/code-quality.yml`

**Triggers:**
- Pull requests to `main` or `develop`
- Push to `main` or `develop`

**Jobs:**
- **Coverage**: Generate and upload code coverage reports
- **Bundle Size**: Analyze frontend bundle size
- **Lighthouse**: Run performance audits
- **Vulnerability Scan**: Security scanning with Trivy
- **Complexity**: Code complexity analysis

### 6. Performance Testing - `.github/workflows/performance.yml`

**Triggers:**
- Pull requests to `main`
- Schedule: Daily at 2 AM UTC
- Manual workflow dispatch

**Jobs:**
- **Load Testing**: k6 load tests
- **Contract Benchmarks**: Rust benchmarks
- **Frontend Performance**: Bundle analysis and size limits

## 🔐 Required Secrets

Configure these secrets in GitHub Settings → Secrets and variables → Actions:

### For Deployment (CD Workflow)

| Secret | Description | Example |
|--------|-------------|---------|
| `STELLAR_SECRET_KEY` | Deployer account secret key | `SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` |
| `SOROBAN_RPC_URL` | Soroban RPC endpoint | `https://soroban-testnet.stellar.org` |
| `NETWORK_PASSPHRASE` | Network passphrase | `Test SDF Network ; September 2015` |
| `HORIZON_URL` | Horizon API endpoint | `https://horizon-testnet.stellar.org` |

### For Frontend Deployment (Optional)

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel deployment token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

### For Code Coverage (Optional)

| Secret | Description |
|--------|-------------|
| `CODECOV_TOKEN` | Codecov upload token |

## 🌍 Environments

Configure environments in GitHub Settings → Environments:

### Testnet Environment
- **Name**: `testnet`
- **Protection rules**: None (auto-deploy)
- **Secrets**: Testnet-specific secrets

### Mainnet Environment
- **Name**: `mainnet`
- **Protection rules**: 
  - Required reviewers (2+)
  - Wait timer (10 minutes)
- **Secrets**: Mainnet-specific secrets

## 📋 Workflow Status Badges

Add these badges to your README.md:

```markdown
![CI](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/CI/badge.svg)
![CD](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/CD%20-%20Deploy/badge.svg)
![Code Quality](https://github.com/YOUR_USERNAME/YOUR_REPO/workflows/Code%20Quality/badge.svg)
```

## 🚀 Deployment Process

### Automatic Deployment (Testnet)

1. Merge PR to `main` branch
2. CI workflow runs all tests
3. CD workflow automatically deploys to testnet
4. Deployment summary posted to GitHub

### Manual Deployment (Mainnet)

1. Go to Actions → CD - Deploy
2. Click "Run workflow"
3. Select `mainnet` environment
4. Approve deployment (requires reviewers)
5. Monitor deployment progress

### Creating a Release

1. Create and push a version tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. Release workflow automatically creates GitHub release
3. Artifacts uploaded (WASM files, deployment scripts)
4. Changelog generated from commits

## 🔧 Local Testing

### Run CI Checks Locally

```bash
# Frontend linting
cd frontend
npm run lint
npx tsc --noEmit

# Frontend tests
npm test

# Contract tests
cd ../contracts
cargo test

# Contract formatting
cargo fmt --all -- --check
cargo clippy --all-targets --all-features
```

### Build Contracts Locally

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
```

### Deploy Contracts Locally

```bash
export STELLAR_SECRET_KEY="your-secret-key"
export SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
export NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

./scripts/deploy.sh
```

## 📊 Monitoring

### GitHub Actions Dashboard
- View workflow runs: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`
- Check deployment status
- Download artifacts
- View logs

### Coverage Reports
- Codecov: `https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO`
- View coverage trends
- Compare PR coverage

### Performance Metrics
- Lighthouse CI reports in workflow summaries
- Bundle size analysis in PR comments
- Load test results in artifacts

## 🐛 Troubleshooting

### CI Failures

**Lint errors:**
```bash
npm run lint -- --fix
cargo fmt --all
```

**Test failures:**
```bash
npm test -- --verbose
cargo test -- --nocapture
```

**Build failures:**
```bash
npm run build
cargo build --target wasm32-unknown-unknown --release
```

### Deployment Failures

**Contract deployment fails:**
- Check `STELLAR_SECRET_KEY` is valid
- Verify account has sufficient XLM balance
- Check RPC endpoint is accessible

**Frontend deployment fails:**
- Verify Vercel tokens are correct
- Check build succeeds locally
- Review environment variables

### Workflow Permissions

If workflows fail with permission errors:
1. Go to Settings → Actions → General
2. Set "Workflow permissions" to "Read and write permissions"
3. Enable "Allow GitHub Actions to create and approve pull requests"

## 📝 Best Practices

### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature branches
- `hotfix/*`: Urgent fixes

### Commit Messages
Follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation
- `chore:` Maintenance
- `test:` Tests
- `refactor:` Code refactoring

### Pull Requests
- All checks must pass
- Require code review
- Update documentation
- Add tests for new features

### Releases
- Use semantic versioning (MAJOR.MINOR.PATCH)
- Document breaking changes
- Test thoroughly before release
- Tag releases in git

## 🔄 Maintenance

### Weekly Tasks
- Review dependency update PRs
- Check security scan results
- Monitor performance metrics

### Monthly Tasks
- Review and update workflows
- Audit secrets and permissions
- Update documentation

### Quarterly Tasks
- Review CI/CD costs
- Optimize workflow performance
- Update tooling versions

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Stellar Documentation](https://developers.stellar.org)
- [Soroban Documentation](https://soroban.stellar.org)
- [Vercel Deployment](https://vercel.com/docs)

## 🤝 Contributing

When adding new workflows:
1. Document the workflow purpose
2. Add required secrets to this document
3. Test locally with `act` if possible
4. Update status badges in README

## 📞 Support

For CI/CD issues:
- Check workflow logs in GitHub Actions
- Review this documentation
- Open an issue with workflow run URL
- Contact DevOps team

---

Last updated: 2024
