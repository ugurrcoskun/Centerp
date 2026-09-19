#![no_std]
use soroban_sdk::{contract, contracterror, contractevent, contractimpl, contracttype, token, Address, BytesN, Env};

const DAY: u32 = 17_280;

#[contracttype]
#[derive(Clone)]
enum Key { Token, Invoice(Address, BytesN<32>) }

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Status { Open, Funded, Released, Refunded, Cancelled, Expired }

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Invoice {
    pub merchant: Address,
    pub buyer: Address,
    pub amount: i128,
    pub commitment: BytesN<32>,
    pub due: u64,
    pub delivery_due: u64,
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
    // A single, fixed USDC SAC. No upgrade, sweep or configurable recipients.
    pub fn __constructor(env: Env, token: Address) { env.storage().instance().set(&Key::Token, &token); }
    pub fn token(env: Env) -> Address { env.storage().instance().get(&Key::Token).unwrap() }

    pub fn create(env: Env, merchant: Address, id: BytesN<32>, buyer: Address, amount: i128,
        commitment: BytesN<32>, due: u64, delivery_due: u64) -> Result<(), Error> {
        merchant.require_auth();
        if merchant == buyer || amount <= 0 || amount > 10_000_000_000_000 || due <= env.ledger().timestamp() || delivery_due < due {
            return Err(Error::Invalid);
        }
        if env.storage().persistent().has(&Key::Invoice(merchant.clone(), id.clone())) { return Err(Error::Exists); }
        save(&env, &id, &Invoice { merchant, buyer, amount, commitment, due, delivery_due, status: Status::Open });
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
        if invoice.status != Status::Funded { return Err(Error::WrongState); }
        invoice.status = Status::Released;
        save(&env, &id, &invoice);
        token(&env).transfer(&env.current_contract_address(), &invoice.merchant, &invoice.amount);
        Ok(())
    }
    pub fn refund(env: Env, merchant: Address, id: BytesN<32>) -> Result<(), Error> {
        let mut invoice = load(&env, &merchant, &id)?;
        invoice.merchant.require_auth();
        if invoice.status != Status::Funded { return Err(Error::WrongState); }
        invoice.status = Status::Refunded;
        save(&env, &id, &invoice);
        token(&env).transfer(&env.current_contract_address(), &invoice.buyer, &invoice.amount);
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

#[cfg(test)]
mod test;
