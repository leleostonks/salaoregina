'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, getStoredTenant, getStoredUser } from '@/lib/api';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/atendimentos', label: 'Atendimentos', icon: '📅' },
  { href: '/profissionais', label: 'Profissionais', icon: '👩‍🎨' },
  { href: '/servicos', label: 'Serviços', icon: '💇' },
  { href: '/clientes', label: 'Clientes', icon: '👥' },
  { href: '/financeiro', label: 'Financeiro', icon: '💰' },
  { href: '/metas', label: 'Metas', icon: '📈' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [tenant, setTenant] = useState<{ name?: string } | null>(null);
  const [user, setUser] = useState<{ name?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('salonhub_token');
    if (!token) router.replace('/login');
    else {
      setTenant(getStoredTenant());
      setUser(getStoredUser());
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return <div className="min-h-screen flex items-center justify-center text-text-muted">Carregando...</div>;
  }

  return (
    <div className="flex min-h-screen">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-bg-2 border-r border-border flex flex-col transition-transform md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2 p-5 font-bold border-b border-border">
          <span className="text-accent">✦</span> SalonHub
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === item.href ? 'bg-accent/10 text-accent' : 'text-text-muted hover:bg-bg-3 hover:text-text'
              }`}
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <p className="text-sm font-semibold truncate">{tenant?.name}</p>
          <p className="text-xs text-text-muted truncate">{user?.name}</p>
          <button
            className="btn btn-ghost btn-sm mt-2"
            onClick={() => { clearSession(); router.push('/login'); }}
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="flex-1 md:ml-64">
        <header className="sticky top-0 z-40 flex items-center gap-4 px-6 py-4 border-b border-border bg-bg/90 backdrop-blur">
          <button className="md:hidden text-xl" onClick={() => setOpen(!open)}>☰</button>
          <h1 className="font-bold text-lg capitalize">
            {NAV.find((n) => n.href === pathname)?.label || 'Painel'}
          </h1>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
