'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function AgendarPage() {
  const [salon, setSalon] = useState<{ name?: string } | null>(null);
  const [services, setServices] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [professionalId, setProfessionalId] = useState('');
  const [date, setDate] = useState(todayStr());
  const [slots, setSlots] = useState<string[]>([]);
  const [slot, setSlot] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<any>(null);

  useEffect(() => {
    Promise.all([api.public.info(), api.public.services(), api.public.professionals()])
      .then(([s, sv, p]) => { setSalon(s); setServices(sv); setProfessionals(p); })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setSlot('');
    if (serviceIds.length === 0 || !professionalId || !date) { setSlots([]); return; }
    setLoadingSlots(true);
    api.public.availability(professionalId, serviceIds, date)
      .then(setSlots)
      .catch((e) => setError(e.message))
      .finally(() => setLoadingSlots(false));
  }, [serviceIds, professionalId, date]);

  function toggleService(id: string) {
    setServiceIds((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const appointment = await api.public.book({
        serviceIds, professionalId, scheduledAt: slot, clientName: name, clientPhone: phone,
      });
      setDone(appointment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao agendar');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const doneServiceNames = (done.items || []).map((i: any) => i.service?.name).filter(Boolean).join(', ');
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card w-full max-w-md text-center p-8">
          <span className="text-4xl">✅</span>
          <h1 className="font-display text-xl font-bold mt-4 mb-2">Agendamento confirmado!</h1>
          <p className="text-text-muted text-sm mb-4">
            {doneServiceNames} com {done.professional?.name}<br />
            {new Date(done.scheduledAt).toLocaleString('pt-BR', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
          <Link href="/meus-agendamentos" className="btn btn-outline w-full mb-2">Ver meus agendamentos</Link>
          <Link href="/" className="block text-accent text-sm mt-2">← Voltar ao início</Link>
        </div>
      </div>
    );
  }

  const selectedServices = services.filter((s) => serviceIds.includes(s.id));
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.durationMin, 0);

  return (
    <div className="min-h-screen px-6 py-12">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <span className="text-accent text-3xl">✦</span>
          <h1 className="font-display text-2xl font-bold mt-2">{salon?.name || 'Agendar horário'}</h1>
          <p className="text-text-muted text-sm">Escolha os serviços, profissional e horário</p>
        </div>

        <div className="card space-y-4">
          <div>
            <label className="label">Serviços (pode escolher mais de um)</label>
            <div className="space-y-2">
              {services.map((s) => (
                <label key={s.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border cursor-pointer hover:border-accent">
                  <input
                    type="checkbox"
                    checked={serviceIds.includes(s.id)}
                    onChange={() => toggleService(s.id)}
                  />
                  <span className="flex-1 text-sm">{s.name}</span>
                  <span className="text-sm text-text-muted">{formatCurrency(s.price)} · {s.durationMin}min</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Profissional</label>
            <select className="input" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)}>
              <option value="">Selecione...</option>
              {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Data</label>
            <input
              type="date"
              className="input"
              value={date}
              min={todayStr()}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {serviceIds.length > 0 && professionalId && (
            <div>
              <label className="label">Horário</label>
              {loadingSlots ? (
                <p className="text-text-muted text-sm">Carregando horários...</p>
              ) : slots.length === 0 ? (
                <p className="text-text-muted text-sm">Nenhum horário disponível nesse dia.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((s) => (
                    <button
                      type="button"
                      key={s}
                      onClick={() => setSlot(s)}
                      className={`btn btn-sm ${slot === s ? 'btn-primary' : 'btn-outline'}`}
                    >
                      {new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {slot && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-border">
              <p className="text-sm text-text-muted">
                Total: <span className="font-semibold text-text">{formatCurrency(totalPrice)}</span> · {totalDuration}min
              </p>
              <div>
                <label className="label">Seu nome</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="label">Seu telefone (WhatsApp)</label>
                <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" required />
              </div>
              {error && <p className="text-danger text-sm">{error}</p>}
              <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
                {submitting ? 'Confirmando...' : `Confirmar — ${formatCurrency(totalPrice)}`}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm mt-4">
          Já tem um agendamento? <Link href="/meus-agendamentos" className="text-accent">Consultar aqui</Link>
        </p>
      </div>
    </div>
  );
}
