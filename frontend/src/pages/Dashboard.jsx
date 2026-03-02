import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, TrendingDown, Wallet, Shield, RefreshCw, Plus,
    ArrowUpRight, BarChart2, AlertCircle, ChevronRight, PieChart
} from 'lucide-react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend,
    CategoryScale, LinearScale, BarElement
} from 'chart.js';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../context/PortfolioContext';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const CATEGORY_COLORS = [
    '#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'
];

function StatCard({ title, value, sub, color, icon: Icon, glow, trend }) {
    return (
        <div className={`glass-card glass-card-hover animate-fade-in ${glow}`} style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</p>
                <div style={{ background: `${color}20`, borderRadius: 8, padding: 8 }}>
                    <Icon size={16} color={color} />
                </div>
            </div>
            <p className="font-numeric" style={{ fontSize: 26, fontWeight: 800, color: '#f1f5f9', marginBottom: 4 }}>{value}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {trend && <span style={{ color: trend > 0 ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: 600 }}>
                    {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                </span>}
                <p style={{ fontSize: 12, color: '#475569' }}>{sub}</p>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        data, loading, refreshing, forceRefreshing,
        holdings, summary, allocation, suggestions,
        navUpdatedAt, fetchPortfolio, forceRefresh
    } = usePortfolio();

    const formatCurrency = (v) => {
        if (!v && v !== 0) return '₹0';
        if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
        if (v >= 100000) return `₹${(v / 100000).toFixed(2)}L`;
        if (v >= 1000) return `₹${(v / 1000).toFixed(2)}K`;
        return `₹${v.toLocaleString('en-IN')}`;
    };

    const getRiskLabel = (score) => {
        if (score < 30) return { label: 'Low', color: '#10b981' };
        if (score < 60) return { label: 'Moderate', color: '#f59e0b' };
        return { label: 'High', color: '#ef4444' };
    };

    // Show skeleton only on very first load (no cached data yet)
    if (loading && !data) return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 120, borderRadius: 16 }} />
            ))}
        </div>
    );

    const risk = getRiskLabel(summary.riskScore || 0);

    const allocKeys = Object.keys(allocation);
    const allocValues = Object.values(allocation);

    const donutData = {
        labels: allocKeys,
        datasets: [{
            data: allocValues,
            backgroundColor: CATEGORY_COLORS.slice(0, allocKeys.length),
            borderColor: '#0f1629',
            borderWidth: 3,
            hoverBorderWidth: 0,
        }]
    };

    const donutOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: { color: '#94a3b8', font: { size: 12 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 }
            },
            tooltip: {
                backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8',
                borderColor: 'rgba(99,130,255,0.2)', borderWidth: 1,
                callbacks: { label: (ctx) => ` ${ctx.label}: ₹${ctx.raw.toLocaleString('en-IN')}` }
            }
        },
        cutout: '68%',
    };

    const topHoldings = [...holdings]
        .sort((a, b) => (b.units * b.currentNav) - (a.units * a.currentNav))
        .slice(0, 5);

    const barData = {
        labels: topHoldings.map(h => h.schemeName?.split('-')[0]?.trim().slice(0, 20) || 'Fund'),
        datasets: [
            {
                label: 'Invested',
                data: topHoldings.map(h => h.investedAmount),
                backgroundColor: 'rgba(99,102,241,0.5)',
                borderColor: '#6366f1',
                borderWidth: 2,
                borderRadius: 6,
            },
            {
                label: 'Current',
                data: topHoldings.map(h => h.units * h.currentNav),
                backgroundColor: 'rgba(16,185,129,0.5)',
                borderColor: '#10b981',
                borderWidth: 2,
                borderRadius: 6,
            }
        ]
    };

    const barOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { labels: { color: '#94a3b8', font: { size: 11 }, usePointStyle: true } },
            tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8', borderColor: 'rgba(99,130,255,0.2)', borderWidth: 1 }
        },
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#475569', font: { size: 11 } } },
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#475569', font: { size: 11 }, callback: v => `₹${(v / 1000).toFixed(0)}K` } }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Greeting */}
            <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 style={{ fontSize: 22, fontWeight: 700 }}>
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
                    </h2>
                    <p style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>Here's your portfolio snapshot</p>
                    {navUpdatedAt && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981', display: 'inline-block' }} />
                            <span style={{ fontSize: 11, color: '#475569' }}>
                                NAVs as of{' '}
                                <span style={{ color: '#94a3b8', fontWeight: 600 }}>
                                    {new Date(navUpdatedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                                {' '}· refreshes daily
                            </span>
                        </div>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {(refreshing || forceRefreshing) && (
                        <span style={{ fontSize: 12, color: '#818cf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 12, height: 12, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                            {forceRefreshing ? 'Fetching live NAVs…' : 'Updating…'}
                        </span>
                    )}
                    <button onClick={() => fetchPortfolio()} className="btn-secondary" disabled={refreshing || forceRefreshing} title="Reload from cache">
                        <RefreshCw size={14} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} /> Reload
                    </button>
                    <button onClick={forceRefresh} className="btn-secondary" disabled={forceRefreshing || refreshing}
                        style={{ borderColor: 'rgba(16,185,129,0.3)', color: '#34d399' }} title="Fetch latest NAVs from exchange">
                        <RefreshCw size={14} color="#34d399" style={forceRefreshing ? { animation: 'spin 1s linear infinite' } : {}} /> Update NAVs
                    </button>
                    <button onClick={() => navigate('/add-fund')} className="btn-primary">
                        <Plus size={14} /> Add Fund
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                <StatCard title="Total Invested" value={formatCurrency(summary.totalInvested)} sub="Your total cost" color="#6366f1" icon={Wallet} glow="stat-glow-blue" />
                <StatCard title="Current Value" value={formatCurrency(summary.currentValue)} sub={`${summary.holdingsCount || 0} funds`} color="#10b981" icon={TrendingUp} glow="stat-glow-green" trend={summary.gainLossPercent} />
                <StatCard
                    title="Gain / Loss"
                    value={`${summary.gainLoss >= 0 ? '+' : ''}${formatCurrency(summary.gainLoss)}`}
                    sub={`${summary.gainLossPercent >= 0 ? '+' : ''}${summary.gainLossPercent || 0}%`}
                    color={summary.gainLoss >= 0 ? '#10b981' : '#ef4444'}
                    icon={summary.gainLoss >= 0 ? TrendingUp : TrendingDown}
                    glow={summary.gainLoss >= 0 ? 'stat-glow-green' : 'stat-glow-red'}
                />
                <div className="glass-card glass-card-hover animate-fade-in stat-glow-purple" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                        <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Risk Score</p>
                        <div style={{ background: `${risk.color}20`, borderRadius: 8, padding: 8 }}>
                            <Shield size={16} color={risk.color} />
                        </div>
                    </div>
                    <p className="font-numeric" style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>{summary.riskScore || 0}<span style={{ fontSize: 14, color: '#64748b' }}>/100</span></p>
                    <div className="risk-meter-bar" style={{ marginBottom: 6 }}>
                        <div style={{ position: 'absolute', top: -2, left: `${summary.riskScore || 0}%`, transform: 'translateX(-50%)' }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: risk.color, border: '2px solid #0f1629' }} />
                        </div>
                    </div>
                    <p style={{ fontSize: 12, color: risk.color, fontWeight: 600 }}>{risk.label} Risk</p>
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
                <div className="glass-card animate-fade-in-delay-1" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontWeight: 700, fontSize: 15 }}>Asset Allocation</h3>
                        <span className="badge badge-blue"><BarChart2 size={10} /> Chart</span>
                    </div>
                    {allocKeys.length > 0 ? (
                        <div style={{ height: 220 }}><Doughnut data={donutData} options={donutOptions} /></div>
                    ) : (
                        <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                            <PieChart size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
                            <p>No holdings yet</p>
                            <button onClick={() => navigate('/add-fund')} className="btn-primary" style={{ marginTop: 12, fontSize: 13 }}>
                                <Plus size={12} /> Add Your First Fund
                            </button>
                        </div>
                    )}
                </div>

                <div className="glass-card animate-fade-in-delay-2" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontWeight: 700, fontSize: 15 }}>Top Holdings — Invested vs Current</h3>
                        <button onClick={() => navigate('/portfolio')} className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>
                            View All <ChevronRight size={12} />
                        </button>
                    </div>
                    {topHoldings.length > 0 ? (
                        <div style={{ height: 220 }}><Bar data={barData} options={barOptions} /></div>
                    ) : (
                        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
                            <p>Add funds to see chart</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Holdings + Suggestions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16 }}>
                <div className="glass-card animate-fade-in-delay-2" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontWeight: 700, fontSize: 15 }}>Recent Holdings</h3>
                        <button onClick={() => navigate('/portfolio')} className="btn-secondary" style={{ fontSize: 12, padding: '5px 12px' }}>
                            All Holdings <ChevronRight size={12} />
                        </button>
                    </div>
                    {holdings.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 40, color: '#475569' }}>
                            <Wallet size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                            <p>No holdings yet. Add mutual funds to get started.</p>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Fund</th>
                                    <th>Invested</th>
                                    <th>Current</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Personal Ret.</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Fund Performance</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holdings.slice(0, 5).map(h => {
                                    const curr = h.units * h.currentNav;
                                    const ret = ((curr - h.investedAmount) / h.investedAmount) * 100;
                                    // CAGR = (currentValue / invested)^(365 / daysHeld) - 1
                                    const daysHeld = h.purchaseDate
                                        ? (Date.now() - new Date(h.purchaseDate).getTime()) / 86400000
                                        : 0;

                                    const fr = h.returns || {};
                                    const renderPerf = (val, label) => (
                                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 42 }}>
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
                                                    <p style={{ fontWeight: 600, fontSize: 13 }}>{h.schemeName?.slice(0, 28) || 'Fund'}{h.schemeName?.length > 28 ? '…' : ''}</p>
                                                    <p style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>{h.category} · {daysHeld > 0 ? `${Math.floor(daysHeld)}d held` : 'today'}</p>
                                                </div>
                                            </td>
                                            <td className="font-numeric" style={{ fontSize: 13 }}>₹{h.investedAmount?.toLocaleString('en-IN')}</td>
                                            <td className="font-numeric" style={{ fontSize: 13, fontWeight: 600 }}>₹{Math.round(curr).toLocaleString('en-IN')}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span className={`badge ${ret >= 0 ? 'badge-green' : 'badge-red'}`} style={{ width: 'fit-content' }}>
                                                        {ret >= 0 ? '↑' : '↓'} {Math.abs(ret).toFixed(2)}%
                                                    </span>
                                                    {daysHeld > 30 && h.investedAmount > 0 && (
                                                        <span style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>
                                                            {((Math.pow(curr / h.investedAmount, 365 / daysHeld) - 1) * 100).toFixed(1)}% p.a.
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                {fr.retSI != null ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: 13, fontWeight: 700, color: fr.retSI >= 0 ? '#10b981' : '#ef4444' }}>
                                                            {fr.retSI >= 0 ? '↑' : '↓'} {Math.abs(fr.retSI).toFixed(1)}%
                                                        </span>
                                                        <span style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                                                            {fr.siYears != null ? `${fr.siYears.toFixed(1)} years since launch` : 'Since Inception'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize: 11, color: '#475569' }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="glass-card animate-fade-in-delay-3" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <div style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', borderRadius: 8, padding: 6 }}>
                            <AlertCircle size={14} color="white" />
                        </div>
                        <h3 style={{ fontWeight: 700, fontSize: 15 }}>AI Suggestions</h3>
                        <span className="badge badge-yellow" style={{ marginLeft: 'auto' }}>{suggestions.length} tips</span>
                    </div>
                    {suggestions.length === 0 ? (
                        <p style={{ color: '#475569', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>
                            Great portfolio! No suggestions at this time.
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {suggestions.map((s, i) => (
                                <div key={i} className={`suggestion-card suggestion-${s.priority}`}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <p style={{ fontWeight: 600, fontSize: 13 }}>{s.title}</p>
                                        <span className={`badge ${s.priority === 'high' ? 'badge-red' : s.priority === 'medium' ? 'badge-yellow' : 'badge-green'}`} style={{ fontSize: 10 }}>
                                            {s.priority}
                                        </span>
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: 12, lineHeight: 1.5 }}>{s.description}</p>
                                    <div style={{ color: '#818cf8', fontSize: 11, marginTop: 6, fontWeight: 500, marginBottom: s.suggestedFunds?.length ? 10 : 0 }}>
                                        💡 {(() => {
                                            const parts = [];
                                            let text = s.action;
                                            if (!s.suggestedFunds?.length) return text;

                                            // Create a regex to find all suggested funds in the action text
                                            const sortedFunds = [...s.suggestedFunds].sort((a, b) => b.length - a.length);
                                            const regex = new RegExp(`(${sortedFunds.map(f => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');

                                            let lastIndex = 0;
                                            let match;
                                            while ((match = regex.exec(text)) !== null) {
                                                // Add text before match
                                                if (match.index > lastIndex) {
                                                    parts.push(text.substring(lastIndex, match.index));
                                                }
                                                // Add clickable match
                                                const fundName = match[0];
                                                parts.push(
                                                    <span
                                                        key={match.index}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/add-fund?search=${encodeURIComponent(fundName)}`);
                                                        }}
                                                        style={{ color: '#6366f1', textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}
                                                    >
                                                        {fundName}
                                                    </span>
                                                );
                                                lastIndex = regex.lastIndex;
                                            }
                                            // Add remaining text
                                            if (lastIndex < text.length) {
                                                parts.push(text.substring(lastIndex));
                                            }
                                            return parts;
                                        })()}
                                    </div>

                                    {s.suggestedFunds?.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {s.suggestedFunds.map((fund, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => navigate(`/add-fund?search=${encodeURIComponent(fund)}`)}
                                                    className="btn-secondary"
                                                    style={{ fontSize: 10, padding: '4px 8px', borderColor: 'rgba(129,140,248,0.3)', color: '#818cf8' }}
                                                >
                                                    Invest in {fund.split(' ')[0]}...
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    <button onClick={() => navigate('/insights')} className="btn-secondary" style={{ width: '100%', justifyContent: 'center', marginTop: 12, fontSize: 13 }}>
                        View All Insights <ArrowUpRight size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
}
