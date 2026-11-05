import {STELLAR} from './config';
let ready = false;
export async function walletKit() {
  const [{StellarWalletsKit}, {FreighterModule, FREIGHTER_ID}, {Networks}] = await Promise.all([
    import('@creit.tech/stellar-wallets-kit/sdk'),
    import('@creit.tech/stellar-wallets-kit/modules/freighter'),
    import('@creit.tech/stellar-wallets-kit/types'),
  ]);
  if (!ready) {
    StellarWalletsKit.init({
      modules: [new FreighterModule()],
      network: Networks.TESTNET,
      authModal: {showInstallLabel: true, hideUnsupportedWallets: false},
    });
    StellarWalletsKit.setWallet(FREIGHTER_ID);
    ready = true;
  }
  return StellarWalletsKit;
}
export async function connectFreighter() {
  const {FreighterModule} = await import('@creit.tech/stellar-wallets-kit/modules/freighter');
  // Embedded browsers may never answer the extension's discovery message.
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const available = await Promise.race([
    new FreighterModule().isAvailable(),
    new Promise<false>(resolve => { timeout = setTimeout(() => resolve(false), 3000); }),
  ]).finally(() => clearTimeout(timeout));
  if (!available) throw new Error('Freighter bu tarayıcıda algılanmadı. Centerp’in Finans sayfasını Freighter eklentisinin kurulu olduğu masaüstü tarayıcıda açıp yeniden deneyin.');
  const kit = await walletKit();
  try {
    const result = await kit.fetchAddress();
    if (!result.address) throw new Error('Seçilen cüzdan hesap adresi paylaşmadı.');
    const network = await kit.getNetwork();
    if (network.networkPassphrase !== STELLAR.passphrase) {
      throw new Error('Freighter şu anda Main Net’te. Freighter’ı açın, üst bölümdeki ağ menüsünden Test Net’i seçin ve ardından yeniden bağlanın. Centerp yalnızca Testnet kullanır.');
    }
    return result.address;
  } catch (error) {
    const message = typeof error === 'object' && error && 'message' in error ? String(error.message) : '';
    throw error instanceof Error ? error : new Error(message || 'Cüzdan bağlantısı tamamlanamadı.');
  }
}
export async function signXdr(xdr: string, account: string) {
  const kit = await walletKit();
  const network = await kit.getNetwork();
  if (network.networkPassphrase !== STELLAR.passphrase) {
    throw new Error('Freighter ağı değişmiş. Freighter’ın üst bölümündeki ağ menüsünden Test Net’i seçip yeniden deneyin.');
  }
  const current = await kit.fetchAddress();
  if (current.address !== account) throw new Error('Cüzdandaki hesap değişmiş. Panelden bağlantıyı kesip yeniden bağlanın.');
  // Every Centerp signature is explicitly scoped to Testnet.
  const signed = await kit.signTransaction(xdr, {networkPassphrase: STELLAR.passphrase, address: account});
  if (!signed.signedTxXdr || signed.signerAddress && signed.signerAddress !== account) throw new Error('İmza alınamadı veya farklı bir hesaba ait.');
  return signed.signedTxXdr;
}
