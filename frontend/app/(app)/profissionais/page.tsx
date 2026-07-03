'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Modal, Select } from '@/components/Modal';

export default function ProfissionaisPage() {
  const [list, setList] = useState<any[]>([]);
  const [ranking, setRanking] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() =>
    Promise.all([api.professionals.list(), api.professionals.ranking()])
      .then(([l, r]) => { setList(l); setRanking(r); }), []);
  useEffect(() => { load(); }, [load]);

  const rankMap = Object.fromEntries(ranking.map((r) => [r.professionalId, r]));

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Remover o profissional "${name}"?`)) return;
    await api.professionals.remove(id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Novo Profissional</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-text-muted text-xs uppercase">
            <th className="text-left p-3">Nome</th><th className="text-left p-3">Telefone</th>
            <th className="text-left p-3">Comissão</th><th className="text-left p-3">Faturamento</th><th className="text-left p-3">Status</th><th className="p-3">Ações</th>
          </tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 font-semibold">{p.name}</td>
                <td className="p-3">{p.phone || '—'}</td>
                <td className="p-3">{Math.round(p.commissionRate * 100)}%</td>
                <td className="p-3">{rankMap[p.id] ? formatCurrency(rankMap[p.id].revenue) : '—'}</td>
                <td className="p-3"><span className={`badge ${p.active ? 'badge-green' : 'badge-gray'}`}>{p.active ? 'Ativo' : 'Inativo'}</span></td>
                <td className="p-3">
                  {p.active && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemove(p.id, p.name)}>Remover</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <Modal title="Novo Profissional" onClose={() => setShowForm(false)}>
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await api.professionals.create({ name: fd.get('name'), phone: fd.get('phone'), commissionRate: Number(fd.get('commission')) / 100 });
            setShowForm(false); load();
          }}>
            <div><label className="label">Nome</label><input className="input" name="name" required /></div>
            <div><label className="label">Telefone</label><input className="input" name="phone" /></div>
            <div><label className="label">Comissão (%)</label><input className="input" name="commission" type="number" defaultValue={40} /></div>
            <button className="btn btn-primary w-full">Salvar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
