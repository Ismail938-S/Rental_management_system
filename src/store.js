// Mock backend (localStorage). Replace each function with a fetch() to your real API later.
import { useState, useEffect } from 'react';
const KEY = 'rms_db_v1';
const P = (id, name, category, img, stock, hour, day, week, deposit, desc, brand, model, image) =>
  ({ id, name, category, img, brand, model, image, stock, rates: { hour, day, week }, deposit, desc, rentable: true });
const seed = () => ({
  users: [
    { id: 1, name: 'Admin', email: 'admin@demo.com', password: 'admin', role: 'admin', segment: 'standard' },
    { id: 2, name: 'Demo Customer', email: 'user@demo.com', password: 'user', role: 'customer', segment: 'standard' },
  ],
  products: [
    P(1, 'DSLR Camera', 'Camera', '📷', 3, 150, 800, 4500, 2000, '30.4MP full-frame DSLR with Canon EF 35mm f/1.4L lens', 'Canon', 'EOS 5D Mark IV', '/images/canon-eos-5d-mark-iv.jpg'),
    P(2, 'Projector', 'Electronics', '📽️', 2, 200, 1000, 5500, 3000, '3LCD projector with HDMI', 'Epson', '3LCD Projector', '/images/epson-projector.jpg'),
    P(3, 'Mountain Bike', 'Vehicles', '🚵', 5, 50, 300, 1800, 1500, 'Mountain bike with front basket', 'Diamondback', 'Trail Bike', '/images/diamondback-bike.jpg'),
    P(4, 'PA Speaker', 'Audio', '🔊', 4, 100, 600, 3500, 2500, 'Portable party speaker with light show', 'JBL', 'PartyBox Stage 320', '/images/jbl-partybox-stage-320.jpg'),
    P(5, 'Camping Tent', 'Outdoor', '⛺', 6, 30, 200, 1200, 800, '4-person family tent', 'Quechua', 'Arpenaz Family 4', '/images/quechua-arpenaz-family-4.jpg'),
  ],
  pricelists: [
    { id: 1, name: 'VIP Customers', segment: 'vip', discountPct: 15, from: '', to: '' },
    { id: 2, name: 'Holiday Rental Rates', segment: 'all', discountPct: 10, from: '2026-12-20', to: '2027-01-05' },
  ],
  orders: [], settings: { notifyDays: 2, lateFeePerHour: 25 }, session: null, seq: 100,
});
let db; try { db = JSON.parse(localStorage.getItem(KEY)); } catch { /* ignore */ }
db = db || seed();
// switch the old demo DSLR to the 5D Mark IV (already-saved data)
db.products.forEach(p => { if (p.brand === 'Canon' && p.model === 'EOS 1500D') Object.assign(p, { desc: '30.4MP full-frame DSLR with Canon EF 35mm f/1.4L lens', model: 'EOS 5D Mark IV', image: '/images/canon-eos-5d-mark-iv.jpg' }); });
// fill brand/model/image for data saved before these fields existed
const _seed = seed();
db.products.forEach(p => { const s = _seed.products.find(x => x.id === p.id); if (s) ['brand', 'model', 'image'].forEach(k => { if (p[k] === undefined) p[k] = s[k]; }); });
// swap the placeholder demo products for the real photos/models (already-saved data)
const OLD_IMG = { 2: '/images/epson-eb-x06.jpg', 3: '/images/hercules-roadeo.jpg', 4: '/images/jbl-partybox-310.jpg', 5: '/images/quechua-tent.jpg' };
db.products.forEach(p => { if (OLD_IMG[p.id] && p.image === OLD_IMG[p.id]) { const s = _seed.products.find(x => x.id === p.id); Object.assign(p, { desc: s.desc, brand: s.brand, model: s.model, image: s.image }); } });
const subs = new Set();
const save = () => { localStorage.setItem(KEY, JSON.stringify(db)); subs.forEach(f => f()); };
export function useDB() {
  const [, s] = useState(0);
  useEffect(() => { const f = () => s(n => n + 1); subs.add(f); return () => subs.delete(f); }, []);
  return db;
}
export const toLocalInput = d => new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);

