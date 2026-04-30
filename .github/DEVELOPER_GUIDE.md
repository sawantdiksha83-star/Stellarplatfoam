# Developer Guide

Quick reference for developers working on the Stellar Freelance Platform.

## 🚀 Quick Start

### Initial Setup

```bash
# Clone repository
git clone <repository-url>
cd stellar-freelance-platform

# Install frontend dependencies
cd frontend
npm install

# Install Rust and Soroban CLI
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install --locked soroban-cli --features opt

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

### Development Workflow

```bash
# Start development server
cd frontend
npm run dev

# Run tests in watch mode
npm test -- --watch

# Run linting
npm run lint

# Build for production
npm run build
```

## 🔄 Git Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation updates
- `refactor/what-changed` - Code refactoring
- `test/what-added` - Test additions

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add batch payment functionality
fix: resolve wallet connection timeout
docs: update deployment instructions
chore: upgrade dependencies
test: add escrow contract tests
refactor: simplify payment form logic
```

### Pull Request Process

1. **Create feature branch**
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "feat: add my feature"
   ```

3. **Push to remote**
   ```bash
   git push origin feature/my-feature
   ```

4. **Create Pull Request**
   - Go to GitHub
   - Click "New Pull Request"
   - Fill in description
   - Request reviews

5. **Wait for CI checks**
   - All tests must pass
   - Code coverage maintained
   - No linting errors

6. **Address review comments**
   ```bash
   git add .
   git commit -m "fix: address review comments"
   git push
   ```

7. **Merge when approved**
   - Squash and merge (preferred)
   - Delete branch after merge

## 🧪 Testing

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run specific test file
npm test -- PaymentForm.test.tsx

# Run with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e

# Run E2E in UI mode
npx playwright test --ui
```

### Contract Tests

```bash
cd contracts

# Run all tests
cargo test

# Run specific test
cargo test test_send_payment

# Run with output
cargo test -- --nocapture

# Run benchmarks
cargo bench
```

## 🔍 Debugging

### Frontend Debugging

```bash
# Enable verbose logging
DEBUG=* npm run dev

# Check TypeScript errors
npx tsc --noEmit

# Analyze bundle
npm run build
npx @next/bundle-analyzer
```

### Contract Debugging

```bash
# Build with debug info
cargo build --target wasm32-unknown-unknown

# Check contract size
ls -lh target/wasm32-unknown-unknown/release/*.wasm

# Inspect contract
soroban contract inspect --wasm target/wasm32-unknown-unknown/release/payment.wasm
```

## 📦 Building

### Frontend Build

```bash
cd frontend

# Development build
npm run dev

# Production build
npm run build

# Start production server
npm start

# Export static site
npm run export
```

### Contract Build

```bash
cd contracts

# Build all contracts
cargo build --target wasm32-unknown-unknown --release

# Build specific contract
cd payment
cargo build --target wasm32-unknown-unknown --release

# Optimize WASM
soroban contract optimize --wasm target/wasm32-unknown-unknown/release/payment.wasm
```

## 🚀 Deployment

### Local Deployment

```bash
# Set environment variables
export STELLAR_SECRET_KEY="your-secret-key"
export SOROBAN_RPC_URL="https://soroban-testnet.stellar.org"
export NETWORK_PASSPHRASE="Test SDF Network ; September 2015"

# Run deployment script
./scripts/deploy.sh

# Update frontend .env.local with contract IDs
```

### CI/CD Deployment

```bash
# Deploy to testnet (automatic on merge to main)
git push origin main

# Deploy to mainnet (manual trigger)
# Go to GitHub Actions → CD - Deploy → Run workflow → Select mainnet

# Create release
git tag v1.0.0
git push origin v1.0.0
```

## 🔧 Common Tasks

### Add New Component

```bash
cd frontend/components

# Create component file
cat > MyComponent.tsx << 'EOF'
'use client';

interface MyComponentProps {
  // props
}

export default function MyComponent({ }: MyComponentProps) {
  return (
    <div>
      {/* component content */}
    </div>
  );
}
EOF

# Create test file
cat > ../tests/MyComponent.test.tsx << 'EOF'
import { render, screen } from '@testing-library/react';
import MyComponent from '../components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    // assertions
  });
});
EOF
```

### Add New Contract Function

```bash
cd contracts/payment/src

# Edit lib.rs
# Add function implementation
# Add tests

# Run tests
cargo test

# Build
cargo build --target wasm32-unknown-unknown --release
```

### Update Dependencies

```bash
# Frontend dependencies
cd frontend
npm update
npm audit fix

# Contract dependencies
cd contracts
cargo update
cargo audit fix
```

## 🐛 Troubleshooting

### Common Issues

**Issue: Wallet not connecting**
```bash
# Check browser console for errors
# Verify wallet extension is installed
# Try different wallet (Freighter/Albedo)
# Clear browser cache
```

**Issue: Contract deployment fails**
```bash
# Check account balance
soroban config identity address

# Verify network configuration
echo $SOROBAN_RPC_URL
echo $NETWORK_PASSPHRASE

# Check contract build
ls -lh contracts/target/wasm32-unknown-unknown/release/*.wasm
```

**Issue: Tests failing**
```bash
# Clear caches
rm -rf frontend/.next
rm -rf frontend/node_modules
npm install

# Reset test database
rm -rf frontend/.jest-cache

# Run tests with verbose output
npm test -- --verbose
```

**Issue: Build errors**
```bash
# Clear build artifacts
cd frontend
rm -rf .next
npm run build

cd ../contracts
cargo clean
cargo build --target wasm32-unknown-unknown --release
```

## 📚 Resources

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Stellar Docs](https://developers.stellar.org)
- [Soroban Docs](https://soroban.stellar.org)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [Rust Book](https://doc.rust-lang.org/book)

### Tools
- [Stellar Laboratory](https://laboratory.stellar.org)
- [Stellar Expert](https://stellar.expert)
- [Freighter Wallet](https://www.freighter.app)
- [Albedo Wallet](https://albedo.link)

### Community
- [Stellar Discord](https://discord.gg/stellardev)
- [Stellar Stack Exchange](https://stellar.stackexchange.com)
- [GitHub Discussions](https://github.com/stellar/soroban-docs/discussions)

## 💡 Best Practices

### Code Style
- Use TypeScript strict mode
- Follow ESLint rules
- Write meaningful comments
- Keep functions small and focused
- Use descriptive variable names

### Testing
- Write tests for new features
- Maintain >80% code coverage
- Test edge cases
- Mock external dependencies
- Use meaningful test descriptions

### Performance
- Optimize bundle size
- Lazy load components
- Use React.memo for expensive components
- Minimize re-renders
- Optimize images

### Security
- Never commit secrets
- Validate user input
- Use environment variables
- Keep dependencies updated
- Follow security best practices

## 🤝 Getting Help

1. **Check Documentation**: Review this guide and project docs
2. **Search Issues**: Look for similar issues on GitHub
3. **Ask Community**: Post in Stellar Discord
4. **Create Issue**: Open a GitHub issue with details
5. **Contact Team**: Reach out to maintainers

## 📝 Checklist

Before submitting a PR:

- [ ] Code follows style guidelines
- [ ] Tests added for new features
- [ ] All tests passing
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main
- [ ] PR description is clear

---

Happy coding! 🚀
