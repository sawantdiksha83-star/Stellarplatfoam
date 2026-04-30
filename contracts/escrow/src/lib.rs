#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracterror, contracttype, token, Address, Env, String, Symbol, Vec,
};

/// Typed errors returned by the EscrowContract.
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

/// A single milestone within an escrow agreement.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Milestone {
    pub id: u32,
    pub amount: i128,
    pub description: String,
    pub released: bool,
}

/// An escrow agreement between a client and freelancer.
#[contracttype]
#[derive(Clone, Debug)]
pub struct Escrow {
    pub id: u64,
    pub client: Address,
    pub freelancer: Address,
    pub total: i128,
    pub token: Address,
    pub milestones: Vec<Milestone>,
}

/// Storage keys used by the EscrowContract.
#[contracttype]
pub enum DataKey {
    Admin,
    PaymentContract,
    Paused,
    Escrow(u64),
    EscrowCount,
}


// ---------------------------------------------------------------------------
// PaymentContract client (cross-contract call interface)
// ---------------------------------------------------------------------------

mod payment_contract {
    use soroban_sdk::{contractclient, Address, Env};

    #[contractclient(name = "PaymentContractClient")]
    pub trait PaymentContractInterface {
        fn send_payment(
            env: Env,
            from: Address,
            to: Address,
            amount: i128,
            token: Address,
        ) -> Result<u64, crate::ContractError>;
    }
}

use payment_contract::PaymentContractClient;

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

