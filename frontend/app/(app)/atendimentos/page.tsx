'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, STATUS_MAP, PAYMENT_METHODS, paymentLabel } from '@/lib/utils';
import { Modal, Select } from '@/components/Modal';

function serviceNames(a: any): string {
  if (a.items?.length) return a.items.map((i: any) => i.service?.name).filter(Boolean).join(', ');
  return a.service?.name ?? '—';
}

function paymentDisplay(a: any): string {
  if (a.payments?.length > 1) {
    return a.payments.map((p: any) => `${paymentLabel(p.method)} ${formatCurrency(p.amount)}`).join(' + ');
  }
  if (a.payments?.length === 1) return paymentLabel(a.payments[0].method);
  return a.paymentMethod ? paymentLabel(a.paymentMethod) : '—';
}

export default function AtendimentosPage() {
  const [list, setList] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showPay, setShowPay] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [pros, setPros] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [payRows, setPayRows] = useState([{ method: 'PIX', amount: '' }]);

  const load = useCallback(() => api.appointments.list().then(setList), []);
  useEffect(() => { load(); }, [load]);

  const selectedTotal = services
    .filter((s) => selectedServices.includes(s.id))
    .reduce((sum, s) => sum + s.price, 0);

  async function openForm() {
    const [c, p, s] = await Promise.all([api.clients.list(), api.professionals.list(), api.services.list()]);
    setClients(c); setPros(p); setServices(s.filter((x: any) => x.active));
    setSelectedServices([]);
    setShowForm(true);
  }

  function openComplete(apt: any) {
    setShowPay(apt);
    setPayRows([{ method: 'PIX', amount: String(apt.price) }]);
  }

  function toggleService(id: string) {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn btn-primary btn-sm" onClick={openForm}>+ Novo Atendimento</button>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-text-muted text-xs uppercase">
            <th className="text-left p-3">Data</th><th className="text-left p-3">Cliente</th>
            <th className="text-left p-3">Profissional</th><th className="text-left p-3">Serviços</th>
            <th className="text-left p-3">Valor</th><th className="text-left p-3">Pagamento</th>
            <th className="text-left p-3">Status</th><th className="p-3">Ações</th>
          </tr></thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="p-3">{formatDate(a.scheduledAt)}</td>
                <td className="p-3">{a.client?.name}</td>
                <td className="p-3">{a.professional?.name}</td>
                <td className="p-3 max-w-[200px]">{serviceNames(a)}</td>
                <td className="p-3">{formatCurrency(a.price)}</td>
                <td className="p-3 text-xs">{paymentDisplay(a)}</td>
                <td className="p-3"><span className={`badge ${STATUS_MAP[a.status]?.[1]}`}>{STATUS_MAP[a.status]?.[0]}</span></td>
                <td className="p-3">
                  {a.status === 'SCHEDULED' && (
                    <button className="btn btn-primary btn-sm" onClick={() => openComplete(a)}>Concluir</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="Novo Atendimento" onClose={() => setShowForm(false)}>
          <form className="space-y-3" onSubmit={async (e) => {
            e.preventDefault();
            if (selectedServices.length === 0) return alert('Selecione ao menos um serviço');
            const fd = new FormData(e.currentTarget);
            await api.appointments.create({
              clientId: fd.get('clientId'),
              professionalId: fd.get('professionalId'),
              serviceIds: selectedServices,
              scheduledAt: new Date(fd.get('scheduledAt') as string).toISOString(),
            });
            setShowForm(false); load();
          }}>
            <Select label="Cliente" name="clientId" options={clients.map((c) => ({ value: c.id, label: c.name }))} />
            <Select label="Profissional" name="professionalId" options={pros.filter((p) => p.active).map((p) => ({ value: p.id, label: p.name }))} />
            <div>
              <label className="label">Serviços (selecione 1 ou mais)</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
                {services.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 cursor-pointer text-sm hover:bg-bg-3 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={selectedServices.includes(s.id)}
                      onChange={() => toggleService(s.id)}
                      className="accent-accent w-4 h-4"
                    />
                    <span className="flex-1">{s.name}</span>
                    <span className="text-text-muted">{formatCurrency(s.price)}</span>
                  </label>
                ))}
              </div>
              {selectedServices.length > 0 && (
                <p className="text-sm text-accent mt-2 font-semibold">
                  Total: {formatCurrency(selectedTotal)} ({selectedServices.length} serviço{selectedServices.length > 1 ? 's' : ''})
                </p>
              )}
            </div>
            <div><label className="label">Data e hora</label><input className="input" name="scheduledAt" type="datetime-local" required defaultValue={new Date().toISOString().slice(0, 16)} /></div>
            <button type="submit" className="btn btn-primary w-full" disabled={selectedServices.length === 0}>Agendar</button>
          </form>
        </Modal>
      )}

      {showPay && (
        <Modal title="Concluir Atendimento" onClose={() => setShowPay(null)}>
          <p className="text-sm text-text-muted mb-4">
            Total: <strong className="text-accent">{formatCurrency(showPay.price)}</strong>
            <br />Serviços: {serviceNames(showPay)}
          </p>
          <div className="space-y-3">
            <label className="label">Formas de pagamento</label>
            {payRows.map((row, i) => (
              <div key={i} className="flex gap-2">
                <select
                  className="input flex-1"
                  value={row.method}
                  onChange={(e) => {
                    const next = [...payRows];
                    next[i].method = e.target.value;
                    setPayRows(next);
                  }}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
                <input
                  className="input w-28"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="R$"
                  value={row.amount}
                  onChange={(e) => {
                    const next = [...payRows];
                    next[i].amount = e.target.value;
                    setPayRows(next);
                  }}
                />
                {payRows.length > 1 && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setPayRows(payRows.filter((_, j) => j !== i))}>×</button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="btn btn-outline btn-sm w-full"
              onClick={() => setPayRows([...payRows, { method: 'CASH', amount: '' }])}
            >
              + Adicionar forma de pagamento
            </button>
            <button
              className="btn btn-primary w-full"
              onClick={async () => {
                const payments = payRows
                  .filter((r) => r.amount && Number(r.amount) > 0)
                  .map((r) => ({ method: r.method, amount: Number(r.amount) }));
                if (payments.length === 0) return alert('Informe o valor');
                const sum = payments.reduce((s, p) => s + p.amount, 0);
                if (Math.abs(sum - showPay.price) > 0.01) {
                  return alert(`A soma (${formatCurrency(sum)}) deve ser igual ao total (${formatCurrency(showPay.price)})`);
                }
                await api.appointments.complete(showPay.id, { payments });
                setShowPay(null); load();
              }}
            >
              Confirmar pagamento
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
