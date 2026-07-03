import { api } from './api.js';
import {
  formatCurrency, formatDate, formatDateShort, formatPercent,
  statusBadge, paymentLabel, categoryLabel, escapeHtml,
  showLoading, showError, todayInputDatetime,
} from './utils.js';

export async function renderDashboard(container) {
  showLoading(container);
  try {
    const [overview, chart] = await Promise.all([
      api.dashboard.overview(),
      api.dashboard.revenueChart(14),
    ]);

    const growth = overview.revenue.growthPercent;
    const growthClass = growth >= 0 ? 'growth-up' : 'growth-down';

    const maxRevenue = Math.max(...chart.map((d) => d.revenue), 1);
    const chartBars = chart.map((d) => {
      const h = Math.round((d.revenue / maxRevenue) * 100);
      const day = d.date.slice(8, 10);
      return `<div class="chart__bar-wrap" title="${d.date}: ${formatCurrency(d.revenue)}">
        <div class="chart__bar" style="height:${Math.max(h, 2)}%"></div>
        <span class="chart__label">${day}</span>
      </div>`;
    }).join('');

    const topPros = overview.topProfessionals.map((p, i) => `
      <li class="rank-item">
        <span class="rank-pos">${i + 1}</span>
        <div class="rank-info"><strong>${escapeHtml(p.name)}</strong><span>${p.appointments} atendimentos</span></div>
        <span class="rank-value">${formatCurrency(p.revenue)}</span>
      </li>`).join('') || '<li class="empty">Sem dados</li>';

    const topSvcs = overview.topServices.map((s, i) => `
      <li class="rank-item">
        <span class="rank-pos">${i + 1}</span>
        <div class="rank-info"><strong>${escapeHtml(s.name)}</strong><span>${s.sold} vendidos</span></div>
      </li>`).join('') || '<li class="empty">Sem dados</li>';

    container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-card__label">Faturamento Hoje</div>
          <div class="stat-card__value stat-card__value--accent">${formatCurrency(overview.revenue.today)}</div>
          <div class="stat-card__sub">${overview.appointments.today} atendimentos</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">Faturamento Semana</div>
          <div class="stat-card__value">${formatCurrency(overview.revenue.week)}</div>
          <div class="stat-card__sub">${overview.appointments.week} atendimentos</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">Faturamento Mês</div>
          <div class="stat-card__value">${formatCurrency(overview.revenue.month)}</div>
          <div class="stat-card__sub ${growthClass}">${formatPercent(growth)} vs mês anterior</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">Ticket Médio</div>
          <div class="stat-card__value">${formatCurrency(overview.appointments.avgTicket)}</div>
          <div class="stat-card__sub">${overview.appointments.month} atendimentos no mês</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">Lucro do Mês</div>
          <div class="stat-card__value stat-card__value--success">${formatCurrency(overview.finance.profit)}</div>
          <div class="stat-card__sub">Despesas: ${formatCurrency(overview.finance.expenses)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">Contas a Pagar</div>
          <div class="stat-card__value stat-card__value--danger">${formatCurrency(overview.finance.pendingPayables)}</div>
        </div>
      </div>

      <div class="panel" style="margin-bottom:24px">
        <div class="panel__title">Receita — últimos 14 dias</div>
        <div class="chart">${chartBars}</div>
      </div>

      <div class="grid-2">
        <div class="panel">
          <div class="panel__title">Top Profissionais do Mês</div>
          <ul class="rank-list">${topPros}</ul>
        </div>
        <div class="panel">
          <div class="panel__title">Serviços Mais Vendidos</div>
          <ul class="rank-list">${topSvcs}</ul>
        </div>
      </div>`;
  } catch (err) {
    showError(container, err.message);
  }
}

export async function renderAppointments(container, { openModal, refresh }) {
  showLoading(container);
  try {
    const appointments = await api.appointments.list();

    const serviceNames = (a) => {
      if (a.items?.length) return a.items.map((i) => i.service?.name).filter(Boolean).join(', ');
      return a.service?.name ?? '—';
    };

    const payLabel = (a) => {
      if (a.payments?.length > 1) return a.payments.map((p) => `${paymentLabel(p.method)} ${formatCurrency(p.amount)}`).join(' + ');
      if (a.payments?.length === 1) return paymentLabel(a.payments[0].method);
      return a.paymentMethod ? paymentLabel(a.paymentMethod) : '—';
    };

    const rows = appointments.map((a) => `
      <tr>
        <td>${formatDate(a.scheduledAt)}</td>
        <td>${escapeHtml(a.client?.name)}</td>
        <td>${escapeHtml(a.professional?.name)}</td>
        <td>${escapeHtml(serviceNames(a))}</td>
        <td>${formatCurrency(a.price)}</td>
        <td>${escapeHtml(payLabel(a))}</td>
        <td>${statusBadge(a.status)}</td>
        <td class="table-actions">
          ${a.status === 'SCHEDULED' ? `<button class="btn btn--sm btn--primary" data-complete="${a.id}" data-price="${a.price}">Concluir</button>` : ''}
          ${a.status === 'SCHEDULED' ? `<button class="btn btn--sm btn--danger" data-cancel="${a.id}">Cancelar</button>` : ''}
        </td>
      </tr>`).join('');

    container.innerHTML = `
      <div class="panel">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Data</th><th>Cliente</th><th>Profissional</th><th>Serviços</th>
              <th>Valor</th><th>Pagamento</th><th>Status</th><th>Ações</th>
            </tr></thead>
            <tbody>${rows || '<tr><td colspan="8" class="empty">Nenhum atendimento</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;

    container.querySelectorAll('[data-complete]').forEach((btn) => {
      btn.addEventListener('click', () => completeAppointment(btn.dataset.complete, parseFloat(btn.dataset.price), refresh, openModal));
    });
    container.querySelectorAll('[data-cancel]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await api.appointments.update(btn.dataset.cancel, { status: 'CANCELLED' });
        refresh();
      });
    });
  } catch (err) {
    showError(container, err.message);
  }
}

