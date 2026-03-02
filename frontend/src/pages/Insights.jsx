import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Shield, Target, ArrowRight, Lightbulb, RefreshCw } from 'lucide-react';
import { Radar } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import { usePortfolio } from '../context/PortfolioContext';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const RISK_DETAILS = [
    { range: [0, 30], label: 'Low Risk', color: '#10b981', emoji: '🛡️', desc: 'Your portfolio is predominantly in debt and liquid instruments. It is capital-safe but may underperform inflation over time.' },
    { range: [30, 60], label: 'Moderate Risk', color: '#f59e0b', emoji: '⚖️', desc: 'Your portfolio has a balanced mix of equity and debt. This is ideal for most retail investors with 5-7 year horizon.' },
    { range: [60, 80], label: 'Moderately High Risk', color: '#f97316', emoji: '📊', desc: 'Your portfolio is tilted towards equity. Suitable for investors with 7+ year horizon and willing to endure short-term volatility.' },
    { range: [80, 101], label: 'High Risk', color: '#ef4444', emoji: '🔥', desc: 'Your portfolio is aggressively positioned in equities. High potential returns but significant volatility. Ensure you have an emergency fund before investing this aggressively.' },
];

const REBALANCE_SUGGESTIONS = {
    Conservative: { equity: 25, debt: 60, hybrid: 10, liquid: 5 },
    Moderate: { equity: 60, debt: 25, hybrid: 10, liquid: 5 },
    Aggressive: { equity: 80, debt: 10, hybrid: 8, liquid: 2 },
};

