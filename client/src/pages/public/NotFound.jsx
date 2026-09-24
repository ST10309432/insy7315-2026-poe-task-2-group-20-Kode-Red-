import { Link } from 'react-router-dom';
import { EmptyState } from '../../components/States';
import { MapPinOff } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="auth-wrap">
      <EmptyState icon={MapPinOff} title="Page not found" action={<Link to="/" className="btn btn-primary">Back to home</Link>}>
        The page you are looking for has moved or does not exist.
      </EmptyState>
    </main>
  );
}
