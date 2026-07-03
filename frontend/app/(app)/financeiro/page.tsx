'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, STATUS_MAP, CATEGORY_MAP } from '@/lib/utils';
import { Modal } from '@/components/Modal';

export default function FinanceiroPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() =>
    Promise.all([api.expenses.list(), api.expenses.summary(), api.dashboard.overview()])
      .then(([e, s, o]) => { setExpenses(e); setSummary(s); setOverview(o); }), []);
  useEffect(() => { load(); }, [load]);

  async function handleRemove(id: string, description: string) {
    if (!confirm(`Remover a despesa "${description}"?`)) return;
    await api.expenses.remove(id);
    load();
  }

  return (
    <div className="space-y-4">
      {overview && summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card"><p className="text-xs text-text-muted">Receita</p><p className="text-xl font-bold text-accent">{formatCurrency(overview.finance.revenue)}</p></div>
          <div className="card"><p className="text-xs text-text-muted">Pagas</p><p className="text-xl font-bold">{formatCurrency(summary.paid)}</p></div>
          <div className="card"><p className="text-xs text-text-muted">Pendentes</p><p className="text-xl font-bold text-danger">{formatCurrency(summary.pending)}</p></div>
          <div className="card"><p className="text-xs text-text-muted">Lucro</p><p className="text-xl font-bold text-success">{formatCurrency(overview.finance.profit)}</p></div>
        </div>
      )}
      <div className="flex justify-end">
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Nova Despesa</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-text-muted text-xs uppercase">
            <th className="text-left p-3">Descrição</th><th className="text-left p-3">Categoria</th>
            <th className="text-left p-3">Valor</th><th className="text-left p-3">Status</th><th className="p-3">Ações</th>
          </tr></thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="p-3">{e.description}</td>
                <td className="p-3">{CATEGORY_MAP[e.category]}</td>
                <td className="p-3">{formatCurrency(e.amount)}</td>
                <td className="p-3"><span className={`badge ${STATUS_MAP[e.status]?.[1]}`}>{STATUS_MAP[e.status]?.[0]}</span></td>
                <td className="p-3">
                  <div className="flex gap-2 flex-wrap">
                    {e.status !== 'PAID' && (
                      <button className="btn btn-primary btn-sm" onClick={async () => { await api.expenses.update(e.id, { status: 'PAID' }); load(); }}>Pagar</button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => handleRemove(e.id, e.description)}>Remover</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <Modal title="Nova Despesa" onClose={() => setShowForm(false)}>
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await api.expenses.create({ description: fd.get('description'), amount: Number(fd.get('amount')), category: fd.get('category'), dueDate: fd.get('dueDate') });
            setShowForm(false); load();
          }}>
            <div><label className="label">Descrição</label><input className="input" name="description" required /></div>
            <div><label className="label">Valor (R$)</label><input className="input" name="amount" type="number" step="0.01" required /></div>
            <div><label className="label">Categoria</label>
              <select className="input" name="category">
                {Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div><label className="label">Vencimento</label><input className="input" name="dueDate" type="date" required /></div>
            <button className="btn btn-primary w-full">Salvar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
