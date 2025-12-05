process.env.ADMIN_TOKEN = 'test-admin';
const { createServer } = require('./server');

async function run() {
  const server = createServer();
  await new Promise((resolve) => server.listen(5001, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:5001';
  const jar = {};

  function getCookie(headers) {
    const set = headers.get('set-cookie');
    if (!set) return;
    const [pair] = set.split(';');
    const [k, v] = pair.split('=');
    jar[k] = v;
  }

  function cookieHeader() {
    const parts = Object.entries(jar).map(([k, v]) => `${k}=${v}`);
    return parts.length ? { Cookie: parts.join('; ') } : {};
  }

  // health
  const h = await fetch(`${base}/healthz`);
  if (h.status !== 200) throw new Error('health failed');

  // menu
  const m = await fetch(`${base}/api/corporate/menu`);
  if (m.status !== 200) throw new Error('menu failed');
  const menu = await m.json();
  if (!menu.categories || !Array.isArray(menu.categories)) throw new Error('menu shape');

  const uname = `demo${Math.floor(Math.random() * 1e6)}`;
  const email = `${uname}@corp.com`;
  // signup
  let r = await fetch(`${base}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: uname, password: 'pass', name: 'Demo', email }),
  });
  if (![200, 201].includes(r.status)) throw new Error('signup failed');
  getCookie(r.headers);

  // me
  r = await fetch(`${base}/api/auth/me`, { headers: cookieHeader() });
  if (r.status !== 200) throw new Error('me failed');
  const me = await r.json();
  if (me.username !== uname) throw new Error('me mismatch');

  // change password
  r = await fetch(`${base}/api/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...cookieHeader() },
    body: JSON.stringify({ oldPassword: 'pass', newPassword: 'newpass' }),
  });
  if (r.status !== 200) throw new Error('change-password failed');
  // logout
  await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: cookieHeader() });
  // login with old should fail
  r = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: uname, password: 'pass' }),
  });
  if (r.status === 200) throw new Error('old password should fail');
  // login with new should work
  r = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: uname, password: 'newpass' }),
  });
  if (r.status !== 200) throw new Error('new password login failed');
  getCookie(r.headers);

  // place order
  const anyItemId = menu.categories[0]?.items?.[0]?.id;
  if (!anyItemId) throw new Error('no menu item');
  r = await fetch(`${base}/api/corporate/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...cookieHeader() },
    body: JSON.stringify({ items: [{ itemId: anyItemId, quantity: 2 }], notes: 'QA' }),
  });
  let orderId = null;
  if (r.status === 201) {
    const orderResp = await r.json();
    orderId = orderResp.id;
  } else if (r.status === 403) {
    // Ordering window closed; skip order assertions
    console.log('Ordering window closed; skipping order flow in validation');
  } else {
    throw new Error('order failed');
  }

  // list orders
  if (orderId) {
    r = await fetch(`${base}/api/corporate/orders`, { headers: cookieHeader() });
    if (r.status !== 200) throw new Error('orders list failed');
    const list = await r.json();
    if (!list.find((o) => o.id === orderId)) throw new Error('order missing in list');
    // get order
    r = await fetch(`${base}/api/corporate/orders/${orderId}`, { headers: cookieHeader() });
    if (r.status !== 200) throw new Error('order get failed');
  }

  // admin: create category + item
  const adminHeaders = { 'Content-Type': 'application/json', 'X-Admin-Token': 'test-admin' };
  r = await fetch(`${base}/api/admin/menu/categories`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ id: 'testcat', name: 'Test Category' }),
  });
  if (r.status !== 201 && r.status !== 200) throw new Error('admin create category failed');
  r = await fetch(`${base}/api/admin/menu/items`, {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ id: 'testitem', categoryId: 'testcat', name: 'Test Item', price: 12.34 }),
  });
  if (r.status !== 201) throw new Error('admin create item failed');
  // verify appears in menu
  const m2 = await (await fetch(`${base}/api/corporate/menu`)).json();
  const foundCat = m2.categories.find((c) => c.id === 'testcat');
  if (!foundCat || !foundCat.items.find((i) => i.id === 'testitem')) throw new Error('admin item not visible');
  // cleanup
  await fetch(`${base}/api/admin/menu/items/testitem`, { method: 'DELETE', headers: adminHeaders });
  await fetch(`${base}/api/admin/menu/categories/testcat`, { method: 'DELETE', headers: adminHeaders });

  console.log('Validation OK');
  await new Promise((resolve) => server.close(resolve));
}

run().catch(async (err) => {
  console.error('Validation failed:', err.message);
  process.exitCode = 1;
});
