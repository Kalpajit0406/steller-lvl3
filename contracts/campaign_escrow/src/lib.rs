#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, token, Address, Env, String, Symbol
};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[contracttype]
pub enum CampaignState {
    Active = 0,
    Successful = 1,
    Failed = 2,
    Released = 3,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Creator,
    Factory,
    Title,
    Description,
    Goal,
    Deadline,
    Token,
    Raised,
    Released,
    Expired,
    Contributor(Address),
}

#[derive(Clone)]
#[contracttype]
pub struct CampaignInfo {
    pub creator: Address,
    pub factory: Address,
    pub title: String,
    pub description: String,
    pub goal: i128,
    pub deadline: u64,
    pub token: Address,
    pub raised: i128,
    pub state: CampaignState,
}

#[contract]
pub struct CampaignEscrow;

#[contractimpl]
impl CampaignEscrow {
    /// Initialize the campaign escrow contract. Can only be called once.
    pub fn initialize(
        env: Env,
        factory: Address,
        creator: Address,
        title: String,
        description: String,
        goal: i128,
        deadline: u64,
        token: Address,
    ) {
        // Ensure not already initialized by checking if creator exists
        if env.storage().instance().has(&DataKey::Creator) {
            panic!("already initialized");
        }

        // Validate parameters
        if goal <= 0 {
            panic!("goal must be positive");
        }
        if deadline <= env.ledger().timestamp() {
            panic!("deadline must be in the future");
        }

        // Store campaign details
        env.storage().instance().set(&DataKey::Creator, &creator);
        env.storage().instance().set(&DataKey::Factory, &factory);
        env.storage().instance().set(&DataKey::Title, &title);
        env.storage().instance().set(&DataKey::Description, &description);
        env.storage().instance().set(&DataKey::Goal, &goal);
        env.storage().instance().set(&DataKey::Deadline, &deadline);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::Raised, &0i128);
        env.storage().instance().set(&DataKey::Released, &false);
        env.storage().instance().set(&DataKey::Expired, &false);
    }

    /// Pledge funds to the campaign.
    pub fn pledge(env: Env, contributor: Address, amount: i128) {
        contributor.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        // Check if campaign is active
        let state = Self::get_state(env.clone());
        if state != CampaignState::Active {
            panic!("campaign is not active");
        }

        // Get details
        let token_addr = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Token)
            .unwrap();
        let raised = env
            .storage()
            .instance()
            .get::<_, i128>(&DataKey::Raised)
            .unwrap();
        let goal = env
            .storage()
            .instance()
            .get::<_, i128>(&DataKey::Goal)
            .unwrap();

        // Transfer tokens from contributor to escrow contract
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&contributor, &env.current_contract_address(), &amount);

        // Update contributor pledge
        let key = DataKey::Contributor(contributor.clone());
        let current_pledge = env
            .storage()
            .persistent()
            .get::<_, i128>(&key)
            .unwrap_or(0);
        let new_pledge = current_pledge + amount;
        env.storage().persistent().set(&key, &new_pledge);

        // Update raised amount
        let new_raised = raised + amount;
        env.storage().instance().set(&DataKey::Raised, &new_raised);

        // Emit contribution event
        env.events().publish(
            (Symbol::new(&env, "ContributionReceived"), env.current_contract_address()),
            (contributor, amount, new_raised)
        );

        // If goal met, emit CampaignFunded
        if raised < goal && new_raised >= goal {
            env.events().publish(
                (Symbol::new(&env, "CampaignFunded"), env.current_contract_address()),
                new_raised
            );
        }
    }

    /// Release funds to the creator. Can only be done if campaign is Successful.
    pub fn release(env: Env, creator: Address) {
        creator.require_auth();

        // Verify that the caller is indeed the creator
        let campaign_creator = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Creator)
            .unwrap();
        if creator != campaign_creator {
            panic!("only creator can release funds");
        }

        // Check if campaign is successful
        let state = Self::get_state(env.clone());
        if state != CampaignState::Successful {
            panic!("campaign not successful or already released");
        }

        let token_addr = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Token)
            .unwrap();
        let raised = env
            .storage()
            .instance()
            .get::<_, i128>(&DataKey::Raised)
            .unwrap();

        // Mark as released
        env.storage().instance().set(&DataKey::Released, &true);

        // Transfer funds to creator
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &creator, &raised);

        // Emit FundsReleased event
        env.events().publish(
            (Symbol::new(&env, "FundsReleased"), env.current_contract_address()),
            (creator, raised)
        );
    }

    /// Claim refund. Can only be done if the campaign has failed.
    pub fn claim_refund(env: Env, contributor: Address) {
        contributor.require_auth();

        // Check if campaign failed
        let state = Self::get_state(env.clone());
        if state != CampaignState::Failed {
            panic!("campaign has not failed");
        }

        let key = DataKey::Contributor(contributor.clone());
        let pledge_amount = env
            .storage()
            .persistent()
            .get::<_, i128>(&key)
            .unwrap_or(0);
        if pledge_amount <= 0 {
            panic!("no contribution to refund");
        }

        let token_addr = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Token)
            .unwrap();
        let raised = env
            .storage()
            .instance()
            .get::<_, i128>(&DataKey::Raised)
            .unwrap();

        // Reset pledge
        env.storage().persistent().set(&key, &0i128);

        // Decrease total raised
        let new_raised = raised - pledge_amount;
        env.storage().instance().set(&DataKey::Raised, &new_raised);

        // Transfer tokens back to contributor
        let client = token::Client::new(&env, &token_addr);
        client.transfer(&env.current_contract_address(), &contributor, &pledge_amount);

        // Emit RefundClaimed event
        env.events().publish(
            (Symbol::new(&env, "RefundClaimed"), env.current_contract_address()),
            (contributor, pledge_amount)
        );
    }

    /// Check if the campaign has expired and emit the CampaignExpired event if so.
    /// This can be called by anyone to update the state and log the event.
    pub fn check_expiry(env: Env) -> bool {
        let is_expired_emitted = env
            .storage()
            .instance()
            .get::<_, bool>(&DataKey::Expired)
            .unwrap_or(false);

        if is_expired_emitted {
            return true;
        }

        let state = Self::get_state(env.clone());
        if state == CampaignState::Failed {
            env.storage().instance().set(&DataKey::Expired, &true);
            env.events().publish(
                (Symbol::new(&env, "CampaignExpired"), env.current_contract_address()),
                ()
            );
            return true;
        }

        false
    }

    /// Get current state of the campaign.
    pub fn get_state(env: Env) -> CampaignState {
        let released = env
            .storage()
            .instance()
            .get::<_, bool>(&DataKey::Released)
            .unwrap_or(false);

        if released {
            return CampaignState::Released;
        }

        let raised = env
            .storage()
            .instance()
            .get::<_, i128>(&DataKey::Raised)
            .unwrap_or(0);
        let goal = env
            .storage()
            .instance()
            .get::<_, i128>(&DataKey::Goal)
            .unwrap_or(0);
        let deadline = env
            .storage()
            .instance()
            .get::<_, u64>(&DataKey::Deadline)
            .unwrap_or(0);

        if raised >= goal {
            CampaignState::Successful
        } else if env.ledger().timestamp() >= deadline {
            CampaignState::Failed
        } else {
            CampaignState::Active
        }
    }

    /// Get campaign information details.
    pub fn get_campaign_info(env: Env) -> CampaignInfo {
        let creator = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Creator)
            .unwrap();
        let factory = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Factory)
            .unwrap();
        let title = env
            .storage()
            .instance()
            .get::<_, String>(&DataKey::Title)
            .unwrap();
        let description = env
            .storage()
            .instance()
            .get::<_, String>(&DataKey::Description)
            .unwrap();
        let goal = env
            .storage()
            .instance()
            .get::<_, i128>(&DataKey::Goal)
            .unwrap();
        let deadline = env
            .storage()
            .instance()
            .get::<_, u64>(&DataKey::Deadline)
            .unwrap();
        let token = env
            .storage()
            .instance()
            .get::<_, Address>(&DataKey::Token)
            .unwrap();
        let raised = env
            .storage()
            .instance()
            .get::<_, i128>(&DataKey::Raised)
            .unwrap();
        let state = Self::get_state(env.clone());

        CampaignInfo {
            creator,
            factory,
            title,
            description,
            goal,
            deadline,
            token,
            raised,
            state,
        }
    }

    /// Get the contribution amount for a specific contributor.
    pub fn get_contribution(env: Env, contributor: Address) -> i128 {
        let key = DataKey::Contributor(contributor);
        env.storage().persistent().get::<_, i128>(&key).unwrap_or(0)
    }
}

mod test;