const PAYMENT_OPTIONS = [
  { value: 'PIX', label: 'PIX' },
  { value: 'CASH', label: 'Dinheiro' },
  { value: 'CREDIT_CARD', label: 'Cartão de Crédito' },
  { value: 'DEBIT_CARD', label: 'Cartão de Débito' },
  { value: 'TRANSFER', label: 'Transferência' },
  { value: 'OTHER', label: 'Outro' },
];

function completeAppointment(id, total, refresh, openModal) {
  const opts = PAYMENT_OPTIONS.map((m) => `<option value="${m.value}">${m.label}</option>`).join('');
  openModal('Concluir Atendimento', `
    <p style="margin-bottom:12px;color:var(--color-text-muted)">Total: <strong style="color:var(--color-accent)">${formatCurrency(total)}</strong></p>
    <form class="modal-form" id="payForm">
      <div class="form-group">
        <label>Forma de pagamento</label>
        <select name="method" class="input" required>${opts}</select>
      </div>
      <div class="form-group">
        <label>Valor (R$)</label>
        <input name="amount" type="number" step="0.01" value="${total}" required>
      </div>
      <p class="login-hint">Para dividir o pagamento, use o painel Next.js em /atendimentos</p>
      <div class="modal-form__actions">
        <button type="button" class="btn btn--outline" data-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">Confirmar</button>
      </div>
    </form>`);

  document.getElementById('payForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const amount = parseFloat(fd.get('amount'));
    const method = fd.get('method');
    await api.appointments.complete(id, {
      payments: [{ method, amount }],
    });
    document.getElementById('modal').classList.add('hidden');
    refresh();
  });
}

export function showNewAppointmentModal(openModal, refresh) {
  Promise.all([
    api.clients.list(),
    api.professionals.list(),
    api.services.list(),
  ]).then(([clients, professionals, services]) => {
    openModal('Novo Atendimento', `
      <form class="modal-form" id="aptForm">
        <div class="form-group">
          <label>Cliente</label>
          <select name="clientId" required>
            <option value="">Selecione...</option>
            ${clients.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Profissional</label>
          <select name="professionalId" required>
            <option value="">Selecione...</option>
            ${professionals.filter(p => p.active).map((p) => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Serviços (selecione 1 ou mais)</label>
          <div id="serviceChecks" style="max-height:180px;overflow-y:auto;border:1px solid var(--color-border);border-radius:8px;padding:12px">
            ${services.filter(s => s.active).map((s) => `
              <label style="display:flex;align-items:center;gap:10px;padding:6px 0;cursor:pointer;font-size:0.9rem">
                <input type="checkbox" name="serviceIds" value="${s.id}" data-price="${s.price}">
                <span style="flex:1">${escapeHtml(s.name)}</span>
                <span style="color:var(--color-text-muted)">${formatCurrency(s.price)}</span>
              </label>`).join('')}
          </div>
          <p id="serviceTotal" style="font-size:0.85rem;color:var(--color-accent);margin-top:8px"></p>
        </div>
        <div class="form-group">
          <label>Data e hora</label>
          <input type="datetime-local" name="scheduledAt" value="${todayInputDatetime()}" required>
        </div>
        <div class="modal-form__actions">
          <button type="button" class="btn btn--outline" data-close>Cancelar</button>
          <button type="submit" class="btn btn--primary">Agendar</button>
        </div>
      </form>`);

    document.getElementById('aptForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const serviceIds = [...e.target.querySelectorAll('input[name="serviceIds"]:checked')].map((el) => el.value);
      if (!serviceIds.length) { alert('Selecione ao menos um serviço'); return; }
      await api.appointments.create({
        clientId: fd.get('clientId'),
        professionalId: fd.get('professionalId'),
        serviceIds,
        scheduledAt: new Date(fd.get('scheduledAt')).toISOString(),
      });
      document.getElementById('modal').classList.add('hidden');
      refresh();
    });

    const updateTotal = () => {
      const checked = [...document.querySelectorAll('#serviceChecks input:checked')];
      const total = checked.reduce((s, el) => s + parseFloat(el.dataset.price), 0);
      const el = document.getElementById('serviceTotal');
      if (el) el.textContent = checked.length ? `Total: ${formatCurrency(total)} (${checked.length} serviço${checked.length > 1 ? 's' : ''})` : '';
    };
    document.querySelectorAll('#serviceChecks input').forEach((cb) => cb.addEventListener('change', updateTotal));
  });
}

