'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatPercent } from '@/lib/utils';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [chart, setChart] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.dashboard.overview(), api.dashboard.revenueChart(14)])
      .then(([overview, chartData]) => { setData(overview); setChart(chartData); })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <p className="text-text-muted">Carregando...</p>;

  const max = Math.max(...chart.map((d: any) => d.revenue), 1);
  const growth = data.revenue.growthPercent;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat label="Faturamento Hoje" value={formatCurrency(data.revenue.today)} sub={`${data.appointments.today} atendimentos`} accent />
        <Stat label="Faturamento Semana" value={formatCurrency(data.revenue.week)} sub={`${data.appointments.week} atendimentos`} />
        <Stat label="Faturamento Mês" value={formatCurrency(data.revenue.month)} sub={formatPercent(growth)} subClass={growth >= 0 ? 'text-success' : 'text-danger'} />
        <Stat label="Ticket Médio" value={formatCurrency(data.appointments.avgTicket)} sub={`${data.appointments.month} no mês`} />
        <Stat label="Lucro do Mês" value={formatCurrency(data.finance.profit)} sub={`Despesas: ${formatCurrency(data.finance.expenses)}`} success />
        <Stat label="Contas a Pagar" value={formatCurrency(data.finance.pendingPayables)} danger />
      </div>

      <div className="card">
        <h2 className="font-bold mb-4">Receita — últimos 14 dias</h2>
        <div className="flex items-end gap-1 h-40">
          {chart.map((d: any) => (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${d.date}: ${formatCurrency(d.revenue)}`}>
              <div className="w-full max-w-[18px] bg-gradient-to-t from-accent-dark to-accent rounded-t" style={{ height: `${Math.max((d.revenue / max) * 100, 2)}%` }} />
              <span className="text-[9px] text-text-muted">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <RankList title="Top Profissionais" items={data.topProfessionals.map((p: any) => ({ name: p.name, sub: `${p.appointments} atendimentos`, value: formatCurrency(p.revenue) }))} />
        <RankList title="Serviços Mais Vendidos" items={data.topServices.map((s: any) => ({ name: s.name, sub: `${s.sold} vendidos` }))} />
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent, success, danger, subClass }: any) {
  return (
    <div className="card">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-2xl font-extrabold ${accent ? 'text-accent' : success ? 'text-success' : danger ? 'text-danger' : ''}`}>{value}</p>
      {sub && <p className={`text-xs text-text-muted mt-1 ${subClass || ''}`}>{sub}</p>}
    </div>
  );
}

function RankList({ title, items }: { title: string; items: { name: string; sub: string; value?: string }[] }) {
  return (
    <div className="card">
      <h2 className="font-bold mb-3">{title}</h2>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={item.name} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
            <span className="w-7 h-7 rounded-full bg-bg-3 flex items-center justify-center text-xs font-bold text-accent">{i + 1}</span>
            <div className="flex-1"><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-text-muted">{item.sub}</p></div>
            {item.value && <span className="text-sm font-bold text-accent">{item.value}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
