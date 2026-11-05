#![no_std]
use soroban_sdk::{contract, contracterror, contractevent, contractimpl, contracttype, token, Address, BytesN, Env};

const DAY: u32 = 17_280;
pub const DISPUTE_WINDOW: u64 = 3 * 86_400;
pub const RESOLUTION_WINDOW: u64 = 7 * 86_400;

#[contracttype]
#[derive(Clone)]
enum Key { Token, Invoice(Address, BytesN<32>) }

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Status { Open, Funded, Delivered, Disputed, Released, Refunded, Cancelled, Expired }

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Invoice {
    pub merchant: Address,
    pub buyer: Address,
    pub amount: i128,
    pub commitment: BytesN<32>,
    pub due: u64,
    pub delivery_due: u64,
    pub resolver: Address,
    pub disputed_at: u64,
    pub status: Status,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error { Invalid = 1, Exists = 2, NotFound = 3, WrongState = 4, Deadline = 5 }

#[contractevent]
pub struct Changed {
    #[topic]
    pub merchant: Address,
    #[topic]
    pub id: BytesN<32>,
    pub status: Status,
    pub amount: i128,
}

#[contract]
pub struct InvoiceEscrow;

fn load(env: &Env, merchant: &Address, id: &BytesN<32>) -> Result<Invoice, Error> {
    env.storage().instance().extend_ttl(30 * DAY, 120 * DAY);
    let key = Key::Invoice(merchant.clone(), id.clone());
    let invoice = env.storage().persistent().get(&key).ok_or(Error::NotFound)?;
    env.storage().persistent().extend_ttl(&key, 30 * DAY, 120 * DAY);
    Ok(invoice)
}
fn save(env: &Env, id: &BytesN<32>, invoice: &Invoice) {
    let key = Key::Invoice(invoice.merchant.clone(), id.clone());
    env.storage().persistent().set(&key, invoice);
    env.storage().persistent().extend_ttl(&key, 30 * DAY, 120 * DAY);
    env.storage().instance().extend_ttl(30 * DAY, 120 * DAY);
    Changed { merchant: invoice.merchant.clone(), id: id.clone(), status: invoice.status.clone(), amount: invoice.amount }.publish(env);
}
fn token(env: &Env) -> token::TokenClient<'_> {
    let address: Address = env.storage().instance().get(&Key::Token).unwrap();
    token::TokenClient::new(env, &address)
}

#[contractimpl]
impl InvoiceEscrow {
    // Fixed token and recipients; an independent per-invoice resolver can only
    // choose full release or full refund during a bounded dispute period.
    pub fn __constructor(env: Env, token: Address) { env.storage().instance().set(&Key::Token, &token); }
    pub fn token(env: Env) -> Address { env.storage().instance().get(&Key::Token).unwrap() }
    pub fn version(_env: Env) -> u32 { 2 }

