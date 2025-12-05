const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { sendOrderEmails, sendContactEmail, sendPasswordResetEmail } = require('./email');
let emailQueue = null;
try {
  // Lazy require to allow server to run without Redis in dev
  ({ emailQueue } = require('./queue'));
} catch (_) {
  emailQueue = null;
}

// Config
const PORT = process.env.PORT ? Number(process.env.PORT) : 5001;
const HOST = '0.0.0.0';
const SESSION_COOKIE = 'corp_session';
const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';
const ORDER_TIMEZONE = process.env.ORDER_TIMEZONE || 'America/Chicago';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const ORDER_SEQUENCE_KEY = 'order_sequence';

// Prisma client
const prisma = new PrismaClient();

// Utilities
function json(res, status, data, headers = {}) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function parseJSON(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        // 1MB guard
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
  });
}

function parseCookies(req) {
  const header = req.headers['cookie'];
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [decodeURIComponent(k), decodeURIComponent(v.join('='))];
    }),
  );
}

function setCookie(res, name, value, opts = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.secure) parts.push('Secure');
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  parts.push(`Path=${opts.path || '/'}`);
  if (opts.maxAge) parts.push(`Max-Age=${opts.maxAge}`);
  res.setHeader('Set-Cookie', parts.join('; '));
}

