#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token, Address, Env, String,
};

fn setup_env() -> (Env, Address, Address) {
    let env = Env::default();
    
    // Set initial ledger timestamp
    env.ledger().set_timestamp(1000);

    // Enable mock auth for all operations in the environment
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let token_address = env.register_stellar_asset_contract(admin.clone());
    let factory = Address::generate(&env);

    (env, factory, token_address)
}

#[test]
fn test_initialization() {
    let (env, factory, token_addr) = setup_env();
    
    let creator = Address::generate(&env);
    let escrow_addr = env.register(CampaignEscrow, ());
    let escrow_client = CampaignEscrowClient::new(&env, &escrow_addr);

    escrow_client.initialize(
        &factory,
        &creator,
        &String::from_str(&env, "Save the Forests"),
        &String::from_str(&env, "Plant trees globally"),
        &1000i128,
        &2000u64, // deadline
        &token_addr,
    );

    let info = escrow_client.get_campaign_info();
    assert_eq!(info.creator, creator);
    assert_eq!(info.factory, factory);
    assert_eq!(info.title, String::from_str(&env, "Save the Forests"));
    assert_eq!(info.description, String::from_str(&env, "Plant trees globally"));
    assert_eq!(info.goal, 1000i128);
    assert_eq!(info.deadline, 2000u64);
    assert_eq!(info.token, token_addr);
    assert_eq!(info.raised, 0i128);
    assert_eq!(info.state, CampaignState::Active);
}

#[test]
#[should_panic(expected = "already initialized")]
fn test_initialize_twice_panics() {
    let (env, factory, token_addr) = setup_env();
    let creator = Address::generate(&env);
    let escrow_addr = env.register(CampaignEscrow, ());
    let escrow_client = CampaignEscrowClient::new(&env, &escrow_addr);

    escrow_client.initialize(
        &factory,
        &creator,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "Desc"),
        &1000i128,
        &2000u64,
        &token_addr,
    );

    // Call again, should fail
    escrow_client.initialize(
        &factory,
        &creator,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "Desc"),
        &1000i128,
        &2000u64,
        &token_addr,
    );
}

#[test]
fn test_pledge_and_release_flow() {
    let (env, factory, token_addr) = setup_env();
    
    let creator = Address::generate(&env);
    let contributor = Address::generate(&env);
    
    let token_client = token::Client::new(&env, &token_addr);
    let token_admin = token::StellarAssetClient::new(&env, &token_addr);

    // Fund contributor
    token_admin.mint(&contributor, &1000i128);
    assert_eq!(token_client.balance(&contributor), 1000i128);

    let escrow_addr = env.register(CampaignEscrow, ());
    let escrow_client = CampaignEscrowClient::new(&env, &escrow_addr);

    escrow_client.initialize(
        &factory,
        &creator,
        &String::from_str(&env, "Crowdfund"),
        &String::from_str(&env, "Raise funds"),
        &500i128, // Goal
        &2000u64, // Deadline
        &token_addr,
    );

    // Contributor pledges 600
    escrow_client.pledge(&contributor, &600i128);

    // Verify balances
    assert_eq!(token_client.balance(&contributor), 400i128);
    assert_eq!(token_client.balance(&escrow_addr), 600i128);
    assert_eq!(escrow_client.get_contribution(&contributor), 600i128);
    
    let info = escrow_client.get_campaign_info();
    assert_eq!(info.raised, 600i128);
    assert_eq!(info.state, CampaignState::Successful); // Goal met (600 >= 500)

    // Release funds (only creator)
    escrow_client.release(&creator);

    // Verify creator received funds, escrow has 0
    assert_eq!(token_client.balance(&creator), 600i128);
    assert_eq!(token_client.balance(&escrow_addr), 0i128);

    let info_after = escrow_client.get_campaign_info();
    assert_eq!(info_after.state, CampaignState::Released);
}

