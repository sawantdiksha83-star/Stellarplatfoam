# CI/CD Quick Reference

Quick commands and workflows for daily development.

## 🚀 Common Commands

### Development

```bash
# Start dev server
cd frontend && npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Build production
npm run build
```

### Testing

```bash
# Frontend tests
cd frontend
npm test                    # Run all tests
npm test -- --watch        # Watch mode
npm test -- --coverage     # With coverage
npm run test:e2e          # E2E tests

# Contract tests
cd contracts
cargo test                 # Run all tests
cargo test -- --nocapture # With output
```

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Commit changes
git add .
git commit -m "feat: add my feature"

# Push and create PR
git push origin feature/my-feature

# Update branch
git fetch origin
git rebase origin/main

# Merge to main
git checkout main
git merge feature/my-feature
git push origin main
```

### Deployment

```bash
# Deploy to testnet (automatic on merge to main)
git push origin main

# Deploy manually
export STELLAR_SECRET_KEY="your-key"
./scripts/deploy.sh

# Create release
git tag v1.0.0
git push origin v1.0.0
```

## 📋 Workflow Triggers

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| CI | Push, PR | Run tests and checks |
| CD | Push to main | Deploy to testnet |
| Release | Tag push | Create GitHub release |
| Code Quality | PR to main | Quality checks |
| Performance | Daily, PR | Performance tests |
| Dependencies | Weekly | Update dependencies |

## ✅ PR Checklist

Before creating a PR:

```bash
# 1. Run tests
npm test

# 2. Run linting
npm run lint

# 3. Check TypeScript
npx tsc --noEmit

# 4. Build
npm run build

# 5. Commit with conventional message
git commit -m "feat: add feature"

# 6. Push
git push origin feature/my-feature
```

## 🔍 Debugging

### Check CI Status

```bash
# View workflow runs
gh run list

# View specific run
gh run view <run-id>

# Watch run
gh run watch
```

### Check Deployment

```bash
# View deployments
gh api repos/:owner/:repo/deployments

# Check contract
soroban contract inspect --id <contract-id>
```

### Check Logs

```bash
# Frontend logs
npm run dev

# Contract logs
cargo test -- --nocapture
```

## 🐛 Common Issues

### Tests Failing

```bash
# Clear cache
rm -rf .next node_modules
npm install

# Run with verbose
npm test -- --verbose
```

### Build Failing

```bash
# Clear build
rm -rf .next
npm run build

# Check TypeScript
npx tsc --noEmit
```

### Deployment Failing

```bash
# Check account balance
soroban config identity address

# Verify secrets
echo $STELLAR_SECRET_KEY
echo $SOROBAN_RPC_URL

# Test deployment locally
./scripts/deploy.sh
```

## 📊 Status Badges

Add to README.md:

```markdown
![CI](https://github.com/USER/REPO/workflows/CI/badge.svg)
![CD](https://github.com/USER/REPO/workflows/CD%20-%20Deploy/badge.svg)
![Quality](https://github.com/USER/REPO/workflows/Code%20Quality/badge.svg)
```

## 🔗 Quick Links

- [CI/CD Documentation](.github/CICD.md)
- [Setup Guide](.github/CICD_SETUP.md)
- [Developer Guide](.github/DEVELOPER_GUIDE.md)
- [GitHub Actions](https://github.com/YOUR_REPO/actions)
- [Releases](https://github.com/YOUR_REPO/releases)

## 💡 Tips

- Use `git commit -m "type: message"` for conventional commits
- Run tests before pushing
- Keep PRs small and focused
- Update documentation with code changes
- Review CI logs for failures
- Use draft PRs for work in progress

## 🆘 Getting Help

1. Check workflow logs in GitHub Actions
2. Review documentation in `.github/`
3. Search existing issues
4. Ask in team chat
5. Create new issue with details

---

Keep this handy for quick reference! 📌
