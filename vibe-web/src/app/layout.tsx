import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "../components/ui/toaster";
import Header from '../components/header';
import Footer from '../components/footer';

export const metadata: Metadata = {
  title: 'Vibe CLI Companion',
  description: 'Your Free AI Coding CLI — Agentic Workflows in Terminal',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Code+Pro:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased selection:bg-accent selection:text-accent-foreground">
        {/* Global decorative overlay */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 [mask-image:radial-gradient(circle_at_center,white,transparent)] bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.20),transparent_60%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.15),transparent_65%)]" />
        </div>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow pt-6 sm:pt-10">
            {children}
          </main>
          <Footer />
        </div>
        <Toaster />
      </body>
    </html>
  );
}
