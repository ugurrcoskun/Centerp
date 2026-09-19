use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger as _}, token::StellarAssetClient};

fn setup() -> (Env, Address, Address, Address, Address, BytesN<32>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1000);
    let merchant = Address::generate(&env);
    let buyer = Address::generate(&env);
    let admin = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(admin.clone()).address();
    StellarAssetClient::new(&env, &sac).mint(&buyer, &100_000_000);
    let contract = env.register(InvoiceEscrow, (sac.clone(),));
    (env.clone(), contract, sac, merchant, buyer, BytesN::from_array(&env, &[1; 32]))
}

#[test]
fn settlement_conserves_tokens_and_rejects_replay() {
    let (env, contract, sac, merchant, buyer, id) = setup();
    let client = InvoiceEscrowClient::new(&env, &contract);
    let token = token::TokenClient::new(&env, &sac);
    client.create(&merchant, &id, &buyer, &50_000_000, &id, &2000, &3000);
    client.fund(&merchant, &id);
    assert_eq!(token.balance(&buyer), 50_000_000);
    assert_eq!(token.balance(&contract), 50_000_000);
    assert!(client.try_fund(&merchant, &id).is_err());
    client.release(&merchant, &id);
    assert_eq!(token.balance(&merchant), 50_000_000);
    assert_eq!(token.balance(&contract), 0);
    assert_eq!(client.get(&merchant, &id).status, Status::Released);
    assert!(client.try_release(&merchant, &id).is_err());
    assert!(client.try_refund(&merchant, &id).is_err());
}

#[test]
fn refund_and_timeout_do_not_pay_the_wrong_party() {
    let (env, contract, sac, merchant, buyer, id) = setup();
    let client = InvoiceEscrowClient::new(&env, &contract);
    client.create(&merchant, &id, &buyer, &50_000_000, &id, &2000, &3000);
    client.fund(&merchant, &id);
    env.ledger().set_timestamp(4000);
    assert!(client.try_expire(&merchant, &id).is_err());
    client.refund(&merchant, &id);
    assert_eq!(token::TokenClient::new(&env, &sac).balance(&buyer), 100_000_000);
    let other = BytesN::from_array(&env, &[2; 32]);
    client.create(&merchant, &other, &buyer, &1, &other, &5000, &6000);
    assert!(client.try_expire(&merchant, &other).is_err());
    env.ledger().set_timestamp(5000);
    assert!(client.try_fund(&merchant, &other).is_err());
    client.expire(&merchant, &other);
    assert_eq!(client.get(&merchant, &other).status, Status::Expired);
}

#[test]
fn validates_amount_identity_and_duplicate() {
    let (env, contract, _, merchant, buyer, id) = setup();
    let client = InvoiceEscrowClient::new(&env, &contract);
    assert!(client.try_create(&merchant, &id, &buyer, &0, &id, &2000, &3000).is_err());
    assert!(client.try_create(&merchant, &id, &buyer, &-1, &id, &2000, &3000).is_err());
    assert!(client.try_create(&merchant, &id, &merchant, &1, &id, &2000, &3000).is_err());
    client.create(&merchant, &id, &buyer, &1, &id, &2000, &3000);
    assert!(client.try_create(&merchant, &id, &buyer, &1, &id, &2000, &3000).is_err());
    client.cancel(&merchant, &id);
    assert!(client.try_fund(&merchant, &id).is_err());
}

#[test]
fn rejects_unsigned_calls() {
    let env = Env::default();
    let merchant = Address::generate(&env);
    let buyer = Address::generate(&env);
    let token = Address::generate(&env);
    let contract = env.register(InvoiceEscrow, (token,));
    let client = InvoiceEscrowClient::new(&env, &contract);
    let id = BytesN::from_array(&env, &[0; 32]);
    assert!(client.try_create(&merchant, &id, &buyer, &1, &id, &2000, &3000).is_err());
}

#[test]
fn buyer_and_merchant_authority_are_required_on_each_transfer() {
    let (env, contract, sac, merchant, buyer, id) = setup();
    let client = InvoiceEscrowClient::new(&env, &contract);
    client.create(&merchant, &id, &buyer, &50_000_000, &id, &2000, &3000);
    env.mock_auths(&[]);
    assert!(client.try_fund(&merchant, &id).is_err());
    assert_eq!(client.get(&merchant, &id).status, Status::Open);
    env.mock_all_auths();
    client.fund(&merchant, &id);
    env.mock_auths(&[]);
    assert!(client.try_release(&merchant, &id).is_err());
    assert!(client.try_refund(&merchant, &id).is_err());
    assert_eq!(client.get(&merchant, &id).status, Status::Funded);
    assert_eq!(token::TokenClient::new(&env, &sac).balance(&contract), 50_000_000);
}

#[test]
fn insufficient_token_balance_rolls_back_invoice_state() {
    let (env, contract, sac, merchant, buyer, id) = setup();
    let client = InvoiceEscrowClient::new(&env, &contract);
    client.create(&merchant, &id, &buyer, &200_000_000, &id, &2000, &3000);
    assert!(client.try_fund(&merchant, &id).is_err());
    assert_eq!(client.get(&merchant, &id).status, Status::Open);
    assert_eq!(token::TokenClient::new(&env, &sac).balance(&contract), 0);
    assert_eq!(token::TokenClient::new(&env, &sac).balance(&buyer), 100_000_000);
}
