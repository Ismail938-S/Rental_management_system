import React, { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import * as S from './store';
import Img from './Img.jsx';

const money = n => '₹' + Math.round(n).toLocaleString('en-IN');
const fmt = d => new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const STEPS = ['quotation', 'confirmed', 'picked_up', 'returned'];
const HINT = { quotation: 'Next step: confirm the order to reserve the item.', confirmed: 'Next step: pay (full or deposit). After that the pickup team hands over the item (Admin → Orders → Pickup).', picked_up: 'Item is with you. Return it before the end time to avoid late fees (Admin → Orders → Mark returned).', returned: 'Completed ✔' };
const Status = ({ o }) => <span className={'tag ' + (S.isLate(o) ? 'red' : o.status)}>{S.isLate(o) ? 'LATE' : o.status.replace('_', ' ')}</span>;
const Stepper = ({ s }) => <div className="steps">{STEPS.map((x, i) => <span key={x} className={i <= STEPS.indexOf(s) ? 'on' : ''}>{x.replace('_', ' ')}</span>)}</div>;

/* ---------------- Login / Signup ---------------- */
export function Login() {
  S.useDB();
  const nav = useNavigate();
  const [mode, setMode] = useState('login'), [f, setF] = useState({ name: '', email: '', password: '', segment: 'standard' }), [err, setErr] = useState('');
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = e => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setErr('Enter a valid email');
    if (f.password.length < 4) return setErr('Password must be at least 4 characters');
    const r = mode === 'login' ? S.login(f.email, f.password) : S.signup(f);
    if (r.error) return setErr(r.error);
    nav(r.user.role === 'admin' ? '/admin' : '/');
  };
  return (
    <div className="center">
      <form className="card auth" onSubmit={submit}>
        <h2>🔑 RentEase</h2>
        <p className="muted">{mode === 'login' ? 'Sign in to your account' : 'Create a customer account'}</p>
        {mode === 'signup' && <>
          <input placeholder="Full name" value={f.name} onChange={set('name')} />
          <select value={f.segment} onChange={set('segment')}><option value="standard">Standard</option><option value="vip">VIP</option><option value="corporate">Corporate</option></select>
        </>}
        <input placeholder="Email" value={f.email} onChange={set('email')} />
        <input type="password" placeholder="Password" value={f.password} onChange={set('password')} />
        {err && <div className="err">{err}</div>}
        <button>{mode === 'login' ? 'Login' : 'Sign up'}</button>
        <div className="row between">
          <a href="#/login" onClick={e => { e.preventDefault(); setMode(mode === 'login' ? 'signup' : 'login'); setErr(''); }}>{mode === 'login' ? 'Create account' : 'Have an account? Login'}</a>
          <a href="#/login" onClick={e => { e.preventDefault(); alert('Password reset link sent (demo).'); }}>Forgot password?</a>
        </div>
        <p className="muted small">Demo: admin@demo.com / admin · user@demo.com / user</p>
      </form>
    </div>
  );
}

/* ---------------- Catalog (Amazon-style home) ---------------- */
const PCard = ({ p }) => (
  <Link to={`/product/${p.id}`} className="pc">
    <div className="pimg">{p.img}</div>
    <div className="pt">{p.name}</div><div className="pd">{p.desc}</div>
    <div className="price"><sup>₹</sup><b>{p.rates.day.toLocaleString('en-IN')}</b><span>/day</span></div>
    <div className="pm">₹{p.rates.hour}/hr · ₹{p.rates.week.toLocaleString('en-IN')}/wk</div>
    <div className="stock">{p.stock} units in stock</div>
    <span className="btn-y">Rent now</span>
  </Link>
);