fn require_not_paused(env: &Env) -> Result<(), ContractError> {
    let paused: bool = env
        .storage()
        .instance()
        .get(&DataKey::Paused)
        .unwrap_or(false);
    if paused {
        Err(ContractError::ContractPaused)
    } else {
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    // -----------------------------------------------------------------------
    // Admin / lifecycle
    // -----------------------------------------------------------------------

    /// Initialize the contract with an admin and the PaymentContract address.
    pub fn initialize(env: Env, admin: Address, payment_contract: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::PaymentContract, &payment_contract);
        env.storage().instance().set(&DataKey::Paused, &false);
        env.storage().instance().set(&DataKey::EscrowCount, &0u64);
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

    // -----------------------------------------------------------------------
    // Escrow lifecycle
    // -----------------------------------------------------------------------

    /// Create a new milestone-based escrow.
    /// Requires authorization from `client`.
    /// Validates that the sum of milestone amounts equals `total`.
    /// Transfers `total` tokens from `client` to this contract.
    pub fn create_escrow(
        env: Env,
        client: Address,
        freelancer: Address,
        total: i128,
        token: Address,
        milestones: Vec<Milestone>,
    ) -> Result<u64, ContractError> {
        client.require_auth();
        require_not_paused(&env)?;

        // Validate milestone sum == total
        let mut sum: i128 = 0;
        for i in 0..milestones.len() {
            sum += milestones.get(i).unwrap().amount;
        }
        if sum != total {
            return Err(ContractError::InsufficientFunds);
        }

        // Transfer total from client to this contract
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&client, &env.current_contract_address(), &total);

        // Assign escrow ID
        let escrow_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::EscrowCount)
            .unwrap_or(0u64);
        let next_id = escrow_id + 1;
        env.storage()
            .instance()
            .set(&DataKey::EscrowCount, &next_id);

        let escrow = Escrow {
            id: escrow_id,
            client: client.clone(),
            freelancer: freelancer.clone(),
            total,
            token,
            milestones,
        };
        env.storage()
            .instance()
            .set(&DataKey::Escrow(escrow_id), &escrow);

        // Emit escrow_created event
        env.events().publish(
            (Symbol::new(&env, "escrow_created"),),
            (escrow_id, client, freelancer, total),
        );

        Ok(escrow_id)
    }

    /// Release a specific milestone, transferring its amount to the freelancer
    /// via the PaymentContract. Requires authorization from `client`.
    pub fn release_milestone(
        env: Env,
        client: Address,
        escrow_id: u64,
        milestone_id: u32,
    ) -> Result<(), ContractError> {
        client.require_auth();
        require_not_paused(&env)?;

        let mut escrow: Escrow = env
            .storage()
            .instance()
            .get(&DataKey::Escrow(escrow_id))
            .unwrap();

        if client != escrow.client {
            return Err(ContractError::UnauthorizedCaller);
        }

        // Find the milestone
        let mut found = false;
        let mut updated_milestones: Vec<Milestone> = Vec::new(&env);
        for i in 0..escrow.milestones.len() {
            let mut m = escrow.milestones.get(i).unwrap();
            if m.id == milestone_id {
                found = true;
                if m.released {
                    return Err(ContractError::EscrowAlreadyReleased);
                }
                // Call PaymentContract to transfer funds to freelancer
                let payment_contract: Address = env
                    .storage()
                    .instance()
                    .get(&DataKey::PaymentContract)
                    .unwrap();
                let payment_client = PaymentContractClient::new(&env, &payment_contract);
                payment_client.send_payment(
                    &env.current_contract_address(),
                    &escrow.freelancer,
                    &m.amount,
                    &escrow.token,
                );

                m.released = true;

                // Emit milestone_released event
                env.events().publish(
                    (Symbol::new(&env, "milestone_released"),),
                    (escrow_id, milestone_id, m.amount),
                );
            }
            updated_milestones.push_back(m);
        }

        if !found {
            return Err(ContractError::InvalidMilestone);
        }

        escrow.milestones = updated_milestones;
        env.storage()
            .instance()
            .set(&DataKey::Escrow(escrow_id), &escrow);

        Ok(())
    }

    /// Raise a dispute on an escrow. Caller must be the client or freelancer.
    pub fn dispute_escrow(
        env: Env,
        caller: Address,
        escrow_id: u64,
    ) -> Result<(), ContractError> {
        caller.require_auth();
        require_not_paused(&env)?;

        let escrow: Escrow = env
            .storage()
            .instance()
            .get(&DataKey::Escrow(escrow_id))
            .unwrap();

        if caller != escrow.client && caller != escrow.freelancer {
            return Err(ContractError::UnauthorizedCaller);
        }

        // Emit dispute_raised event
        env.events().publish(
            (Symbol::new(&env, "dispute_raised"),),
            (escrow_id, caller),
        );

        Ok(())
    }

    /// Cancel an escrow, refunding all unreleased milestone amounts to the client.
    /// Requires authorization from `client`.
    pub fn cancel_escrow(
        env: Env,
        client: Address,
        escrow_id: u64,
    ) -> Result<(), ContractError> {
        client.require_auth();
        require_not_paused(&env)?;

        let escrow: Escrow = env
            .storage()
            .instance()
            .get(&DataKey::Escrow(escrow_id))
            .unwrap();

        if client != escrow.client {
            return Err(ContractError::UnauthorizedCaller);
        }

        // Sum unreleased milestone amounts and refund to client
        let token_client = token::Client::new(&env, &escrow.token);
        let mut refund_total: i128 = 0;
        for i in 0..escrow.milestones.len() {
            let m = escrow.milestones.get(i).unwrap();
            if !m.released {
                refund_total += m.amount;
            }
        }

        if refund_total > 0 {
            token_client.transfer(&env.current_contract_address(), &client, &refund_total);
        }

        // Emit escrow_cancelled event
        env.events().publish(
            (Symbol::new(&env, "escrow_cancelled"),),
            (escrow_id, client, refund_total),
        );

        // Remove escrow from storage
        env.storage().instance().remove(&DataKey::Escrow(escrow_id));

        Ok(())
    }

    /// Read an escrow by ID.
    pub fn get_escrow(env: Env, escrow_id: u64) -> Option<Escrow> {
        env.storage().instance().get(&DataKey::Escrow(escrow_id))
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
        Address, Env, String,
    };

    // -----------------------------------------------------------------------
    // Test helpers
    // -----------------------------------------------------------------------

    /// Deploy a mock SAC token, mint `amount` to `recipient`, and return the token address.
    fn create_token(env: &Env, admin: &Address, recipient: &Address, amount: i128) -> Address {
        let token_id = env.register_stellar_asset_contract(admin.clone());
        let sac = StellarAssetClient::new(env, &token_id);
        sac.mint(recipient, &amount);
        token_id
    }

    /// Build a simple milestone list with a single milestone.
    fn single_milestone(env: &Env, amount: i128) -> Vec<Milestone> {
        let mut ms = Vec::new(env);
        ms.push_back(Milestone {
            id: 0,
            amount,
            description: String::from_str(env, "Task 1"),
            released: false,
        });
        ms
    }

    /// Build a milestone list with two milestones.
    fn two_milestones(env: &Env, a1: i128, a2: i128) -> Vec<Milestone> {
        let mut ms = Vec::new(env);
        ms.push_back(Milestone {
            id: 0,
            amount: a1,
            description: String::from_str(env, "Task 1"),
            released: false,
        });
        ms.push_back(Milestone {
            id: 1,
            amount: a2,
            description: String::from_str(env, "Task 2"),
            released: false,
        });
        ms
    }

    // -----------------------------------------------------------------------
    // Minimal mock PaymentContract for testing
    // -----------------------------------------------------------------------

    /// A minimal PaymentContract mock that just does a token transfer.
    #[contract]
    pub struct MockPaymentContract;

    #[contractimpl]
    impl MockPaymentContract {
        pub fn send_payment(
            env: Env,
            from: Address,
            to: Address,
            amount: i128,
            token: Address,
        ) -> Result<u64, ContractError> {
            from.require_auth();
            let token_client = token::Client::new(&env, &token);
            token_client.transfer(&from, &to, &amount);
            Ok(env.ledger().sequence() as u64)
        }
    }

    // -----------------------------------------------------------------------
    // Unit tests (Requirements 14.2, 14.3, 14.5)
    // -----------------------------------------------------------------------

    #[test]
    fn test_escrow_milestone_release() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();

        let admin = Address::generate(&env);
        let client_addr = Address::generate(&env);
        let freelancer_addr = Address::generate(&env);

        let payment_id = env.register(MockPaymentContract, ());
        let escrow_id_addr = env.register(EscrowContract, ());
        let token_id = create_token(&env, &admin, &client_addr, 1_000);

        let escrow_client = EscrowContractClient::new(&env, &escrow_id_addr);
        escrow_client.initialize(&admin, &payment_id);

        let milestones = single_milestone(&env, 500);
        let eid = escrow_client.create_escrow(
            &client_addr,
            &freelancer_addr,
            &500,
            &token_id,
            &milestones,
        );

        // Freelancer balance before release
        let token_client = TokenClient::new(&env, &token_id);
        assert_eq!(token_client.balance(&freelancer_addr), 0);

        escrow_client.release_milestone(&client_addr, &eid, &0u32);

        // Freelancer should have received 500
        assert_eq!(token_client.balance(&freelancer_addr), 500);
    }

    #[test]
    fn test_unauthorized_dispute() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();

        let admin = Address::generate(&env);
        let client_addr = Address::generate(&env);
        let freelancer_addr = Address::generate(&env);
        let stranger = Address::generate(&env);

        let payment_id = env.register(MockPaymentContract, ());
        let escrow_id_addr = env.register(EscrowContract, ());
        let token_id = create_token(&env, &admin, &client_addr, 1_000);

        let escrow_client = EscrowContractClient::new(&env, &escrow_id_addr);
        escrow_client.initialize(&admin, &payment_id);

        let milestones = single_milestone(&env, 1_000);
        let eid = escrow_client.create_escrow(
            &client_addr,
            &freelancer_addr,
            &1_000,
            &token_id,
            &milestones,
        );

        let result = escrow_client.try_dispute_escrow(&stranger, &eid);
        assert_eq!(result, Err(Ok(ContractError::UnauthorizedCaller)));
    }

    #[test]
    fn test_cancel_escrow_refunds_client() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();

        let admin = Address::generate(&env);
        let client_addr = Address::generate(&env);
        let freelancer_addr = Address::generate(&env);

        let payment_id = env.register(MockPaymentContract, ());
        let escrow_id_addr = env.register(EscrowContract, ());
        let token_id = create_token(&env, &admin, &client_addr, 1_000);

        let escrow_client = EscrowContractClient::new(&env, &escrow_id_addr);
        escrow_client.initialize(&admin, &payment_id);

        let milestones = two_milestones(&env, 400, 600);
        let eid = escrow_client.create_escrow(
            &client_addr,
            &freelancer_addr,
            &1_000,
            &token_id,
            &milestones,
        );

        // Release first milestone (400)
        escrow_client.release_milestone(&client_addr, &eid, &0u32);

        let token_client = TokenClient::new(&env, &token_id);
        // Client spent 1000, freelancer got 400 → client balance = 0
        assert_eq!(token_client.balance(&client_addr), 0);

        // Cancel escrow — should refund 600 (unreleased)
        escrow_client.cancel_escrow(&client_addr, &eid);
        assert_eq!(token_client.balance(&client_addr), 600);
    }

    // -----------------------------------------------------------------------
    // Property tests
    // -----------------------------------------------------------------------

    // P2: Milestone Monotonicity — once released=true it can never revert to false
    // (Requirements 3.6, 3.7)
    #[test]
    fn prop_milestone_monotonicity() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();

        let admin = Address::generate(&env);
        let client_addr = Address::generate(&env);
        let freelancer_addr = Address::generate(&env);

        let payment_id = env.register(MockPaymentContract, ());
        let escrow_id_addr = env.register(EscrowContract, ());
        let token_id = create_token(&env, &admin, &client_addr, 2_000);

        let escrow_client = EscrowContractClient::new(&env, &escrow_id_addr);
        escrow_client.initialize(&admin, &payment_id);

        // Test with multiple milestone amounts
        for amount in [100i128, 500, 1000] {
            let token_id2 = create_token(&env, &admin, &client_addr, amount);
            let milestones = single_milestone(&env, amount);
            let eid = escrow_client.create_escrow(
                &client_addr,
                &freelancer_addr,
                &amount,
                &token_id2,
                &milestones,
            );

            // Release milestone 0
            escrow_client.release_milestone(&client_addr, &eid, &0u32);

            // Verify released=true in storage
            let escrow = escrow_client.get_escrow(&eid).unwrap();
            assert!(escrow.milestones.get(0).unwrap().released);

            // Attempting to release again must return EscrowAlreadyReleased
            let result = escrow_client.try_release_milestone(&client_addr, &eid, &0u32);
            assert_eq!(result, Err(Ok(ContractError::EscrowAlreadyReleased)));

            // Verify released is still true (not reverted)
            let escrow2 = escrow_client.get_escrow(&eid).unwrap();
            assert!(escrow2.milestones.get(0).unwrap().released);
        }
    }

    // P3: Escrow Total Integrity — sum of milestone amounts == stored total
    // (Requirement 3.1)
    #[test]
    fn prop_escrow_total_integrity() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();

        let admin = Address::generate(&env);
        let client_addr = Address::generate(&env);
        let freelancer_addr = Address::generate(&env);

        let payment_id = env.register(MockPaymentContract, ());
        let escrow_id_addr = env.register(EscrowContract, ());

        let escrow_client = EscrowContractClient::new(&env, &escrow_id_addr);
        escrow_client.initialize(&admin, &payment_id);

        // Test various milestone distributions
        let distributions: &[(i128, i128)] = &[(100, 200), (500, 500), (1, 999), (333, 667)];
        for (a1, a2) in distributions {
            let total = a1 + a2;
            let token_id = create_token(&env, &admin, &client_addr, total);
            let milestones = two_milestones(&env, *a1, *a2);
            let eid = escrow_client.create_escrow(
                &client_addr,
                &freelancer_addr,
                &total,
                &token_id,
                &milestones,
            );

            let escrow = escrow_client.get_escrow(&eid).unwrap();
            let sum: i128 = (0..escrow.milestones.len())
                .map(|i| escrow.milestones.get(i).unwrap().amount)
                .sum();
            assert_eq!(sum, escrow.total);
        }
    }

    // P4: Authorization Exclusivity — only client can release/cancel; only client or freelancer can dispute
    // (Requirements 3.5, 4.2, 6.6, 17.3)
    #[test]
    fn prop_authorization_exclusivity() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();

        let admin = Address::generate(&env);
        let client_addr = Address::generate(&env);
        let freelancer_addr = Address::generate(&env);
        let stranger = Address::generate(&env);

        let payment_id = env.register(MockPaymentContract, ());
        let escrow_id_addr = env.register(EscrowContract, ());
        let token_id = create_token(&env, &admin, &client_addr, 1_000);

        let escrow_client = EscrowContractClient::new(&env, &escrow_id_addr);
        escrow_client.initialize(&admin, &payment_id);

        let milestones = single_milestone(&env, 1_000);
        let eid = escrow_client.create_escrow(
            &client_addr,
            &freelancer_addr,
            &1_000,
            &token_id,
            &milestones,
        );

        // Stranger cannot release milestone
        let r1 = escrow_client.try_release_milestone(&stranger, &eid, &0u32);
        assert_eq!(r1, Err(Ok(ContractError::UnauthorizedCaller)));

        // Stranger cannot cancel escrow
        let r2 = escrow_client.try_cancel_escrow(&stranger, &eid);
        assert_eq!(r2, Err(Ok(ContractError::UnauthorizedCaller)));

        // Stranger cannot dispute
        let r3 = escrow_client.try_dispute_escrow(&stranger, &eid);
        assert_eq!(r3, Err(Ok(ContractError::UnauthorizedCaller)));

        // Client CAN dispute
        let r4 = escrow_client.try_dispute_escrow(&client_addr, &eid);
        assert!(r4.is_ok());

        // Freelancer CAN dispute
        let r5 = escrow_client.try_dispute_escrow(&freelancer_addr, &eid);
        assert!(r5.is_ok());

        // Client CAN release
        let r6 = escrow_client.try_release_milestone(&client_addr, &eid, &0u32);
        assert!(r6.is_ok());

        // Freelancer CANNOT cancel
        let token_id2 = create_token(&env, &admin, &client_addr, 500);
        let ms2 = single_milestone(&env, 500);
        let eid2 = escrow_client.create_escrow(
            &client_addr,
            &freelancer_addr,
            &500,
            &token_id2,
            &ms2,
        );
        let r7 = escrow_client.try_cancel_escrow(&freelancer_addr, &eid2);
        assert_eq!(r7, Err(Ok(ContractError::UnauthorizedCaller)));
    }

    // P6: Cancel Refund Completeness — refunded amount == sum of unreleased milestone amounts
    // (Requirement 3.9)
    #[test]
    fn prop_cancel_refund_completeness() {
        let env = Env::default();
        env.mock_all_auths_allowing_non_root_auth();

        let admin = Address::generate(&env);
        let client_addr = Address::generate(&env);
        let freelancer_addr = Address::generate(&env);

        let payment_id = env.register(MockPaymentContract, ());
        let escrow_id_addr = env.register(EscrowContract, ());

        let escrow_client = EscrowContractClient::new(&env, &escrow_id_addr);
        escrow_client.initialize(&admin, &payment_id);

        // Test: release 0 milestones before cancel → full refund
        {
            let total = 1_000i128;
            let token_id = create_token(&env, &admin, &client_addr, total);
            let token_client = TokenClient::new(&env, &token_id);
            let milestones = two_milestones(&env, 400, 600);
            let eid = escrow_client.create_escrow(
                &client_addr,
                &freelancer_addr,
                &total,
                &token_id,
                &milestones,
            );
            let balance_before = token_client.balance(&client_addr);
            escrow_client.cancel_escrow(&client_addr, &eid);
            let balance_after = token_client.balance(&client_addr);
            assert_eq!(balance_after - balance_before, total);
        }

        // Test: release 1 milestone before cancel → partial refund
        {
            let total = 1_000i128;
            let token_id = create_token(&env, &admin, &client_addr, total);
            let token_client = TokenClient::new(&env, &token_id);
            let milestones = two_milestones(&env, 400, 600);
            let eid = escrow_client.create_escrow(
                &client_addr,
                &freelancer_addr,
                &total,
                &token_id,
                &milestones,
            );
            escrow_client.release_milestone(&client_addr, &eid, &0u32);
            let balance_before = token_client.balance(&client_addr);
            escrow_client.cancel_escrow(&client_addr, &eid);
            let balance_after = token_client.balance(&client_addr);
            // Only the unreleased 600 should be refunded
            assert_eq!(balance_after - balance_before, 600);
        }
    }
}