    pub fn create(env: Env, merchant: Address, id: BytesN<32>, buyer: Address, amount: i128,
        commitment: BytesN<32>, due: u64, delivery_due: u64, resolver: Address) -> Result<(), Error> {
        merchant.require_auth();
        if merchant == buyer || resolver == merchant || resolver == buyer || amount <= 0 || amount > 10_000_000_000_000 || due <= env.ledger().timestamp() || delivery_due < due || delivery_due > env.ledger().timestamp().saturating_add(730 * 86_400) {
            return Err(Error::Invalid);
        }
        if env.storage().persistent().has(&Key::Invoice(merchant.clone(), id.clone())) { return Err(Error::Exists); }
        save(&env, &id, &Invoice { merchant, buyer, amount, commitment, due, delivery_due, resolver, disputed_at: 0, status: Status::Open });
        Ok(())
    }
    pub fn get(env: Env, merchant: Address, id: BytesN<32>) -> Result<Invoice, Error> { load(&env, &merchant, &id) }
    pub fn fund(env: Env, merchant: Address, id: BytesN<32>) -> Result<(), Error> {
        let mut invoice = load(&env, &merchant, &id)?;
        invoice.buyer.require_auth();
        if invoice.status != Status::Open { return Err(Error::WrongState); }
        if env.ledger().timestamp() >= invoice.due { return Err(Error::Deadline); }
        invoice.status = Status::Funded;
        save(&env, &id, &invoice);
        token(&env).transfer(&invoice.buyer, &env.current_contract_address(), &invoice.amount);
        Ok(())
    }
    pub fn release(env: Env, merchant: Address, id: BytesN<32>) -> Result<(), Error> {
        let mut invoice = load(&env, &merchant, &id)?;
        invoice.buyer.require_auth();
        if !matches!(invoice.status, Status::Funded | Status::Delivered | Status::Disputed) { return Err(Error::WrongState); }
        invoice.status = Status::Released;
        save(&env, &id, &invoice);
        token(&env).transfer(&env.current_contract_address(), &invoice.merchant, &invoice.amount);
        Ok(())
    }
    pub fn refund(env: Env, merchant: Address, id: BytesN<32>) -> Result<(), Error> {
        let mut invoice = load(&env, &merchant, &id)?;
        invoice.merchant.require_auth();
        if !matches!(invoice.status, Status::Funded | Status::Delivered | Status::Disputed) { return Err(Error::WrongState); }
        invoice.status = Status::Refunded;
        save(&env, &id, &invoice);
        token(&env).transfer(&env.current_contract_address(), &invoice.buyer, &invoice.amount);
        Ok(())
    }
    pub fn deliver(env: Env, merchant: Address, id: BytesN<32>) -> Result<(), Error> {
        let mut invoice = load(&env, &merchant, &id)?;
        invoice.merchant.require_auth();
        if invoice.status != Status::Funded { return Err(Error::WrongState); }
        if env.ledger().timestamp() >= invoice.delivery_due { return Err(Error::Deadline); }
        invoice.status = Status::Delivered;
        save(&env, &id, &invoice);
        Ok(())
    }
    pub fn dispute(env: Env, merchant: Address, id: BytesN<32>) -> Result<(), Error> {
        let mut invoice = load(&env, &merchant, &id)?;
        invoice.buyer.require_auth();
        let deadline = match invoice.status {
            Status::Funded => invoice.delivery_due,
            Status::Delivered => invoice.delivery_due + DISPUTE_WINDOW,
            _ => return Err(Error::WrongState),
        };
        if env.ledger().timestamp() >= deadline { return Err(Error::Deadline); }
        invoice.status = Status::Disputed;
        invoice.disputed_at = env.ledger().timestamp();
        save(&env, &id, &invoice);
        Ok(())
    }
    pub fn resolve_release(env: Env, merchant: Address, id: BytesN<32>) -> Result<(), Error> {
        resolve(&env, &merchant, &id, true)
    }
    pub fn resolve_refund(env: Env, merchant: Address, id: BytesN<32>) -> Result<(), Error> {
        resolve(&env, &merchant, &id, false)
    }
    // Anyone can pay the network fee; recipients and outcome are determined by
    // state and ledger time, never by the caller or an off-chain clock.
    pub fn finalize(env: Env, merchant: Address, id: BytesN<32>) -> Result<(), Error> {
        let mut invoice = load(&env, &merchant, &id)?;
        let (deadline, release) = match invoice.status {
            Status::Funded => (invoice.delivery_due, false),
            Status::Delivered => (invoice.delivery_due + DISPUTE_WINDOW, true),
            Status::Disputed => (invoice.disputed_at + RESOLUTION_WINDOW, false),
            _ => return Err(Error::WrongState),
        };
        if env.ledger().timestamp() < deadline { return Err(Error::Deadline); }
        payout(&env, &id, &mut invoice, release);
        Ok(())
    }
    pub fn cancel(env: Env, merchant: Address, id: BytesN<32>) -> Result<(), Error> {
        let mut invoice = load(&env, &merchant, &id)?;
        invoice.merchant.require_auth();
        if invoice.status != Status::Open { return Err(Error::WrongState); }
        invoice.status = Status::Cancelled;
        save(&env, &id, &invoice);
        Ok(())
    }
    pub fn expire(env: Env, merchant: Address, id: BytesN<32>) -> Result<(), Error> {
        let mut invoice = load(&env, &merchant, &id)?;
        if invoice.status != Status::Open { return Err(Error::WrongState); }
        if env.ledger().timestamp() < invoice.due { return Err(Error::Deadline); }
        invoice.status = Status::Expired;
        save(&env, &id, &invoice);
        Ok(())
    }
}

fn payout(env: &Env, id: &BytesN<32>, invoice: &mut Invoice, release: bool) {
    invoice.status = if release { Status::Released } else { Status::Refunded };
    save(env, id, invoice);
    let recipient = if release { &invoice.merchant } else { &invoice.buyer };
    token(env).transfer(&env.current_contract_address(), recipient, &invoice.amount);
}

fn resolve(env: &Env, merchant: &Address, id: &BytesN<32>, release: bool) -> Result<(), Error> {
    let mut invoice = load(env, merchant, id)?;
    invoice.resolver.require_auth();
    if invoice.status != Status::Disputed { return Err(Error::WrongState); }
    if env.ledger().timestamp() >= invoice.disputed_at + RESOLUTION_WINDOW { return Err(Error::Deadline); }
    payout(env, id, &mut invoice, release);
    Ok(())
}

#[cfg(test)]
mod test;
