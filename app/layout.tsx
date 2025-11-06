import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Universal API Gateway',
  description: 'Turn any website into a programmable API session',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