export async function renderProfessionals(container, { openModal, refresh }) {
  showLoading(container);
  try {
    const [list, ranking] = await Promise.all([
      api.professionals.list(),
      api.professionals.ranking(),
    ]);

    const rankMap = Object.fromEntries(ranking.map((r) => [r.professionalId, r]));

    const rows = list.map((p) => {
      const r = rankMap[p.id];
      return `<tr>
        <td><strong>${escapeHtml(p.name)}</strong></td>
        <td>${escapeHtml(p.phone || '—')}</td>
        <td>${Math.round(p.commissionRate * 100)}%</td>
        <td>${r ? formatCurrency(r.revenue) : '—'}</td>
        <td>${p.active ? '<span class="badge badge--green">Ativo</span>' : '<span class="badge badge--gray">Inativo</span>'}</td>
        <td class="table-actions">${p.active ? `<button class="btn btn--sm btn--danger" data-remove-pro="${p.id}" data-name="${escapeHtml(p.name)}">Remover</button>` : ''}</td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="panel">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Telefone</th><th>Comissão</th><th>Faturamento</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="empty">Nenhum profissional</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;

    container.querySelectorAll('[data-remove-pro]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Remover o profissional "${btn.dataset.name}"?`)) return;
        await api.professionals.remove(btn.dataset.removePro);
        refresh();
      });
    });
  } catch (err) {
    showError(container, err.message);
  }
}

export function showNewProfessionalModal(openModal, refresh) {
  openModal('Novo Profissional', `
    <form class="modal-form" id="proForm">
      <div class="form-group"><label>Nome</label><input name="name" required></div>
      <div class="form-group"><label>Telefone</label><input name="phone"></div>
      <div class="form-group"><label>Comissão (%)</label><input name="commissionRate" type="number" min="0" max="100" value="40"></div>
      <div class="modal-form__actions">
        <button type="button" class="btn btn--outline" data-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">Salvar</button>
      </div>
    </form>`);

  document.getElementById('proForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api.professionals.create({
      name: fd.get('name'),
      phone: fd.get('phone') || undefined,
      commissionRate: parseFloat(fd.get('commissionRate')) / 100,
    });
    document.getElementById('modal').classList.add('hidden');
    refresh();
  });
}

export async function renderServices(container, { openModal, refresh }) {
  showLoading(container);
  try {
    const [list, analysis] = await Promise.all([
      api.services.list(),
      api.services.analysis(),
    ]);

    const analysisMap = Object.fromEntries(analysis.map((a) => [a.serviceId, a]));

    const rows = list.map((s) => {
      const a = analysisMap[s.id];
      return `<tr>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>${formatCurrency(s.price)}</td>
        <td>${s.durationMin} min</td>
        <td>${a ? a.sold : 0}</td>
        <td>${a ? formatCurrency(a.profit) : '—'}</td>
        <td>${s.active ? '<span class="badge badge--green">Ativo</span>' : '<span class="badge badge--gray">Inativo</span>'}</td>
        <td class="table-actions">${s.active ? `<button class="btn btn--sm btn--danger" data-remove-svc="${s.id}" data-name="${escapeHtml(s.name)}">Remover</button>` : ''}</td>
      </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="panel">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Serviço</th><th>Preço</th><th>Duração</th><th>Vendidos</th><th>Lucro</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="7" class="empty">Nenhum serviço</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;

    container.querySelectorAll('[data-remove-svc]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Remover o serviço "${btn.dataset.name}"?`)) return;
        await api.services.remove(btn.dataset.removeSvc);
        refresh();
      });
    });
  } catch (err) {
    showError(container, err.message);
  }
}

