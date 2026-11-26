use super::*;
use soroban_sdk::{testutils::{Address as _, Ledger as _, MockAuth, MockAuthInvoke, storage::{Instance as _, Persistent as _}}, token::StellarAssetClient, IntoVal};

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

#[test]
fn wrong_signers_cannot_use_privileged_actions() {
    let (env, contract, sac, merchant, buyer, id) = setup();
    let c = InvoiceEscrowClient::new(&env, &contract);
    let resolver = Address::generate(&env);
    let stranger = Address::generate(&env);
    let create_args = (&merchant, &id, &buyer, 50_000_000i128, &id, 2000u64, 3000u64, &resolver).into_val(&env);
    env.mock_auths(&[MockAuth { address: &stranger, invoke: &MockAuthInvoke {
        contract: &contract, fn_name: "create", args: create_args, sub_invokes: &[],
    }}]);
    assert!(c.try_create(&merchant, &id, &buyer, &50_000_000, &id, &2000, &3000, &resolver).is_err());
    assert_eq!(c.try_get(&merchant, &id), Err(Ok(Error::NotFound)));
    env.mock_all_auths();
    c.create(&merchant, &id, &buyer, &50_000_000, &id, &2000, &3000, &resolver);
    // An authorization for the right invocation but the wrong identity must fail.
    for action in ["fund", "cancel"] {
        env.mock_auths(&[MockAuth { address: &stranger, invoke: &MockAuthInvoke {
            contract: &contract, fn_name: action, args: (&merchant, &id).into_val(&env), sub_invokes: &[],
        }}]);
        if action == "fund" { assert!(c.try_fund(&merchant, &id).is_err()); }
        else { assert!(c.try_cancel(&merchant, &id).is_err()); }
        assert_eq!(c.get(&merchant, &id).status, Status::Open);
    }
    env.mock_all_auths();
    c.fund(&merchant, &id);
    for action in ["release", "refund", "deliver", "dispute"] {
        env.mock_auths(&[MockAuth { address: &stranger, invoke: &MockAuthInvoke {
            contract: &contract, fn_name: action, args: (&merchant, &id).into_val(&env), sub_invokes: &[],
        }}]);
        let rejected = match action {
            "release" => c.try_release(&merchant, &id).is_err(),
            "refund" => c.try_refund(&merchant, &id).is_err(),
            "deliver" => c.try_deliver(&merchant, &id).is_err(),
            _ => c.try_dispute(&merchant, &id).is_err(),
        };
        assert!(rejected);
        assert_eq!(c.get(&merchant, &id).status, Status::Funded);
    }
    env.mock_all_auths();
    c.dispute(&merchant, &id);
    // Even the buyer and merchant cannot impersonate the independent resolver.
    for signer in [&stranger, &buyer, &merchant] {
        for action in ["resolve_release", "resolve_refund"] {
            env.mock_auths(&[MockAuth { address: signer, invoke: &MockAuthInvoke {
                contract: &contract, fn_name: action, args: (&merchant, &id).into_val(&env), sub_invokes: &[],
            }}]);
            if action == "resolve_release" { assert!(c.try_resolve_release(&merchant, &id).is_err()); }
            else { assert!(c.try_resolve_refund(&merchant, &id).is_err()); }
            assert_eq!(c.get(&merchant, &id).status, Status::Disputed);
        }
    }
    assert_eq!(token::TokenClient::new(&env, &sac).balance(&contract), 50_000_000);
    // Positive control: exact resolver authorization, without mock_all_auths.
    env.mock_auths(&[MockAuth { address: &resolver, invoke: &MockAuthInvoke {
        contract: &contract, fn_name: "resolve_refund", args: (&merchant, &id).into_val(&env), sub_invokes: &[],
    }}]);
    c.resolve_refund(&merchant, &id);
    assert_eq!(token::TokenClient::new(&env, &sac).balance(&buyer), 100_000_000);
}

#[test]
fn creation_enforces_amount_and_deadline_boundaries() {
    let (env, contract, _, merchant, buyer, id) = setup();
    let c = InvoiceEscrowClient::new(&env, &contract);
    let resolver = Address::generate(&env);
    let latest = 1000 + 730 * 86_400;
    for (amount, due, delivery) in [
        (i128::MIN, 2000, 3000), (10_000_000_000_001, 2000, 3000),
        (i128::MAX, 2000, 3000), (1, 1000, 3000), (1, 999, 3000),
        (1, 2000, 1999), (1, 2000, latest + 1), (1, 2000, u64::MAX),
    ] {
        assert_eq!(c.try_create(&merchant, &id, &buyer, &amount, &id, &due, &delivery, &resolver), Err(Ok(Error::Invalid)));
    }
    c.create(&merchant, &id, &buyer, &10_000_000_000_000, &id, &2000, &latest, &resolver);
    assert_eq!(c.get(&merchant, &id).amount, 10_000_000_000_000);
    let other = BytesN::from_array(&env, &[4; 32]);
    c.create(&merchant, &other, &buyer, &1, &other, &1001, &1001, &resolver);
    c.fund(&merchant, &other); // One stroop, one second before deadline.
}

