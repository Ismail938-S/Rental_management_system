import React from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import * as S from './store';
import { Login, Catalog, Product, MyOrders, Assistant, Admin } from './pages.jsx';

function Layout({ children }) {
  const db = S.useDB(), u = S.me(), nav = useNavigate();
  const mine = db.orders.filter(o => u.role === 'admin' || o.userId === u.id);
  const late = mine.filter(S.isLate), soon = mine.filter(S.dueSoon);
  return (
    <>
      <header className="nav">
        <b className="brand">🔑 RentEase</b>
        <NavLink to="/">Shop</NavLink>
        <NavLink to="/orders">My Orders</NavLink>
        <NavLink to="/assistant">AI Assistant</NavLink>
        {u.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        <span className="grow" />
        <span className="muted">{u.name}</span>
        <button className="ghost" onClick={() => { S.logout(); nav('/login'); }}>Logout</button>
      </header>
      {late.length > 0 && <div className="banner red">⚠ {late.length} rental(s) are overdue — late fees apply.</div>}
      {soon.length > 0 && <div className="banner amber">⏰ {soon.length} rental(s) due back within {db.settings.notifyDays} day(s).</div>}
      <main className="wrap">{children}</main>
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
      <Route path="/" element={<Guard><Catalog /></Guard>} />
      <Route path="/product/:id" element={<Guard><Product /></Guard>} />
      <Route path="/orders" element={<Guard><MyOrders /></Guard>} />
      <Route path="/assistant" element={<Guard><Assistant /></Guard>} />
      <Route path="/admin" element={<Guard admin><Admin /></Guard>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
