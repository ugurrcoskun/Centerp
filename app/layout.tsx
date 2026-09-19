import type {Metadata} from 'next';
import './globals.css';
export const metadata: Metadata = {title: 'Centerp — İşletmen, bir arada', description: 'Satış, satın alma, stok, üretim, personel ve finans kayıtlarını Stellar Testnet ödemeleriyle birleştiren ERP prototipi.'};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="tr"><body>{children}</body></html>;
}
