# Deployment Checklist

Complete this checklist before and after deploying to production.

## 📋 Pre-Deployment

### 1. Update Test Wallet Addresses

- [ ] Create 6+ test wallet addresses on Stellar Testnet
- [ ] Fund each wallet with test XLM using friendbot
- [ ] Update `README.md` with actual wallet addresses
- [ ] Update `TEST_WALLETS.md` with wallet details
- [ ] Verify all addresses on [Stellar Expert](https://stellar.expert/explorer/testnet)

**Quick Command:**
```bash
# Generate test wallets
for i in {1..6}; do
  soroban config identity generate test-user-$i
  ADDRESS=$(soroban config identity address test-user-$i)
  echo "Test User $i: $ADDRESS"
  curl "https://friendbot.stellar.org?addr=$ADDRESS"
done
```

### 2. Deploy Smart Contracts

- [ ] Build contracts: `cd contracts && cargo build --target wasm32-unknown-unknown --release`
- [ ] Deploy Payment contract
- [ ] Deploy Escrow contract
- [ ] Save contract IDs
- [ ] Update `.env.local` with contract IDs
- [ ] Update `README.md` with contract IDs and Explorer links
- [ ] Verify contracts on Stellar Expert

**Deployment Command:**
```bash
export STELLAR_SECRET_KEY="your-secret-key"
./scripts/deploy.sh
```

### 3. Configure Environment Variables

- [ ] Update `frontend/.env.local` with:
  - `NEXT_PUBLIC_PAYMENT_CONTRACT_ID`
  - `NEXT_PUBLIC_ESCROW_CONTRACT_ID`
  - `NEXT_PUBLIC_HORIZON_URL`
  - `NEXT_PUBLIC_SOROBAN_RPC_URL`
  - `NEXT_PUBLIC_NETWORK_PASSPHRASE`

### 4. Test Locally

- [ ] Run frontend: `cd frontend && npm run dev`
- [ ] Test wallet connection (Freighter & Albedo)
- [ ] Test payment functionality
- [ ] Test escrow creation
- [ ] Test milestone releases
- [ ] Test batch payments
- [ ] Test invoice generation
- [ ] Test transaction history
- [ ] Test activity feed

### 5. Run All Tests

- [ ] Frontend unit tests: `npm test`
- [ ] E2E tests: `npm run test:e2e`
- [ ] Contract tests: `cd contracts && cargo test`
- [ ] Linting: `npm run lint`
- [ ] TypeScript check: `npx tsc --noEmit`

### 6. Build for Production

- [ ] Build frontend: `npm run build`
- [ ] Check build size
- [ ] Test production build locally: `npm start`
- [ ] Verify no console errors

## 🚀 Deployment

### 7. Deploy to Vercel

- [ ] Connect repository to Vercel
- [ ] Configure environment variables in Vercel
- [ ] Deploy to production
- [ ] Verify deployment URL: `http://stellarfreelance.vercel.app/`
- [ ] Test all features on live site

**Vercel Deployment:**
```bash
cd frontend
vercel --prod
```

### 8. Update Documentation

- [ ] Update `README.md` with live demo link
- [ ] Update contract IDs in README
- [ ] Update wallet addresses in README
- [ ] Add feedback form link
- [ ] Update deployment date
- [ ] Update version number

### 9. Configure GitHub

- [ ] Set up GitHub secrets for CI/CD
- [ ] Configure environments (testnet, mainnet)
- [ ] Enable GitHub Actions
- [ ] Set up branch protection rules
- [ ] Add status badges to README

## ✅ Post-Deployment

### 10. Verify Live Deployment

- [ ] Visit live demo: http://stellarfreelance.vercel.app/
- [ ] Test wallet connection
- [ ] Send test payment
- [ ] Create test escrow
- [ ] Generate test invoice
- [ ] Check transaction history
- [ ] Verify all links work
- [ ] Test on mobile devices
- [ ] Test on different browsers

### 11. Verify on Stellar Explorer

- [ ] Check all test wallet addresses are visible
- [ ] Verify contract deployments
- [ ] Check transaction history
- [ ] Verify contract interactions
- [ ] Ensure all transactions are successful

### 12. Update Links

- [ ] Update README with actual Stellar Explorer links
- [ ] Update contract Explorer links
- [ ] Update wallet Explorer links
- [ ] Test all Explorer links work

### 13. Create Release

- [ ] Tag version: `git tag v1.0.0`
- [ ] Push tag: `git push origin v1.0.0`
- [ ] Verify GitHub release created
- [ ] Download and verify artifacts
- [ ] Update release notes

### 14. Share and Promote

- [ ] Share live demo link
- [ ] Share feedback form
- [ ] Post on Stellar Discord
- [ ] Tweet about launch
- [ ] Update portfolio/website
- [ ] Add to Stellar ecosystem list

## 📊 Monitoring

### 15. Set Up Monitoring

- [ ] Monitor Vercel analytics
- [ ] Check GitHub Actions status
- [ ] Monitor error logs
- [ ] Track user feedback
- [ ] Monitor contract interactions
- [ ] Check wallet balances

### 16. Regular Maintenance

- [ ] Weekly: Check feedback responses
- [ ] Weekly: Review error logs
- [ ] Weekly: Refund test wallets if needed
- [ ] Monthly: Update dependencies
- [ ] Monthly: Review and respond to issues
- [ ] Quarterly: Security audit

## 🔧 Quick Reference

### Important URLs

- **Live Demo**: http://stellarfreelance.vercel.app/
- **Feedback Form**: https://docs.google.com/forms/d/1Yh3oM3i3a5mrUeMFo_Rwjh9GyNwqRr7B7FzORdAFob0/edit
- **Stellar Expert**: https://stellar.expert/explorer/testnet
- **GitHub Repo**: [Your GitHub URL]
- **Vercel Dashboard**: [Your Vercel URL]

### Contract IDs

Update these after deployment:

```bash
PAYMENT_CONTRACT_ID="CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
ESCROW_CONTRACT_ID="CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
```

### Test Wallet Addresses

Update these in README.md and TEST_WALLETS.md after creation.

## 📝 Notes

- Keep this checklist updated with each deployment
- Document any issues encountered
- Update procedures based on lessons learned
- Share knowledge with team members

## 🆘 Troubleshooting

### Deployment Fails

1. Check environment variables
2. Verify contract IDs are correct
3. Check Vercel logs
4. Verify build succeeds locally

### Contracts Not Working

1. Verify contract IDs in .env.local
2. Check RPC endpoint is correct
3. Verify network passphrase matches
4. Check contract on Stellar Expert

### Wallet Connection Issues

1. Verify wallet is on testnet
2. Check wallet has XLM balance
3. Try different wallet (Freighter/Albedo)
4. Clear browser cache

---

**Last Updated**: [Date]  
**Version**: 1.0.0  
**Deployed By**: [Your Name]
