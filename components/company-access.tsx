'use client';
import {useState, type FormEvent} from 'react';
import {Button} from './ui/button';
import {fetchApiJson} from '@/lib/client-api';
import {shortAddress} from '@/lib/config';
import type {CompanyRole, ERPState} from '@/lib/erp-types';
const names: Record<CompanyRole,string> = {owner:'Şirket sahibi',admin:'Yönetici',billing:'Fatura hazırlayan',approver:'Ödeme onaylayan',operator:'Operasyon',viewer:'Salt okunur'};
export function CompanyAccess({state, busy, mutate}: {state: ERPState; busy: boolean; mutate: (action:string, params:Record<string,unknown>)=>Promise<void>}) {
  const [error,setError] = useState('');
  const [joining,setJoining] = useState(false);
  const manage = state.roles.some(r=>['owner','admin'].includes(r));
  async function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setJoining(true); setError('');
    try {
      const companyId = new FormData(event.currentTarget).get('companyId');
      await fetchApiJson('/api/erp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'joinCompany',companyId})});
      window.location.reload();
    } catch(e) {setError(e instanceof Error?e.message:'Şirkete katılınamadı.');} finally {setJoining(false);}
  }
  return <section className="panel erp-settings-panel erp-secondary-panel company-access-panel">
    <div className="panel-heading"><div><h2>Üyelik ve yetkiler</h2><p>{state.roles.length?state.roles.map(r=>names[r]).join(', '):'İzole demo alanı. Şirketi sahiplenmek için cüzdanı eşleştirin.'}</p></div></div>
    <p className="erp-field-help">Şirket kimliği: <code className="breakable-code">{state.company.id}</code>. Davet edilen kullanıcı finans ekranında kendi cüzdanını bağlayıp bu kimlikle katılabilir.</p>
    <form className="invoice-form" onSubmit={join}><label>Katılacağım şirket kimliği<input name="companyId" required placeholder="Yöneticinin paylaştığı şirket kimliği"/></label><Button type="submit" disabled={joining||!state.connectedAccount}>Üye olduğum şirkete geç</Button>{error&&<p role="alert">{error}</p>}</form>
    {manage&&<>
      <form className="invoice-form" onSubmit={event=>{event.preventDefault();const form=event.currentTarget;const data=new FormData(form);void mutate('member',{account:data.get('account'),roles:[data.get('role')],active:true});}}>
        <label>Üyenin Stellar public key’i<input name="account" required pattern="G[A-Z2-7]{55}" placeholder="G…"/></label>
        <label>Yetki<select name="role">{(['billing','approver','operator','viewer','admin'] as CompanyRole[]).map(r=><option value={r} key={r}>{names[r]}</option>)}</select></label>
        <Button type="submit" disabled={busy}>Üye ekle / yetkisini güncelle</Button>
      </form>
      <div className="table-scroll"><table><thead><tr><th>Cüzdan</th><th>Yetki</th><th>Durum</th><th/></tr></thead><tbody>{state.members.map(m=><tr key={m.id}><td title={m.account}>{shortAddress(m.account)}</td><td>{m.roles.map(r=>names[r]).join(', ')}</td><td>{m.active?'Aktif':'İptal edildi'}</td><td>{!m.roles.includes('owner')&&<Button size="sm" variant="secondary" disabled={busy} onClick={()=>mutate('member',{account:m.account,roles:m.roles,active:!m.active})}>{m.active?'Yetkiyi kaldır':'Yeniden etkinleştir'}</Button>}</td></tr>)}</tbody></table></div>
      <details className="commitment-details"><summary>Son yetki ve işlem kayıtları</summary>{state.audit.map(a=><p key={a.id}>{new Date(a.createdAt).toLocaleString('tr-TR')} · {shortAddress(a.actor)} · {a.action}</p>)}</details>
    </>}
    <p className="erp-field-help">Fatura hazırlama yetkisi zincirde imza yetkisi vermez. Şirket cüzdanı sahibi son işlemi imzalar. Ödeme onaylayan kullanıcı ERP ödeme kaydını onaylayabilir; anahtarlar paylaşılmaz.</p>
  </section>;
}
