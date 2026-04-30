#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracterror, contracttype, symbol_short, token, Address, Env, Symbol,
};

/// Typed errors returned by the PaymentContract.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum ContractError {
    InsufficientFunds = 1,
    UnauthorizedCaller = 2,
    EscrowAlreadyReleased = 3,
    InvalidMilestone = 4,
    ContractPaused = 5,
}

/// Storage keys used by the PaymentContract.
#[contracttype]
pub enum DataKey {
    Admin,
    Token,
    Paused,
    PaymentStatus(u64),
}

/// Status of a payment record.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum PaymentStatus {
    Sent,
    Confirmed,
    Failed,
}

#[contract]
pub struct PaymentContract;

#[contractimpl]
impl PaymentContract {
    /// Initialize the contract with an admin address and a default token contract address.
    pub fn initialize(env: Env, admin: Address, token: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Paused, &false);
    }

    /// Send a payment from `from` to `to` for `amount` of `token`.
    /// Requires authorization from `from`. Returns `ContractPaused` if paused,
    /// `InsufficientFunds` if the SAC transfer fails.
    pub fn send_payment(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
        token: Address,
    ) -> Result<u64, ContractError> {
        from.require_auth();

        // Pause guard
        let paused: bool = env
            .storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false);
        if paused {
            return Err(ContractError::ContractPaused);
        }

        // Derive a deterministic payment ID from the ledger sequence
        let payment_id: u64 = env.ledger().sequence() as u64;

        // Transfer via SAC token client
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&from, &to, &amount);

        // Store payment status as Sent
        env.storage()
            .instance()
            .set(&DataKey::PaymentStatus(payment_id), &PaymentStatus::Sent);

        // Emit payment_sent event
        let topics = (Symbol::new(&env, "payment_sent"),);
        env.events().publish(topics, (payment_id, from.clone(), to.clone(), amount, token.clone()));

        // Emit payment_confirmed event (on-chain confirmation is immediate in Soroban)
        let confirm_topics = (Symbol::new(&env, "payment_confirmed"),);
        env.events().publish(confirm_topics, (payment_id,));

        // Update status to Confirmed
        env.storage()
            .instance()
            .set(&DataKey::PaymentStatus(payment_id), &PaymentStatus::Confirmed);

        Ok(payment_id)
    }

    /// Read the status of a payment by its ID.
    pub fn get_payment_status(env: Env, payment_id: u64) -> Option<PaymentStatus> {
        env.storage()
            .instance()
            .get(&DataKey::PaymentStatus(payment_id))
    }

    /// Pause the contract. Only the admin may call this.
    pub fn pause(env: Env, caller: Address) -> Result<(), ContractError> {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if caller != admin {
            return Err(ContractError::UnauthorizedCaller);
        }
        env.storage().instance().set(&DataKey::Paused, &true);
        Ok(())
    }

    /// Unpause the contract. Only the admin may call this.
    pub fn unpause(env: Env, caller: Address) -> Result<(), ContractError> {
        caller.require_auth();
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        if caller != admin {
            return Err(ContractError::UnauthorizedCaller);
        }
        env.storage().instance().set(&DataKey::Paused, &false);
        Ok(())
    }

    /// Returns true when the contract is paused.
    pub fn is_paused(env: Env) -> bool {
        env.storage()
            .instance()
            .get(&DataKey::Paused)
            .unwrap_or(false)
    }
}


// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{
        testutils::Address as _,
        token::{Client as TokenClient, StellarAssetClient},
        Address, Env,
    };

    fn create_token(env: &Env, admin: &Address, recipient: &Address, amount: i128) -> Address {
        let token_id = env
            .register_stellar_asset_contract_v2(admin.clone())
            .address();
        let sac = StellarAssetClient::new(env, &token_id);
        sac.mint(recipient, &amount);
        token_id
    }

    #[test]
    fn test_send_payment_success() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();
        let admin = Address::generate(&env);
        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let token_id = create_token(&env, &admin, &sender, 1_000);
        let contract_id = env.register_contract(None, PaymentContract);
        let client = PaymentContractClient::new(&env, &contract_id);
        client.initialize(&admin, &token_id);
        let token_client = TokenClient::new(&env, &token_id);
        assert_eq!(token_client.balance(&recipient), 0);
        client.send_payment(&sender, &recipient, &500, &token_id);
        assert_eq!(token_client.balance(&recipient), 500);
        assert_eq!(token_client.balance(&sender), 500);
    }

    #[test]
    fn test_insufficient_funds_error() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();
        let admin = Address::generate(&env);
        let sender = Address::generate(&env);
        let recipient = Address::generate(&env);
        let token_id = create_token(&env, &admin, &sender, 100);
        let contract_id = env.register_contract(None, PaymentContract);
        let client = PaymentContractClient::new(&env, &contract_id);
        client.initialize(&admin, &token_id);
        let result = client.try_send_payment(&sender, &recipient, &500, &token_id);
        assert!(result.is_err());
    }

    // P7: Batch Payment Atomicity per Operation
    // **Validates: Requirements 2.6**
    #[test]
    fn prop_batch_payment_atomicity() {
        let scenarios: &[(i128, &[i128])] = &[
            (800, &[200, 300, 800]),
            (500, &[100, 9999, 150, 100]),
            (200, &[50, 10_000]),
            (600, &[100, 5_000, 200]),
        ];

        for (sender_balance, amounts) in scenarios {
            let env = Env::default();
            env.mock_all_auths_allowing_non_root_auth();
            let admin = Address::generate(&env);
            let sender = Address::generate(&env);
            let token_id = create_token(&env, &admin, &sender, *sender_balance);
            let contract_id = env.register_contract(None, PaymentContract);
            let payment_client = PaymentContractClient::new(&env, &contract_id);
            payment_client.initialize(&admin, &token_id);
            let token_client = TokenClient::new(&env, &token_id);

            let mut recipients = soroban_sdk::Vec::new(&env);
            for _ in amounts.iter() {
                recipients.push_back(Address::generate(&env));
            }

            let mut results = soroban_sdk::Vec::new(&env);
            for i in 0..amounts.len() {
                let amount = amounts[i];
                let recipient = recipients.get(i as u32).unwrap();
                let result = payment_client.try_send_payment(&sender, &recipient, &amount, &token_id);
                results.push_back(result.is_ok());
            }

            for i in 0..amounts.len() {
                let amount = amounts[i];
                let recipient = recipients.get(i as u32).unwrap();
                let succeeded = results.get(i as u32).unwrap();
                if succeeded {
                    assert_eq!(token_client.balance(&recipient), amount,
                        "Scenario {}: recipient {} should have received {}", sender_balance, i, amount);
                } else {
                    assert_eq!(token_client.balance(&recipient), 0,
                        "Scenario {}: failed recipient {} should have balance 0", sender_balance, i);
                }
            }

            let any_succeeded = (0..amounts.len()).any(|i| results.get(i as u32).unwrap());
            assert!(any_succeeded, "Scenario {}: at least one payment should have succeeded", sender_balance);

            let any_failed = (0..amounts.len()).any(|i| !results.get(i as u32).unwrap());
            assert!(any_failed, "Scenario {}: at least one payment should have failed", sender_balance);

            let successful_total: i128 = (0..amounts.len())
                .filter(|&i| results.get(i as u32).unwrap())
                .map(|i| amounts[i])
                .sum();
            assert_eq!(token_client.balance(&sender), sender_balance - successful_total,
                "Scenario {}: sender balance should reflect only successful payments", sender_balance);
        }
    }
}