#[test]
fn merchant_namespaces_isolate_identical_invoice_ids_and_balances() {
    let (env, contract, sac, merchant, buyer, id) = setup();
    let c = InvoiceEscrowClient::new(&env, &contract);
    let other_merchant = Address::generate(&env);
    let other_buyer = Address::generate(&env);
    StellarAssetClient::new(&env, &sac).mint(&other_buyer, &70_000_000);
    let resolver = Address::generate(&env);
    c.create(&merchant, &id, &buyer, &30_000_000, &id, &2000, &3000, &resolver);
    assert_eq!(c.try_get(&other_merchant, &id), Err(Ok(Error::NotFound)));
    c.create(&other_merchant, &id, &other_buyer, &70_000_000, &id, &2000, &3000, &resolver);
    c.fund(&merchant, &id);
    c.fund(&other_merchant, &id);
    c.release(&merchant, &id);
    assert_eq!(c.get(&other_merchant, &id).status, Status::Funded);
    let t = token::TokenClient::new(&env, &sac);
    assert_eq!(t.balance(&merchant), 30_000_000);
    assert_eq!(t.balance(&other_merchant), 0);
    assert_eq!(t.balance(&contract), 70_000_000);
    c.refund(&other_merchant, &id);
    assert_eq!(t.balance(&buyer), 70_000_000);
    assert_eq!(t.balance(&other_buyer), 70_000_000);
    assert_eq!(t.balance(&contract), 0);
    assert_eq!(c.token(), sac);
    assert_eq!(c.get(&merchant, &id).commitment, id);
}

#[test]
fn get_renews_invoice_and_instance_ttl_without_changing_terms() {
    let (env, contract, _, merchant, buyer, id) = setup();
    let c = InvoiceEscrowClient::new(&env, &contract);
    let resolver = Address::generate(&env);
    // A long invoice exceeds a single TTL extension: renewal is operationally required.
    c.create(&merchant, &id, &buyer, &1, &id, &2000, &(1000 + 730 * 86_400), &resolver);
    let before = c.get(&merchant, &id);
    let (instance_ttl, invoice_ttl) = env.as_contract(&contract, || (
        env.storage().instance().get_ttl(),
        env.storage().persistent().get_ttl(&Key::Invoice(merchant.clone(), id.clone())),
    ));
    assert_eq!(instance_ttl, 120 * DAY);
    assert_eq!(invoice_ttl, 120 * DAY);
    // Move into the renewal threshold without archiving the entries.
    env.ledger().set_sequence_number(env.ledger().sequence() + 91 * DAY);
    env.mock_auths(&[]);
    assert_eq!(c.get(&merchant, &id), before);
    env.as_contract(&contract, || {
        assert_eq!(env.storage().instance().get_ttl(), 120 * DAY);
        assert_eq!(env.storage().persistent().get_ttl(&Key::Invoice(merchant, id)), 120 * DAY);
    });
}

#[test]
fn all_terminal_states_reject_every_lifecycle_action_and_id_reuse() {
    for outcome in [Status::Released, Status::Refunded, Status::Cancelled, Status::Expired] {
        let (env, contract, sac, merchant, buyer, id) = setup();
        let c = InvoiceEscrowClient::new(&env, &contract);
        let resolver = Address::generate(&env);
        c.create(&merchant, &id, &buyer, &1, &id, &2000, &3000, &resolver);
        match outcome {
            Status::Released => { c.fund(&merchant, &id); c.release(&merchant, &id); },
            Status::Refunded => { c.fund(&merchant, &id); c.refund(&merchant, &id); },
            Status::Cancelled => c.cancel(&merchant, &id),
            _ => { env.ledger().set_timestamp(2000); env.mock_auths(&[]); c.expire(&merchant, &id); env.mock_all_auths(); },
        }
        assert!(c.try_fund(&merchant, &id).is_err());
        assert!(c.try_release(&merchant, &id).is_err());
        assert!(c.try_refund(&merchant, &id).is_err());
        assert!(c.try_deliver(&merchant, &id).is_err());
        assert!(c.try_dispute(&merchant, &id).is_err());
        assert!(c.try_resolve_release(&merchant, &id).is_err());
        assert!(c.try_resolve_refund(&merchant, &id).is_err());
        assert!(c.try_finalize(&merchant, &id).is_err());
        assert!(c.try_cancel(&merchant, &id).is_err());
        assert!(c.try_expire(&merchant, &id).is_err());
        assert_eq!(c.try_create(&merchant, &id, &buyer, &1, &id, &5000, &6000, &resolver), Err(Ok(Error::Exists)));
        assert_eq!(c.get(&merchant, &id).status, outcome);
        let t = token::TokenClient::new(&env, &sac);
        assert_eq!(t.balance(&contract), 0);
        assert_eq!(t.balance(&buyer) + t.balance(&merchant), 100_000_000);
    }
}