export function Catalog() {
  const db = S.useDB(), [sp] = useSearchParams();
  const q = sp.get('q') || '', cat = sp.get('cat') || 'All';
  const all = db.products.filter(p => p.rentable);
  const cats = [...new Set(all.map(p => p.category))];
  const list = all.filter(p => (cat === 'All' || p.category === cat) && p.name.toLowerCase().includes(q.toLowerCase()));
  if (q || cat !== 'All') return (
    <div className="sec"><h3>{list.length} result(s){q && <> for “{q}”</>}{cat !== 'All' && <> in {cat}</>}</h3>
      <div className="pgrid">{list.map(p => <PCard key={p.id} p={p} />)}</div>
      {!list.length && <p className="muted">Nothing matched. <Link to="/">Back to home</Link></p>}</div>
  );
  const first = c => all.find(p => p.category === c);
  const minDay = c => Math.min(...all.filter(p => p.category === c).map(p => p.rates.day));
  const save = Math.round(Math.max(0, ...all.map(p => 100 - (100 * p.rates.week) / (7 * p.rates.day))));
  const vip = db.pricelists.find(l => l.segment === 'vip');
  const offer = vip ? `${vip.discountPct}% off for VIP members*` : 'Free pickup & return scheduling';
  const promos = [
    { cls: 'orange', h: `From ₹${Math.min(...all.map(p => p.rates.hour))}/hr`, s: 'Rent by the hour — pay only for what you use', em: '🚵', to: '/?cat=All&q=' },
    ...cats.slice(0, 2).map((c, i) => ({ cls: 'red', h: `From ₹${minDay(c)}/day`, s: c, em: first(c).img, to: `/?cat=${encodeURIComponent(c)}`, i })),
    { cls: 'green', h: `Save up to ${save}%`, s: 'Weekly rental rates on every product', em: '🗓️', to: '/?cat=All&q=' },
  ];
  return <>
    <div className="promos">{promos.map((p, i) => (
      <Link key={i} to={p.to} className={`promo ${p.cls}`}>
        <h2>{p.h}</h2><p>{p.s}</p><div className="art">{p.em}</div>
        <span className="shop">Shop Now</span>
        <div className="fest">Great Rental Festival | Reloaded</div>
        <div className="offer">{offer}</div>
      </Link>))}
    </div>
    <div className="cats">{cats.map(c => (
      <Link key={c} to={`/?cat=${encodeURIComponent(c)}`} className="cat">
        <h4>Rent {c}</h4><div className="pimg">{first(c).img}</div><span>See all →</span>
      </Link>))}
    </div>
    <div className="sec"><h3>Popular rentals</h3><div className="strip">{all.map(p => <PCard key={p.id} p={p} />)}</div></div>
    <div className="sec"><h3>Budget picks — under ₹500/day</h3>
      <div className="strip">{all.filter(p => p.rates.day < 500).map(p => <PCard key={p.id} p={p} />)}
        {!all.some(p => p.rates.day < 500) && <span className="muted">No products in this range yet.</span>}</div></div>
  </>;
}

/* ---------------- Product: pricing, availability, quotation ---------------- */
export function Product() {
  const db = S.useDB(), { id } = useParams(), nav = useNavigate(), u = S.me();
  const p = db.products.find(p => p.id === +id);
  const t0 = new Date(Date.now() + 864e5); t0.setMinutes(0, 0, 0);
  const [start, setStart] = useState(S.toLocalInput(t0)), [end, setEnd] = useState(S.toLocalInput(new Date(+t0 + 864e5))), [qty, setQty] = useState(1), [view, setView] = useState('calendar');
  if (!p) return <p>Product not found.</p>;
  const valid = new Date(end) > new Date(start);
  const pr = valid ? S.calcPrice(p, start, end, qty, u) : null, left = valid ? S.available(p.id, start, end) : 0;
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); const e = new Date(+d + 864e5); return { d, left: S.available(p.id, d, e) }; });
  const booked = db.orders.filter(o => o.productId === p.id && ['confirmed', 'picked_up'].includes(o.status));
  const book = () => { S.createQuote({ productId: p.id, qty, start, end }); nav('/orders'); };
  return (
    <div className="two">
      <div className="card">
        <Img p={p} className="pimg big" key={p.image} /><h2>{p.name}</h2>{p.brand && <p className="brand">Brand: <b>{p.brand}</b>{p.model && ` · Model: ${p.model}`}</p>}<p className="muted">{p.desc}</p>
        <table><tbody>
          <tr><td>Per hour</td><td>{money(p.rates.hour)}</td></tr><tr><td>Per day</td><td>{money(p.rates.day)}</td></tr>
          <tr><td>Per week</td><td>{money(p.rates.week)}</td></tr><tr><td>Security deposit</td><td>{money(p.deposit)}/unit</td></tr>
          <tr><td>Total stock</td><td>{p.stock}</td></tr></tbody></table>
        <div className="row between"><h3>Availability</h3>
          <button className="ghost" onClick={() => setView(view === 'calendar' ? 'list' : 'calendar')}>{view === 'calendar' ? 'List view' : 'Calendar view'}</button></div>
        {view === 'calendar'
          ? <div className="cal">{days.map(({ d, left }) => <div key={+d} className={'day ' + (left <= 0 ? 'none' : left < p.stock ? 'part' : 'free')}><small>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</small><b>{d.getDate()}</b><small>{left} left</small></div>)}</div>
          : booked.length ? <ul>{booked.map(o => <li key={o.id}>{o.qty} unit(s): {fmt(o.start)} → {fmt(o.end)}</li>)}</ul> : <p className="muted">No reservations — fully available.</p>}
      </div>
      <div className="card">
        <h3>Step 1 · Request a quotation</h3>
        <label>Pickup<input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} /></label>
        <label>Return<input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} /></label>
        <label>Quantity<input type="number" min="1" value={qty} onChange={e => setQty(Math.max(1, +e.target.value))} /></label>
        {!valid ? <div className="err">Return must be after pickup</div> : <>
          <table><tbody>
            <tr><td>Duration</td><td>{pr.hours} hours</td></tr><tr><td>Base price</td><td>{money(pr.base)}</td></tr>
            {pr.pl && <tr><td>{pr.pl.name} (−{pr.pl.discountPct}%)</td><td>−{money(pr.discount)}</td></tr>}
            <tr><td><b>Total</b></td><td><b>{money(pr.total)}</b></td></tr></tbody></table>
          <p className={left >= qty ? 'ok' : 'err'}>{left >= qty ? `✔ ${left} unit(s) available` : `✖ Only ${Math.max(0, left)} available for these dates`}</p>
        </>}
        <button disabled={!valid || left < qty} onClick={book}>Create quotation</button>
      </div>
    </div>
  );
}

