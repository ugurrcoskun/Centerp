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
    client.create(&merchant, &id, &buyer, &50_000_000, &id, &2000, &3000, &Address::generate(&env));
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
    client.create(&merchant, &id, &buyer, &50_000_000, &id, &2000, &3000, &Address::generate(&env));
    client.fund(&merchant, &id);
    env.ledger().set_timestamp(4000);
    assert!(client.try_expire(&merchant, &id).is_err());
    client.refund(&merchant, &id);
    assert_eq!(token::TokenClient::new(&env, &sac).balance(&buyer), 100_000_000);
    let other = BytesN::from_array(&env, &[2; 32]);
    client.create(&merchant, &other, &buyer, &1, &other, &5000, &6000, &Address::generate(&env));
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
    assert!(client.try_create(&merchant, &id, &buyer, &0, &id, &2000, &3000, &Address::generate(&env)).is_err());
    assert!(client.try_create(&merchant, &id, &buyer, &-1, &id, &2000, &3000, &Address::generate(&env)).is_err());
    assert!(client.try_create(&merchant, &id, &merchant, &1, &id, &2000, &3000, &Address::generate(&env)).is_err());
    client.create(&merchant, &id, &buyer, &1, &id, &2000, &3000, &Address::generate(&env));
    assert!(client.try_create(&merchant, &id, &buyer, &1, &id, &2000, &3000, &Address::generate(&env)).is_err());
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
    assert!(client.try_create(&merchant, &id, &buyer, &1, &id, &2000, &3000, &Address::generate(&env)).is_err());
}

#[test]
fn buyer_and_merchant_authority_are_required_on_each_transfer() {
    let (env, contract, sac, merchant, buyer, id) = setup();
    let client = InvoiceEscrowClient::new(&env, &contract);
    client.create(&merchant, &id, &buyer, &50_000_000, &id, &2000, &3000, &Address::generate(&env));
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
    client.create(&merchant, &id, &buyer, &200_000_000, &id, &2000, &3000, &Address::generate(&env));
    assert!(client.try_fund(&merchant, &id).is_err());
    assert_eq!(client.get(&merchant, &id).status, Status::Open);
    assert_eq!(token::TokenClient::new(&env, &sac).balance(&contract), 0);
    assert_eq!(token::TokenClient::new(&env, &sac).balance(&buyer), 100_000_000);
}

#[test]
fn silent_buyer_releases_only_after_the_full_dispute_window() {
    let (env, contract, sac, merchant, buyer, id) = setup();
    let c = InvoiceEscrowClient::new(&env, &contract);
    c.create(&merchant, &id, &buyer, &50_000_000, &id, &2000, &3000, &Address::generate(&env));
    c.fund(&merchant, &id);
    c.deliver(&merchant, &id);
    env.ledger().set_timestamp(3000 + DISPUTE_WINDOW - 1);
    assert!(c.try_finalize(&merchant, &id).is_err());
    env.ledger().set_timestamp(3000 + DISPUTE_WINDOW);
    assert!(c.try_dispute(&merchant, &id).is_err());
    env.mock_auths(&[]); // finalization is permissionless
    c.finalize(&merchant, &id);
    let t = token::TokenClient::new(&env, &sac);
    assert_eq!(t.balance(&merchant), 50_000_000);
    assert_eq!(t.balance(&contract), 0);
    assert!(c.try_finalize(&merchant, &id).is_err());
}

#[test]
fn absent_merchant_refunds_at_delivery_deadline() {
    let (env, contract, sac, merchant, buyer, id) = setup();
    let c = InvoiceEscrowClient::new(&env, &contract);
    c.create(&merchant, &id, &buyer, &50_000_000, &id, &2000, &3000, &Address::generate(&env));
    c.fund(&merchant, &id);
    env.ledger().set_timestamp(2999);
    assert!(c.try_finalize(&merchant, &id).is_err());
    env.ledger().set_timestamp(3000);
    assert!(c.try_deliver(&merchant, &id).is_err());
    env.mock_auths(&[]);
    c.finalize(&merchant, &id);
    assert_eq!(c.get(&merchant, &id).status, Status::Refunded);
    assert_eq!(token::TokenClient::new(&env, &sac).balance(&buyer), 100_000_000);
    assert!(c.try_finalize(&merchant, &id).is_err());
}

