sitedeki tüm linkler bunlar:

https://tr-mock-anchor.fly.dev/
https://tr-mock-anchor.fly.dev/sep
https://tr-mock-anchor.fly.dev/explorer
https://tr-mock-anchor.fly.dev/guide
https://tr-mock-anchor.fly.dev/mainnet

# A Turkish TRY ⇄ USDC on/off-ramp your users can use — the standard, portable way.

Source: https://tr-mock-anchor.fly.dev/
# A Turkish TRY ⇄ USDC on/off-ramp your users can use — the standard, portable way.

Integrate the SEP path once against this testnet mock, and the same code works against any real Stellar anchor later — you only change the network and the home domain. The bank is simulated; the Stellar leg is real testnet USDC.

### Start with the SEP path

The whole handoff is two values. Everything else — where to log in, deposit, withdraw, the issuer — is discovered from stellar.toml.

**Home domain**
tr-mock-anchor.fly.dev

**Asset**
USDC

Read the SEP path →  ·  Try the SEP demo live

Or open demo-wallet.stellar.org and add asset USDC with that home domain. No API key, no password — the user's key is the identity. Verified with SDF's anchor-tests.

### Status

**Network**
Stellar testnet (live Horizon)

**Asset**
USDC · GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5

**Treasury**
GCLCZEQZ2THTEDAOFI66LACNPLY4OBKN7VKLEZFMBIHYKYQOW2W7T3Z6

**Treasury USDC**
27242.3433301

**USDC/TRY**
mid 48.785078 · buy 49.029003 · sell 48.541152 (50 bps, source: reflector)

## On-ramp · TRY → USDC

TRY
bank transfer

→

TRY balance

→

USD/TRY
quote

→

USDC
to wallet

- The user logs in with their Stellar key (SEP-10) and starts a deposit
- The anchor returns bank details: an IBAN and a reference to write in the transfer description (açıklama)
- You play the bank in this sandbox: the TRY "arrives" and is credited
- The rate is locked at USD/TRY (Reflector oracle + spread) via a SEP-38 quote
- Real testnet USDC is paid to the user's wallet (or held until a trustline exists)

## Off-ramp · USDC → TRY

USDC
+ memo

→

USDC received

→

USD/TRY
locked

→

TRY
to IBAN

- The user starts a withdrawal and gets the treasury address + a memo id
- The wallet sends USDC on Stellar testnet with that memo
- The anchor detects the payment and sells at the locked rate
- TRY is paid to the user's IBAN (simulated FAST)
- Both sides track status through SEP-6 /transaction

## One standard door

### SEP path · standard, portable (start here)

stellar.toml discovery (SEP-1), /auth (SEP-10), /sep6 deposit & withdraw, /sep12 simulated KYC (no personal data), /sep38 quotes. Non-custodial: the user's key is the identity. Integrate once, ship to any real SEP anchor by changing the home domain. The SEP path →
