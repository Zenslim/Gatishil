import './globals.css';
import Nav from '@/components/Nav';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Gatishil — One Ledger',
  description: 'Parallel Life → One Ledger, Six Registers'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <h1 className="h1">Gatishil — One Ledger <span className="badge">v1</span></h1>
          <div className="sub">Six registers to keep life moving: People, Orgs, Projects, Money, Knowledge, Polls/Proposals.</div>
          <Nav />
          {children}
        </div>
      </body>
    </html>
  );
}