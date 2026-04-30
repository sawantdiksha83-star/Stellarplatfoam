# Test Wallet Addresses

This document contains test wallet addresses for the Stellar Freelance Platform on Stellar Testnet.

## 📋 Active Test Wallets

| Wallet Name | Public Address | Purpose | Balance | Explorer Link |
|-------------|----------------|---------|---------|---------------|
| Test User 1 | `GABC123EXAMPLE1STELLAR1ADDRESS1TESTNET1WALLET1ADDR1` | General testing | 10,000 XLM | [View](https://stellar.expert/explorer/testnet/account/GABC123EXAMPLE1STELLAR1ADDRESS1TESTNET1WALLET1ADDR1) |
| Test User 2 | `GDEF456EXAMPLE2STELLAR2ADDRESS2TESTNET2WALLET2ADDR2` | Payment sender | 10,000 XLM | [View](https://stellar.expert/explorer/testnet/account/GDEF456EXAMPLE2STELLAR2ADDRESS2TESTNET2WALLET2ADDR2) |
| Test User 3 | `GHIJ789EXAMPLE3STELLAR3ADDRESS3TESTNET3WALLET3ADDR3` | Payment recipient | 10,000 XLM | [View](https://stellar.expert/explorer/testnet/account/GHIJ789EXAMPLE3STELLAR3ADDRESS3TESTNET3WALLET3ADDR3) |
| Test User 4 | `GKLM012EXAMPLE4STELLAR4ADDRESS4TESTNET4WALLET4ADDR4` | Escrow client | 10,000 XLM | [View](https://stellar.expert/explorer/testnet/account/GKLM012EXAMPLE4STELLAR4ADDRESS4TESTNET4WALLET4ADDR4) |
| Test User 5 | `GNOP345EXAMPLE5STELLAR5ADDRESS5TESTNET5WALLET5ADDR5` | Escrow freelancer | 10,000 XLM | [View](https://stellar.expert/explorer/testnet/account/GNOP345EXAMPLE5STELLAR5ADDRESS5TESTNET5WALLET5ADDR5) |
| Test User 6 | `GQRS678EXAMPLE6STELLAR6ADDRESS6TESTNET6WALLET6ADDR6` | Batch payments | 10,000 XLM | [View](https://stellar.expert/explorer/testnet/account/GQRS678EXAMPLE6STELLAR6ADDRESS6TESTNET6WALLET6ADDR6) |

## 🔧 How to Create Test Wallets

### Method 1: Using Stellar Laboratory (Recommended)

1. Visit [Stellar Laboratory](https://laboratory.stellar.org/#account-creator?network=test)
2. Click "Generate keypair"
3. Save the **Secret Key** securely (never share this!)
4. Copy the **Public Key**
5. Click "Fund account with friendbot" to get test XLM
6. Verify the account on [Stellar Expert](https://stellar.expert/explorer/testnet)

### Method 2: Using Freighter Wallet

1. Install [Freighter Wallet](https://www.freighter.app/)
2. Create a new wallet
3. Switch to "Testnet" network
4. Copy your public address
5. Fund with friendbot:
   ```bash
   curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"
   ```

### Method 3: Using Stellar CLI

```bash
# Generate new keypair
soroban config identity generate test-user-1

# Get public address
soroban config identity address test-user-1

# Fund with friendbot
curl "https://friendbot.stellar.org?addr=$(soroban config identity address test-user-1)"
```

## 📝 Updating This Document

After creating real test wallets:

1. Replace the example addresses with your actual public keys
2. Update the balance column with current balances
3. Verify all Explorer links work correctly
4. Update the README.md with the same addresses
5. Commit the changes to the repository

## 🔐 Security Notes

- **NEVER** commit secret keys to the repository
- Only share public addresses
- These are testnet addresses - no real value
- Regularly rotate test wallets for security practice
- Keep secret keys in a secure password manager

## 🧪 Test Scenarios

### Scenario 1: Simple Payment
- **Sender**: Test User 1
- **Recipient**: Test User 2
- **Amount**: 100 XLM
- **Purpose**: Test basic payment functionality

### Scenario 2: Escrow Creation
- **Client**: Test User 4
- **Freelancer**: Test User 5
- **Total**: 1,000 XLM
- **Milestones**: 3 milestones of 333.33 XLM each
- **Purpose**: Test escrow creation and milestone releases

### Scenario 3: Batch Payment
- **Sender**: Test User 6
- **Recipients**: Test Users 1, 2, 3
- **Amount**: 50 XLM each
- **Purpose**: Test batch payment functionality

### Scenario 4: Invoice Generation
- **Payer**: Test User 1
- **Payee**: Test User 3
- **Amount**: 250 XLM
- **Purpose**: Test invoice PDF generation

## 📊 Transaction History

Track all test transactions:

| Date | From | To | Amount | Type | Tx Hash | Status |
|------|------|----|----|------|---------|--------|
| 2024-01-XX | User 1 | User 2 | 100 XLM | Payment | `abc123...` | ✅ Success |
| 2024-01-XX | User 4 | Escrow | 1000 XLM | Escrow | `def456...` | ✅ Success |
| 2024-01-XX | User 6 | Multiple | 150 XLM | Batch | `ghi789...` | ✅ Success |

## 🔄 Wallet Maintenance

### Weekly Tasks
- [ ] Check wallet balances
- [ ] Refund wallets if needed using friendbot
- [ ] Verify all addresses are active
- [ ] Update transaction history

### Monthly Tasks
- [ ] Review and clean up old transactions
- [ ] Rotate test wallets if needed
- [ ] Update documentation
- [ ] Verify all Explorer links

## 🆘 Troubleshooting

### Wallet Not Funded
```bash
# Refund using friendbot
curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"
```

### Account Not Found
- Wait a few seconds after funding
- Check you're on testnet, not mainnet
- Verify the address is correct

### Low Balance
- Use friendbot to add more test XLM
- Each friendbot call adds 10,000 XLM

## 📚 Resources

- [Stellar Laboratory](https://laboratory.stellar.org)
- [Stellar Expert](https://stellar.expert/explorer/testnet)
- [Freighter Wallet](https://www.freighter.app/)
- [Stellar Documentation](https://developers.stellar.org)
- [Friendbot API](https://developers.stellar.org/docs/fundamentals-and-concepts/testnet-and-pubnet#friendbot)

---

**Last Updated**: 2024-01-XX  
**Network**: Stellar Testnet  
**Total Test Wallets**: 6
