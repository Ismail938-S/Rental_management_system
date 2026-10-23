import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as S from './store';
import Img from './Img.jsx';

const money = n => '₹' + Math.round(n).toLocaleString('en-IN');
const PROMOS = [
  { cls: 'p-orange', title: 'From ₹30/hr', sub: 'Camping & outdoor gear', cat: 'Outdoor', em: '⛺' },
  { cls: 'p-red', title: 'Under ₹800/day', sub: 'DSLR cameras for every shoot', cat: 'Camera', em: '📷' },
  { cls: 'p-plum', title: 'Party-ready sound', sub: 'PA speakers from ₹100/hr', cat: 'Audio', em: '🔊' },
  { cls: 'p-green', title: 'Weekly deals', sub: 'Projectors from ₹5,500/wk', cat: 'Electronics', em: '📽️' },
];

function Card({ p }) {
  return (
    <Link to={`/product/${p.id}`} className="pcard">
      <Img p={p} key={p.image} />
      <b className="pname">{p.name}</b>
      {p.brand && <span className="brand">{p.brand}{p.model && ` · ${p.model}`}</span>}
      <span className="muted small">{p.desc}</span>
      <div className="price"><small>₹</small>{p.rates.day.toLocaleString('en-IN')}<small>/day</small></div>
      <span className="small">{money(p.rates.hour)}/hr · {money(p.rates.week)}/wk</span>
      <span className="instock">{p.stock} in stock · Deposit {money(p.deposit)}</span>
      <span className="buy">Rent now</span>
    </Link>
  );
}

export default function Home() {
  const db = S.useDB(), [sp] = useSearchParams();
  const q = sp.get('q') || '', cat = sp.get('cat') || '';
  const rentable = db.products.filter(p => p.rentable);
  const list = rentable.filter(p => (!cat || p.category === cat) && (p.name + ' ' + p.desc + ' ' + p.category).toLowerCase().includes(q.toLowerCase()));
  const cats = [...new Set(rentable.map(p => p.category))];

  if (q || cat) return (
    <section className="shelf">
      <h2>{list.length} result(s){q && ` for “${q}”`}{cat && ` in ${cat}`}</h2>
      {list.length
        ? <div className="grid4">{list.map(p => <Card key={p.id} p={p} />)}</div>
        : <p className="muted">No products found. <Link to="/">Back to home</Link></p>}
    </section>
  );

  return <>
    <section className="hero">{PROMOS.map(x => (
      <Link key={x.cat} to={`/?cat=${x.cat}`} className={'promo ' + x.cls}>
        <div><h2>{x.title}</h2><p>{x.sub}</p></div>
        <div className="em">{x.em}</div>
        <span className="pill">Rent now</span>
      </Link>))}
    </section>
    <section className="shelf"><h2>Popular rentals</h2>
      <div className="scroll">{rentable.map(p => <Card key={p.id} p={p} />)}</div>
    </section>
    <section className="tiles">{cats.map(c => (
      <Link key={c} to={`/?cat=${c}`} className="tile">
        <h3>Shop {c}</h3><div className="em">{rentable.find(p => p.category === c).img}</div><span>See all</span>
      </Link>))}
    </section>
    <section className="perks">{[['🚚', 'Doorstep pickup & return'], ['🔒', 'Secure online payments'], ['💸', 'Hourly, daily & weekly rates'], ['🤖', 'AI rental assistant']].map(([i, t]) => (
      <div key={t}><div className="em">{i}</div>{t}</div>))}
    </section>
  </>;
}
