import { Router } from 'express';
import { authenticate, ensureTenantAccess } from '../middleware/auth';
import * as auth from './auth.routes';
import * as professionals from './professionals.routes';
import * as services from './services.routes';
import * as clients from './clients.routes';
import * as appointments from './appointments.routes';
import * as expenses from './expenses.routes';
import * as products from './products.routes';
import * as goals from './goals.routes';
import * as dashboard from './dashboard.routes';

const router = Router();

// Público
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);

// Protegido (multi-tenant)
const protected_ = Router();
protected_.use(authenticate, ensureTenantAccess);

protected_.get('/auth/me', auth.me);

protected_.get('/professionals', professionals.list);
protected_.get('/professionals/ranking', professionals.ranking);
protected_.get('/professionals/:id', professionals.getById);
protected_.post('/professionals', professionals.create);
protected_.put('/professionals/:id', professionals.update);
protected_.delete('/professionals/:id', professionals.remove);

protected_.get('/services', services.list);
protected_.get('/services/analysis', services.analysis);
protected_.get('/services/:id', services.getById);
protected_.post('/services', services.create);
protected_.put('/services/:id', services.update);
protected_.delete('/services/:id', services.remove);

protected_.get('/clients', clients.list);
protected_.get('/clients/stats', clients.stats);
protected_.get('/clients/:id', clients.getById);
protected_.post('/clients', clients.create);
protected_.put('/clients/:id', clients.update);
protected_.delete('/clients/:id', clients.remove);

protected_.get('/appointments/payment-methods', appointments.listPaymentMethods);
protected_.get('/appointments', appointments.list);
protected_.get('/appointments/:id', appointments.getById);
protected_.post('/appointments', appointments.create);
protected_.patch('/appointments/:id/complete', appointments.complete);
protected_.put('/appointments/:id', appointments.update);
protected_.delete('/appointments/:id', appointments.remove);

protected_.get('/expenses', expenses.list);
protected_.get('/expenses/summary', expenses.summary);
protected_.post('/expenses', expenses.create);
protected_.put('/expenses/:id', expenses.update);
protected_.delete('/expenses/:id', expenses.remove);

protected_.get('/products', products.list);
protected_.get('/products/alerts', products.alerts);
protected_.post('/products', products.create);
protected_.put('/products/:id', products.update);
protected_.patch('/products/:id/stock', products.adjustStock);
protected_.delete('/products/:id', products.remove);

protected_.get('/goals', goals.list);
protected_.get('/goals/progress', goals.progress);
protected_.post('/goals', goals.create);
protected_.delete('/goals/:id', goals.remove);

protected_.get('/dashboard/overview', dashboard.overview);
protected_.get('/dashboard/revenue-chart', dashboard.revenueChart);
protected_.get('/dashboard/cash-flow', dashboard.cashFlow);

router.use(protected_);

export default router;
