export type InvoiceStatus = 'draft' | 'open' | 'funded' | 'released' | 'refunded' | 'cancelled' | 'expired';
export interface Invoice {
  id: string; code: string; merchant: string; buyer: string; buyerName: string;
  amount: string; description: string; due: number; deliveryDue: number;
  commitment: string; status: InvoiceStatus; createdAt: number;
  orderId?: string; erpCompanyId?: string;
  transactions: {kind: string; hash: string}[];
}
export interface AnchorTransfer {
  id: string; account: string; kind: 'deposit' | 'withdraw'; invoiceId?: string;
  status: string; amount: string; quoteId?: string; createdAt: number;
  details: Record<string, unknown>; hash?: string;
}
export interface ChainOperation {
  id: string; account: string; kind: string; invoiceId?: string; anchorId?: string;
  xdr: string; hash: string; status: 'prepared' | 'pending' | 'success' | 'failed';
  erpPayableId?: string; erpCompanyId?: string;
  createdAt: number; error?: string;
}
export interface BridgeState {
  account: string | null; contract: string; invoices: Invoice[]; transfers: AnchorTransfer[];
  operations: ChainOperation[]; balances: {xlm: string; usdc: string; trustline: boolean; funded: boolean};
  health: Record<string, unknown> | null; anchorAuthenticated: boolean;
}