/* ---------------- Contract / documents ---------------- */
function printDoc(title, o, p, u, extra = '') {
  const w = window.open('', '_blank');
  w.document.write(`<body style="font-family:sans-serif;padding:32px"><h2>${title} #${o.id}</h2><p>Customer: ${u?.name} (${u?.email})</p><p>Item: ${p.name} × ${o.qty}</p><p>Period: ${fmt(o.start)} → ${fmt(o.end)}</p><p>Total: ${money(o.total)} · Paid: ${money(o.paid)} · Late fee: ${money(o.lateFee)}</p>${extra}<script>window.print()<\/script></body>`);
  w.document.close();
}

/* ---------------- Customer orders ---------------- */
export function MyOrders() {
  const db = S.useDB(), u = S.me(), [msg, setMsg] = useState('');
  const mine = db.orders.filter(o => o.userId === u.id).sort((a, b) => b.id - a.id);
  if (!mine.length) return <p className="muted">No orders yet. <Link to="/">Browse products</Link></p>;
  return <>{msg && <div className="banner red">{msg}</div>}{mine.map(o => {
    const p = db.products.find(p => p.id === o.productId), due = o.total - o.paid;
    return (
      <div className="card" key={o.id}>
        <div className="row between"><b>{p.img} {p.name} × {o.qty} <span className="muted">#{o.id}</span></b><Status o={o} /></div>
        <Stepper s={o.status} /><p className="muted">{HINT[o.status]}</p>
        <p>{fmt(o.start)} → {fmt(o.end)}</p>
        <p>Total <b>{money(o.total)}</b> · Paid {money(o.paid)}{o.lateFee > 0 && <> · Late fee <b className="err">{money(o.lateFee)}</b></>}{S.isLate(o) && <> · Late fee so far <b className="err">{money(S.lateFeeFor(o))}</b></>}</p>
        <div className="row">
          {o.status === 'quotation' && <button onClick={() => setMsg(S.confirmOrder(o.id).error || '')}>Confirm order (reserve)</button>}
          {o.status !== 'quotation' && due > 0 && <>
            <button onClick={() => S.pay(o.id, 'full')}>Pay in full ({money(o.total)})</button>
            <button className="ghost" onClick={() => S.pay(o.id, 'deposit')}>Pay deposit ({money(Math.min(o.total, p.deposit * o.qty))})</button></>}
          {o.status !== 'quotation' && <button className="ghost" onClick={() => printDoc('Rental Contract', o, p, u, '<p>Late returns are charged per hour per unit as per the rental policy.</p>')}>Contract</button>}
        </div>
      </div>);
  })}</>;
}

