import { PaymentMethod } from '@prisma/client';

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
  { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
  { value: 'TRANSFER', label: 'Transferência' },
  { value: 'OTHER', label: 'Outro' },
];

export function paymentMethodLabel(method: PaymentMethod | string | null): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method ?? '—';
}