#[test]
fn dispute_blocks_release_and_an_absent_resolver_cannot_lock_funds() {
    let (env, contract, sac, merchant, buyer, id) = setup();
    let c = InvoiceEscrowClient::new(&env, &contract);
    c.create(&merchant, &id, &buyer, &50_000_000, &id, &2000, &3000, &Address::generate(&env));
    c.fund(&merchant, &id);
    c.deliver(&merchant, &id);
    env.ledger().set_timestamp(3000 + DISPUTE_WINDOW - 1);
    c.dispute(&merchant, &id);
    let deadline = 3000 + DISPUTE_WINDOW - 1 + RESOLUTION_WINDOW;
    assert!(c.try_dispute(&merchant, &id).is_err());
    env.ledger().set_timestamp(deadline - 1);
    assert!(c.try_finalize(&merchant, &id).is_err());
    env.ledger().set_timestamp(deadline);
    assert!(c.try_resolve_release(&merchant, &id).is_err());
    assert!(c.try_resolve_refund(&merchant, &id).is_err());
    env.mock_auths(&[]);
    c.finalize(&merchant, &id);
    assert_eq!(c.get(&merchant, &id).status, Status::Refunded);
    assert_eq!(token::TokenClient::new(&env, &sac).balance(&buyer), 100_000_000);
}

#[test]
fn resolver_can_only_pay_the_fixed_parties_and_cannot_replay() {
    for release in [false, true] {
        let (env, contract, sac, merchant, buyer, id) = setup();
        let resolver = Address::generate(&env);
        let c = InvoiceEscrowClient::new(&env, &contract);
        assert!(c.try_create(&merchant, &id, &buyer, &1, &id, &2000, &3000, &buyer).is_err());
        assert!(c.try_create(&merchant, &id, &buyer, &1, &id, &2000, &3000, &merchant).is_err());
        c.create(&merchant, &id, &buyer, &50_000_000, &id, &2000, &3000, &resolver);
        c.fund(&merchant, &id);
        assert!(c.try_resolve_release(&merchant, &id).is_err());
        c.dispute(&merchant, &id);
        env.mock_auths(&[]);
        assert!(c.try_resolve_release(&merchant, &id).is_err());
        assert!(c.try_resolve_refund(&merchant, &id).is_err());
        env.mock_all_auths();
        if release { c.resolve_release(&merchant, &id); } else { c.resolve_refund(&merchant, &id); }
        let t = token::TokenClient::new(&env, &sac);
        assert_eq!(t.balance(&resolver), 0);
        assert_eq!(t.balance(&contract), 0);
        assert_eq!(t.balance(&merchant), if release {50_000_000} else {0});
        assert!(c.try_resolve_refund(&merchant, &id).is_err());
        assert!(c.try_finalize(&merchant, &id).is_err());
    }
}

#[test]
fn new_delivery_and_dispute_actions_require_the_correct_auth() {
    let (env, contract, _, merchant, buyer, id) = setup();
    let c = InvoiceEscrowClient::new(&env, &contract);
    c.create(&merchant, &id, &buyer, &50_000_000, &id, &2000, &3000, &Address::generate(&env));
    c.fund(&merchant, &id);
    env.mock_auths(&[]);
    assert!(c.try_deliver(&merchant, &id).is_err());
    assert!(c.try_dispute(&merchant, &id).is_err());
    assert_eq!(c.get(&merchant, &id).status, Status::Funded);
}

#[test]
fn failed_timeout_transfer_rolls_back_and_other_invoices_keep_their_funds() {
    let (env, contract, sac, merchant, buyer, id) = setup();
    let c = InvoiceEscrowClient::new(&env, &contract);
    let other = BytesN::from_array(&env, &[3;32]);
    let resolver = Address::generate(&env);
    c.create(&merchant, &id, &buyer, &50_000_000, &id, &2000, &3000, &resolver);
    c.create(&merchant, &other, &buyer, &50_000_000, &other, &2000, &3000, &resolver);
    c.fund(&merchant, &id);
    c.fund(&merchant, &other);
    c.deliver(&merchant, &id);
    env.ledger().set_timestamp(3000 + DISPUTE_WINDOW);
    c.finalize(&merchant, &id);
    assert_eq!(token::TokenClient::new(&env, &sac).balance(&contract), 50_000_000);
    assert_eq!(c.get(&merchant, &other).status, Status::Funded);
    // Simulate loss of token liquidity in the test environment to exercise
    // transaction rollback, not a production withdrawal path.
    env.as_contract(&contract, || token::TokenClient::new(&env, &sac).transfer(&contract, &merchant, &50_000_000));
    assert!(c.try_finalize(&merchant, &other).is_err());
    assert_eq!(c.get(&merchant, &other).status, Status::Funded);
}