// Simple signed token (not JWT): base64(payload).base64(signature)
function signToken(payloadObj) {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const h = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${h}`;
}

function verifyToken(token) {
  if (!token) return null;
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  if (crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    try {
      const json = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
      return json;
    } catch (e) {
      return null;
    }
  }
  return null;
}

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

function enableCORS(req, res) {
  const origin = req.headers.origin || '*';
  const allowOrigin = origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : '*';
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
}

function normalizeIdentifier(value) {
  return String(value || '').trim();
}

async function findUserByIdentifier(identifier) {
  const raw = normalizeIdentifier(identifier);
  if (!raw) return null;
  const lower = raw.toLowerCase();
  let user = await prisma.user.findUnique({ where: { username: raw } }).catch(() => null);
  if (!user && raw.includes('@')) {
    user = await prisma.user.findUnique({ where: { email: raw } }).catch(() => null);
  }
  if (!user && lower !== raw) {
    user = await prisma.user.findFirst({ where: { OR: [{ username: lower }, { email: lower }] } }).catch(() => null);
  }
  return user;
}

async function getNextOrderNumber() {
  // Use a simple app config row as a counter to avoid race conditions
  const seqKey = ORDER_SEQUENCE_KEY;
  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.appConfig.findUnique({ where: { key: seqKey } });
    const current = existing ? Number(existing.value || '0') : 0;
    const next = current + 1;
    await tx.appConfig.upsert({
      where: { key: seqKey },
      create: { key: seqKey, value: String(next) },
      update: { value: String(next) },
    });
    return next;
  });
  return updated;
}

// Router helpers
function matchRoute(method, urlPath, route) {
  if (method !== route.method) return null;
  const m = route.regex.exec(urlPath);
  if (!m) return null;
  const params = {};
  route.keys.forEach((k, i) => (params[k] = m[i + 1]));
  return params;
}

function compilePath(pattern) {
  // Very small path-to-regexp: /a/:id => ^/a/([^/]+)$
  const keys = [];
  const re = pattern
    .split('/')
    .map((seg) => {
      if (seg.startsWith(':')) {
        keys.push(seg.slice(1));
        return '([^/]+)';
      }
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return { regex: new RegExp(`^${re}$`), keys };
}

// Routes
const routes = [];
function addRoute(method, pattern, handler) {
  const { regex, keys } = compilePath(pattern);
  routes.push({ method, regex, keys, handler });
}

// Health
addRoute('GET', '/healthz', async (req, res) => json(res, 200, { status: 'ok' }));
addRoute('GET', '/readyz', async (req, res) => json(res, 200, { ready: true }));

// Contact
addRoute('POST', '/api/contact', async (req, res) => {
  try {
    const body = await parseJSON(req);
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const message = String(body.message || '').trim();
    const errors = [];
    if (!name) errors.push('name');
    if (!email) errors.push('email');
    if (!message) errors.push('message');
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailRe.test(email)) errors.push('email');
    if (errors.length) return json(res, 400, { error: 'invalid_fields', fields: errors });

    await sendContactEmail({ name, email, message });
    return json(res, 200, { ok: true });
  } catch (e) {
    if (e && e.message === 'Invalid JSON') return json(res, 400, { error: 'invalid_json' });
    // eslint-disable-next-line no-console
    console.error('[contact] send failed', e);
    return json(res, 500, { error: 'failed_to_send' });
  }
});

// Auth
addRoute('POST', '/api/auth/signup', async (req, res) => {
  try {
    const body = await parseJSON(req);
    const { username, password, name, email, phone, address } = body || {};
    const normalizedUsername = normalizeIdentifier(username).toLowerCase();
    const normalizedEmail = email ? normalizeIdentifier(email).toLowerCase() : null;
    if (!normalizedUsername || !password) return json(res, 400, { error: 'username and password required' });
    const existing = await prisma.user.findUnique({ where: { username: normalizedUsername } });
    if (existing) return json(res, 409, { error: 'username already exists' });
    const id = crypto.randomUUID();
    const salt = crypto.randomBytes(8).toString('hex');
    const passwordHash = hashPassword(password, salt);
    try {
      await prisma.user.create({
        data: {
          id,
          username: normalizedUsername,
          passwordHash,
          salt,
          name: name || null,
          email: normalizedEmail || null,
          phone: phone || null,
          address: address || null,
          role: 'corporate',
        },
      });
    } catch (e) {
      if (e && e.code === 'P2002') {
        return json(res, 409, { error: 'duplicate username or email' });
      }
      throw e;
    }
    const token = signToken({ sub: id, username: normalizedUsername });
    setCookie(res, SESSION_COOKIE, token, { httpOnly: true, sameSite: 'Lax', path: '/' });
    return json(res, 201, { id, username: normalizedUsername, name, email: normalizedEmail, phone, address });
  } catch (e) {
    return json(res, 400, { error: 'invalid request' });
  }
});

addRoute('POST', '/api/auth/login', async (req, res) => {
  try {
    const body = await parseJSON(req);
    const { username, password, email } = body || {};
    const identifier = normalizeIdentifier(username || email);
    const user = await findUserByIdentifier(identifier);
    if (!user) return json(res, 401, { error: 'invalid credentials' });
    const hash = hashPassword(password, user.salt);
    if (hash !== user.passwordHash) return json(res, 401, { error: 'invalid credentials' });
    const token = signToken({ sub: user.id, username: user.username });
    setCookie(res, SESSION_COOKIE, token, { httpOnly: true, sameSite: 'Lax', path: '/' });
    return json(res, 200, { id: user.id, username: user.username, name: user.name, email: user.email, phone: user.phone, address: user.address });
  } catch (e) {
    return json(res, 400, { error: 'invalid request' });
  }
});

// Forgot password: generate temp password and email it
addRoute('POST', '/api/auth/forgot', async (req, res) => {
  try {
    const body = await parseJSON(req);
    const { identifier } = body || {};
    const normalized = normalizeIdentifier(identifier);
    if (!normalized) return json(res, 400, { error: 'identifier required' });
    const user = await findUserByIdentifier(normalized);
    if (!user || !user.email) return json(res, 404, { error: 'user_not_found' });
    const tempPassword = crypto.randomBytes(8).toString('base64url').slice(0, 12);
    const newSalt = crypto.randomBytes(8).toString('hex');
    const newHash = hashPassword(tempPassword, newSalt);
    await prisma.user.update({ where: { id: user.id }, data: { salt: newSalt, passwordHash: newHash } });
    await sendPasswordResetEmail({ email: user.email, name: user.name || user.username, temporaryPassword: tempPassword });
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 400, { error: 'invalid request' });
  }
});

addRoute('POST', '/api/auth/logout', async (req, res) => {
  setCookie(res, SESSION_COOKIE, '', { httpOnly: true, sameSite: 'Lax', path: '/', maxAge: 0 });
  return json(res, 200, { ok: true });
});

addRoute('GET', '/api/auth/me', async (req, res) => {
  const cookies = parseCookies(req);
  const session = verifyToken(cookies[SESSION_COOKIE]);
  if (!session) return json(res, 401, { error: 'unauthorized' });
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return json(res, 401, { error: 'unauthorized' });
  return json(res, 200, { id: user.id, username: user.username, name: user.name, email: user.email, phone: user.phone, address: user.address });
});

// Change password
addRoute('POST', '/api/auth/change-password', async (req, res) => {
  const cookies = parseCookies(req);
  const session = verifyToken(cookies[SESSION_COOKIE]);
  if (!session) return json(res, 401, { error: 'unauthorized' });
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return json(res, 401, { error: 'unauthorized' });
  try {
    const body = await parseJSON(req);
    const { oldPassword, newPassword } = body || {};
    if (!oldPassword || !newPassword) return json(res, 400, { error: 'oldPassword and newPassword required' });
    const oldHash = hashPassword(oldPassword, user.salt);
    if (oldHash !== user.passwordHash) return json(res, 401, { error: 'invalid old password' });
    const newSalt = crypto.randomBytes(8).toString('hex');
    const newHash = hashPassword(newPassword, newSalt);
    await prisma.user.update({ where: { id: user.id }, data: { salt: newSalt, passwordHash: newHash } });
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 400, { error: 'invalid request' });
  }
});

// Menu
addRoute('GET', '/api/corporate/menu', async (req, res) => {
  const cats = await prisma.menuCategory.findMany({ include: { items: true } });
  const payload = {
    categories: cats.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || undefined,
      items: c.items.map((it) => ({ id: it.id, name: it.name, price: it.price })),
    })),
  };
  return json(res, 200, payload);
});

async function requireAuth(req) {
  const cookies = parseCookies(req);
  const session = verifyToken(cookies[SESSION_COOKIE]);
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  return user || null;
}

function requireAdmin(req) {
  const token = req.headers['x-admin-token'];
  if (!ADMIN_TOKEN) return false;
  if (typeof token === 'string') return token === ADMIN_TOKEN;
  if (Array.isArray(token)) return token[0] === ADMIN_TOKEN;
  return false;
}

// Read/write order window from DB with env defaults fallback
async function getOrderWindow() {
  const startDefault = Number(process.env.ORDER_WINDOW_START_MINUTES || 5);
  const endDefault = Number(process.env.ORDER_WINDOW_END_MINUTES || 645);
  try {
    const rows = await prisma.appConfig.findMany({ where: { key: { in: ['order_window_start_minutes', 'order_window_end_minutes'] } } });
    const map = new Map(rows.map((r) => [r.key, r.value]));
    const startMin = Number(map.get('order_window_start_minutes') ?? startDefault);
    const endMin = Number(map.get('order_window_end_minutes') ?? endDefault);
    return { startMin, endMin };
  } catch (_) {
    return { startMin: startDefault, endMin: endDefault };
  }
}

function normalizeMinutes(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 1440) return null;
  return Math.floor(n);
}

// Admin: order window config
addRoute('GET', '/api/admin/config/order-window', async (req, res) => {
  if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  const { startMin, endMin } = await getOrderWindow();
  return json(res, 200, { timeZone: ORDER_TIMEZONE, startMin, endMin });
});

addRoute('PATCH', '/api/admin/config/order-window', async (req, res) => {
  if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  try {
    const body = await parseJSON(req);
    const startMin = normalizeMinutes(body.startMin);
    const endMin = normalizeMinutes(body.endMin);
    if (startMin === null || endMin === null) return json(res, 400, { error: 'invalid minutes' });
    if (!(startMin < endMin)) return json(res, 400, { error: 'start must be less than end' });
    await prisma.$transaction([
      prisma.appConfig.upsert({
        where: { key: 'order_window_start_minutes' },
        update: { value: String(startMin) },
        create: { key: 'order_window_start_minutes', value: String(startMin) },
      }),
      prisma.appConfig.upsert({
        where: { key: 'order_window_end_minutes' },
        update: { value: String(endMin) },
        create: { key: 'order_window_end_minutes', value: String(endMin) },
      }),
    ]);
    return json(res, 200, { ok: true, startMin, endMin });
  } catch (e) {
    return json(res, 400, { error: 'invalid request' });
  }
});

// Orders
addRoute('POST', '/api/corporate/orders', async (req, res) => {
  const user = await requireAuth(req);
  if (!user) return json(res, 401, { error: 'unauthorized' });
  try {
    const body = await parseJSON(req);
    const { items, notes, scheduledAt, deliveryAddress } = body || {};
    if (!Array.isArray(items) || items.length === 0) {
      return json(res, 400, { error: 'items required' });
    }
    // Enforce ordering window in configured timezone
    const minutes = currentMinutesInTZ(ORDER_TIMEZONE);
    const { startMin, endMin } = await getOrderWindow();
    if (!(minutes >= startMin && minutes <= endMin)) {
      return json(res, 403, {
        error: 'ordering_closed',
        available: {
          start: `${String(Math.floor(startMin / 60)).padStart(2, '0')}:${String(startMin % 60).padStart(2, '0')}`,
          end: `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`,
          timeZone: ORDER_TIMEZONE,
        },
      });
    }
    // Fetch items from DB
    const ids = items.map((i) => String(i.itemId));
    const menuItems = await prisma.menuItem.findMany({ where: { id: { in: ids } } });
    const byId = new Map(menuItems.map((m) => [m.id, m]));
    let total = 0;
    const createItems = [];
    for (const it of items) {
      const base = byId.get(String(it.itemId));
      const qty = Number(it.quantity || 0);
      if (!base || qty <= 0) return json(res, 400, { error: `invalid item: ${it.itemId}` });
      const price = Number(base.price);
      total += price * qty;
      createItems.push({ itemId: base.id, nameSnapshot: base.name, priceSnapshot: price, quantity: qty });
    }
    const nextOrderNumber = await getNextOrderNumber();
    const created = await prisma.order.create({
      data: {
        id: crypto.randomUUID(),
        orderNumber: nextOrderNumber,
        userId: user.id,
        status: 'placed',
        totalAmount: Number(total.toFixed(2)),
        notes: notes || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        deliveryAddress: deliveryAddress || user.address || null,
        items: { create: createItems },
      },
    });
    // Respond immediately
    json(res, 201, { id: created.id, orderNumber: created.orderNumber, status: created.status, totalAmount: created.totalAmount });
    // Queue email job if queue available; else send directly (non-blocking)
    if (emailQueue) {
      emailQueue.add('sendOrderEmail', { order: created, user, items: createItems }).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[queue] enqueue failed; falling back to direct send', err && err.message);
        Promise.resolve(sendOrderEmails({ order: created, user, items: createItems })).catch(() => {});
      });
    } else {
      Promise.resolve(sendOrderEmails({ order: created, user, items: createItems })).catch(() => {});
    }
    return;
  } catch (e) {
    return json(res, 400, { error: 'invalid request' });
  }
});

addRoute('GET', '/api/corporate/orders', async (req, res) => {
  const user = await requireAuth(req);
  if (!user) return json(res, 401, { error: 'unauthorized' });
  const list = await prisma.order.findMany({ where: { userId: user.id }, include: { items: true }, orderBy: { createdAt: 'desc' } });
  return json(res, 200, list);
});

addRoute('GET', '/api/corporate/orders/:id', async (req, res, params) => {
  const user = await requireAuth(req);
  if (!user) return json(res, 401, { error: 'unauthorized' });
  const found = await prisma.order.findFirst({ where: { id: params.id, userId: user.id }, include: { items: true } });
  if (!found) return json(res, 404, { error: 'not found' });
  return json(res, 200, found);
});

// Admin: verification (simple token check)
addRoute('GET', '/api/admin/verify', async (req, res) => {
  if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  return json(res, 200, { ok: true });
});

// Admin: Orders report by date
// GET /api/admin/reports/orders?date=YYYY-MM-DD
addRoute('GET', '/api/admin/reports/orders', async (req, res) => {
  if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const dateStr = url.searchParams.get('date');
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return json(res, 400, { error: 'invalid_date', hint: 'use YYYY-MM-DD' });
    }
    const [y, m, d] = dateStr.split('-').map((n) => Number(n));
    // Interpret in server local time; for stricter TZ use ORDER_TIMEZONE as needed
    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);

    const list = await prisma.order.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: {
        items: true,
        user: { select: { id: true, username: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return json(res, 200, { date: dateStr, count: list.length, orders: list });
  } catch (e) {
    return json(res, 400, { error: 'invalid request' });
  }
});

// Admin: menu categories
addRoute('POST', '/api/admin/menu/categories', async (req, res) => {
  if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  try {
    const body = await parseJSON(req);
    let { id, name, description } = body || {};
    if (!name) return json(res, 400, { error: 'name required' });
    if (!id) {
      id = String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    const created = await prisma.menuCategory.create({ data: { id, name, description: description || null } });
    return json(res, 201, created);
  } catch (e) {
    return json(res, 400, { error: 'invalid request' });
  }
});

addRoute('PATCH', '/api/admin/menu/categories/:id', async (req, res, params) => {
  if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  try {
    const body = await parseJSON(req);
    const data = {};
    if (typeof body.name === 'string') data.name = body.name;
    if (typeof body.description === 'string' || body.description === null) data.description = body.description;
    const updated = await prisma.menuCategory.update({ where: { id: params.id }, data });
    return json(res, 200, updated);
  } catch (e) {
    return json(res, 400, { error: 'invalid request' });
  }
});

addRoute('DELETE', '/api/admin/menu/categories/:id', async (req, res, params) => {
  if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  try {
    await prisma.menuItem.deleteMany({ where: { categoryId: params.id } });
    await prisma.menuCategory.delete({ where: { id: params.id } });
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 400, { error: 'invalid request' });
  }
});

// Admin: menu items
addRoute('POST', '/api/admin/menu/items', async (req, res) => {
  if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  try {
    const body = await parseJSON(req);
    const { id, categoryId, name, price } = body || {};
    if (!categoryId || !name || price === undefined) return json(res, 400, { error: 'categoryId, name, price required' });
    const itemId = id || crypto.randomUUID();
    const created = await prisma.menuItem.create({ data: { id: String(itemId), categoryId: String(categoryId), name: String(name), price: Number(price) } });
    return json(res, 201, created);
  } catch (e) {
    return json(res, 400, { error: 'invalid request' });
  }
});

addRoute('PATCH', '/api/admin/menu/items/:id', async (req, res, params) => {
  if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  try {
    const body = await parseJSON(req);
    const data = {};
    if (typeof body.name === 'string') data.name = body.name;
    if (body.price !== undefined) data.price = Number(body.price);
    if (typeof body.categoryId === 'string') data.categoryId = body.categoryId;
    const updated = await prisma.menuItem.update({ where: { id: params.id }, data });
    return json(res, 200, updated);
  } catch (e) {
    return json(res, 400, { error: 'invalid request' });
  }
});

addRoute('DELETE', '/api/admin/menu/items/:id', async (req, res, params) => {
  if (!requireAdmin(req)) return json(res, 401, { error: 'unauthorized' });
  try {
    await prisma.menuItem.delete({ where: { id: params.id } });
    return json(res, 200, { ok: true });
  } catch (e) {
    return json(res, 400, { error: 'invalid request' });
  }
});

function notFound(res) {
  json(res, 404, { error: 'not found' });
}

function createServer() {
  const server = http.createServer(async (req, res) => {
    enableCORS(req, res);
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    for (const route of routes) {
      const params = matchRoute(req.method, pathname, route);
      if (params) {
        try {
          return await route.handler(req, res, params);
        } catch (e) {
          return json(res, 500, { error: 'internal_error' });
        }
      }
    }
    return notFound(res);
  });
  return server;
}

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, HOST, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://${HOST}:${PORT}`);
  });
}

module.exports = { createServer };
// Time helpers
function currentMinutesInTZ(tz) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      hour: 'numeric',
      minute: 'numeric',
    }).formatToParts(new Date());
    const hh = Number(parts.find((p) => p.type === 'hour')?.value || '0');
    const mm = Number(parts.find((p) => p.type === 'minute')?.value || '0');
    return hh * 60 + mm;
  } catch (_) {
    // Fallback to local time if tz invalid
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }
}
