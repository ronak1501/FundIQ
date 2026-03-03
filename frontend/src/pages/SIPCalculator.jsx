import React, { useState } from 'react';
import { Calculator, TrendingUp, IndianRupee, Calendar, Percent } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from 'chart.js';
import api from '../api/client';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function SIPCalculator() {
    const [form, setForm] = useState({ monthlyAmount: 10000, years: 10, expectedReturn: 12 });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const calculate = async () => {
        setLoading(true);
        try {
            const res = await api.post('/portfolio/sip-projection', form);
            setResult(res.data);
        } catch (err) {
            console.error(err);
        } finally { setLoading(false); }
    };

    const formatCurrency = (v) => {
        if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
        if (v >= 100000) return `₹${(v / 100000).toFixed(2)} L`;
        return `₹${v?.toLocaleString('en-IN') || 0}`;
    };

    const lineData = result ? {
        labels: result.yearlyData.map(d => `Yr ${d.year}`),
        datasets: [
            {
                label: 'Invested Amount',
                data: result.yearlyData.map(d => d.invested),
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 5,
            },
            {
                label: 'Portfolio Value',
                data: result.yearlyData.map(d => d.value),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16,185,129,0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 5,
            }
        ]
    } : null;

    const lineOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#94a3b8', font: { size: 12 }, usePointStyle: true } },
            tooltip: {
                backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8',
                borderColor: 'rgba(99,130,255,0.2)', borderWidth: 1,
                callbacks: {
                    label: ctx => ` ${ctx.dataset.label}: ₹${ctx.raw?.toLocaleString('en-IN')}`
                }
            }
        },
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#475569', font: { size: 11 } } },
            y: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: {
                    color: '#475569', font: { size: 11 },
                    callback: v => v >= 100000 ? `₹${(v / 100000).toFixed(0)}L` : `₹${(v / 1000).toFixed(0)}K`
                }
            }
        }
    };

    const presets = [
        { label: 'Conservative', ret: 8, color: '#10b981' },
        { label: 'Moderate', ret: 12, color: '#f59e0b' },
        { label: 'Aggressive', ret: 18, color: '#ef4444' },
    ];

    return (
        <div className="max-w-[860px] mx-auto flex flex-col gap-5">
            <div>
                <h1 style={{ fontSize: 22, fontWeight: 700 }}>SIP Calculator</h1>
                <p style={{ color: '#475569', fontSize: 14 }}>Project your wealth growth with systematic investment planning</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
                {/* Input Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="glass-card animate-fade-in" style={{ padding: 24 }}>
                        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Calculator size={16} color="#6366f1" /> Investment Parameters
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div>
                                <label className="form-label">Monthly SIP Amount</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#6366f1', fontWeight: 700 }}>₹</span>
                                    <input className="input-field" type="number" min="500" step="500"
                                        value={form.monthlyAmount}
                                        onChange={e => setForm({ ...form, monthlyAmount: parseInt(e.target.value) })}
                                        style={{ paddingLeft: 32 }} />
                                </div>
                                <input type="range" min="500" max="100000" step="500"
                                    value={form.monthlyAmount}
                                    onChange={e => setForm({ ...form, monthlyAmount: parseInt(e.target.value) })}
                                    style={{ width: '100%', marginTop: 8, accentColor: '#6366f1' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569' }}>
                                    <span>₹500</span><span>₹1L</span>
                                </div>
                            </div>

                            <div>
                                <label className="form-label">Investment Duration</label>
                                <div style={{ position: 'relative' }}>
                                    <input className="input-field" type="number" min="1" max="40"
                                        value={form.years}
                                        onChange={e => setForm({ ...form, years: parseInt(e.target.value) })}
                                        style={{ paddingRight: 50 }} />
                                    <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569', fontSize: 12 }}>years</span>
                                </div>
                                <input type="range" min="1" max="40" value={form.years}
                                    onChange={e => setForm({ ...form, years: parseInt(e.target.value) })}
                                    style={{ width: '100%', marginTop: 8, accentColor: '#8b5cf6' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569' }}>
                                    <span>1 yr</span><span>40 yrs</span>
                                </div>
                            </div>

                            <div>
                                <label className="form-label">Expected Annual Return</label>
                                <div style={{ position: 'relative' }}>
                                    <input className="input-field" type="number" min="1" max="40" step="0.5"
                                        value={form.expectedReturn}
                                        onChange={e => setForm({ ...form, expectedReturn: parseFloat(e.target.value) })}
                                        style={{ paddingRight: 36 }} />
                                    <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#f59e0b', fontWeight: 700 }}>%</span>
                                </div>
                                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                    {presets.map(p => (
                                        <button key={p.label} onClick={() => setForm({ ...form, expectedReturn: p.ret })}
                                            style={{ flex: 1, padding: '5px', borderRadius: 6, border: `1px solid ${p.color}40`, background: form.expectedReturn === p.ret ? `${p.color}20` : 'transparent', color: p.color, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                            {p.label}<br />{p.ret}%
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={calculate} className="btn-primary" disabled={loading}
                                style={{ width: '100%', justifyContent: 'center', padding: 14 }}>
                                {loading ? '⏳ Calculating...' : '🚀 Calculate Returns'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {result ? (
                        <>
                            {/* Summary cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
                                {[
                                    { label: 'Total Invested', value: formatCurrency(result.invested), color: '#6366f1', icon: '💰' },
                                    { label: 'Maturity Value', value: formatCurrency(result.maturity), color: '#10b981', icon: '🏆' },
                                    { label: 'Total Gains', value: formatCurrency(result.gains), color: '#f59e0b', icon: '📈' },
                                ].map((s, i) => (
                                    <div key={i} className="glass-card" style={{ padding: 16, textAlign: 'center' }}>
                                        <p style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</p>
                                        <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</p>
                                        <p className="font-numeric" style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Wealth Multiplier */}
                            <div className="glass-card animate-fade-in" style={{ padding: 16, background: 'linear-gradient(135deg,rgba(99,102,241,0.1),rgba(16,185,129,0.06))', borderColor: 'rgba(99,102,241,0.25)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Wealth Multiplier</p>
                                        <p className="font-numeric" style={{ fontSize: 28, fontWeight: 900, color: '#818cf8' }}>
                                            {(result.maturity / result.invested).toFixed(2)}x
                                        </p>
                                        <p style={{ fontSize: 12, color: '#475569' }}>Your money grows {(result.maturity / result.invested).toFixed(2)} times in {form.years} years</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Return %</p>
                                        <p className="font-numeric" style={{ fontSize: 28, fontWeight: 900, color: '#10b981' }}>
                                            +{((result.gains / result.invested) * 100).toFixed(1)}%
                                        </p>
                                        <p style={{ fontSize: 12, color: '#475569' }}>On total invested amount</p>
                                    </div>
                                </div>
                            </div>

                            {/* Line Chart */}
                            <div className="glass-card animate-fade-in" style={{ padding: 20 }}>
                                <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>Wealth Growth Projection</h3>
                                <div style={{ height: 220 }}>
                                    <Line data={lineData} options={lineOptions} />
                                </div>
                            </div>

                            {/* Year-by-year table */}
                            <div className="glass-card animate-fade-in" style={{ padding: 20 }}>
                                <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Year-by-Year Breakdown</h3>
                                <div style={{ maxHeight: 240, overflowY: 'auto' }}>
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Year</th>
                                                <th>Invested</th>
                                                <th>Portfolio Value</th>
                                                <th>Gains</th>
                                                <th>Growth</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.yearlyData.map(d => (
                                                <tr key={d.year}>
                                                    <td style={{ fontWeight: 600 }}>Year {d.year}</td>
                                                    <td className="font-numeric">₹{d.invested.toLocaleString('en-IN')}</td>
                                                    <td className="font-numeric" style={{ color: '#10b981', fontWeight: 600 }}>₹{d.value.toLocaleString('en-IN')}</td>
                                                    <td className="font-numeric" style={{ color: '#f59e0b' }}>+₹{(d.value - d.invested).toLocaleString('en-IN')}</td>
                                                    <td>
                                                        <span className="badge badge-green">{(((d.value - d.invested) / d.invested) * 100).toFixed(1)}%</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="glass-card animate-fade-in" style={{ padding: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, opacity: 0.7, flex: 1 }}>
                            <TrendingUp size={48} color="#475569" />
                            <p style={{ color: '#475569', textAlign: 'center' }}>
                                Fill in the parameters and click <strong style={{ color: '#818cf8' }}>Calculate Returns</strong> to see your SIP projection
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
