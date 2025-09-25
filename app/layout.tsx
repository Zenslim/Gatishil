export const metadata = {
  title: 'Gatishil',
  description: 'One Ledger — Six Registers'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{background:'#000',color:'#fff',minHeight:'100vh',margin:0}}>
        {children}
      </body>
    </html>
  );
}
