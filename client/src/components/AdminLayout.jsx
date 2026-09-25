import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, UtensilsCrossed, GraduationCap, BarChart3, LogOut, Settings } from 'lucide-react';
import Brand from './Brand';
import NotificationBell from './NotificationBell';
import { useAuth } from '../context/AuthContext';

export default function AdminLayout() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const nav = [
    { to: '/admin', label: 'Home', icon: LayoutDashboard, end: true },
    { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
    { to: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
    { to: '/admin/credit', label: 'Credit', icon: GraduationCap, admin: true },
    { to: '/admin/reports', label: 'Reports', icon: BarChart3, admin: true },
  ].filter(n => !n.admin || isAdmin);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="topbar topbar-admin">
        <div className="container topbar-inner">
          <Brand to="/admin" sub={isAdmin ? 'Admin' : 'Vendor'} />
          <nav className="desktop-nav" aria-label="Admin">
            {nav.map(n => <NavLink key={n.to} to={n.to} end={n.end}>{n.label}</NavLink>)}
          </nav>
          <span className="spacer" />
          <NotificationBell />
          {isAdmin && <NavLink to="/admin/settings" className="icon-btn" aria-label="Settings" title="Settings"><Settings size={20} aria-hidden="true" /></NavLink>}
          <span className="badge badge-orange hide-sm" title={user?.email}>{user?.role}</span>
          <button className="icon-btn" onClick={() => { logout(); navigate('/login'); }} aria-label="Log out" title="Log out">
            <LogOut size={20} aria-hidden="true" />
          </button>
        </div>
      </header>
      <main id="main" className="container page">
        <Outlet />
      </main>
      <nav className="bottom-nav" aria-label="Admin">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}><Icon size={22} aria-hidden="true" />{label}</NavLink>
        ))}
      </nav>
    </>
  );
}