#[test]
fn funding_requires_the_exact_buyer_authorization_tree() {
    let (env, contract, sac, merchant, buyer, id) = setup();
    let c = InvoiceEscrowClient::new(&env, &contract);
    let resolver = Address::generate(&env);
    c.create(&merchant, &id, &buyer, &1, &id, &2000, &3000, &resolver);
    let other = BytesN::from_array(&env, &[9; 32]);
    c.create(&merchant, &other, &buyer, &1, &other, &2000, &3000, &resolver);
    let transfer = MockAuthInvoke {
        contract: &sac, fn_name: "transfer",
        args: (&buyer, &contract, 1i128).into_val(&env), sub_invokes: &[],
    };
    // Buyer authorized a different invoice, with an otherwise valid token transfer.
    env.mock_auths(&[MockAuth { address: &buyer, invoke: &MockAuthInvoke {
        contract: &contract, fn_name: "fund", args: (&merchant, &other).into_val(&env),
        sub_invokes: &[transfer.clone()],
    }}]);
    assert!(c.try_fund(&merchant, &id).is_err());
    assert_eq!(c.get(&merchant, &id).status, Status::Open);
    // Root-only approval cannot authorize the nested token debit.
    env.mock_auths(&[MockAuth { address: &buyer, invoke: &MockAuthInvoke {
        contract: &contract, fn_name: "fund", args: (&merchant, &id).into_val(&env), sub_invokes: &[],
    }}]);
    assert!(c.try_fund(&merchant, &id).is_err());
    assert_eq!(c.get(&merchant, &id).status, Status::Open);
    env.mock_auths(&[MockAuth { address: &buyer, invoke: &MockAuthInvoke {
        contract: &contract, fn_name: "fund", args: (&merchant, &id).into_val(&env), sub_invokes: &[transfer],
    }}]);
    c.fund(&merchant, &id);
    assert_eq!(c.get(&merchant, &id).status, Status::Funded);
    assert_eq!(c.get(&merchant, &other).status, Status::Open);
    assert_eq!(token::TokenClient::new(&env, &sac).balance(&contract), 1);
}

#[test]
fn buyer_and_merchant_roles_cannot_be_swapped() {
    for action in ["release", "refund", "deliver", "dispute", "cancel"] {
        let (env, contract, sac, merchant, buyer, id) = setup();
        let c = InvoiceEscrowClient::new(&env, &contract);
        c.create(&merchant, &id, &buyer, &1, &id, &2000, &3000, &Address::generate(&env));
        let initial = if action == "cancel" { Status::Open } else { c.fund(&merchant, &id); Status::Funded };
        let buyer_action = action == "release" || action == "dispute";
        let correct = if buyer_action { &buyer } else { &merchant };
        let wrong = if buyer_action { &merchant } else { &buyer };
        let invoke = MockAuthInvoke {
            contract: &contract, fn_name: action, args: (&merchant, &id).into_val(&env), sub_invokes: &[],
        };
        env.mock_auths(&[MockAuth { address: wrong, invoke: &invoke }]);
        let rejected = match action {
            "release" => c.try_release(&merchant, &id).is_err(),
            "refund" => c.try_refund(&merchant, &id).is_err(),
            "deliver" => c.try_deliver(&merchant, &id).is_err(),
            "dispute" => c.try_dispute(&merchant, &id).is_err(),
            _ => c.try_cancel(&merchant, &id).is_err(),
        };
        assert!(rejected);
        assert_eq!(c.get(&merchant, &id).status, initial);
        env.mock_auths(&[MockAuth { address: correct, invoke: &invoke }]);
        let expected = match action {
            "release" => { c.release(&merchant, &id); Status::Released },
            "refund" => { c.refund(&merchant, &id); Status::Refunded },
            "deliver" => { c.deliver(&merchant, &id); Status::Delivered },
            "dispute" => { c.dispute(&merchant, &id); Status::Disputed },
            _ => { c.cancel(&merchant, &id); Status::Cancelled },
        };
        assert_eq!(c.get(&merchant, &id).status, expected);
        let t = token::TokenClient::new(&env, &sac);
        assert_eq!(t.balance(&contract), if action == "deliver" || action == "dispute" { 1 } else { 0 });
        assert_eq!(t.balance(&contract) + t.balance(&merchant) + t.balance(&buyer), 100_000_000);
    }
}
