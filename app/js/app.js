import {
  api, getToken, clearToken, storeSession, getStoredUser, getStoredTenant,
} from './api.js';
import {
  renderDashboard, renderAppointments, showNewAppointmentModal,
  renderProfessionals, showNewProfessionalModal,
  renderServices, showNewServiceModal,
  renderClients, showNewClientModal,
  renderFinanceiro, showNewExpenseModal,
  renderMetas, showNewGoalModal,
} from './pages.js';

const PAGES = {
  dashboard: { title: 'Dashboard', render: renderDashboard },
  atendimentos: {
    title: 'Atendimentos',
    render: renderAppointments,
    action: { label: '+ Novo', fn: showNewAppointmentModal },
  },
  profissionais: {
    title: 'Profissionais',
    render: renderProfessionals,
    action: { label: '+ Novo', fn: showNewProfessionalModal },
  },
  servicos: {
    title: 'Serviços',
    render: renderServices,
    action: { label: '+ Novo', fn: showNewServiceModal },
  },
  clientes: {
    title: 'Clientes',
    render: renderClients,
    action: { label: '+ Novo', fn: showNewClientModal },
  },
  financeiro: {
    title: 'Financeiro',
    render: renderFinanceiro,
    action: { label: '+ Despesa', fn: showNewExpenseModal },
  },
  metas: {
    title: 'Metas',
    render: renderMetas,
    action: { label: '+ Nova Meta', fn: showNewGoalModal },
  },
};

const loginScreen = document.getElementById('loginScreen');
const appEl = document.getElementById('app');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const content = document.getElementById('content');
const pageTitle = document.getElementById('pageTitle');
const topbarActions = document.getElementById('topbarActions');
const nav = document.getElementById('nav');
const sidebar = document.getElementById('sidebar');
const menuBtn = document.getElementById('menuBtn');
const logoutBtn = document.getElementById('logoutBtn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');

let currentPage = 'dashboard';

function showLogin() {
  loginScreen.classList.remove('hidden');
  appEl.classList.add('hidden');
}

function showApp() {
  loginScreen.classList.add('hidden');
  appEl.classList.remove('hidden');
  const tenant = getStoredTenant();
  const user = getStoredUser();
  if (tenant) document.getElementById('tenantName').textContent = tenant.name;
  if (user) document.getElementById('userName').textContent = user.name;
}

function openModal(title, html) {
  modalTitle.textContent = title;
  modalBody.innerHTML = html;
  modal.classList.remove('hidden');

  modalBody.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => modal.classList.add('hidden'));
  });
}

function getCtx() {
  return { openModal, refresh: () => navigate(currentPage) };
}

async function navigate(page) {
  currentPage = page;
  const config = PAGES[page] || PAGES.dashboard;

  pageTitle.textContent = config.title;

  nav.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  topbarActions.innerHTML = '';
  if (config.action) {
    const btn = document.createElement('button');
    btn.className = 'btn btn--primary btn--sm';
    btn.textContent = config.action.label;
    btn.addEventListener('click', () => config.action.fn(openModal, () => navigate(page)));
    topbarActions.appendChild(btn);
  }

  sidebar.classList.remove('open');
  await config.render(content, getCtx());
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const data = await api.login(email, password);
    storeSession(data.token, data.user, data.tenant);
    showApp();
    navigate('dashboard');
  } catch (err) {
    loginError.textContent = err.message || 'Erro ao entrar';
    loginError.classList.remove('hidden');
  }
});

logoutBtn.addEventListener('click', () => {
  clearToken();
  showLogin();
  location.hash = '';
});

nav.addEventListener('click', (e) => {
  const item = e.target.closest('.nav-item');
  if (!item) return;
  e.preventDefault();
  const page = item.dataset.page;
  location.hash = page;
});

menuBtn.addEventListener('click', () => sidebar.classList.toggle('open'));

document.getElementById('modalBackdrop').addEventListener('click', () => modal.classList.add('hidden'));
document.getElementById('modalClose').addEventListener('click', () => modal.classList.add('hidden'));

window.addEventListener('hashchange', () => {
  const page = location.hash.slice(1) || 'dashboard';
  if (getToken()) navigate(page);
});

async function init() {
  if (getToken()) {
    try {
      const me = await api.me();
      storeSession(getToken(), { id: me.id, name: me.name, email: me.email, role: me.role }, me.tenant);
      showApp();
      navigate(location.hash.slice(1) || 'dashboard');
    } catch {
      clearToken();
      showLogin();
    }
  } else {
    showLogin();
  }
}

init();
