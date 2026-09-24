import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function PageHeader({ title, back, action, children }) {
  const navigate = useNavigate();
  return (
    <div className="row-between" style={{ marginBottom: 16 }}>
      <div className="row">
        {back && (
          <button className="icon-btn" onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))} aria-label="Go back">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        )}
        <div>
          <h1 className="mt-0" style={{ marginBottom: 0 }}>{title}</h1>
          {children}
        </div>
      </div>
      {action}
    </div>
  );
}
