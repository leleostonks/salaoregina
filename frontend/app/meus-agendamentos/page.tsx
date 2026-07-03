'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency, STATUS_MAP } from '@/lib/utils';

export default function MeusAgendamentosPage() {
  const [phone, setPhone] = useState('');
  const [appointments, setAppointments] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const list = await api.public.myAppointments(phone);
      setAppointments(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar agendamentos');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <span className="text-accent text-3xl">✦</span>
          <h1 className="font-display text-2xl font-bold mt-2">Meus agendamentos</h1>
          <p className="text-text-muted text-sm">Digite o telefone usado no agendamento</p>
        </div>

        <form onSubmit={handleSearch} className="card space-y-4">
          <div>
            <label className="label">Telefone (WhatsApp)</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" required />
          </div>
          {error && <p className="text-danger text-sm">{error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {appointments && (
          <div className="mt-6 space-y-3">
            {appointments.length === 0 && (
              <p className="text-text-muted text-sm text-center">Nenhum agendamento encontrado para esse telefone.</p>
            )}
            {appointments.map((a) => {
              const [label, cls] = STATUS_MAP[a.status] || [a.status, 'badge-gray'];
              const serviceNames = (a.items || []).map((i: any) => i.service?.name).filter(Boolean).join(', ');
              return (
                <div key={a.id} className="card">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold">{serviceNames || '—'}</p>
                      <p className="text-text-muted text-sm">com {a.professional?.name}</p>
                    </div>
                    <span className={`badge ${cls}`}>{label}</span>
                  </div>
                  <p className="text-sm text-text-muted">
                    {new Date(a.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
                  </p>
                  <p className="text-sm font-semibold text-accent mt-1">{formatCurrency(a.price)}</p>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-sm mt-6">
          <Link href="/agendar" className="text-accent">Novo agendamento</Link>
          {' · '}
          <Link href="/" className="text-text-muted">Voltar ao início</Link>
        </p>
      </div>
    </div>
  );
}
