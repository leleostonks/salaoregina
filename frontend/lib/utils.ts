export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
}

export function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(dateStr));
}

export function formatPercent(value: number) {
  return `${value > 0 ? '+' : ''}${value}%`;
}

export const STATUS_MAP: Record<string, [string, string]> = {
  SCHEDULED: ['Agendado', 'badge-blue'],
  COMPLETED: ['Concluído', 'badge-green'],
  CANCELLED: ['Cancelado', 'badge-gray'],
  NO_SHOW: ['Não compareceu', 'badge-red'],
  PENDING: ['Pendente', 'badge-yellow'],
  PAID: ['Pago', 'badge-green'],
  OVERDUE: ['Atrasado', 'badge-red'],
};

export const CATEGORY_MAP: Record<string, string> = {
  RENT: 'Aluguel', UTILITIES: 'Utilidades', SUPPLIES: 'Insumos',
  SALARY: 'Salário', MARKETING: 'Marketing', EQUIPMENT: 'Equipamento', OTHER: 'Outro',
};

export const PAYMENT_METHODS = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
  { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
  { value: 'TRANSFER', label: 'Transferência' },
  { value: 'OTHER', label: 'Outro' },
] as const;

export function paymentLabel(method: string | null | undefined) {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method ?? '—';
}