export default function Insights() {
    const navigate = useNavigate();
    const {
        data, loading, refreshing, forceRefreshing,
        holdings, summary, allocation, suggestions,
        fetchPortfolio, forceRefresh
    } = usePortfolio();

    if (loading && !data) return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 180, borderRadius: 16 }} />)}
        </div>
    );

    const riskScore = summary.riskScore || 0;
    const totalInvested = summary.totalInvested || 1;
    const allocEntries = Object.entries(allocation);

    // Radar chart data
    const radarData = {
        labels: ['Equity', 'Debt', 'Hybrid', 'International', 'Gold/Commodity', 'Liquid'],
        datasets: [{
            label: 'Your Portfolio',
            data: [
                Math.min(100, allocEntries.filter(([k]) => k.toLowerCase().includes('equity') || k.toLowerCase().includes('elss')).reduce((s, [, v]) => s + (v / totalInvested) * 100, 0)),
                Math.min(100, allocEntries.filter(([k]) => k.toLowerCase().includes('debt')).reduce((s, [, v]) => s + (v / totalInvested) * 100, 0)),
                Math.min(100, allocEntries.filter(([k]) => k.toLowerCase().includes('hybrid')).reduce((s, [, v]) => s + (v / totalInvested) * 100, 0)),
                Math.min(100, allocEntries.filter(([k]) => k.toLowerCase().includes('international') || k.toLowerCase().includes('fof')).reduce((s, [, v]) => s + (v / totalInvested) * 100, 0)),
                Math.min(100, allocEntries.filter(([k]) => k.toLowerCase().includes('gold') || k.toLowerCase().includes('commodity')).reduce((s, [, v]) => s + (v / totalInvested) * 100, 0)),
                Math.min(100, allocEntries.filter(([k]) => k.toLowerCase().includes('liquid') || k.toLowerCase().includes('overnight')).reduce((s, [, v]) => s + (v / totalInvested) * 100, 0)),
            ],
            fill: true,
            backgroundColor: 'rgba(99,102,241,0.15)',
            borderColor: '#6366f1',
            pointBackgroundColor: '#6366f1',
            borderWidth: 2,
        }]
    };

    const radarOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8', borderColor: 'rgba(99,130,255,0.2)', borderWidth: 1 }
        },
        scales: {
            r: {
                min: 0, max: 100,
                grid: { color: 'rgba(255,255,255,0.05)' },
                angleLines: { color: 'rgba(255,255,255,0.05)' },
                ticks: { display: false },
                pointLabels: { color: '#94a3b8', font: { size: 11 } }
            }
        }
    };

    const riskDetail = RISK_DETAILS.find(r => riskScore >= r.range[0] && riskScore < r.range[1]) || RISK_DETAILS[0];

    const holdingReturns = holdings.map(h => {
        const curr = h.units * h.currentNav;
        const ret = h.investedAmount > 0 ? ((curr - h.investedAmount) / h.investedAmount) * 100 : 0;
        return { name: h.schemeName?.slice(0, 25), ret, curr, invested: h.investedAmount };
    }).sort((a, b) => b.ret - a.ret);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: 22, fontWeight: 700 }}>AI Insights &amp; Analysis</h1>
                    <p style={{ color: '#475569', fontSize: 14 }}>Personalized recommendations powered by portfolio intelligence</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {(refreshing || forceRefreshing) && (
                        <span style={{ fontSize: 12, color: '#818cf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 12, height: 12, border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                            {forceRefreshing ? 'Fetching live NAVs…' : 'Updating…'}
                        </span>
                    )}
                    <button onClick={() => fetchPortfolio()} className="btn-secondary" disabled={refreshing || forceRefreshing}>
                        <RefreshCw size={14} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} /> Reload
                    </button>
                </div>
            </div>

            {/* Risk Score Card */}
            <div className="glass-card animate-fade-in" style={{ padding: 24 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <div style={{ background: `${riskDetail.color}20`, borderRadius: 10, padding: 10 }}>
                                <Shield size={20} color={riskDetail.color} />
                            </div>
                            <div>
                                <h3 style={{ fontWeight: 700, fontSize: 16 }}>Portfolio Risk Analysis</h3>
                                <p style={{ color: '#475569', fontSize: 12 }}>Based on your asset allocation</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, marginBottom: 16 }}>
                            <p className="font-numeric" style={{ fontSize: 56, fontWeight: 900, color: riskDetail.color, lineHeight: 1 }}>{riskScore}</p>
                            <div>
                                <p style={{ fontSize: 13, color: '#94a3b8' }}>/ 100</p>
                                <p style={{ fontWeight: 700, fontSize: 16, color: riskDetail.color }}>{riskDetail.emoji} {riskDetail.label}</p>
                            </div>
                        </div>
                        <div className="risk-meter-bar" style={{ position: 'relative', marginBottom: 8 }}>
                            <div style={{ position: 'absolute', top: '50%', left: `${riskScore}%`, transform: 'translate(-50%,-50%)', width: 16, height: 16, borderRadius: '50%', background: riskDetail.color, border: '3px solid #0f1629', zIndex: 2 }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginBottom: 16 }}>
                            <span>Low Risk</span><span>Moderate</span><span>High Risk</span>
                        </div>
                        <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7 }}>{riskDetail.desc}</p>
                    </div>

                    {/* Radar Chart */}
                    <div>
                        <h4 style={{ fontWeight: 700, fontSize: 13, marginBottom: 12, color: '#94a3b8' }}>Diversification Map</h4>
                        <div style={{ height: 220 }}>
                            <Radar data={radarData} options={radarOptions} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* AI Suggestions */}
                <div className="glass-card animate-fade-in-delay-1" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{ background: 'linear-gradient(135deg,#f59e0b,#ef4444)', borderRadius: 10, padding: 8 }}>
                            <Lightbulb size={17} color="white" />
                        </div>
                        <h3 style={{ fontWeight: 700, fontSize: 15 }}>AI Recommendations</h3>
                        <span className="badge badge-yellow" style={{ marginLeft: 'auto' }}>{suggestions.length} active</span>
                    </div>

                    {suggestions.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 32, color: '#475569' }}>
                            <p style={{ fontSize: 24, marginBottom: 8 }}>🎉</p>
                            <p style={{ fontWeight: 600 }}>Portfolio looks healthy!</p>
                            <p style={{ fontSize: 13 }}>No major suggestions at this time. Keep investing!</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {suggestions.map((s, i) => (
                                <div key={i} className={`suggestion-card suggestion-${s.priority}`} style={{ cursor: 'default' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                        <div>
                                            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{s.title}</p>
                                            <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>{s.description}</p>
                                        </div>
                                        <span className={`badge ${s.priority === 'high' ? 'badge-red' : s.priority === 'medium' ? 'badge-yellow' : 'badge-green'}`}>
                                            {s.priority}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '8px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: 8 }}>
                                        <ArrowRight size={12} color="#818cf8" />
                                        <div style={{ color: '#818cf8', fontSize: 12, fontWeight: 500 }}>
                                            {(() => {
                                                const parts = [];
                                                let text = s.action;
                                                if (!s.suggestedFunds?.length) return text;

                                                const sortedFunds = [...s.suggestedFunds].sort((a, b) => b.length - a.length);
                                                const regex = new RegExp(`(${sortedFunds.map(f => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');

                                                let lastIndex = 0;
                                                let match;
                                                while ((match = regex.exec(text)) !== null) {
                                                    if (match.index > lastIndex) {
                                                        parts.push(text.substring(lastIndex, match.index));
                                                    }
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
                                                if (lastIndex < text.length) {
                                                    parts.push(text.substring(lastIndex));
                                                }
                                                return parts;
                                            })()}
                                        </div>
                                    </div>
                                    {s.suggestedFunds?.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                                            {s.suggestedFunds.map((fund, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => navigate(`/add-fund?search=${encodeURIComponent(fund)}`)}
                                                    className="btn-primary"
                                                    style={{ fontSize: 11, padding: '6px 12px', borderRadius: 8 }}
                                                >
                                                    Invest in {fund}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Fund Performance Ranking */}
                <div className="glass-card animate-fade-in-delay-2" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{ background: 'linear-gradient(135deg,#10b981,#06b6d4)', borderRadius: 10, padding: 8 }}>
                            <TrendingUp size={17} color="white" />
                        </div>
                        <h3 style={{ fontWeight: 700, fontSize: 15 }}>Fund Performance Ranking</h3>
                    </div>

                    {holdingReturns.length === 0 ? (
                        <p style={{ color: '#475569', textAlign: 'center', padding: 32 }}>Add funds to see performance ranking</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {holdingReturns.map((h, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10 }}>
                                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: i < 3 ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: i < 3 ? 'white' : '#6366f1' }}>
                                        {i + 1}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <p style={{ fontWeight: 600, fontSize: 12, marginBottom: 2 }}>{h.name}...</p>
                                        <div className="progress-bar" style={{ height: 4 }}>
                                            <div className="progress-fill" style={{ width: `${Math.min(100, (Math.abs(h.ret) / 50) * 100)}%`, background: h.ret >= 0 ? '#10b981' : '#ef4444' }} />
                                        </div>
                                    </div>
                                    <span className={`badge ${h.ret >= 0 ? 'badge-green' : 'badge-red'}`}>
                                        {h.ret >= 0 ? '+' : ''}{h.ret.toFixed(2)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Suggested Rebalance */}
            <div className="glass-card animate-fade-in-delay-3" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 10, padding: 8 }}>
                        <Target size={17} color="white" />
                    </div>
                    <h3 style={{ fontWeight: 700, fontSize: 15 }}>Suggested Portfolio Rebalance</h3>
                    <span className="badge badge-blue" style={{ marginLeft: 'auto' }}>Based on {data?.user?.riskProfile || 'Moderate'} profile</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                    {Object.entries(REBALANCE_SUGGESTIONS['Moderate']).map(([cat, pct], i) => {
                        const colors = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4'];
                        return (
                            <div key={cat} style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: `1px solid ${colors[i]}30`, textAlign: 'center' }}>
                                <div style={{ width: 60, height: 60, borderRadius: '50%', background: `conic-gradient(${colors[i]} ${pct * 3.6}deg, rgba(255,255,255,0.05) 0deg)`, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <span className="font-numeric" style={{ fontWeight: 800, fontSize: 13, color: colors[i] }}>{pct}%</span>
                                    </div>
                                </div>
                                <p style={{ fontWeight: 600, fontSize: 13, textTransform: 'capitalize' }}>{cat}</p>
                                <p style={{ fontSize: 11, color: '#475569' }}>Recommended</p>
                            </div>
                        );
                    })}
                </div>
                <div style={{ marginTop: 16, padding: 12, background: 'rgba(99,102,241,0.08)', borderRadius: 10, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                    💡 <strong style={{ color: '#818cf8' }}>Pro Tip:</strong> Rebalancing your portfolio annually can improve risk-adjusted returns by 1-2% over the long term. Consider selling overweight assets and buying underweight ones during market corrections.
                </div>
            </div>
        </div>
    );
}
