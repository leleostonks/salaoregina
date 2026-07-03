'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, storeSession } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    try {
      const data = await api.login(fd.get('email') as string, fd.get('password') as string);
      storeSession(data.token, data.user, data.tenant);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(212,165,116,0.12),transparent_60%)]">
      <div className="w-full max-w-md card p-8">
        <div className="text-center mb-8">
          <span className="text-accent text-3xl">✦</span>
          <h1 className="font-display text-2xl font-bold mt-2">SalonHub</h1>
          <p className="text-text-muted text-sm">O sistema operacional do seu salão</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input className="input" id="email" name="email" type="email" defaultValue="riana@gmail.com" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha</label>
            <input className="input" id="password" name="password" type="password" defaultValue="123456" required />
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="text-center text-xs text-text-muted mt-4">Demo: riana@gmail.com / 123456</p>
        <Link href="/" className="block text-center text-accent text-sm mt-3">← Voltar ao site</Link>
      </div>
    </div>
  );
}
