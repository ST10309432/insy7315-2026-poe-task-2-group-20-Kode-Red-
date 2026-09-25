import { Link } from 'react-router-dom';
import { Star, Clock, Wallet, GraduationCap, Zap, MapPin, Phone, MessageCircle, ArrowRight, Sandwich, ShieldCheck } from 'lucide-react';
import Brand from '../../components/Brand';
import ItemIcon from '../../components/ItemIcon';
import TruckMap from '../../components/TruckMap';
import { Stars } from '../../components/Stars';
import { useApi } from '../../hooks/useApi';
import { rand } from '../../utils/format';

export default function Landing() {
  const { data: menu } = useApi('/menu');
  const { data: truck } = useApi('/truck');
  const { data: reviewData } = useApi('/reviews?limit=6');
  const rating = reviewData?.summary;
  const highlights = (menu || []).filter(m => m.available).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 4);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="topbar">
        <div className="container topbar-inner">
          <Brand />
          <nav className="desktop-nav" aria-label="Sections">
            <a href="#menu">Menu</a><a href="#credit">Student Credit</a><a href="#find">Find the truck</a>
          </nav>
          <span className="spacer" />
          <Link to="/login" className="btn btn-sm">Log in</Link>
          <Link to="/app" className="btn btn-sm btn-primary">Order now</Link>
        </div>
      </header>

      <main id="main">
        <section className="hero">
          <div className="container hero-grid">
            <div className="stack">
              {truck && (
                <span className="status-pill">
                  <span className={`led ${truck.isOpen ? 'led-on' : 'led-off'}`} aria-hidden="true" />
                  {truck.isOpen ? 'Open now' : 'Closed'} · {truck.locationName}
                </span>
              )}
              <h1>Kasi kotas, <em>served fast.</em></h1>
              <p style={{ fontSize: '1.1rem', maxWidth: 520 }}>
                Order ahead from Thabang Phala's food truck at Varsity College, skip the lunch queue, and pay with your
                wallet, card, or Student Credit before allowance day.
              </p>
              <div className="row wrap">
                <Link to="/app/menu" className="btn btn-primary">See the menu <ArrowRight size={18} aria-hidden="true" /></Link>
                <Link to="/register" className="btn btn-yellow">Register with student number</Link>
              </div>
              <div className="hero-stats" aria-label="Quick facts">
                {rating?.count > 0 && <div><strong>{rating.average} <Star size={16} style={{ display: 'inline' }} aria-hidden="true" /></strong><span className="small muted">from {rating.count} review{rating.count === 1 ? '' : 's'}</span></div>}
                <div><strong>~12 min</strong><span className="small muted">average prep</span></div>
                <div><strong>From R35</strong><span className="small muted">quarter kota</span></div>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <Sandwich size={160} strokeWidth={1.6} />
              <span className="badge badge-orange" style={{ position: 'absolute', top: 20, right: 20, transform: 'rotate(8deg)', fontSize: '.9rem', padding: '6px 14px' }}>Eat now, pay month-end</span>
            </div>
          </div>
        </section>

        <div className="marquee" aria-hidden="true">
          <div>{' Kotas ★ Slap chips ★ Ice cold drinks ★ Order ahead ★ Skip the queue ★ Student Credit ★ '.repeat(4)}</div>
        </div>

        <section id="menu" className="section">
          <div className="container">
            <div className="section-title"><h2>Menu highlights</h2><p className="muted">Student favourites, made fresh at the truck.</p></div>
            <div className="grid grid-3">
              {highlights.map(item => (
                <Link key={item.id} to={`/app/item/${item.id}`} className="card card-link feature-card">
                  <div className={`top tone-${item.category}`}><ItemIcon category={item.category} size={64} /></div>
                  <div className="bottom">
                    <h3 style={{ marginBottom: 2 }}>{item.name}</h3>
                    <p className="small muted" style={{ marginBottom: 6 }}>{item.description}</p>
                    <span className="price">{rand(item.salePrice ?? item.price)}</span>
                    {item.salePrice && <span className="price-old">{rand(item.price)}</span>}
                  </div>
                </Link>
              ))}
              {!menu && Array.from({ length: 4 }, (_, i) => <div key={i} className="skeleton" style={{ height: 220 }} />)}
            </div>
            <p className="center" style={{ marginTop: 24 }}><Link to="/app/menu" className="btn">Full menu <ArrowRight size={18} aria-hidden="true" /></Link></p>
          </div>
        </section>

        <section id="credit" className="section" style={{ background: 'var(--navy)', color: '#fff', borderBlock: '2px solid var(--ink)' }}>
          <div className="container hero-grid">
            <div className="stack">
              <span className="badge badge-orange">New</span>
              <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', textTransform: 'uppercase' }}>Low on cash before allowance day?</h2>
              <p style={{ color: '#D7DDEA' }}>Verified Varsity College students can buy now and settle by month-end using their student number.
                Your limit is set by Thabang, and you can see what you owe at any time in the app.</p>
              <Link to="/register" className="btn btn-yellow" style={{ justifySelf: 'start' }}>Activate Student Credit</Link>
            </div>
            <div className="grid" style={{ gap: 12 }}>
              {[[GraduationCap, 'Register with your student number', 'Thabang verifies you once.'],
                [Wallet, 'Pay with Student Credit at checkout', 'We check your limit instantly.'],
                [ShieldCheck, 'Repay any time before month-end', 'From your wallet or by card.']].map(([Icon, t, s]) => (
                <div key={t} className="card row" style={{ color: 'var(--ink)' }}>
                  <span className="stat"><span className="ico" style={{ background: 'var(--yellow)' }}><Icon size={22} aria-hidden="true" /></span></span>
                  <div><strong>{t}</strong><div className="small muted">{s}</div></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-title"><h2>Why students order ahead</h2></div>
            <div className="grid grid-3">
              {[[Zap, 'Skip the queue', 'Pick a collection time between lectures and walk straight up.'],
                [Clock, 'Ready when you are', 'Live order tracking tells you the moment your food is ready.'],
                [Wallet, 'No cash needed', 'Wallet, card or Student Credit — and earn loyalty points on every order.']].map(([Icon, t, s]) => (
                <div key={t} className="card"><Icon size={28} aria-hidden="true" /><h3 style={{ marginTop: 10 }}>{t}</h3><p className="muted mt-0">{s}</p></div>
              ))}
            </div>
          </div>
        </section>

        {reviewData?.reviews?.length > 0 && (
          <section className="section" aria-labelledby="reviews-title" style={{ paddingTop: 0 }}>
            <div className="container">
              <div className="section-title"><h2 id="reviews-title">What students say</h2>
                <p className="muted">Real reviews from orders collected at the truck.</p></div>
              <div className="grid grid-3">
                {reviewData.reviews.map((r, i) => (
                  <figure key={i} className="card review-card" style={{ margin: 0 }}>
                    <Stars value={r.rating} />
                    <blockquote>“{r.comment}”</blockquote>
                    <figcaption className="small muted">{r.name} · {r.items}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="find" className="section" style={{ paddingTop: 0 }}>
          <div className="container hero-grid">
            <TruckMap truck={truck} />
            <div className="stack">
              <h2 style={{ fontSize: '2rem' }}>Find the truck</h2>
              <p className="row"><MapPin size={20} aria-hidden="true" /> {truck?.locationName || 'Varsity College Campus'}</p>
              <p className="row"><Clock size={20} aria-hidden="true" /> {truck?.hours || 'Mon–Fri 08:00–17:00'}</p>
              {truck?.phone && <p className="row"><Phone size={20} aria-hidden="true" /> <a href={`tel:${truck.phone.replace(/\s/g, '')}`}>{truck.phone}</a></p>}
              {truck?.phone && (
                <a className="btn btn-dark" style={{ justifySelf: 'start' }} href={`https://wa.me/${truck.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
                  <MessageCircle size={18} aria-hidden="true" /> WhatsApp us
                </a>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container row-between wrap">
          <div><strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>Thabang Phala</strong>
            <p className="small mt-0" style={{ marginTop: 4 }}>Kotas, chips and cold drinks at Varsity College.</p></div>
          <p className="small">© {new Date().getFullYear()} Thabang Phala · <Link to="/login">Staff login</Link></p>
        </div>
      </footer>
    </>
  );
}
