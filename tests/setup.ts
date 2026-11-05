import {Keypair} from '@stellar/stellar-sdk';
// Public, deterministic test-only key. Never used by the application runtime.
process.env.SEP10_SIGNING_SECRET = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 7)).secret();
process.env.APP_ORIGIN = 'http://localhost:3000';
