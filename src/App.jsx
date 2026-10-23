import React, { useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import * as S from './store';
import { Login, Product, MyOrders, Assistant, Admin } from './pages.jsx';
import Home from './Home.jsx';

function Layout({ children }) {
  const db = S.useDB(), u = S.me(), nav = useNavigate();
  const [q, setQ] = useState(''), [cat, setCat] = useState('');
  const cats = [...new Set(db.products.filter(p => p.rentable).map(p => p.category))];
  const mine = db.orders.filter(o => u.role === 'admin' || o.userId === u.id);
  const late = mine.filter(S.isLate), soon = mine.filter(S.dueSoon);
  const quotes = db.orders.filter(o => o.userId === u.id && o.status === 'quotation').length;
  const search = e => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q) p.set('q', q);
    if (cat) p.set('cat', cat);
    nav('/?' + p.toString());
  };
  return (
    <>
      <header className="top">
        <Link to="/" className="logo">🔑 Rent<b>Ease</b></Link>
        <div className="loc"><small>Pickup location</small><b>📍 Update location</b></div>
        <form className="search" onSubmit={search}>
          <select value={cat} onChange={e => setCat(e.target.value)}><option value="">All</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
          <input placeholder="Search RentEase" value={q} onChange={e => setQ(e.target.value)} />
          <button>🔍</button>
        </form>
        <div className="acct"><small>Hello, {u.name}</small><b>Account &amp; Lists ▾</b>
          <div className="menu">
            <Link to="/orders">Your orders</Link>
            {u.role === 'admin' && <Link to="/admin">Admin dashboard</Link>}
            <a href="#/login" onClick={e => { e.preventDefault(); S.logout(); nav('/login'); }}>Sign out</a>
          </div>
        </div>
        <Link to="/orders"><small>Returns</small><b>&amp; Orders</b></Link>
        <Link to="/orders" className="cart">🛒<span className="count">{quotes}</span> <b>Quotes</b></Link>
      </header>
      <nav className="sub">
        <Link to="/">☰ All</Link><Link to="/">Today’s Deals</Link>
        {cats.map(c => <Link key={c} to={`/?cat=${c}`}>{c}</Link>)}
        <Link to="/assistant">🤖 AI Assistant</Link>
        {u.role === 'admin' && <Link to="/admin">Admin</Link>}
        <span className="fest">Great Rental Festival | Live Now</span>
      </nav>
      {late.length > 0 && <div className="banner red">⚠ {late.length} rental(s) are overdue — late fees apply.</div>}
      {soon.length > 0 && <div className="banner amber">⏰ {soon.length} rental(s) due back within {db.settings.notifyDays} day(s).</div>}
      <main className="wrap">{children}</main>
      <footer className="foot">
        <a href="#/" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Back to top</a>
        <p>© RentEase · Rental Management</p>
      </footer>
    </>
  );
}

const Guard = ({ children, admin }) => {
  S.useDB();
  const u = S.me();
  if (!u) return <Navigate to="/login" />;
  if (admin && u.role !== 'admin') return <Navigate to="/" />;
  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Guard><Home /></Guard>} />
      <Route path="/product/:id" element={<Guard><Product /></Guard>} />
      <Route path="/orders" element={<Guard><MyOrders /></Guard>} />
      <Route path="/assistant" element={<Guard><Assistant /></Guard>} />
      <Route path="/admin" element={<Guard admin><Admin /></Guard>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