export function showNewServiceModal(openModal, refresh) {
  openModal('Novo Serviço', `
    <form class="modal-form" id="svcForm">
      <div class="form-group"><label>Nome</label><input name="name" required></div>
      <div class="form-group"><label>Preço (R$)</label><input name="price" type="number" min="0" step="0.01" required></div>
      <div class="form-group"><label>Duração (min)</label><input name="durationMin" type="number" min="5" value="60"></div>
      <div class="form-group"><label>Custo (R$)</label><input name="cost" type="number" min="0" step="0.01" value="0"></div>
      <div class="modal-form__actions">
        <button type="button" class="btn btn--outline" data-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">Salvar</button>
      </div>
    </form>`);

  document.getElementById('svcForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api.services.create({
      name: fd.get('name'),
      price: parseFloat(fd.get('price')),
      durationMin: parseInt(fd.get('durationMin'), 10),
      cost: parseFloat(fd.get('cost')) || 0,
    });
    document.getElementById('modal').classList.add('hidden');
    refresh();
  });
}

export async function renderClients(container, { openModal, refresh }) {
  showLoading(container);
  try {
    const [list, stats] = await Promise.all([
      api.clients.list(),
      api.clients.stats(),
    ]);

    const rows = list.map((c) => `
      <tr>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td>${escapeHtml(c.phone || '—')}</td>
        <td>${escapeHtml(c.email || '—')}</td>
        <td>${c._count?.appointments ?? 0}</td>
      </tr>`).join('');

    container.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card"><div class="stat-card__label">Total</div><div class="stat-card__value">${stats.total}</div></div>
        <div class="stat-card"><div class="stat-card__label">Novos (30 dias)</div><div class="stat-card__value">${stats.newLast30Days}</div></div>
        <div class="stat-card"><div class="stat-card__label">Recorrentes</div><div class="stat-card__value stat-card__value--success">${stats.recurring}</div></div>
      </div>
      <div class="panel">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Telefone</th><th>E-mail</th><th>Atendimentos</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="4" class="empty">Nenhum cliente</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  } catch (err) {
    showError(container, err.message);
  }
}

export function showNewClientModal(openModal, refresh) {
  openModal('Novo Cliente', `
    <form class="modal-form" id="cliForm">
      <div class="form-group"><label>Nome</label><input name="name" required></div>
      <div class="form-group"><label>Telefone</label><input name="phone"></div>
      <div class="form-group"><label>E-mail</label><input name="email" type="email"></div>
      <div class="modal-form__actions">
        <button type="button" class="btn btn--outline" data-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">Salvar</button>
      </div>
    </form>`);

  document.getElementById('cliForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api.clients.create({
      name: fd.get('name'),
      phone: fd.get('phone') || undefined,
      email: fd.get('email') || undefined,
    });
    document.getElementById('modal').classList.add('hidden');
    refresh();
  });
}

export async function renderFinanceiro(container, { openModal, refresh }) {
  showLoading(container);
  try {
    const [expenses, summary, overview] = await Promise.all([
      api.expenses.list(),
      api.expenses.summary(),
      api.dashboard.overview(),
    ]);

    const rows = expenses.map((e) => `
      <tr>
        <td>${escapeHtml(e.description)}</td>
        <td>${categoryLabel(e.category)}</td>
        <td>${formatCurrency(e.amount)}</td>
        <td>${formatDateShort(e.dueDate)}</td>
        <td>${statusBadge(e.status)}</td>
        <td class="table-actions">
          ${e.status !== 'PAID' ? `<button class="btn btn--sm btn--primary" data-pay="${e.id}">Pagar</button>` : ''}
          <button class="btn btn--sm btn--danger" data-remove-exp="${e.id}" data-name="${escapeHtml(e.description)}">Remover</button>
        </td>
      </tr>`).join('');

    container.innerHTML = `
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card"><div class="stat-card__label">Receita do Mês</div><div class="stat-card__value stat-card__value--accent">${formatCurrency(overview.finance.revenue)}</div></div>
        <div class="stat-card"><div class="stat-card__label">Despesas Pagas</div><div class="stat-card__value">${formatCurrency(summary.paid)}</div></div>
        <div class="stat-card"><div class="stat-card__label">Pendentes</div><div class="stat-card__value stat-card__value--danger">${formatCurrency(summary.pending)}</div></div>
        <div class="stat-card"><div class="stat-card__label">Lucro</div><div class="stat-card__value stat-card__value--success">${formatCurrency(overview.finance.profit)}</div></div>
      </div>
      <div class="panel">
        <div class="table-wrap">
          <table>
            <thead><tr><th>Descrição</th><th>Categoria</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="empty">Nenhuma despesa</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;

    container.querySelectorAll('[data-pay]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await api.expenses.update(btn.dataset.pay, { status: 'PAID' });
        refresh();
      });
    });
    container.querySelectorAll('[data-remove-exp]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Remover a despesa "${btn.dataset.name}"?`)) return;
        await api.expenses.remove(btn.dataset.removeExp);
        refresh();
      });
    });
  } catch (err) {
    showError(container, err.message);
  }
}

