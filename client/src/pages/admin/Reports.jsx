import { useState } from 'react';
import { Download } from 'lucide-react';
import PageHeader from '../../components/PageHeader';
import { Loading, ErrorState } from '../../components/States';
import { useApi } from '../../hooks/useApi';
import { download } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import { Stars } from '../../components/Stars';
import { rand, randShort, METHOD_LABEL } from '../../utils/format';

export default function Reports() {
  const [days, setDays] = useState(7);
  const { data, error, loading, reload } = useApi(`/admin/reports?days=${days}`);
  const [showTable, setShowTable] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { data: reviewData } = useApi('/reviews?limit=5');
  const toast = useToast();

  async function exportCsv() {
    setExporting(true);
    try { await download(`/admin/reports/export.csv?days=${days}`, 'sales.csv'); toast.success('Sales report downloaded'); }
    catch (err) { toast.error(err.message); } finally { setExporting(false); }
  }

  return (
    <div className="stack">
      <PageHeader title="Reports" action={
        <button className="btn btn-sm" onClick={exportCsv} disabled={exporting}><Download size={16} aria-hidden="true" /> Export CSV</button>} />
      <div className="chips" role="group" aria-label="Period">
        {[7, 14, 30].map(d => <button key={d} className="chip" aria-pressed={days === d} onClick={() => setDays(d)}>Last {d} days</button>)}
      </div>
      {loading && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && (
        <>
          <div className="grid grid-stats">
            <Stat label="Sales" value={rand(data.totalSales)} />
            <Stat label="Orders" value={data.totalOrders} />
            <Stat label="Average order" value={rand(data.averageOrder)} />
            <Stat label="Outstanding credit" value={rand(data.creditOwed)} dark />
          </div>

          <section className="card" aria-labelledby="sales-chart">
            <div className="row-between">
              <h2 id="sales-chart">Daily sales (R)</h2>
              <button className="btn btn-sm" onClick={() => setShowTable(s => !s)} aria-expanded={showTable}>{showTable ? 'Show chart' : 'Show table'}</button>
            </div>
            {showTable ? <SalesTable rows={data.salesByDay} /> : <SalesChart rows={data.salesByDay} />}
          </section>

          <div className="grid grid-2">
            <section className="card" aria-labelledby="top-sellers">
              <h2 id="top-sellers">Top sellers</h2>
              {data.topSellers.map((t, i) => (
                <div key={t.name} className="tx">
                  <span><strong style={{ color: 'var(--orange-text)' }}>#{i + 1}</strong> <strong>{t.name}</strong><div className="xs muted">{t.sold} sold</div></span>
                  <strong>{rand(t.revenue)}</strong>
                </div>
              ))}
            </section>
            <section className="card" aria-labelledby="ratings">
              <h2 id="ratings">Customer ratings</h2>
              {data.ratings.count === 0
                ? <p className="muted small">No reviews yet. Students can rate an order after collecting it.</p>
                : <>
                    <p className="row" style={{ gap: 8 }}><span className="value" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem' }}>{data.ratings.average}</span>
                      <Stars value={data.ratings.average} size={18} /> <span className="small muted">({data.ratings.count} reviews)</span></p>
                    {reviewData?.reviews?.map((r, i) => (
                      <div key={i} className="tx small"><span><Stars value={r.rating} size={12} /> “{r.comment}”<div className="xs muted">{r.name}</div></span></div>
                    ))}
                  </>}
            </section>
            <section className="card" aria-labelledby="pay-mix">
              <h2 id="pay-mix">Payment methods</h2>
              {data.paymentMix.map(p => (
                <div key={p.method} className="tx">
                  <span><strong>{METHOD_LABEL[p.method]}</strong><div className="xs muted">{p.count} orders</div></span>
                  <strong>{rand(p.amount)}</strong>
                </div>
              ))}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, dark }) {
  return (
    <div className={`card ${dark ? 'card-dark' : ''}`}>
      <div className="xs muted">{label}</div>
      <div className="stat"><span className="value" style={dark ? { color: 'var(--yellow)' } : undefined}>{value}</span></div>
    </div>
  );
}

/** Single-series bar chart: one hue, today highlighted, hover/focus tooltips, table alternative. */
function SalesChart({ rows }) {
  const max = Math.max(1, ...rows.map(r => r.sales));
  const today = rows[rows.length - 1]?.date;
  const showLabel = rows.length <= 14;
  return (
    <figure style={{ margin: '12px 0 0' }}>
      <div className="bars" role="img" aria-label={`Bar chart of daily sales. Highest ${randShort(max)}.`}>
        {rows.map(r => (
          <div key={r.date} className="bar-col">
            <span className="bar-tip">{r.label} {r.date.slice(5)}: {rand(r.sales)} · {r.orders} orders</span>
            <div className={`bar ${r.date === today ? 'today' : ''}`} style={{ height: `${(r.sales / max) * 100}%` }} tabIndex={0}
              aria-label={`${r.date}: ${rand(r.sales)}, ${r.orders} orders`} />
          </div>
        ))}
      </div>
      <div className="bar-labels" aria-hidden="true">{rows.map((r, i) => <span key={r.date}>{showLabel || i % 5 === 0 ? r.label[0] + (rows.length > 7 ? r.date.slice(8) : r.label.slice(1)) : ''}</span>)}</div>
      <figcaption className="xs muted" style={{ marginTop: 8 }}>Today is highlighted in orange. Hover or focus a bar for details.</figcaption>
    </figure>
  );
}

function SalesTable({ rows }) {
  return (
    <div className="table-wrap" style={{ marginTop: 12 }}>
      <table className="data">
        <thead><tr><th>Date</th><th>Day</th><th className="num">Orders</th><th className="num">Sales</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.date}><td>{r.date}</td><td>{r.label}</td><td className="num">{r.orders}</td><td className="num">{rand(r.sales)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
