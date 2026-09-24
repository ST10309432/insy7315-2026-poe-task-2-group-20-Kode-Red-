import { NavLink, Outlet, Link } from 'react-router-dom';
import { Home, UtensilsCrossed, ShoppingCart, Wallet, User, LogIn } from 'lucide-react';
import Brand from './Brand';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function StudentLayout() {
  const { count } = useCart();
  const { user, isStudent } = useAuth();
  const nav = [
    { to: '/app', label: 'Home', icon: Home, end: true },
    { to: '/app/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/app/wallet', label: 'Wallet', icon: Wallet, hide: user && !isStudent },
    { to: user ? '/app/account' : '/login', label: user ? 'You' : 'Log in', icon: user ? User : LogIn },
  ].filter(n => !n.hide);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="topbar">
        <div className="container topbar-inner">
          <Brand to="/app" />
          <nav className="desktop-nav" aria-label="Main">
            {nav.map(n => <NavLink key={n.to} to={n.to} end={n.end}>{n.label}</NavLink>)}
          </nav>
          <span className="spacer" />
          <Link to="/app/cart" className="icon-btn" style={{ position: 'relative' }} aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}>
            <ShoppingCart size={20} aria-hidden="true" />
            {count > 0 && <span className="count-dot">{count}</span>}
          </Link>
        </div>
      </header>
      <main id="main" className="container page">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Main">
        {nav.slice(0, 2).map(n => <BottomLink key={n.to} {...n} />)}
        <NavLink to="/app/cart" className="nav-cart" aria-label={`Cart, ${count} items`}>
          <span className="fab" style={{ position: 'relative' }}>
            <ShoppingCart size={22} aria-hidden="true" />
            {count > 0 && <span className="count-dot">{count}</span>}
          </span>
          Cart
        </NavLink>
        {nav.slice(2).map(n => <BottomLink key={n.to} {...n} />)}
      </nav>
    </>
  );
}

function BottomLink({ to, label, icon: Icon, end }) {
  return (
    <NavLink to={to} end={end}>
      <Icon size={22} aria-hidden="true" />
      {label}
    </NavLink>
  );
}