#[test]
#[should_panic(expected = "only creator can release funds")]
fn test_release_by_non_creator_panics() {
    let (env, factory, token_addr) = setup_env();
    let creator = Address::generate(&env);
    let contributor = Address::generate(&env);
    let non_creator = Address::generate(&env);

    let token_admin = token::StellarAssetClient::new(&env, &token_addr);
    token_admin.mint(&contributor, &1000i128);

    let escrow_addr = env.register(CampaignEscrow, ());
    let escrow_client = CampaignEscrowClient::new(&env, &escrow_addr);

    escrow_client.initialize(
        &factory,
        &creator,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "Desc"),
        &500i128,
        &2000u64,
        &token_addr,
    );

    escrow_client.pledge(&contributor, &600i128);

    // Attempt release by non_creator, should panic
    escrow_client.release(&non_creator);
}

#[test]
fn test_refund_flow_when_campaign_fails() {
    let (env, factory, token_addr) = setup_env();
    
    let creator = Address::generate(&env);
    let contributor1 = Address::generate(&env);
    let contributor2 = Address::generate(&env);

    let token_client = token::Client::new(&env, &token_addr);
    let token_admin = token::StellarAssetClient::new(&env, &token_addr);

    token_admin.mint(&contributor1, &200i128);
    token_admin.mint(&contributor2, &200i128);

    let escrow_addr = env.register(CampaignEscrow, ());
    let escrow_client = CampaignEscrowClient::new(&env, &escrow_addr);

    escrow_client.initialize(
        &factory,
        &creator,
        &String::from_str(&env, "Crowdfund"),
        &String::from_str(&env, "Raise"),
        &500i128, // Goal 500
        &2000u64, // Deadline 2000
        &token_addr,
    );

    escrow_client.pledge(&contributor1, &150i128);
    escrow_client.pledge(&contributor2, &150i128);

    // Total raised is 300 / 500. Not yet deadline (current time = 1000).
    assert_eq!(escrow_client.get_campaign_info().state, CampaignState::Active);

    // Advance time past deadline
    env.ledger().set_timestamp(2500);

    assert_eq!(escrow_client.get_campaign_info().state, CampaignState::Failed);

    // Check expiry
    let expired_emitted = escrow_client.check_expiry();
    assert!(expired_emitted);

    // Refund contributor 1
    escrow_client.claim_refund(&contributor1);
    assert_eq!(token_client.balance(&contributor1), 200i128); // original balance restored
    assert_eq!(escrow_client.get_contribution(&contributor1), 0i128);

    // Refund contributor 2
    escrow_client.claim_refund(&contributor2);
    assert_eq!(token_client.balance(&contributor2), 200i128);
    assert_eq!(escrow_client.get_contribution(&contributor2), 0i128);

    assert_eq!(token_client.balance(&escrow_addr), 0i128);
}

#[test]
#[should_panic(expected = "campaign has not failed")]
fn test_refund_before_deadline_panics() {
    let (env, factory, token_addr) = setup_env();
    let creator = Address::generate(&env);
    let contributor = Address::generate(&env);

    let token_admin = token::StellarAssetClient::new(&env, &token_addr);
    token_admin.mint(&contributor, &200i128);

    let escrow_addr = env.register(CampaignEscrow, ());
    let escrow_client = CampaignEscrowClient::new(&env, &escrow_addr);

    escrow_client.initialize(
        &factory,
        &creator,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "Desc"),
        &500i128,
        &2000u64,
        &token_addr,
    );

    escrow_client.pledge(&contributor, &100i128);

    // Try claiming refund, should panic because deadline has not passed yet
    escrow_client.claim_refund(&contributor);
}

#[test]
#[should_panic(expected = "campaign is not active")]
fn test_pledge_after_deadline_fails() {
    let (env, factory, token_addr) = setup_env();
    let creator = Address::generate(&env);
    let contributor = Address::generate(&env);

    let token_admin = token::StellarAssetClient::new(&env, &token_addr);
    token_admin.mint(&contributor, &200i128);

    let escrow_addr = env.register(CampaignEscrow, ());
    let escrow_client = CampaignEscrowClient::new(&env, &escrow_addr);

    escrow_client.initialize(
        &factory,
        &creator,
        &String::from_str(&env, "Title"),
        &String::from_str(&env, "Desc"),
        &500i128,
        &2000u64,
        &token_addr,
    );

    // Advance time past deadline
    env.ledger().set_timestamp(2500);

    // Pledge should panic
    escrow_client.pledge(&contributor, &100i128);
}