/* ---------- auth ---------- */
export const me = () => db.users.find(u => u.id === db.session);
export function login(email, password) {
  const u = db.users.find(u => u.email === email && u.password === password);
  if (!u) return { error: 'Invalid email or password' };
  db.session = u.id; save(); return { user: u };
}
export function signup(f) {
  if (db.users.some(u => u.email === f.email)) return { error: 'Email already registered' };
  const u = { id: ++db.seq, name: f.name || f.email.split('@')[0], email: f.email, password: f.password, role: 'customer', segment: f.segment || 'standard' };
  db.users.push(u); db.session = u.id; save(); return { user: u };
}
export const logout = () => { db.session = null; save(); };

/* ---------- pricing ---------- */
export const hoursBetween = (s, e) => Math.max(1, Math.ceil((new Date(e) - new Date(s)) / 36e5));
export function activeDiscount(user, at = new Date()) {
  let best = null;
  for (const l of db.pricelists) {
    const ok = (l.segment === 'all' || l.segment === user?.segment) &&
      (!l.from || new Date(l.from) <= at) && (!l.to || new Date(l.to + 'T23:59') >= at);
    if (ok && (!best || l.discountPct > best.discountPct)) best = l;
  }
  return best;
}
export function calcPrice(p, start, end, qty, user) {
  const h = hoursBetween(start, end), { hour, day, week } = p.rates;
  const w = Math.floor(h / 168), d = Math.floor((h % 168) / 24), hr = h % 24;
  const rem = Math.min(d * day + Math.min(hr * hour, day), week);   // never exceed next tier
  const base = (w * week + rem) * qty;
  const pl = activeDiscount(user, new Date(start));
  const discount = pl ? (base * pl.discountPct) / 100 : 0;
  return { hours: h, base, discount, pl, total: base - discount };
}

/* ---------- availability & orders ---------- */
const overlap = (a, b, c, d) => new Date(a) < new Date(d) && new Date(c) < new Date(b);
const RESERVING = ['confirmed', 'picked_up'];
export const available = (pid, s, e, skip) => {
  const p = db.products.find(p => p.id === pid);
  return p.stock - db.orders.filter(o => o.id !== skip && o.productId === pid && RESERVING.includes(o.status) && overlap(o.start, o.end, s, e)).reduce((a, o) => a + o.qty, 0);
};
export function createQuote({ productId, qty, start, end }) {
  const u = me(), p = db.products.find(p => p.id === productId), pr = calcPrice(p, start, end, qty, u);
  const o = { id: ++db.seq, userId: u.id, productId, qty, start, end, status: 'quotation', total: Math.round(pr.total), discount: Math.round(pr.discount), paid: 0, lateFee: 0, createdAt: new Date().toISOString() };
  db.orders.push(o); save(); return o;
}
const get = id => db.orders.find(o => o.id === id);
export function confirmOrder(id) {
  const o = get(id);
  if (available(o.productId, o.start, o.end, o.id) < o.qty) return { error: 'Not enough units available for these dates' };
  o.status = 'confirmed'; save(); return {};
}
export function pay(id, mode) {
  const o = get(id), p = db.products.find(p => p.id === o.productId);
  o.payMode = mode; o.paid = mode === 'full' ? o.total : Math.min(o.total, p.deposit * o.qty); save();  // plug Stripe/Razorpay here
}
export const lateFeeFor = (o, at = new Date()) => new Date(at) > new Date(o.end) ? Math.ceil((new Date(at) - new Date(o.end)) / 36e5) * db.settings.lateFeePerHour * o.qty : 0;
export const pickup = id => { const o = get(id); o.status = 'picked_up'; o.pickedAt = new Date().toISOString(); save(); };
export const returnOrder = id => { const o = get(id); o.lateFee = lateFeeFor(o); o.status = 'returned'; o.returnedAt = new Date().toISOString(); save(); };
export const isLate = o => o.status === 'picked_up' && new Date() > new Date(o.end);
export const dueSoon = o => o.status === 'picked_up' && !isLate(o) && new Date(o.end) - new Date() < db.settings.notifyDays * 864e5;

