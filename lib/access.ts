import {randomUUID} from 'node:crypto';
import {accountFromRequest, publicKey, requireAccount} from './auth';
import {putRecord, record, records} from './db';
import type {AuditEntry, Company, CompanyRole, Membership, PaymentApproval} from './erp-types';
import type {ChainOperation, Invoice} from './types';
export type Permission = 'view' | 'operate' | 'invoice' | 'approve' | 'manage';
const rights: Record<CompanyRole, Permission[]> = {
  owner: ['view','operate','invoice','approve','manage'], admin: ['view','operate','invoice','approve','manage'],
  billing: ['view','invoice'], approver: ['view','approve'], operator: ['view','operate'], viewer: ['view'],
};
export function rolesFor(company: Company, account: string | null): CompanyRole[] {
  if (!account) return [];
  try {
    const member = record<Membership>('erp_member', company.id + ':' + account);
    return member.active ? member.roles : [];
  } catch { return []; }
}
export function allows(roles: CompanyRole[], permission: Permission) {return roles.some(role => rights[role]?.includes(permission));}
export function requirePermission(companyId: string, account: string, permission: Permission) {
  const company = record<Company>('erp_company', companyId);
  if (!allows(rolesFor(company, account), permission)) throw new Error('Bu işlem için şirket rolünüz yeterli değil.');
  return company;
}
export function assertWorkspaceAccess(company: Company, request: Request) {
  if (!company.wallet) return; // Anonymous, isolated demo data only.
  const account = requireAccount(request);
  if (!company.ownerAccount && account === company.wallet) return; // Legacy owner may migrate explicitly via linkWallet.
  requirePermission(company.id, account, 'view');
}
export function assertMutation(company: Company, request: Request, action: string) {
  if (action === 'linkWallet') return;
  if (!company.wallet) return;
  requirePermission(company.id, requireAccount(request), ['company','member'].includes(action) ? 'manage' : action === 'approvePayable' ? 'approve' : 'operate');
}
export function audit(companyId: string, actor: string, action: string, target?: string) {
  const id = randomUUID();
  putRecord('erp_audit', id, companyId, {id, companyId, actor, action, target, createdAt: Date.now()} satisfies AuditEntry);
}
export function setMember(company: Company, actor: string, account: string, roles: CompanyRole[], active: boolean) {
  publicKey(account);
  requirePermission(company.id, actor, 'manage');
  if (account === company.ownerAccount || roles.includes('owner')) throw new Error('Şirket sahibinin yetkisi devredilemez veya kaldırılamaz.');
  const member: Membership = {id: company.id + ':' + account, companyId: company.id, account, roles: [...new Set(roles)], active, createdAt: Date.now()};
  putRecord('erp_member', member.id, company.id, member);
  return member;
}
export function accessibleCompanyIds(request: Request) {
  const account = accountFromRequest(request);
  return records<Company>('erp_company').filter(c => allows(rolesFor(c, account), 'view')).map(c => c.id);
}
export function authorizeInvoiceAction(account: string, kind: string, invoiceId?: string) {
  if (!invoiceId) return;
  const invoice = record<Invoice>('invoice', invoiceId);
  if (invoice.erpCompanyId && account === invoice.merchant && ['create','cancel','deliver','refund'].includes(kind)) {
    requirePermission(invoice.erpCompanyId, account, kind === 'refund' ? 'approve' : 'invoice');
  }
}
export function authorizeOperation(account: string, operation: ChainOperation) {
  if (operation.account !== account) throw new Error('İşlem başka cüzdana ait.');
  authorizeInvoiceAction(account, operation.kind, operation.invoiceId);
  if (operation.erpCompanyId && operation.erpPayableId) {
    requirePermission(operation.erpCompanyId, account, 'approve');
    if (operation.status === 'prepared') {
      const approval = record<PaymentApproval>('erp_approval', operation.erpPayableId);
      requirePermission(operation.erpCompanyId, approval.actor, 'approve');
      if (approval.id !== operation.paymentApprovalId || approval.createdAt + 86400000 <= Date.now()) throw new Error('Ödeme onayı değişti veya süresi doldu; işlemi yeniden hazırlayın.');
    }
  }
}
