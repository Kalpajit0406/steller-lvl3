#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env, String,
};

fn setup_env() -> (Env, Address) {
    let env = Env::default();
    
    // Set initial ledger timestamp
    env.ledger().set_timestamp(1000);

    // Enable mock auth
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract(admin.clone());

    (env, token_address)
}

#[test]
fn test_factory_creation_and_registration() {
    let (env, token_addr) = setup_env();
    
    let creator = Address::generate(&env);
    let factory_addr = env.register(CampaignFactory, ());
    let factory_client = CampaignFactoryClient::new(&env, &factory_addr);

    // Upload the escrow WASM to the test environment using the compiled WASM
    const ESCROW_WASM: &[u8] = include_bytes!("../../../target/wasm32v1-none/release/campaign_escrow.wasm");
    let escrow_wasm_hash = env.deployer().upload_contract_wasm(ESCROW_WASM);

    // Initialize factory with the escrow WASM hash
    factory_client.init(&escrow_wasm_hash);
    
    assert_eq!(factory_client.get_wasm_hash(), escrow_wasm_hash);

    // Create campaign 1
    let campaign1_addr = factory_client.create_campaign(
        &creator,
        &String::from_str(&env, "Save the Forests"),
        &String::from_str(&env, "Plant trees globally"),
        &1000i128,
        &2000u64,
        &token_addr,
    );

    // Create campaign 2
    let campaign2_addr = factory_client.create_campaign(
        &creator,
        &String::from_str(&env, "Clean the Oceans"),
        &String::from_str(&env, "Remove plastic"),
        &2000i128,
        &3000u64,
        &token_addr,
    );

    // Verify campaigns are registered
    let campaigns = factory_client.get_campaigns();
    assert_eq!(campaigns.len(), 2);
    assert_eq!(campaigns.get(0).unwrap(), campaign1_addr);
    assert_eq!(campaigns.get(1).unwrap(), campaign2_addr);

    // Verify campaign 1 is initialized correctly
    let escrow1_client = campaign_escrow::CampaignEscrowClient::new(&env, &campaign1_addr);
    let info1 = escrow1_client.get_campaign_info();
    assert_eq!(info1.creator, creator);
    assert_eq!(info1.factory, factory_addr);
    assert_eq!(info1.title, String::from_str(&env, "Save the Forests"));
    assert_eq!(info1.goal, 1000i128);
    assert_eq!(info1.deadline, 2000u64);

    // Verify campaign 2 is initialized correctly
    let escrow2_client = campaign_escrow::CampaignEscrowClient::new(&env, &campaign2_addr);
    let info2 = escrow2_client.get_campaign_info();
    assert_eq!(info2.creator, creator);
    assert_eq!(info2.factory, factory_addr);
    assert_eq!(info2.title, String::from_str(&env, "Clean the Oceans"));
    assert_eq!(info2.goal, 2000i128);
    assert_eq!(info2.deadline, 3000u64);
}
