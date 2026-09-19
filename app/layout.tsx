import type {Metadata} from 'next';
import './globals.css';
import LanguageProvider from '@/components/language-provider';
export const metadata: Metadata = {title: 'Centerp — Your business, connected', description: 'An ERP prototype connecting sales, purchasing, inventory, production, people and finance records with Stellar Testnet payments.'};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body><LanguageProvider>{children}</LanguageProvider></body></html>;
}
