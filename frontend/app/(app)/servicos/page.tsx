'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/Modal';

export default function ServicosPage() {
  const [list, setList] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() =>
    Promise.all([api.services.list(), api.services.analysis()])
      .then(([l, a]) => { setList(l); setAnalysis(a); }), []);
  useEffect(() => { load(); }, [load]);

  const aMap = Object.fromEntries(analysis.map((a) => [a.serviceId, a]));

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Remover o serviço "${name}"?`)) return;
    await api.services.remove(id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Novo Serviço</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-text-muted text-xs uppercase">
            <th className="text-left p-3">Serviço</th><th className="text-left p-3">Preço</th>
            <th className="text-left p-3">Duração</th><th className="text-left p-3">Vendidos</th><th className="text-left p-3">Lucro</th><th className="p-3">Ações</th>
          </tr></thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="p-3 font-semibold">{s.name}</td>
                <td className="p-3">{formatCurrency(s.price)}</td>
                <td className="p-3">{s.durationMin} min</td>
                <td className="p-3">{aMap[s.id]?.sold ?? 0}</td>
                <td className="p-3">{aMap[s.id] ? formatCurrency(aMap[s.id].profit) : '—'}</td>
                <td className="p-3">
                  {s.active && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemove(s.id, s.name)}>Remover</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <Modal title="Novo Serviço" onClose={() => setShowForm(false)}>
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await api.services.create({ name: fd.get('name'), price: Number(fd.get('price')), durationMin: Number(fd.get('duration')), cost: Number(fd.get('cost')) || 0 });
            setShowForm(false); load();
          }}>
            <div><label className="label">Nome</label><input className="input" name="name" required /></div>
            <div><label className="label">Preço (R$)</label><input className="input" name="price" type="number" step="0.01" required /></div>
            <div><label className="label">Duração (min)</label><input className="input" name="duration" type="number" defaultValue={60} /></div>
            <div><label className="label">Custo (R$)</label><input className="input" name="cost" type="number" step="0.01" defaultValue={0} /></div>
            <button className="btn btn-primary w-full">Salvar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
