'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/Modal';

export default function MetasPage() {
  const [progress, setProgress] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => api.goals.progress().then(setProgress), []);
  useEffect(() => { load(); }, [load]);

  const now = new Date();

  async function handleRemove(id: string, label: string) {
    if (!confirm(`Remover a meta "${label}"?`)) return;
    await api.goals.remove(id);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Nova Meta</button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {progress.map((g) => {
          const label = g.professional?.name || 'Salão (geral)';
          return (
          <div key={g.goalId} className="card relative">
            <button
              className="absolute top-3 right-3 btn btn-danger btn-sm"
              onClick={() => handleRemove(g.goalId, label)}
              title="Remover meta"
            >
              Remover
            </button>
            <p className="text-sm text-text-muted pr-20">{label}</p>
            <p className="text-2xl font-bold text-accent mt-1">{formatCurrency(g.achieved)}</p>
            <p className="text-xs text-text-muted">Meta: {formatCurrency(g.target)} — {g.percent}%</p>
            <div className="mt-3 h-2 bg-bg-3 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-accent-dark to-accent rounded-full" style={{ width: `${Math.min(g.percent, 100)}%` }} />
            </div>
            <p className="text-xs text-text-muted mt-2">Faltam {formatCurrency(g.remaining)}</p>
          </div>
          );
        })}
        {progress.length === 0 && <p className="text-text-muted col-span-2 text-center py-10">Nenhuma meta definida</p>}
      </div>
      {showForm && (
        <Modal title="Nova Meta" onClose={() => setShowForm(false)}>
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            await api.goals.create({ revenueTarget: Number(fd.get('target')), month: Number(fd.get('month')), year: Number(fd.get('year')) });
            setShowForm(false); load();
          }}>
            <div><label className="label">Meta (R$)</label><input className="input" name="target" type="number" required /></div>
            <div><label className="label">Mês</label><input className="input" name="month" type="number" min={1} max={12} defaultValue={now.getMonth() + 1} /></div>
            <div><label className="label">Ano</label><input className="input" name="year" type="number" defaultValue={now.getFullYear()} /></div>
            <button className="btn btn-primary w-full">Salvar</button>
          </form>
        </Modal>
      )}
    </div>
  );
}
