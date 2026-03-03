import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Plus, TrendingUp, TrendingDown, RefreshCw, BarChart2, PieChart as PieIcon } from 'lucide-react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import api from '../api/client';
import toast from 'react-hot-toast';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];

export default function Portfolio() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(null);
    const navigate = useNavigate();

    const fetch = async () => {
        setLoading(true);
        try {
            const res = await api.get('/portfolio');
            setData(res.data);
        } catch (err) { toast.error('Failed to load portfolio'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetch(); }, []);

    const deleteHolding = async (id) => {
        if (!window.confirm('Remove this holding?')) return;
        setDeleting(id);
        try {
            await api.delete(`/portfolio/holding/${id}`);
            toast.success('Holding removed');
            fetch();
        } catch { toast.error('Failed to remove'); }
        finally { setDeleting(null); }
    };

    const formatCurrency = (v) => v >= 100000 ? `₹${(v / 100000).toFixed(2)}L` : `₹${v?.toLocaleString('en-IN') || 0}`;

    if (loading) return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 16 }} />)}
    </div>;

    const holdings = data?.holdings || [];
    const summary = data?.summary || {};
    const allocation = data?.allocation || {};
    const allocKeys = Object.keys(allocation);

    const donutData = {
        labels: allocKeys,
        datasets: [{ data: Object.values(allocation), backgroundColor: COLORS.slice(0, allocKeys.length), borderColor: '#0f1629', borderWidth: 3 }]
    };

    const donutOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 11 }, padding: 10, usePointStyle: true } },
            tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8', borderColor: 'rgba(99,130,255,0.2)', borderWidth: 1 }
        },
        cutout: '65%',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700 }}>My Portfolio</h1>
                    <p style={{ color: '#475569', fontSize: 14 }}>{holdings.length} fund{holdings.length !== 1 ? 's' : ''} · Last updated {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'now'}</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={fetch} className="btn-secondary"><RefreshCw size={14} /> Refresh NAV</button>
                    <button onClick={() => navigate('/add-fund')} className="btn-primary"><Plus size={14} /> Add Fund</button>
                </div>
            </div>

            {/* Summary bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                    { label: 'Total Invested', value: formatCurrency(summary.totalInvested || 0), color: '#6366f1' },
                    { label: 'Current Value', value: formatCurrency(summary.currentValue || 0), color: '#10b981' },
                    { label: 'Gain/Loss', value: `${summary.gainLoss >= 0 ? '+' : ''}${formatCurrency(summary.gainLoss || 0)}`, color: summary.gainLoss >= 0 ? '#10b981' : '#ef4444' },
                    { label: 'Overall Return', value: `${summary.gainLossPercent >= 0 ? '+' : ''}${summary.gainLossPercent || 0}%`, color: summary.gainLossPercent >= 0 ? '#10b981' : '#ef4444' },
                ].map((s, i) => (
                    <div key={i} className="glass-card" style={{ padding: 16 }}>
                        <p style={{ fontSize: 11, color: '#475569', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</p>
                        <p className="font-numeric" style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
                {/* Holdings Table */}
                <div className="glass-card" style={{ padding: 20 }}>
                    <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>All Holdings</h3>
                    {holdings.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>
                            <BarChart2 size={48} style={{ margin: '0 auto 12px', opacity: 0.2 }} />
                            <p style={{ fontWeight: 600, marginBottom: 8 }}>No funds in your portfolio</p>
                            <button onClick={() => navigate('/add-fund')} className="btn-primary">
                                <Plus size={14} /> Add Your First Fund
                            </button>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Fund Name</th>
                                        <th>Units</th>
                                        <th>Buy NAV</th>
                                        <th>Curr NAV</th>
                                        <th>Invested</th>
                                        <th>Current</th>
                                        <th>P&L</th>
                                        <th>Return</th>
                                        <th>Fund Performance</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {holdings.map(h => {
                                        const curr = h.units * h.currentNav;
                                        const pnl = curr - h.investedAmount;
                                        const ret = h.investedAmount > 0 ? (pnl / h.investedAmount) * 100 : 0;
                                        const fr = h.returns || {};

                                        const renderPerf = (val, label) => (
                                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 40, alignItems: 'center' }}>
                                                <span style={{ fontSize: 9, color: '#64748b', fontWeight: 600 }}>{label}</span>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: val >= 0 ? '#10b981' : val < 0 ? '#ef4444' : '#475569' }}>
                                                    {val != null ? `${val >= 0 ? '+' : ''}${val.toFixed(1)}%` : '—'}
                                                </span>
                                            </div>
                                        );

                                        return (
                                            <tr key={h._id}>
                                                <td>
                                                    <div>
                                                        <p style={{ fontWeight: 600, fontSize: 13, maxWidth: 180 }}>{h.schemeName?.slice(0, 30)}{h.schemeName?.length > 30 ? '...' : ''}</p>
                                                        <div style={{ display: 'flex', gap: 6, marginTop: 3 }}>
                                                            <span className="badge badge-blue" style={{ fontSize: 10 }}>{h.category?.slice(0, 12)}</span>
                                                            {h.isSIP && <span className="badge badge-purple" style={{ fontSize: 10 }}>SIP</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="font-numeric" style={{ fontSize: 13 }}>{h.units?.toFixed(3)}</td>
                                                <td className="font-numeric" style={{ fontSize: 13 }}>₹{h.buyNav?.toFixed(2)}</td>
                                                <td className="font-numeric" style={{ fontSize: 13, fontWeight: 600 }}>₹{h.currentNav?.toFixed(2)}</td>
                                                <td className="font-numeric" style={{ fontSize: 13 }}>₹{h.investedAmount?.toLocaleString('en-IN')}</td>
                                                <td className="font-numeric" style={{ fontSize: 13, fontWeight: 600 }}>₹{Math.round(curr).toLocaleString('en-IN')}</td>
                                                <td>
                                                    <span style={{ color: pnl >= 0 ? '#10b981' : '#ef4444', fontSize: 13, fontWeight: 700 }}
                                                        className="font-numeric">
                                                        {pnl >= 0 ? '+' : ''}₹{Math.round(pnl).toLocaleString('en-IN')}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge ${ret >= 0 ? 'badge-green' : 'badge-red'}`}>
                                                        {ret >= 0 ? '↑' : '↓'} {Math.abs(ret).toFixed(2)}%
                                                    </span>
                                                </td>
                                                <td>
                                                    {fr.retSI != null ? (
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                            <span style={{ fontSize: 13, fontWeight: 700, color: fr.retSI >= 0 ? '#10b981' : '#ef4444' }}>
                                                                {fr.retSI >= 0 ? '↑' : '↓'} {Math.abs(fr.retSI).toFixed(1)}%
                                                            </span>
                                                            <span style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                                                                {fr.siYears != null ? `${fr.siYears.toFixed(1)}y SI` : 'Since Inception'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div style={{ textAlign: 'center', color: '#475569', fontSize: 11 }}>—</div>
                                                    )}
                                                </td>
                                                <td>
                                                    <button className="btn-danger" onClick={() => deleteHolding(h._id)} disabled={deleting === h._id}>
                                                        <Trash2 size={12} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Allocation Chart */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="glass-card" style={{ padding: 20 }}>
                        <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Allocation</h3>
                        {allocKeys.length > 0 ? (
                            <div style={{ height: 200 }}>
                                <Doughnut data={donutData} options={donutOptions} />
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>
                                <PieIcon size={32} style={{ margin: '0 auto 8px', opacity: 0.2 }} />
                                <p style={{ fontSize: 13 }}>No data</p>
                            </div>
                        )}
                    </div>

                    {/* Allocation breakdown */}
                    {allocKeys.length > 0 && (
                        <div className="glass-card" style={{ padding: 16 }}>
                            <h4 style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Category Breakdown</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {allocKeys.map((k, i) => {
                                    const pct = ((allocation[k] / summary.totalInvested) * 100).toFixed(1);
                                    return (
                                        <div key={k}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                                <span style={{ color: '#94a3b8' }}>{k.slice(0, 20)}</span>
                                                <span style={{ fontWeight: 700, color: COLORS[i % COLORS.length] }}>{pct}%</span>
                                            </div>
                                            <div className="progress-bar">
                                                <div className="progress-fill" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