export function showNewExpenseModal(openModal, refresh) {
  openModal('Nova Despesa', `
    <form class="modal-form" id="expForm">
      <div class="form-group"><label>Descrição</label><input name="description" required></div>
      <div class="form-group"><label>Valor (R$)</label><input name="amount" type="number" min="0" step="0.01" required></div>
      <div class="form-group"><label>Categoria</label>
        <select name="category">
          <option value="RENT">Aluguel</option><option value="UTILITIES">Utilidades</option>
          <option value="SUPPLIES">Insumos</option><option value="SALARY">Salário</option>
          <option value="MARKETING">Marketing</option><option value="EQUIPMENT">Equipamento</option>
          <option value="OTHER">Outro</option>
        </select>
      </div>
      <div class="form-group"><label>Vencimento</label><input name="dueDate" type="date" required></div>
      <div class="modal-form__actions">
        <button type="button" class="btn btn--outline" data-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">Salvar</button>
      </div>
    </form>`);

  document.getElementById('expForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api.expenses.create({
      description: fd.get('description'),
      amount: parseFloat(fd.get('amount')),
      category: fd.get('category'),
      dueDate: fd.get('dueDate'),
    });
    document.getElementById('modal').classList.add('hidden');
    refresh();
  });
}

export async function renderMetas(container, { openModal, refresh }) {
  showLoading(container);
  try {
    const progress = await api.goals.progress();

    const cards = progress.map((g) => {
      const pct = Math.min(g.percent, 100);
      const name = g.professional ? g.professional.name : 'Salão (geral)';
      return `<div class="stat-card" style="position:relative">
        <button class="btn btn--sm btn--danger" data-remove-goal="${g.goalId}" data-name="${escapeHtml(name)}" style="position:absolute;top:12px;right:12px">Remover</button>
        <div class="stat-card__label">${escapeHtml(name)}</div>
        <div class="stat-card__value stat-card__value--accent">${formatCurrency(g.achieved)}</div>
        <div class="stat-card__sub">Meta: ${formatCurrency(g.target)} — ${g.percent}%</div>
        <div class="progress-bar"><div class="progress-bar__fill" style="width:${pct}%"></div></div>
        <div class="stat-card__sub" style="margin-top:6px">Faltam ${formatCurrency(g.remaining)}</div>
      </div>`;
    }).join('');

    container.innerHTML = `
      <div class="stats-grid">${cards || '<div class="empty">Nenhuma meta definida</div>'}</div>`;

    container.querySelectorAll('[data-remove-goal]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm(`Remover a meta "${btn.dataset.name}"?`)) return;
        await api.goals.remove(btn.dataset.removeGoal);
        refresh();
      });
    });
  } catch (err) {
    showError(container, err.message);
  }
}

export function showNewGoalModal(openModal, refresh) {
  const now = new Date();
  openModal('Nova Meta', `
    <form class="modal-form" id="goalForm">
      <div class="form-group"><label>Meta de faturamento (R$)</label><input name="revenueTarget" type="number" min="1" required></div>
      <div class="form-group"><label>Mês</label><input name="month" type="number" min="1" max="12" value="${now.getMonth() + 1}"></div>
      <div class="form-group"><label>Ano</label><input name="year" type="number" value="${now.getFullYear()}"></div>
      <div class="modal-form__actions">
        <button type="button" class="btn btn--outline" data-close>Cancelar</button>
        <button type="submit" class="btn btn--primary">Salvar</button>
      </div>
    </form>`);

  document.getElementById('goalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await api.goals.create({
      revenueTarget: parseFloat(fd.get('revenueTarget')),
      month: parseInt(fd.get('month'), 10),
      year: parseInt(fd.get('year'), 10),
    });
    document.getElementById('modal').classList.add('hidden');
    refresh();
  });
}
