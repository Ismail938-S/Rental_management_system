import React, { useState } from 'react';
// Shows the product photo (public/images/... or any URL); falls back to the emoji icon if it can't load.
export default function Img({ p, className = 'pimg' }) {
  const [bad, setBad] = useState(false);
  return (
    <div className={className}>
      {p.image && !bad ? <img src={p.image} alt={p.name} loading="lazy" onError={() => setBad(true)} /> : <span className="fallback">{p.img}</span>}
    </div>
  );
}
