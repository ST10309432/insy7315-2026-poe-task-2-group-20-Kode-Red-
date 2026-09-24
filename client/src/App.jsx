import { Routes, Route, Navigate } from 'react-router-dom';
import StudentLayout from './components/StudentLayout';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/public/Landing';
import Login from './pages/public/Login';
import NotFound from './pages/public/NotFound';
import Home from './pages/student/Home';
import Menu from './pages/student/Menu';
import ItemDetail from './pages/student/ItemDetail';
import Cart from './pages/student/Cart';
import Checkout from './pages/student/Checkout';
import OrderStatus from './pages/student/OrderStatus';
import Wallet from './pages/student/Wallet';
import Account from './pages/student/Account';
import Dashboard from './pages/admin/Dashboard';
import Orders from './pages/admin/Orders';
import ManageMenu from './pages/admin/ManageMenu';
import EditItem from './pages/admin/EditItem';
import Credit from './pages/admin/Credit';
import Reports from './pages/admin/Reports';

const STAFF = ['ADMIN', 'VENDOR'];
const auth = (el, roles) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <Routes>
      {/* Marketing website */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Login mode="register" />} />

      {/* Student app (menu is public; ordering needs an account) */}
      <Route path="/app" element={<StudentLayout />}>
        <Route index element={<Home />} />
        <Route path="menu" element={<Menu />} />
        <Route path="item/:id" element={<ItemDetail />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={auth(<Checkout />)} />
        <Route path="orders/:orderNumber" element={auth(<OrderStatus />)} />
        <Route path="wallet" element={auth(<Wallet />, ['STUDENT'])} />
        <Route path="account" element={auth(<Account />)} />
      </Route>

      {/* Admin portal (Thabang + staff) */}
      <Route path="/admin" element={auth(<AdminLayout />, STAFF)}>
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="menu" element={<ManageMenu />} />
        <Route path="menu/new" element={auth(<EditItem />, ['ADMIN'])} />
        <Route path="menu/:id" element={auth(<EditItem />, ['ADMIN'])} />
        <Route path="credit" element={auth(<Credit />, ['ADMIN'])} />
        <Route path="reports" element={auth(<Reports />, ['ADMIN'])} />
      </Route>

      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
