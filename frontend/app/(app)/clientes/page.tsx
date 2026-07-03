'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Modal } from '@/components/Modal';

export default function ClientesPage() {
  const [list, setList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() =>
    Promise.all([api.clients.list(), api.clients.stats()])
      .then(([l, s]) => { setList(l); setStats(s); }), []);
  useEffect(() => { load(); }, [load]);

  async function handleRemove(c: any) {
    if (!confirm(`Excluir o cliente "${c.name}"? Essa ação não pode ser desfeita.`)) return;
    setError('');
    try {
      await api.clients.remove(c.id);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir cliente');
    }
  }

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card"><p className="text-xs text-text-muted">Total</p><p className="text-2xl font-bold">{stats.total}</p></div>
          <div className="card"><p className="text-xs text-text-muted">Novos (30d)</p><p className="text-2xl font-bold">{stats.newLast30Days}</p></div>
          <div className="card"><p className="text-xs text-text-muted">Recorrentes</p><p className="text-2xl font-bold text-success">{stats.recurring}</p></div>
        </div>
      )}
      <div className="flex justify-end">
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Novo Cliente</button>
      </div>
      {error && <p className="text-danger text-sm">{error}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-text-muted text-xs uppercase">
            <th className="text-left p-3">Nome</th><th className="text-left p-3">Telefone</th>
            <th className="text-left p-3">E-mail</th><th className="text-left p-3">Atendimentos</th>
            <th className="text-right p-3">Ações</th>
          </tr></thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3 font-semibold">{c.name}</td>
                <td className="p-3">{c.phone || '—'}</td>
                <td className="p-3">{c.email || '—'}</td>
                <td className="p-3">{c._count?.appointments ?? 0}</td>
                <td className="p-3 text-right">
                  <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleRemove(c)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <Modal title="Novo Cliente" onClose={() => setShowForm(false)}>
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await api.clients.create({ name: fd.get('name'), phone: fd.get('phone'), email: fd.get('email') });
            setShowForm(false); load();
          }}>
            <div><label className="label">Nome</label><input className="input" name="name" required /></div>
            <div><label className="label">Telefone</label><input className="input" name="phone" /></div>
            <div><label className="label">E-mail</label><input className="input" name="email" type="email" /></div>
            <button className="btn btn-primary w-full">Salvar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
