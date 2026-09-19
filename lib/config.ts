export const STELLAR = {
  network: 'TESTNET',
  passphrase: 'Test SDF Network ; September 2015',
  horizon: 'https://horizon-testnet.stellar.org',
  rpc: 'https://soroban-testnet.stellar.org',
  anchor: 'https://tr-mock-anchor.fly.dev',
  homeDomain: 'tr-mock-anchor.fly.dev',
  assetCode: 'USDC',
  issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
  anchorSigner: 'GDXYO6FJCNXZEWGXD54GT76FGFYLOLSOGSOJLNQ6WGHCGEQPO7NTE73M',
} as const;

export const explorer = (hash: string) => `https://stellar.expert/explorer/testnet/tx/${hash}`;
export const shortAddress = (value: string) => value ? `${value.slice(0, 6)}…${value.slice(-5)}` : '';