/* ---------- admin ---------- */
export const addProduct = p => { db.products.push({ ...p, id: ++db.seq, rentable: true }); save(); };
export const updateProduct = (id, patch) => { Object.assign(db.products.find(p => p.id === id), patch); save(); };
export const addPricelist = l => { db.pricelists.push({ ...l, id: ++db.seq }); save(); };
export const delPricelist = id => { db.pricelists = db.pricelists.filter(l => l.id !== id); save(); };
export const setSettings = s => { Object.assign(db.settings, s); save(); };
export function report(from, to) {
  const rows = db.orders.filter(o => o.status !== 'quotation' && (!from || o.start >= from) && (!to || o.start <= to + 'T23:59'));
  const byProd = {}, byCust = {};
  rows.forEach(o => {
    const pn = db.products.find(p => p.id === o.productId).name, cn = db.users.find(u => u.id === o.userId)?.name;
    byProd[pn] = (byProd[pn] || 0) + o.qty; byCust[cn] = (byCust[cn] || 0) + o.total + o.lateFee;
  });
  const top = Object.entries(byCust).sort((a, b) => b[1] - a[1])[0];
  return { rows, byProd: Object.entries(byProd).sort((a, b) => b[1] - a[1]), revenue: rows.reduce((a, o) => a + o.total + o.lateFee, 0), top };
}

/* ---------- AI assistant (rule-based; swap askAI body for an LLM/RAG call) ---------- */
const UNIT = { hour: 1, day: 24, week: 168, month: 720 };
const STOP = new Set(['the', 'for', 'need', 'want', 'day', 'days', 'week', 'weeks', 'hour', 'hours', 'under', 'and', 'with', 'rent', 'month', 'budget', 'units', 'unit', 'please', 'can', 'you', 'have', 'any']);
export function recommend(text, user) {
  const t = text.toLowerCase();
  const d = t.match(/(\d+)\s*(hour|day|week|month)/), q = t.match(/(\d+)\s*(units?|pcs|pieces|x\b)/), b = t.match(/(?:under|below|budget|within|max|upto|up to)\D{0,6}(\d[\d,]*)/);
  const hours = d ? +d[1] * UNIT[d[2]] : 24, qty = q ? +q[1] : 1, budget = b ? +b[1].replace(/,/g, '') : null;
  const start = new Date(Date.now() + 864e5); start.setMinutes(0, 0, 0);
  const end = new Date(+start + hours * 36e5);
  const words = t.split(/\W+/).filter(w => w.length > 2 && !STOP.has(w) && isNaN(w));
  const all = db.products.filter(p => p.rentable);
  const hit = all.filter(p => words.some(w => (p.name + ' ' + p.category + ' ' + p.desc).toLowerCase().includes(w.replace(/s$/, ''))));
  const items = (hit.length ? hit : all).map(p => {
    const pr = calcPrice(p, start, end, qty, user), left = available(p.id, start, end);
    return { p, total: Math.round(pr.total), left, ok: left >= qty, fits: budget == null || pr.total <= budget, deal: pr.pl?.name };
  }).filter(i => i.ok).sort((a, b) => (b.fits - a.fits) || (a.total - b.total));
  return { items, hours, qty, budget, start, end, matched: hit.length > 0 };
}
export function askAI(text, user) {
  const t = text.toLowerCase(), s = db.settings;
  if (/deposit/.test(t)) return { text: 'You can pay in full upfront, or pay a security deposit (set per product, e.g. 2,000 for a DSLR) now and the rest later.' };
  if (/late|penalt|overdue/.test(t)) return { text: `Late returns are charged ₹${s.lateFeePerHour} per hour per unit after the return time. Fees are calculated automatically when the item is marked returned.` };
  if (/return|pickup|pick up|deliver/.test(t)) return { text: `Flow: Reservation → Pickup → Return. Items are reserved once your order is confirmed. You get reminders ${s.notifyDays} day(s) before the return date.` };
  if (/discount|pricelist|vip|offer|coupon/.test(t)) return { text: 'Active pricelists: ' + db.pricelists.map(l => `${l.name} (${l.discountPct}% off)`).join(', ') + '.' };
  const r = recommend(text, user);
  if (!r.items.length) return { text: 'Sorry, nothing is available for that request. Try different dates or a smaller quantity.', items: [] };
  const best = r.items[0];
  return { text: `For ${r.qty} unit(s) over ${r.hours}h, I suggest ${best.p.name} at ₹${best.total}${r.budget && !best.fits ? ` (above your ₹${r.budget} budget — cheapest match)` : ''}.`, items: r.items.slice(0, 3) };
}
