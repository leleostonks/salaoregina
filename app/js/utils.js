export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dateStr));
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(dateStr));
}

export function formatPercent(value) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}

export function statusBadge(status) {
  const map = {
    SCHEDULED: ['Agendado', 'badge--blue'],
    COMPLETED: ['Concluído', 'badge--green'],
    CANCELLED: ['Cancelado', 'badge--gray'],
    NO_SHOW: ['Não compareceu', 'badge--red'],
    PENDING: ['Pendente', 'badge--yellow'],
    PAID: ['Pago', 'badge--green'],
    OVERDUE: ['Atrasado', 'badge--red'],
  };
  const [label, cls] = map[status] || [status, 'badge--gray'];
  return `<span class="badge ${cls}">${label}</span>`;
}

export function paymentLabel(method) {
  const map = {
    CASH: 'Dinheiro', CREDIT_CARD: 'Crédito', DEBIT_CARD: 'Débito',
    PIX: 'PIX', TRANSFER: 'Transferência', OTHER: 'Outro',
  };
  return map[method] || method || '—';
}

export function categoryLabel(cat) {
  const map = {
    RENT: 'Aluguel', UTILITIES: 'Utilidades', SUPPLIES: 'Insumos',
    SALARY: 'Salário', MARKETING: 'Marketing', EQUIPMENT: 'Equipamento', OTHER: 'Outro',
  };
  return map[cat] || cat;
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
}

export function showLoading(container, msg = 'Carregando...') {
  container.innerHTML = `<div class="loading">${msg}</div>`;
}

export function showError(container, msg) {
  container.innerHTML = `<div class="alert alert--error">${escapeHtml(msg)}</div>`;
}

export function toInputDatetimeLocal(date) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function todayInputDatetime() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