/* ---------------- AI assistant ---------------- */
export function Assistant() {
  S.useDB();
  const u = S.me();
  const [log, setLog] = useState([{ role: 'bot', text: 'Hi! Tell me what you need, e.g. "I need 2 speakers for 3 days under 2500", or ask about deposits, late fees and returns.' }]);
  const [t, setT] = useState('');
  const send = e => { e.preventDefault(); if (!t.trim()) return; const r = S.askAI(t, u); setLog([...log, { role: 'me', text: t }, { role: 'bot', ...r }]); setT(''); };
  return (
    <div className="card chat">
      <div className="msgs">{log.map((m, i) => <div key={i} className={'msg ' + m.role}>{m.text}
        {m.items?.map(i => <Link key={i.p.id} to={`/product/${i.p.id}`} className="rec">{i.p.img} {i.p.name} — {money(i.total)} {i.deal && <small>({i.deal})</small>} · {i.left} avail.</Link>)}</div>)}</div>
      <form className="row" onSubmit={send}><input value={t} onChange={e => setT(e.target.value)} placeholder="Ask the rental assistant…" /><button>Send</button></form>
    </div>
  );
}

/* ---------------- Admin ---------------- */
export function Admin() {
  const [tab, setTab] = useState('orders');
  return <>
    <div className="row tabs">{['orders', 'products', 'pricelists', 'reports', 'settings'].map(x => <button key={x} className={tab === x ? '' : 'ghost'} onClick={() => setTab(x)}>{x}</button>)}</div>
    {tab === 'orders' && <AdminOrders />}{tab === 'products' && <AdminProducts />}{tab === 'pricelists' && <AdminPricelists />}{tab === 'reports' && <AdminReports />}{tab === 'settings' && <AdminSettings />}
  </>;
}

function AdminOrders() {
  const db = S.useDB();
  return <div className="card"><table><thead><tr><th>#</th><th>Customer</th><th>Item</th><th>Period</th><th>Total / Paid</th><th>Status</th><th>Actions</th></tr></thead><tbody>
    {[...db.orders].reverse().map(o => {
      const p = db.products.find(p => p.id === o.productId), cu = db.users.find(u => u.id === o.userId);
      return <tr key={o.id}><td>{o.id}</td><td>{cu?.name}</td><td>{p.name} ×{o.qty}</td><td>{fmt(o.start)}<br />{fmt(o.end)}</td>
        <td>{money(o.total)}<br />{money(o.paid)}{o.lateFee > 0 && <><br /><span className="err">+{money(o.lateFee)} late</span></>}</td><td><Status o={o} /></td>
        <td className="row">
          {o.status === 'quotation' && <button onClick={() => alert(S.confirmOrder(o.id).error || 'Reserved')}>Confirm</button>}
          {o.status === 'confirmed' && <><button onClick={() => { S.pickup(o.id); printDoc('Pickup Document', o, p, cu); }}>Pickup</button></>}
          {o.status === 'picked_up' && <button onClick={() => { S.returnOrder(o.id); }}>Mark returned{S.isLate(o) ? ` (+${money(S.lateFeeFor(o))})` : ''}</button>}
        </td></tr>;
    })}</tbody></table>{!db.orders.length && <p className="muted">No orders yet.</p>}</div>;
}

function AdminProducts() {
  const db = S.useDB(), [n, setN] = useState({ name: '', category: '', brand: '', model: '', image: '', img: '📦', stock: 1, deposit: 0, desc: '', rates: { hour: 0, day: 0, week: 0 } });
  const num = (id, k) => e => S.updateProduct(id, { [k]: +e.target.value });
  const rate = (p, k) => e => S.updateProduct(p.id, { rates: { ...p.rates, [k]: +e.target.value } });
  return <>
    <div className="card"><table><thead><tr><th>Product</th><th>Stock</th><th>₹/hr</th><th>₹/day</th><th>₹/week</th><th>Deposit</th><th>Rentable</th><th>Brand · Model · Image URL</th></tr></thead><tbody>
      {db.products.map(p => <tr key={p.id}><td>{p.img} {p.name}</td>
        <td><input className="s" type="number" value={p.stock} onChange={num(p.id, 'stock')} /></td>
        {['hour', 'day', 'week'].map(k => <td key={k}><input className="s" type="number" value={p.rates[k]} onChange={rate(p, k)} /></td>)}
        <td><input className="s" type="number" value={p.deposit} onChange={num(p.id, 'deposit')} /></td>
        <td><input type="checkbox" checked={p.rentable} onChange={e => S.updateProduct(p.id, { rentable: e.target.checked })} /></td>
        <td className="row">{[['brand', 'Brand'], ['model', 'Model'], ['image', 'Image URL']].map(([k, l]) => <input key={k} placeholder={l} value={p[k] || ''} onChange={e => S.updateProduct(p.id, { [k]: e.target.value })} />)}</td></tr>)}</tbody></table></div>
    <div className="card"><h3>Add product</h3><div className="row">
      <input placeholder="Name" value={n.name} onChange={e => setN({ ...n, name: e.target.value })} />
      <input placeholder="Category" value={n.category} onChange={e => setN({ ...n, category: e.target.value })} />
      {['brand', 'model', 'image'].map(k => <input key={k} placeholder={k === 'image' ? 'Image URL' : k[0].toUpperCase() + k.slice(1)} onChange={e => setN({ ...n, [k]: e.target.value })} />)}
      <input className="s" placeholder="Icon" value={n.img} onChange={e => setN({ ...n, img: e.target.value })} />
      {['hour', 'day', 'week'].map(k => <input key={k} className="s" type="number" placeholder={'₹/' + k} onChange={e => setN({ ...n, rates: { ...n.rates, [k]: +e.target.value } })} />)}
      <input className="s" type="number" placeholder="Stock" onChange={e => setN({ ...n, stock: +e.target.value })} />
      <input className="s" type="number" placeholder="Deposit" onChange={e => setN({ ...n, deposit: +e.target.value })} />
      <button onClick={() => n.name && S.addProduct(n)}>Add</button></div></div></>;
}

