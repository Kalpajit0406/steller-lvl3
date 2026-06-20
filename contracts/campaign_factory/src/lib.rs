#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, BytesN, Env, IntoVal, String, Symbol, Vec
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    WasmHash,
    Campaigns,
}

#[derive(Clone)]
#[contracttype]
pub struct SaltData {
    pub creator: Address,
    pub title: String,
    pub count: u32,
}

#[contract]
pub struct CampaignFactory;

#[contractimpl]
impl CampaignFactory {
    /// Initialize the campaign factory with the WASM hash of the campaign escrow contract.
    pub fn init(env: Env, wasm_hash: BytesN<32>) {
        if env.storage().instance().has(&DataKey::WasmHash) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::WasmHash, &wasm_hash);
        
        let empty_campaigns: Vec<Address> = Vec::new(&env);
        env.storage().instance().set(&DataKey::Campaigns, &empty_campaigns);
    }

    /// Create a new campaign escrow contract instance.
    pub fn create_campaign(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        goal: i128,
        deadline: u64,
        token: Address,
    ) -> Address {
        creator.require_auth();

        let wasm_hash = env
            .storage()
            .instance()
            .get::<_, BytesN<32>>(&DataKey::WasmHash)
            .expect("factory not initialized");

        let mut campaigns = env
            .storage()
            .instance()
            .get::<_, Vec<Address>>(&DataKey::Campaigns)
            .unwrap_or_else(|| Vec::new(&env));

        // Create deterministic salt for unique deployment
        let salt_data = SaltData {
            creator: creator.clone(),
            title: title.clone(),
            count: campaigns.len(),
        };
        use soroban_sdk::xdr::ToXdr;
        let salt = env.crypto().sha256(&salt_data.to_xdr(&env));

        // Deploy the contract
        let campaign_address = env
            .deployer()
            .with_current_contract(salt)
            .deploy(wasm_hash);

        // Initialize the escrow contract using its client
        let campaign_client = campaign_escrow::CampaignEscrowClient::new(&env, &campaign_address);
        campaign_client.initialize(
            &env.current_contract_address(),
            &creator,
            &title,
            &description,
            &goal,
            &deadline,
            &token,
        );

        // Record the campaign address
        campaigns.push_back(campaign_address.clone());
        env.storage().instance().set(&DataKey::Campaigns, &campaigns);

        // Emit CampaignCreated event
        env.events().publish(
            (Symbol::new(&env, "CampaignCreated"), env.current_contract_address()),
            (campaign_address.clone(), creator, title, goal)
        );

        campaign_address
    }

    /// Retrieve all created campaign escrow addresses.
    pub fn get_campaigns(env: Env) -> Vec<Address> {
        env.storage()
            .instance()
            .get::<_, Vec<Address>>(&DataKey::Campaigns)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Retrieve the stored campaign WASM hash.
    pub fn get_wasm_hash(env: Env) -> BytesN<32> {
        env.storage()
            .instance()
            .get::<_, BytesN<32>>(&DataKey::WasmHash)
            .expect("factory not initialized")
    }
}

mod test;

