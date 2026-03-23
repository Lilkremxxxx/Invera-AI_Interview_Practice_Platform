import { ReactNode } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

interface CompanyPageShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export const CompanyPageShell = ({ eyebrow, title, description, children }: CompanyPageShellProps) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-24">
        <section className="border-b border-slate-200 bg-white">
          <div className="container mx-auto px-4 py-16 md:py-20">
            <div className="max-w-3xl">
              <div className="text-xs font-semibold uppercase tracking-[0.26em] text-teal-600">{eyebrow}</div>
              <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-950 md:text-6xl">{title}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{description}</p>
            </div>
          </div>
        </section>
        <section className="container mx-auto px-4 py-12 md:py-16">{children}</section>
      </main>
      <Footer />
    </div>
  );
};