function AdminPricelists() {
  const db = S.useDB(), [f, setF] = useState({ name: '', segment: 'all', discountPct: 10, from: '', to: '' });
  return <>
    <div className="card"><table><thead><tr><th>Name</th><th>Segment</th><th>Discount</th><th>Validity</th><th /></tr></thead><tbody>
      {db.pricelists.map(l => <tr key={l.id}><td>{l.name}</td><td>{l.segment}</td><td>{l.discountPct}%</td><td>{l.from || '∞'} → {l.to || '∞'}</td><td><button className="ghost" onClick={() => S.delPricelist(l.id)}>Delete</button></td></tr>)}</tbody></table></div>
    <div className="card"><h3>New pricelist</h3><div className="row">
      <input placeholder="Name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} />
      <select value={f.segment} onChange={e => setF({ ...f, segment: e.target.value })}><option value="all">All</option><option value="standard">Standard</option><option value="vip">VIP</option><option value="corporate">Corporate</option></select>
      <input className="s" type="number" value={f.discountPct} onChange={e => setF({ ...f, discountPct: +e.target.value })} />
      <input type="date" value={f.from} onChange={e => setF({ ...f, from: e.target.value })} /><input type="date" value={f.to} onChange={e => setF({ ...f, to: e.target.value })} />
      <button onClick={() => f.name && S.addPricelist(f)}>Add</button></div></div></>;
}

function AdminReports() {
  S.useDB();
  const [from, setFrom] = useState(''), [to, setTo] = useState('');
  const r = S.report(from, to), max = r.byProd[0]?.[1] || 1;
  const csv = () => {
    const lines = ['order,customer,product,qty,start,end,total,lateFee,status', ...r.rows.map(o => [o.id, o.userId, o.productId, o.qty, o.start, o.end, o.total, o.lateFee, o.status].join(','))];
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); a.download = 'rental-report.csv'; a.click();
  };
  return <div className="card">
    <div className="row"><label>From <input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label>To <input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
      <button onClick={csv}>Export CSV</button><button className="ghost" onClick={() => window.print()}>Export PDF</button></div>
    <div className="stats"><div><small>Total revenue</small><b>{money(r.revenue)}</b></div><div><small>Orders</small><b>{r.rows.length}</b></div><div><small>Top customer</small><b>{r.top ? `${r.top[0]} (${money(r.top[1])})` : '—'}</b></div></div>
    <h3>Most rented products</h3>
    {r.byProd.map(([n, c]) => <div key={n} className="bar"><span>{n}</span><i style={{ width: (c / max) * 100 + '%' }} /><b>{c}</b></div>)}
    {!r.byProd.length && <p className="muted">No data for this period.</p>}
  </div>;
}

function AdminSettings() {
  const db = S.useDB();
  return <div className="card"><h3>Notifications & late fees</h3>
    <label>Reminder lead time N (days before return)<input type="number" min="0" value={db.settings.notifyDays} onChange={e => S.setSettings({ notifyDays: +e.target.value })} /></label>
    <label>Late fee (₹ per hour per unit)<input type="number" min="0" value={db.settings.lateFeePerHour} onChange={e => S.setSettings({ lateFeePerHour: +e.target.value })} /></label></div>;
}
