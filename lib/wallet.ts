import {STELLAR} from './config';
let ready = false;
export async function walletKit() {
  const [{StellarWalletsKit}, {FreighterModule, FREIGHTER_ID}, {Networks}] = await Promise.all([
    import('@creit.tech/stellar-wallets-kit/sdk'),
    import('@creit.tech/stellar-wallets-kit/modules/freighter'),
    import('@creit.tech/stellar-wallets-kit/types'),
  ]);
  if (!ready) {
    StellarWalletsKit.init({modules: [new FreighterModule()], network: Networks.TESTNET});
    StellarWalletsKit.setWallet(FREIGHTER_ID);
    ready = true;
  }
  return StellarWalletsKit;
}
export async function signXdr(xdr: string, account: string) {
  const kit = await walletKit();
  const network = await kit.getNetwork();
  if (network.networkPassphrase !== STELLAR.passphrase) throw new Error('Freighter ağını Testnet olarak değiştirin.');
  const current = await kit.fetchAddress();
  if (current.address !== account) throw new Error('Cüzdandaki hesap değişmiş. Panelden bağlantıyı kesip yeniden bağlanın.');
  const signed = await kit.signTransaction(xdr, {networkPassphrase: STELLAR.passphrase, address: account});
  if (!signed.signedTxXdr || signed.signerAddress && signed.signerAddress !== account) throw new Error('İmza alınamadı veya farklı bir hesaba ait.');
  return signed.signedTxXdr;
}
