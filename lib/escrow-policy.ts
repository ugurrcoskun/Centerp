import type {Invoice} from './types';
export const DISPUTE_SECONDS = 3 * 86400;
export const RESOLUTION_SECONDS = 7 * 86400;
export function settlementDue(invoice: Invoice): number | null {
  if (invoice.version !== 2) return null;
  if (invoice.status === 'funded') return invoice.deliveryDue;
  if (invoice.status === 'delivered') return invoice.deliveryDue + DISPUTE_SECONDS;
  if (invoice.status === 'disputed' && invoice.disputedAt) return invoice.disputedAt + RESOLUTION_SECONDS;
  return null;
}
export function settlementEvent(status: Invoice['status'], kind: string) {
  if (['finalize', 'resolve_release', 'resolve_refund'].includes(kind)) {
    if (status === 'released') return 'release';
    if (status === 'refunded') return 'refund';
    throw new Error('Sonuçlandırma için nihai kontrat durumu gerekli.');
  }
  return kind;
}
