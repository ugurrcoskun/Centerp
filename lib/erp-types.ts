export interface Company {id: string; name: string; wallet: string | null; demo?: boolean; createdAt: number}
export interface Contact {id: string; companyId: string; type: 'customer' | 'vendor'; name: string; email: string; wallet: string; createdAt: number}
export interface Product {id: string; companyId: string; sku: string; name: string; type: 'raw' | 'finished'; quantity: number; reorderPoint: number; price: string; createdAt: number}
export interface OrderLine {productId: string; name: string; quantity: number; unitPrice: string; total: string}
export interface SalesOrder {id: string; companyId: string; code: string; contactId: string; lines: OrderLine[]; total: string; status: 'open' | 'invoiced' | 'settled' | 'refunded' | 'cancelled'; delivered: boolean; invoiceId?: string; createdAt: number}
export interface PurchaseOrder {id: string; companyId: string; code: string; contactId: string; lines: OrderLine[]; total: string; status: 'ordered' | 'received'; payableId?: string; createdAt: number}
export interface Employee {id: string; companyId: string; name: string; department: string; role: string; salary: string; wallet: string; createdAt: number}
export interface ProductionJob {id: string; companyId: string; code: string; outputId: string; quantity: number; inputs: {productId: string; perUnit: number}[]; status: 'planned' | 'completed'; createdAt: number}
export interface Payable {id: string; companyId: string; code: string; type: 'vendor' | 'salary'; sourceId: string; recipientId: string; recipient: string; amount: string; status: 'open' | 'paid'; hash?: string; period?: string; createdAt: number}
export interface StockMovement {id: string; companyId: string; productId: string; quantity: number; reason: string; sourceId: string; createdAt: number}
export interface JournalEntry {id: string; companyId: string; sourceId: string; label: string; debit: string; credit: string; amount: string; hash?: string; createdAt: number}
export interface ERPState {company: Company; connectedAccount: string | null; contacts: Contact[]; products: Product[]; sales: SalesOrder[]; purchases: PurchaseOrder[]; employees: Employee[]; production: ProductionJob[]; payables: Payable[]; movements: StockMovement[]; journal: JournalEntry[]}
