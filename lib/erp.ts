import {createHash, randomBytes, randomUUID} from 'node:crypto';
import Decimal from 'decimal.js';
import {z} from 'zod';
import {amount} from './amount';
import {accountFromRequest, publicKey, requireAccount} from './auth';
import {db, deleteRecord, putRecord, record, records} from './db';
import type {Invoice} from './types';
import type {Company, Contact, Employee, ERPState, JournalEntry, OrderLine, Payable, Product, ProductionJob, PurchaseOrder, SalesOrder, StockMovement} from './erp-types';

export const ERP_COOKIE = 'erp_workspace';
const scope = <T extends {companyId: string}>(kind: string, companyId: string) => records<T>('erp_' + kind).filter(row => row.companyId === companyId);
const put = <T>(kind: string, id: string, companyId: string, value: T) => putRecord('erp_' + kind, id, companyId, value);
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const text = z.string().trim().min(1).max(120);
const wallet = z.string().max(56).default('');
const count = z.number().int().min(1).max(100000);
const lineSchema = z.object({productId: z.string().uuid(), quantity: count, unitPrice: z.string().max(30)});
const mutationSchema = z.discriminatedUnion('action', [
  z.object({action: z.literal('company'), name: text}),
  z.object({action: z.literal('linkWallet')}),
  z.object({action: z.literal('contact'), id: z.string().uuid().optional(), type: z.enum(['customer', 'vendor']), name: text, email: z.string().max(160).default(''), wallet}),
  z.object({action: z.literal('product'), sku: text, name: text, type: z.enum(['raw', 'finished']), quantity: z.number().int().min(0).max(100000), reorderPoint: z.number().int().min(0).max(100000), price: z.string().max(30)}),
  z.object({action: z.literal('sales'), contactId: z.string().uuid(), lines: z.array(lineSchema).min(1).max(20)}),
  z.object({action: z.literal('purchase'), contactId: z.string().uuid(), lines: z.array(lineSchema).min(1).max(20)}),
  z.object({action: z.literal('receive'), id: z.string().uuid()}),
  z.object({action: z.literal('deliver'), id: z.string().uuid()}),
  z.object({action: z.literal('employee'), id: z.string().uuid().optional(), name: text, department: text, role: text, salary: z.string().max(30), wallet}),
  z.object({action: z.literal('payroll'), period: z.string().regex(/^20[0-9]{2}-(0[1-9]|1[0-2])$/)}),
  z.object({action: z.literal('production'), outputId: z.string().uuid(), quantity: count, inputs: z.array(z.object({productId: z.string().uuid(), perUnit: count})).min(1).max(20)}),
  z.object({action: z.literal('completeProduction'), id: z.string().uuid()}),
  z.object({action: z.literal('delete'), kind: z.enum(['contact', 'product', 'employee', 'sales', 'purchase', 'production']), id: z.string().uuid()}),
  z.object({action: z.literal('sample')}),
]);
export function transaction<T>(work: () => T): T {
  db().exec('BEGIN IMMEDIATE');
  try {const result = work(); db().exec('COMMIT'); return result;} catch (error) {db().exec('ROLLBACK'); throw error;}
}
function cookieToken(request: Request) {
  return request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(ERP_COOKIE + '='))?.slice(ERP_COOKIE.length + 1);
}
export function erpCompany(request: Request): Company {
  const token = cookieToken(request);
  if (!token) throw new Error('ERP çalışma alanını önce açın.');
  const session = record<{companyId: string; expires: number}>('erp_session', hashToken(token));
  if (session.expires < Date.now()) throw new Error('ERP oturumunun süresi doldu.');
  const company = record<Company>('erp_company', session.companyId);
  // Preserve user-renamed companies; only migrate the former generated default.
  return company.name === 'Yeni şirketim'
    ? putRecord('erp_company', company.id, company.id, {...company, name: 'Comuchain'})
    : company;
}
export function openERP(request: Request) {
  const token = cookieToken(request);
  if (token) {
    let company: Company | null = null;
    try {company = erpCompany(request);} catch {}
    if (company) {
      let dirty = false;
      if (!process.env.ERP_DISABLE_DEFAULT_SEED && company.demoVersion !== 3) {
        company = putRecord('erp_company', company.id, company.id, {...company, demo: true});
        mutateERP(request, {action: 'sample'});
        company = record<Company>('erp_company', company.id);
        dirty = true;
      }
      return {company, token: null, dirty};
    }
  }
  const opened = transaction(() => {
    const company: Company = {id: randomUUID(), name: 'Comuchain', wallet: null, createdAt: Date.now()};
    putRecord('erp_company', company.id, company.id, company);
    const fresh = randomBytes(48).toString('hex');
    putRecord('erp_session', hashToken(fresh), company.id, {companyId: company.id, expires: Date.now() + 30 * 86400000});
    return {company, token: fresh, dirty: true};
  });
  if (!process.env.ERP_DISABLE_DEFAULT_SEED) {
    const seededRequest = new Request(request.url, {headers: {cookie: ERP_COOKIE + '=' + opened.token}});
    mutateERP(seededRequest, {action: 'sample'});
    opened.company = record<Company>('erp_company', opened.company.id);
  }
  return opened;
}
export function erpState(company: Company, request?: Request): ERPState {
  return {company, connectedAccount: request ? accountFromRequest(request) : null,
    contacts: scope<Contact>('contact', company.id), products: scope<Product>('product', company.id),
    sales: scope<SalesOrder>('sales', company.id), purchases: scope<PurchaseOrder>('purchase', company.id),
    employees: scope<Employee>('employee', company.id), production: scope<ProductionJob>('production', company.id),
    payables: scope<Payable>('payable', company.id), movements: scope<StockMovement>('movement', company.id),
    journal: scope<JournalEntry>('journal', company.id)};
}
export function companyRecord<T extends {companyId: string}>(kind: string, id: string, companyId: string): T {
  const value = record<T>('erp_' + kind, id);
  if (value.companyId !== companyId) throw new Error('Bu kayıt şirketinize ait değil.');
  return value;
}
function validateWallet(value: string) {if (value) publicKey(value); return value;}
function linesFor(companyId: string, input: z.infer<typeof lineSchema>[]): OrderLine[] {
  if (new Set(input.map(line => line.productId)).size !== input.length) throw new Error('Aynı ürünü tek satırda ekleyin.');
  return input.map(line => {
    const product = companyRecord<Product>('product', line.productId, companyId);
    const unitPrice = amount(line.unitPrice);
    const total = amount(new Decimal(unitPrice).mul(line.quantity).toFixed(7));
    return {productId: product.id, name: product.name, quantity: line.quantity, unitPrice, total};
  });
}
const totalFor = (lines: OrderLine[]) => amount(lines.reduce((sum, line) => sum.plus(line.total), new Decimal(0)).toFixed(7));
const code = (prefix: string, id: string) => prefix + '-' + new Date().getFullYear() + '-' + id.slice(0, 6).toUpperCase();
function movement(companyId: string, productId: string, quantity: number, reason: string, sourceId: string) {
  const id = randomUUID();
  return put('movement', id, companyId, {id, companyId, productId, quantity, reason, sourceId, createdAt: Date.now()} satisfies StockMovement);
}
function stockChange(companyId: string, productId: string, delta: number, reason: string, sourceId: string) {
  const product = companyRecord<Product>('product', productId, companyId);
  const next = product.quantity + delta;
  if (!Number.isSafeInteger(next) || next < 0 || next > 100000000) throw new Error(product.name + ' için yeterli stok yok veya stok limiti aşılıyor.');
  put('product', product.id, companyId, {...product, quantity: next});
  movement(companyId, productId, delta, reason, sourceId);
}
export function journal(companyId: string, sourceId: string, event: string, label: string, debit: string, credit: string, value: string, hash?: string) {
  const id = createHash('sha256').update(companyId + ':' + sourceId + ':' + event).digest('hex');
  const existing = scope<JournalEntry>('journal', companyId).find(entry => entry.id === id);
  if (existing) return existing;
  return put('journal', id, companyId, {id, companyId, sourceId, label, debit, credit, amount: amount(value), hash, createdAt: Date.now()} satisfies JournalEntry);
}
export function mutateERP(request: Request, raw: unknown) {
  const input = mutationSchema.parse(raw);
  const company = erpCompany(request);
  const companyId = company.id;
  return transaction(() => {
    const id = randomUUID();
    const createdAt = Date.now();
    switch (input.action) {
      case 'company': return putRecord('erp_company', companyId, companyId, {...company, name: input.name});
      case 'linkWallet': {
        const account = requireAccount(request);
        if (company.wallet && company.wallet !== account) throw new Error('Şirketin kayıtlı cüzdanını bağlayın. Bu sürüm cüzdan sahipliği devrini desteklemez.');
        const existing = records<Company>('erp_company').find(c => c.wallet === account && c.id !== companyId);
        // A Freighter signature proves control of this account. Reassign it from
        // stale mock workspaces instead of trapping the user in an old browser session.
        if (existing) putRecord('erp_company', existing.id, existing.id, {...existing, wallet: null});
        return putRecord('erp_company', companyId, companyId, {...company, wallet: account});
      }
      case 'contact': {
        if (input.id) companyRecord<Contact>('contact', input.id, companyId);
        const contact: Contact = {id: input.id || id, companyId, type: input.type, name: input.name, email: input.email, wallet: validateWallet(input.wallet), createdAt};
        return put('contact', contact.id, companyId, contact);
      }
      case 'product': {
        if (scope<Product>('product', companyId).some(p => p.sku.toLowerCase() === input.sku.toLowerCase())) throw new Error('Bu SKU zaten kayıtlı.');
        const product: Product = {id, companyId, sku: input.sku, name: input.name, type: input.type, quantity: input.quantity, reorderPoint: input.reorderPoint, price: amount(input.price), createdAt};
        put('product', id, companyId, product);
        if (input.quantity) movement(companyId, id, input.quantity, 'Açılış stoku', id);
        return product;
      }
      case 'sales': {
        const contact = companyRecord<Contact>('contact', input.contactId, companyId);
        if (contact.type !== 'customer') throw new Error('Bir müşteri seçin.');
        const lines = linesFor(companyId, input.lines);
        return put('sales', id, companyId, {id, companyId, code: code('SO', id), contactId: contact.id, lines, total: totalFor(lines), status: 'open', delivered: false, createdAt} satisfies SalesOrder);
      }
      case 'purchase': {
        const contact = companyRecord<Contact>('contact', input.contactId, companyId);
        if (contact.type !== 'vendor') throw new Error('Bir tedarikçi seçin.');
        const lines = linesFor(companyId, input.lines);
        return put('purchase', id, companyId, {id, companyId, code: code('PO', id), contactId: contact.id, lines, total: totalFor(lines), status: 'ordered', createdAt} satisfies PurchaseOrder);
      }
      case 'receive': {
        const purchase = companyRecord<PurchaseOrder>('purchase', input.id, companyId);
        if (purchase.status !== 'ordered') throw new Error('Bu satın alma zaten teslim alındı.');
        for (const line of purchase.lines) stockChange(companyId, line.productId, line.quantity, 'Satın alma kabulü', purchase.id);
        const contact = companyRecord<Contact>('contact', purchase.contactId, companyId);
        const payable: Payable = {id, companyId, code: code('AP', id), type: 'vendor', sourceId: purchase.id, recipientId: contact.id, recipient: contact.name, amount: purchase.total, status: 'open', createdAt};
        put('payable', id, companyId, payable);
        journal(companyId, purchase.id, 'received', purchase.code + ' mal kabulü', 'Stok', 'Tedarikçi borçları', purchase.total);
        return put('purchase', purchase.id, companyId, {...purchase, status: 'received', payableId: id});
      }
      case 'deliver': {
        const sales = companyRecord<SalesOrder>('sales', input.id, companyId);
        if (sales.delivered || ['refunded', 'cancelled'].includes(sales.status)) throw new Error('Bu sipariş sevkiyata uygun değil.');
        for (const line of sales.lines) stockChange(companyId, line.productId, -line.quantity, 'Satış sevkiyatı', sales.id);
        return put('sales', sales.id, companyId, {...sales, delivered: true});
      }
      case 'employee': {
        if (input.id) companyRecord<Employee>('employee', input.id, companyId);
        const employee: Employee = {id: input.id || id, companyId, name: input.name, department: input.department, role: input.role, salary: amount(input.salary), wallet: validateWallet(input.wallet), createdAt};
        return put('employee', employee.id, companyId, employee);
      }
      case 'payroll': {
        const employees = scope<Employee>('employee', companyId);
        if (!employees.length) throw new Error('Önce çalışan ekleyin.');
        const existing = scope<Payable>('payable', companyId);
        let added = 0;
        for (const employee of employees) {
          if (existing.some(p => p.type === 'salary' && p.recipientId === employee.id && p.period === input.period)) continue;
          const payableId = randomUUID();
          put('payable', payableId, companyId, {id: payableId, companyId, code: code('PAY', payableId), type: 'salary', sourceId: employee.id, recipientId: employee.id, recipient: employee.name, amount: employee.salary, status: 'open', period: input.period, createdAt} satisfies Payable);
          journal(companyId, payableId, 'accrued', input.period + ' ücret · ' + employee.name, 'Personel giderleri', 'Çalışan borçları', employee.salary);
          added++;
        }
        if (!added) throw new Error('Bu dönem için tüm çalışanların ödeme kayıtları zaten var.');
        return {added};
      }
      case 'production': {
        companyRecord<Product>('product', input.outputId, companyId);
        if (new Set(input.inputs.map(i => i.productId)).size !== input.inputs.length) throw new Error('Tekrarlanan girdi ürünü var.');
        for (const ingredient of input.inputs) {
          companyRecord<Product>('product', ingredient.productId, companyId);
          if (ingredient.productId === input.outputId) throw new Error('Çıktı ürünü aynı iş emrinin girdisi olamaz.');
        }
        return put('production', id, companyId, {id, companyId, code: code('WO', id), outputId: input.outputId, quantity: input.quantity, inputs: input.inputs, status: 'planned', createdAt} satisfies ProductionJob);
      }
      case 'completeProduction': {
        const job = companyRecord<ProductionJob>('production', input.id, companyId);
        if (job.status !== 'planned') throw new Error('İş emri zaten tamamlandı.');
        for (const ingredient of job.inputs) stockChange(companyId, ingredient.productId, -ingredient.perUnit * job.quantity, 'Üretim tüketimi', job.id);
        stockChange(companyId, job.outputId, job.quantity, 'Üretim çıktısı', job.id);
        return put('production', job.id, companyId, {...job, status: 'completed'});
      }
      case 'delete': {
        if (input.kind === 'sales') {
          const sale = companyRecord<SalesOrder>('sales', input.id, companyId);
          if (sale.invoiceId || sale.delivered || sale.status !== 'open') throw new Error('Faturalanmış veya sevk edilmiş satış kaydı silinemez.');
          deleteRecord('erp_sales', sale.id);
          return {deleted: sale.id};
        }
        if (input.kind === 'purchase') {
          const purchase = companyRecord<PurchaseOrder>('purchase', input.id, companyId);
          if (purchase.status !== 'ordered') throw new Error('Mal kabulü yapılmış satın alma kaydı silinemez.');
          deleteRecord('erp_purchase', purchase.id);
          return {deleted: purchase.id};
        }
        if (input.kind === 'production') {
          const job = companyRecord<ProductionJob>('production', input.id, companyId);
          if (job.status !== 'planned') throw new Error('Tamamlanmış üretim kaydı silinemez.');
          deleteRecord('erp_production', job.id);
          return {deleted: job.id};
        }
        if (input.kind === 'contact') {
          const contact = companyRecord<Contact>('contact', input.id, companyId);
          if (scope<SalesOrder>('sales', companyId).some(row => row.contactId === contact.id) || scope<PurchaseOrder>('purchase', companyId).some(row => row.contactId === contact.id)) throw new Error('Önce bu iş ortağına bağlı siparişleri kaldırın.');
          deleteRecord('erp_contact', contact.id);
          return {deleted: contact.id};
        }
        if (input.kind === 'product') {
          const product = companyRecord<Product>('product', input.id, companyId);
          const inOrders = scope<SalesOrder>('sales', companyId).some(row => row.lines.some(line => line.productId === product.id)) || scope<PurchaseOrder>('purchase', companyId).some(row => row.lines.some(line => line.productId === product.id));
          const inProduction = scope<ProductionJob>('production', companyId).some(row => row.outputId === product.id || row.inputs.some(item => item.productId === product.id));
          if (inOrders || inProduction) throw new Error('Önce bu ürüne bağlı sipariş ve üretim kayıtlarını kaldırın.');
          if (scope<StockMovement>('movement', companyId).some(row => row.productId === product.id && row.sourceId !== product.id)) throw new Error('İşlem görmüş ürün kaydı silinemez.');
          for (const row of scope<StockMovement>('movement', companyId).filter(row => row.productId === product.id)) deleteRecord('erp_movement', row.id);
          deleteRecord('erp_product', product.id);
          return {deleted: product.id};
        }
        const employee = companyRecord<Employee>('employee', input.id, companyId);
        const employeePayables = scope<Payable>('payable', companyId).filter(row => row.type === 'salary' && row.recipientId === employee.id);
        if (employeePayables.some(row => row.status === 'paid')) throw new Error('Ödemesi tamamlanmış çalışan kaydı silinemez.');
        for (const payable of employeePayables) {
          for (const entry of scope<JournalEntry>('journal', companyId).filter(row => row.sourceId === payable.id)) deleteRecord('erp_journal', entry.id);
          deleteRecord('erp_payable', payable.id);
        }
        deleteRecord('erp_employee', employee.id);
        return {deleted: employee.id};
      }
      case 'sample': {
        const hasCoreData = scope<Product>('product', companyId).length || scope<Contact>('contact', companyId).length || scope<Employee>('employee', companyId).length;
        if (hasCoreData && !company.demo) throw new Error('Örnek veri yalnızca boş veya örnek çalışma alanına eklenir.');
        putRecord('erp_company', companyId, companyId, {...company, demo: true, demoVersion: 3});
        const at = (daysAgo: number) => createdAt - daysAgo * 86400000;
        const contactIds: Record<string, string> = {};
        const contactSeeds = [
          ['atlas', 'Atlas Tasarım · örnek', 'customer', 'satinalma@atlastasarim.test'],
          ['nova', 'Nova Perakende · örnek', 'customer', 'operasyon@novaperakende.test'],
          ['marmara', 'Marmara Teknoloji · örnek', 'customer', 'finans@marmarateknoloji.test'],
          ['kuzey', 'Kuzey Tedarik · örnek', 'vendor', 'siparis@kuzeytedarik.test'],
          ['eksen', 'Eksen Elektronik · örnek', 'vendor', 'satis@eksenelektronik.test'],
          ['anadolu', 'Anadolu Ambalaj · örnek', 'vendor', 'tedarik@anadoluambalaj.test'],
        ] as const;
        for (const [key, name, type, email] of contactSeeds) {
          const existing = scope<Contact>('contact', companyId).find(row => row.name === name);
          const contactId = existing?.id || randomUUID();
          contactIds[key] = contactId;
          if (!existing) put('contact', contactId, companyId, {id: contactId, companyId, name, type, email, wallet: '', createdAt: at(35)} satisfies Contact);
        }
        const productIds: Record<string, string> = {};
        const productSeeds = [
          ['RAW-001', 'Alüminyum gövde · örnek', 'raw', 48, '1250', 20],
          ['RAW-002', 'Sensör modülü · örnek', 'raw', 14, '2850', 18],
          ['RAW-003', 'Bağlantı kiti · örnek', 'raw', 80, '390', 25],
          ['RAW-004', 'Ambalaj seti · örnek', 'raw', 12, '160', 20],
          ['PRD-001', 'Akıllı sensör · örnek', 'finished', 26, '7250', 10],
          ['PRD-002', 'Endüstriyel ağ geçidi · örnek', 'finished', 7, '16800', 8],
          ['PRD-003', 'İzleme başlangıç paketi · örnek', 'finished', 18, '11200', 6],
        ] as const;
        for (const [sku, name, type, quantity, price, reorderPoint] of productSeeds) {
          const existing = scope<Product>('product', companyId).find(row => row.sku === sku);
          const productId = existing?.id || randomUUID();
          productIds[sku] = productId;
          if (existing) put('product', productId, companyId, {...existing, name, type, price: amount(price), reorderPoint});
          else {
            put('product', productId, companyId, {id: productId, companyId, sku, name, type, quantity, price: amount(price), reorderPoint, createdAt: at(30)} satisfies Product);
            movement(companyId, productId, quantity, 'Örnek açılış stoku', productId);
          }
        }
        const employeeSeeds = [
          ['Ayşe Yılmaz · örnek', 'Operasyon', 'Operasyon yöneticisi', '2850'],
          ['Mehmet Kaya · örnek', 'Üretim', 'Üretim sorumlusu', '2700'],
          ['Elif Demir · örnek', 'Satış', 'Kurumsal satış uzmanı', '2600'],
          ['Can Arslan · örnek', 'Finans', 'Finans uzmanı', '2950'],
          ['Zeynep Şahin · örnek', 'Lojistik', 'Depo ve sevkiyat uzmanı', '2500'],
        ] as const;
        for (const [name, department, role, salary] of employeeSeeds) {
          const existing = scope<Employee>('employee', companyId).find(row => row.name === name);
          if (!existing) {
            const employeeId = randomUUID();
            put('employee', employeeId, companyId, {id: employeeId, companyId, name, department, role, salary: amount(salary), wallet: '', createdAt: at(25)} satisfies Employee);
          } else put('employee', existing.id, companyId, {...existing, department, role, salary: amount(salary)} satisfies Employee);
        }
        const ensureSale = (contactId: string, daysAgo: number, input: z.infer<typeof lineSchema>[]) => {
          if (scope<SalesOrder>('sales', companyId).some(row => row.contactId === contactId && row.lines.some(line => line.productId === input[0].productId))) return;
          const saleId = randomUUID(); const lines = linesFor(companyId, input);
          put('sales', saleId, companyId, {id: saleId, companyId, code: code('SO', saleId), contactId, lines, total: totalFor(lines), status: 'open', delivered: false, createdAt: at(daysAgo)} satisfies SalesOrder);
        };
        ensureSale(contactIds.atlas, 9, [{productId: productIds['PRD-001'], quantity: 4, unitPrice: '7250'}]);
        ensureSale(contactIds.nova, 5, [{productId: productIds['PRD-002'], quantity: 2, unitPrice: '16800'}, {productId: productIds['PRD-003'], quantity: 1, unitPrice: '11200'}]);
        ensureSale(contactIds.marmara, 2, [{productId: productIds['PRD-003'], quantity: 3, unitPrice: '11200'}]);
        const ensurePurchase = (contactId: string, daysAgo: number, received: boolean, input: z.infer<typeof lineSchema>[]) => {
          if (scope<PurchaseOrder>('purchase', companyId).some(row => row.contactId === contactId && row.lines.some(line => line.productId === input[0].productId))) return;
          const purchaseId = randomUUID(); const lines = linesFor(companyId, input); const total = totalFor(lines); const payableId = received ? randomUUID() : undefined;
          if (received) for (const line of lines) stockChange(companyId, line.productId, line.quantity, 'Örnek satın alma kabulü', purchaseId);
          put('purchase', purchaseId, companyId, {id: purchaseId, companyId, code: code('PO', purchaseId), contactId, lines, total, status: received ? 'received' : 'ordered', payableId, createdAt: at(daysAgo)} satisfies PurchaseOrder);
          if (received && payableId) {
            const recipient = companyRecord<Contact>('contact', contactId, companyId);
            put('payable', payableId, companyId, {id: payableId, companyId, code: code('AP', payableId), type: 'vendor', sourceId: purchaseId, recipientId: contactId, recipient: recipient.name, amount: total, status: 'open', createdAt: at(daysAgo)} satisfies Payable);
            journal(companyId, purchaseId, 'received', code('PO', purchaseId) + ' mal kabulü', 'Stok', 'Tedarikçi borçları', total);
          }
        };
        ensurePurchase(contactIds.kuzey, 16, true, [{productId: productIds['RAW-001'], quantity: 2, unitPrice: '1250'}]);
        ensurePurchase(contactIds.eksen, 4, false, [{productId: productIds['RAW-002'], quantity: 24, unitPrice: '2850'}, {productId: productIds['RAW-003'], quantity: 30, unitPrice: '390'}]);
        ensurePurchase(contactIds.anadolu, 11, true, [{productId: productIds['RAW-004'], quantity: 10, unitPrice: '160'}]);
        if (!scope<ProductionJob>('production', companyId).some(row => row.outputId === productIds['PRD-002'] && row.status === 'planned')) {
          const productionId = randomUUID();
          put('production', productionId, companyId, {id: productionId, companyId, code: code('WO', productionId), outputId: productIds['PRD-002'], quantity: 5, inputs: [{productId: productIds['RAW-001'], perUnit: 2}, {productId: productIds['RAW-002'], perUnit: 1}, {productId: productIds['RAW-003'], perUnit: 2}], status: 'planned', createdAt: at(1)} satisfies ProductionJob);
        }
        const period = new Date().toISOString().slice(0, 7);
        const payables = scope<Payable>('payable', companyId);
        const sampleAmounts = new Map(scope<Employee>('employee', companyId).map(row => [row.id, row.salary]));
        for (const payable of payables) {
          const amountForPayable = payable.type === 'salary' ? sampleAmounts.get(payable.recipientId) : payable.recipient.startsWith('Kuzey Tedarik') ? '2500.0000000' : payable.recipient.startsWith('Anadolu Ambalaj') ? '1600.0000000' : undefined;
          if (payable.status === 'open' && amountForPayable) put('payable', payable.id, companyId, {...payable, amount: amountForPayable} satisfies Payable);
        }
        for (const employee of scope<Employee>('employee', companyId)) {
          if (payables.some(row => row.type === 'salary' && row.recipientId === employee.id && row.period === period)) continue;
          const payrollId = randomUUID();
          put('payable', payrollId, companyId, {id: payrollId, companyId, code: code('PAY', payrollId), type: 'salary', sourceId: employee.id, recipientId: employee.id, recipient: employee.name, amount: employee.salary, status: 'open', period, createdAt: at(1)} satisfies Payable);
          journal(companyId, payrollId, 'accrued', period + ' ücret · ' + employee.name, 'Personel giderleri', 'Çalışan borçları', employee.salary);
        }
        return {ok: true, version: 2};
      }
    }
  });
}
export function orderForInvoice(request: Request, orderId: string, account: string) {
  const company = erpCompany(request);
  if (company.wallet !== account) throw new Error('Faturayı oluşturmak için şirkete bağlı Stellar cüzdanını kullanın.');
  const order = companyRecord<SalesOrder>('sales', orderId, company.id);
  if (order.status !== 'open' || order.invoiceId) throw new Error('Bu sipariş zaten faturaya bağlandı.');
  const contact = companyRecord<Contact>('contact', order.contactId, company.id);
  publicKey(contact.wallet);
  return {company, order, contact};
}
export function attachInvoice(orderId: string, companyId: string, invoiceId: string) {
  const order = companyRecord<SalesOrder>('sales', orderId, companyId);
  if (order.invoiceId && order.invoiceId !== invoiceId) throw new Error('Sipariş zaten faturalanmış.');
  put('sales', order.id, companyId, {...order, invoiceId});
}
export function syncERPInvoice(invoice: Invoice, kind: string, hash: string) {
  if (!invoice.erpCompanyId || !invoice.orderId) return;
  transaction(() => {
    const order = companyRecord<SalesOrder>('sales', invoice.orderId!, invoice.erpCompanyId!);
    const company = record<Company>('erp_company', order.companyId);
    if (company.wallet !== invoice.merchant || order.invoiceId !== invoice.id || order.total !== invoice.amount) throw new Error('ERP ve on-chain fatura bağlantısı eşleşmiyor.');
    const entries: Record<string, [string, string, string]> = {
      create: ['Satış faturası', 'Müşteri alacakları', 'Satış gelirleri'],
      fund: ['Escrow’a ödeme', 'Escrow alacakları', 'Müşteri alacakları'],
      release: ['Stellar tahsilatı', 'USDC cüzdanı', 'Escrow alacakları'],
      refund: ['Escrow iadesi', 'Müşteri alacakları', 'Escrow alacakları'],
      cancel: ['Fatura iptali', 'Satış gelirleri', 'Müşteri alacakları'],
      expire: ['Fatura vade kapatma', 'Satış gelirleri', 'Müşteri alacakları'],
    };
    const entry = entries[kind];
    if (entry) journal(company.id, invoice.id, kind, order.code + ' · ' + entry[0], entry[1], entry[2], invoice.amount, hash);
    if (kind === 'refund') journal(company.id, invoice.id, 'refund-reversal', order.code + ' · Satış iade kapatma', 'Satış gelirleri', 'Müşteri alacakları', invoice.amount, hash);
    const statuses: Partial<Record<Invoice['status'], SalesOrder['status']>> = {open: 'invoiced', released: 'settled', refunded: 'refunded', cancelled: 'cancelled', expired: 'cancelled'};
    put('sales', order.id, company.id, {...order, status: statuses[invoice.status] || 'invoiced'});
  });
}
export function payableForAnchor(companyId: string, payableId: string, account: string) {
  const company = record<Company>('erp_company', companyId);
  if (company.wallet !== account) throw new Error('Şirketin Stellar cüzdanını bağlayın.');
  const payable = companyRecord<Payable>('payable', payableId, companyId);
  if (payable.status !== 'open') throw new Error('Bu borç zaten ödendi.');
  return payable;
}
export function payableForPayment(companyId: string, payableId: string, account: string) {
  const payable = payableForAnchor(companyId, payableId, account);
  const recipient = payable.type === 'vendor' ? companyRecord<Contact>('contact', payable.recipientId, companyId) : companyRecord<Employee>('employee', payable.recipientId, companyId);
  if (!recipient.wallet) throw new Error(`Alıcının Stellar cüzdanı eksik. ERP’de ${payable.type === 'vendor' ? 'tedarikçi' : 'çalışan'} kaydına Testnet public key ekleyin.`);
  const destination = publicKey(recipient.wallet);
  if (destination === account) throw new Error('Alıcı cüzdanı şirket cüzdanından farklı olmalı.');
  return {payable, destination};
}
export function settlePayable(companyId: string, payableId: string, hash: string) {
  return transaction(() => {
    const payable = companyRecord<Payable>('payable', payableId, companyId);
    if (payable.hash && payable.hash !== hash) throw new Error('Borç farklı bir işlemle daha önce ödendi.');
    put('payable', payable.id, companyId, {...payable, status: 'paid', hash});
    journal(companyId, payable.id, 'paid', payable.code + ' · Stellar ödemesi', payable.type === 'vendor' ? 'Tedarikçi borçları' : 'Çalışan borçları', 'USDC cüzdanı', payable.amount, hash);
  });
}
