import React, { useState, useMemo } from 'react';
import {
    Wallet, TrendingUp, Calculator, Lightbulb, AlertTriangle,
    IndianRupee, PiggyBank, Home, Car, CreditCard, ArrowRight,
    ChevronDown, ChevronUp, Info, Zap, BarChart2, Target
} from 'lucide-react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement,
    LineElement, Title, Tooltip, Legend, Filler, ArcElement
} from 'chart.js';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler, ArcElement
);

// ——————————————————————————————————————————————————————————————
// Helpers
// ——————————————————————————————————————————————————————————————
const fmt = (v) => {
    const n = parseFloat(v) || 0;
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)} L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
    return `₹${n.toLocaleString('en-IN')}`;
};

const fmtFull = (v) =>
    `₹${Math.round(parseFloat(v) || 0).toLocaleString('en-IN')}`;

function sipFV(monthly, rateAnnual, years) {
    const r = rateAnnual / 100 / 12;
    const n = years * 12;
    return monthly * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
}

// ——————————————————————————————————————————————————————————————
// Small reusable card
// ——————————————————————————————————————————————————————————————
function InfoCard({ children, accent = '#6366f1', style = {} }) {
    return (
        <div style={{
            background: 'rgba(17,24,39,0.8)',
            border: `1px solid ${accent}30`,
            borderLeft: `3px solid ${accent}`,
            borderRadius: 14,
            padding: '18px 20px',
            ...style
        }}>
            {children}
        </div>
    );
}

// ——————————————————————————————————————————————————————————————
// Animated number input with ₹ prefix
// ——————————————————————————————————————————————————————————————
function RupeeInput({ label, value, onChange, placeholder = '0', helpText }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="form-label">{label}</label>
            <div style={{ position: 'relative' }}>
                <span style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: '#6366f1', fontWeight: 700, fontSize: 15, pointerEvents: 'none'
                }}>₹</span>
                <input
                    type="number"
                    min="0"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="input-field"
                    style={{ paddingLeft: 28 }}
                />
            </div>
            {helpText && <p style={{ fontSize: 11, color: '#475569' }}>{helpText}</p>}
        </div>
    );
}

// ——————————————————————————————————————————————————————————————
// Section header
// ——————————————————————————————————————————————————————————————
function SectionHeader({ icon: Icon, title, subtitle, color = '#6366f1', badge }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
            <div style={{
                background: `linear-gradient(135deg,${color}40,${color}20)`,
                border: `1px solid ${color}30`,
                borderRadius: 12, padding: 10, flexShrink: 0
            }}>
                <Icon size={20} color={color} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>{title}</h3>
                    {badge && <span className="badge badge-blue" style={{ fontSize: 10 }}>{badge}</span>}
                </div>
                {subtitle && <p style={{ fontSize: 13, color: '#64748b', marginTop: 3 }}>{subtitle}</p>}
            </div>
        </div>
    );
}

// ——————————————————————————————————————————————————————————————
// Surplus Meter
// ——————————————————————————————————————————————————————————————
function SurplusMeter({ surplus, income }) {
    const pct = income > 0 ? Math.min(100, Math.max(0, (surplus / income) * 100)) : 0;
    const color = pct >= 30 ? '#10b981' : pct >= 15 ? '#f59e0b' : '#ef4444';
    const label = pct >= 30 ? 'Excellent' : pct >= 15 ? 'Good' : pct >= 5 ? 'Tight' : 'Very Tight';
    return (
        <div style={{ marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>Surplus Ratio</span>
                <span style={{ fontSize: 12, fontWeight: 700, color }}>{pct.toFixed(1)}% — {label}</span>
            </div>
            <div className="progress-bar">
                <div
                    className="progress-fill"
                    style={{ width: `${pct}%`, background: `linear-gradient(to right,${color}99,${color})` }}
                />
            </div>
        </div>
    );
}

// ——————————————————————————————————————————————————————————————
// Main Component
// ——————————————————————————————————————————————————————————————
export default function InvestmentPlanner() {
    // ── Section 1 state ──────────────────────────────────────────
    const [income, setIncome] = useState('');
    const [expenses, setExpenses] = useState('');
    const [emi, setEmi] = useState('');
    const [other, setOther] = useState('');
    const [existing, setExisting] = useState('');
    const [showBreakdown, setShowBreakdown] = useState(false);

    // ── Section 3 state ──────────────────────────────────────────
    const [sipAmount, setSipAmount] = useState('');
    const [returnRate, setReturnRate] = useState('12');
    const [years, setYears] = useState('10');

    // ── Calculations ─────────────────────────────────────────────
    const inc = parseFloat(income) || 0;
    const exp = parseFloat(expenses) || 0;
    const emiV = parseFloat(emi) || 0;
    const oth = parseFloat(other) || 0;
    const exst = parseFloat(existing) || 0;

    const totalOutflow = exp + emiV + oth;
    const surplus = Math.max(0, inc - totalOutflow);
    const recommended = Math.max(0, surplus - exst);

    // SIP projection
    const sipAmt = parseFloat(sipAmount) || 0;
    const rate = parseFloat(returnRate) || 12;
    const yrs = parseInt(years) || 10;

    const totalInvested = sipAmt * yrs * 12;
    const futureValue = sipFV(sipAmt, rate, yrs);
    const wealthGained = futureValue - totalInvested;

    // Yearly chart data
    const chartLabels = useMemo(() =>
        Array.from({ length: yrs }, (_, i) => `Yr ${i + 1}`), [yrs]);

    const investedData = useMemo(() =>
        Array.from({ length: yrs }, (_, i) => sipAmt * (i + 1) * 12), [sipAmt, yrs]);

    const valueData = useMemo(() =>
        Array.from({ length: yrs }, (_, i) => Math.round(sipFV(sipAmt, rate, i + 1))), [sipAmt, rate, yrs]);

    const lineData = {
        labels: chartLabels,
        datasets: [
            {
                label: 'Amount Invested',
                data: investedData,
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99,102,241,0.08)',
                borderWidth: 2,
                pointRadius: 0,
                fill: true,
                tension: 0.4,
            },
            {
                label: 'Wealth Value',
                data: valueData,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16,185,129,0.08)',
                borderWidth: 2.5,
                pointRadius: 3,
                pointBackgroundColor: '#10b981',
                fill: true,
                tension: 0.4,
            }
        ]
    };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                labels: { color: '#94a3b8', font: { size: 12 }, usePointStyle: true, pointStyleWidth: 8 }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                titleColor: '#f1f5f9',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(99,130,255,0.2)',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: ctx => ` ${ctx.dataset.label}: ${fmt(ctx.raw)}`
                }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(255,255,255,0.03)' },
                ticks: { color: '#475569', font: { size: 11 } }
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: { color: '#475569', font: { size: 11 }, callback: v => fmt(v) }
            }
        }
    };

    // Budget donut
    const budgetData = {
        labels: ['Savings/SIP', 'Household Expenses', 'EMI / Loans', 'Other Expenses'],
        datasets: [{
            data: [
                Math.max(0, surplus),
                Math.max(0, exp),
                Math.max(0, emiV),
                Math.max(0, oth)
            ],
            backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#8b5cf6'],
            borderColor: '#0f1629',
            borderWidth: 3,
            hoverBorderWidth: 0,
        }]
    };

    const donutOptions = {
        responsive: true, maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: {
                position: 'bottom',
                labels: { color: '#94a3b8', font: { size: 11 }, padding: 12, usePointStyle: true }
            },
            tooltip: {
                backgroundColor: '#1e293b', titleColor: '#f1f5f9', bodyColor: '#94a3b8',
                callbacks: { label: ctx => ` ${ctx.label}: ${fmt(ctx.raw)}` }
            }
        }
    };

    // Pre-fill SIP from recommended
    const applyRecommended = () => {
        const rec = Math.round(recommended / 500) * 500;
        setSipAmount(String(Math.max(500, rec)));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

            {/* ── Page Title ─────────────────────────────────────────── */}
            <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 style={{ fontSize: 22, fontWeight: 800 }}>
                        Investment <span className="gradient-text">Planner</span>
                    </h2>
                    <p style={{ color: '#475569', fontSize: 14, marginTop: 4 }}>
                        Understand your finances, plan your investments, and project your future wealth
                    </p>
                </div>
                <div style={{
                    background: 'linear-gradient(135deg,#6366f120,#8b5cf620)',
                    border: '1px solid #6366f130',
                    borderRadius: 12, padding: '8px 16px',
                    display: 'flex', alignItems: 'center', gap: 8
                }}>
                    <Zap size={14} color="#f59e0b" />
                    <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>AI-Powered</span>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
          SECTION 1 — FINANCIAL OVERVIEW
      ══════════════════════════════════════════════════════════ */}
            <div className="glass-card animate-fade-in" style={{ padding: 28 }}>
                <SectionHeader
                    icon={Wallet}
                    title="Financial Overview"
                    subtitle="Enter your monthly income and expenses to calculate your investable surplus"
                    color="#6366f1"
                    badge="Step 1"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <RupeeInput
                        label="Monthly Income (take-home)"
                        value={income}
                        onChange={setIncome}
                        placeholder="e.g. 80000"
                        helpText="Your net salary/income after tax"
                    />
                    <RupeeInput
                        label="Household Expenses"
                        value={expenses}
                        onChange={setExpenses}
                        placeholder="e.g. 30000"
                        helpText="Rent, groceries, utilities, food"
                    />
                    <RupeeInput
                        label="EMI / Loan Payments"
                        value={emi}
                        onChange={setEmi}
                        placeholder="e.g. 15000"
                        helpText="Home loan, car loan, personal loan"
                    />
                    <RupeeInput
                        label="Other Monthly Expenses"
                        value={other}
                        onChange={setOther}
                        placeholder="e.g. 5000"
                        helpText="Entertainment, subscriptions, misc"
                    />
                    <RupeeInput
                        label="Existing Monthly Investments"
                        value={existing}
                        onChange={setExisting}
                        placeholder="e.g. 5000"
                        helpText="Current SIPs, RD, PPF contributions"
                    />
                </div>

                {/* Summary Row */}
                {inc > 0 && (
                    <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Breakdown toggle */}
                        <button
                            onClick={() => setShowBreakdown(!showBreakdown)}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6,
                                color: '#818cf8', fontSize: 13, fontWeight: 600, padding: 0
                            }}
                        >
                            {showBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {showBreakdown ? 'Hide' : 'Show'} Budget Breakdown
                        </button>

                        {showBreakdown && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-1">
                                {/* Stat rows */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {[
                                        { label: 'Monthly Income', val: inc, color: '#10b981', icon: TrendingUp },
                                        { label: 'Household Expenses', val: -exp, color: '#6366f1', icon: Home },
                                        { label: 'EMI / Loans', val: -emiV, color: '#f59e0b', icon: CreditCard },
                                        { label: 'Other Expenses', val: -oth, color: '#8b5cf6', icon: Wallet },
                                        { label: 'Existing Investments', val: -exst, color: '#06b6d4', icon: PiggyBank },
                                    ].map(({ label, val, color, icon: Icon }) => (
                                        <div key={label} style={{
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.02)'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Icon size={13} color={color} />
                                                <span style={{ fontSize: 13, color: '#94a3b8' }}>{label}</span>
                                            </div>
                                            <span style={{ fontSize: 13, fontWeight: 700, color: val < 0 ? '#ef4444' : color }}>
                                                {val < 0 ? '-' : '+'}{fmtFull(Math.abs(val))}
                                            </span>
                                        </div>
                                    ))}
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '10px 12px', borderRadius: 8,
                                        background: `${surplus > 0 ? '#10b981' : '#ef4444'}15`,
                                        border: `1px solid ${surplus > 0 ? '#10b981' : '#ef4444'}30`
                                    }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>Available to Invest</span>
                                        <span style={{ fontSize: 16, fontWeight: 800, color: surplus > 0 ? '#10b981' : '#ef4444' }}>
                                            {fmtFull(recommended)}
                                        </span>
                                    </div>
                                </div>
                                {/* Donut */}
                                {inc > 0 && (
                                    <div style={{ height: 220 }}>
                                        <Doughnut data={budgetData} options={donutOptions} />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Surplus meter */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-1">
                            {[
                                { label: 'Total Outflow', val: totalOutflow, color: '#ef4444' },
                                { label: 'Investable Surplus', val: surplus, color: '#10b981' },
                                { label: 'Available for New SIP', val: recommended, color: '#6366f1' },
                            ].map(({ label, val, color }) => (
                                <div key={label} style={{
                                    background: `${color}10`,
                                    border: `1px solid ${color}25`,
                                    borderRadius: 12, padding: '14px 18px'
                                }}>
                                    <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{label}</p>
                                    <p className="font-numeric" style={{ fontSize: 22, fontWeight: 800, color }}>{fmt(val)}</p>
                                </div>
                            ))}
                        </div>
                        <SurplusMeter surplus={surplus} income={inc} />
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════
          SECTION 2 — RECOMMENDED INVESTMENT
      ══════════════════════════════════════════════════════════ */}
            <div className="glass-card animate-fade-in-delay-1" style={{ padding: 28 }}>
                <SectionHeader
                    icon={Target}
                    title="Recommended Investment"
                    subtitle="Based on your financial overview"
                    color="#10b981"
                    badge="Step 2"
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Recommendation card */}
                    <div style={{
                        background: 'linear-gradient(135deg,#10b98115,#06b6d415)',
                        border: '1px solid #10b98130',
                        borderRadius: 16, padding: 24
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            <div style={{ background: '#10b98120', borderRadius: 10, padding: 8 }}>
                                <PiggyBank size={20} color="#10b981" />
                            </div>
                            <p style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600 }}>Suggested Monthly SIP</p>
                        </div>
                        <p className="font-numeric" style={{ fontSize: 36, fontWeight: 900, color: '#10b981', marginBottom: 4 }}>
                            {inc > 0 ? fmt(Math.round(recommended / 500) * 500 || 500) : '—'}
                        </p>
                        <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, marginBottom: 16 }}>
                            {inc > 0
                                ? `About ${((recommended / inc) * 100).toFixed(0)}% of your income available for investment.`
                                : 'Fill in your financial details above to get a recommendation.'}
                        </p>
                        {inc > 0 && (
                            <button
                                onClick={applyRecommended}
                                className="btn-primary"
                                style={{ fontSize: 13 }}
                            >
                                Apply to Calculator <ArrowRight size={13} />
                            </button>
                        )}
                    </div>

                    {/* Compounding teaser */}
                    <InfoCard accent="#f59e0b">
                        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                            <Lightbulb size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                            <p style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>The Power of Starting Small</p>
                        </div>
                        <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 16 }}>
                            Even small investments like{' '}
                            <span style={{ color: '#fbbf24', fontWeight: 700 }}>₹2,000 per month</span>{' '}
                            can grow significantly over time due to the power of compounding. The key is to
                            start early and stay consistent.
                        </p>
                        {/* Quick teaser rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[
                                { amount: 2000, years: 10, rate: 12 },
                                { amount: 5000, years: 15, rate: 12 },
                                { amount: 10000, years: 20, rate: 12 },
                            ].map(({ amount, years: y, rate: r }) => {
                                const fv = sipFV(amount, r, y);
                                return (
                                    <div key={amount} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '7px 10px', background: 'rgba(245,158,11,0.08)', borderRadius: 8
                                    }}>
                                        <span style={{ fontSize: 12, color: '#94a3b8' }}>
                                            ₹{amount.toLocaleString('en-IN')}/mo × {y} yrs @{r}%
                                        </span>
                                        <span style={{ fontSize: 13, fontWeight: 800, color: '#10b981' }}>{fmt(fv)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </InfoCard>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
          SECTION 3 — SIP CALCULATOR
      ══════════════════════════════════════════════════════════ */}
            <div className="glass-card animate-fade-in-delay-2" style={{ padding: 28 }}>
                <SectionHeader
                    icon={Calculator}
                    title="SIP Calculator"
                    subtitle="Calculate your future wealth with systematic investment planning"
                    color="#8b5cf6"
                    badge="Step 3"
                />

                {/* Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
                    {/* SIP Amount */}
                    <div>
                        <label className="form-label">Monthly SIP Amount</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{
                                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                                color: '#8b5cf6', fontWeight: 700, fontSize: 15, pointerEvents: 'none'
                            }}>₹</span>
                            <input
                                type="number"
                                min="500"
                                step="500"
                                value={sipAmount}
                                onChange={e => setSipAmount(e.target.value)}
                                placeholder="e.g. 5000"
                                className="input-field"
                                style={{ paddingLeft: 28 }}
                            />
                        </div>
                        <input
                            type="range" min="500" max="100000" step="500"
                            value={sipAmount || 500}
                            onChange={e => setSipAmount(e.target.value)}
                            style={{ width: '100%', marginTop: 8, accentColor: '#8b5cf6' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569' }}>
                            <span>₹500</span><span>₹1L</span>
                        </div>
                    </div>

                    {/* Expected Return */}
                    <div>
                        <label className="form-label">Expected Annual Return</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
                            {['8', '10', '12', '14', '15', '18'].map(r => (
                                <button
                                    key={r}
                                    onClick={() => setReturnRate(r)}
                                    style={{
                                        padding: '9px 4px',
                                        borderRadius: 8,
                                        border: `1px solid ${returnRate === r ? '#8b5cf6' : 'rgba(99,130,255,0.15)'}`,
                                        background: returnRate === r ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.02)',
                                        color: returnRate === r ? '#a78bfa' : '#64748b',
                                        fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {r}%
                                </button>
                            ))}
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 6, marginTop: 10,
                            padding: '6px 10px', background: 'rgba(139,92,246,0.08)', borderRadius: 8
                        }}>
                            <Info size={11} color="#8b5cf6" />
                            <span style={{ fontSize: 11, color: '#64748b' }}>
                                {returnRate <= 8 ? 'Debt / Conservative' : returnRate <= 12 ? 'Balanced / Moderate' : 'Aggressive / Equity'}
                            </span>
                        </div>
                    </div>

                    {/* Time Horizon */}
                    <div>
                        <label className="form-label">Time Horizon</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <input
                                type="range" min="1" max="40"
                                value={years}
                                onChange={e => setYears(e.target.value)}
                                style={{ flex: 1, accentColor: '#8b5cf6' }}
                            />
                            <div style={{
                                background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                                borderRadius: 10, padding: '10px 16px', minWidth: 68, textAlign: 'center'
                            }}>
                                <p className="font-numeric" style={{ fontSize: 20, fontWeight: 800, color: '#a78bfa' }}>{years}</p>
                                <p style={{ fontSize: 10, color: '#64748b' }}>years</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#475569', marginTop: 4 }}>
                            <span>1 yr</span><span>40 yrs</span>
                        </div>
                        {/* Year quick-pick */}
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            {['5', '10', '15', '20', '30'].map(y => (
                                <button key={y} onClick={() => setYears(y)} style={{
                                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                                    border: `1px solid ${years === y ? '#8b5cf6' : 'rgba(99,130,255,0.15)'}`,
                                    background: years === y ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.02)',
                                    color: years === y ? '#a78bfa' : '#64748b', cursor: 'pointer'
                                }}>{y}Y</button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Results */}
                {sipAmt > 0 && (
                    <>
                        {/* Result Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            {[
                                {
                                    label: 'Total Invested',
                                    val: totalInvested,
                                    sub: `${sipAmt.toLocaleString('en-IN')}/mo × ${yrs * 12} months`,
                                    color: '#6366f1',
                                    bg: '#6366f110'
                                },
                                {
                                    label: 'Estimated Future Value',
                                    val: futureValue,
                                    sub: `At ${returnRate}% p.a. compounded monthly`,
                                    color: '#10b981',
                                    bg: '#10b98110'
                                },
                                {
                                    label: 'Wealth Gained',
                                    val: wealthGained,
                                    sub: `${((wealthGained / totalInvested) * 100).toFixed(0)}× your investment`,
                                    color: '#f59e0b',
                                    bg: '#f59e0b10'
                                }
                            ].map(({ label, val, sub, color, bg }) => (
                                <div key={label} style={{
                                    background: bg, border: `1px solid ${color}25`,
                                    borderRadius: 14, padding: '18px 20px'
                                }}>
                                    <p style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{label}</p>
                                    <p className="font-numeric" style={{ fontSize: 26, fontWeight: 900, color, marginBottom: 4 }}>{fmt(val)}</p>
                                    <p style={{ fontSize: 11, color: '#475569' }}>{sub}</p>
                                </div>
                            ))}
                        </div>

                        {/* Line Chart */}
                        <div style={{ background: 'rgba(255,255,255,0.01)', borderRadius: 12, padding: '16px 8px', border: '1px solid rgba(99,130,255,0.08)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingLeft: 8 }}>
                                <p style={{ fontSize: 14, fontWeight: 700 }}>SIP Growth Projection</p>
                                <span className="badge badge-green">
                                    <TrendingUp size={10} /> {fmt(futureValue)} in {yrs}Y
                                </span>
                            </div>
                            <div style={{ height: 260 }}>
                                <Line data={lineData} options={lineOptions} />
                            </div>
                        </div>

                        {/* Year-by-year breakdown (condensed) */}
                        <div style={{ marginTop: 20 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Yearly Snapshot</p>
                            <div style={{ overflowX: 'auto' }}>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Year</th>
                                            <th>Invested</th>
                                            <th>Value</th>
                                            <th>Gain</th>
                                            <th>Growth</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from({ length: yrs }, (_, i) => {
                                            const y = i + 1;
                                            const inv = sipAmt * y * 12;
                                            const val = sipFV(sipAmt, rate, y);
                                            const gain = val - inv;
                                            const pct = (gain / inv) * 100;
                                            return (
                                                <tr key={y}>
                                                    <td style={{ color: '#818cf8', fontWeight: 600 }}>{y}</td>
                                                    <td className="font-numeric" style={{ fontSize: 13 }}>{fmt(inv)}</td>
                                                    <td className="font-numeric" style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>{fmt(val)}</td>
                                                    <td className="font-numeric" style={{ fontSize: 13, color: '#34d399' }}>+{fmt(gain)}</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                            <div className="progress-bar" style={{ width: 60 }}>
                                                                <div className="progress-fill" style={{
                                                                    width: `${Math.min(100, pct / 3)}%`,
                                                                    background: 'linear-gradient(to right,#10b98199,#10b981)'
                                                                }} />
                                                            </div>
                                                            <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>{pct.toFixed(0)}%</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {!sipAmt && (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>
                        <Calculator size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                        <p>Enter a monthly SIP amount above to see your wealth projection</p>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════════════════════════════════
          SECTION 4 — COMPOUNDING INSIGHT
      ══════════════════════════════════════════════════════════ */}
            <div className="animate-fade-in-delay-3" style={{
                background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.12),rgba(6,182,212,0.08))',
                border: '1px solid rgba(99,102,241,0.2)',
                borderRadius: 18, padding: 28
            }}>
                <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
                    <div style={{
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        borderRadius: 14, padding: 14, flexShrink: 0
                    }}>
                        <Lightbulb size={24} color="white" />
                    </div>
                    <div>
                        <p style={{ fontSize: 11, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                            Compounding Insight
                        </p>
                        <p style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.6, marginBottom: 12 }}>
                            "Multiple EMIs help you acquire assets like homes and cars,
                            while multiple SIPs help build the{' '}
                            <span className="gradient-text">financial freedom</span>{' '}
                            to enjoy those assets stress-free."
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-4">
                            {[
                                { icon: Home, label: 'Home Loan EMI', desc: 'Builds a roof over your head', color: '#f59e0b' },
                                { icon: Car, label: 'Car Loan EMI', desc: 'Gives you the freedom to move', color: '#06b6d4' },
                                { icon: PiggyBank, label: 'Monthly SIP', desc: 'Builds wealth to live on your terms', color: '#10b981' },
                            ].map(({ icon: Icon, label, desc, color }) => (
                                <div key={label} style={{
                                    background: `${color}10`, border: `1px solid ${color}25`,
                                    borderRadius: 12, padding: '14px 16px',
                                    display: 'flex', gap: 10, alignItems: 'flex-start'
                                }}>
                                    <Icon size={16} color={color} style={{ marginTop: 2, flexShrink: 0 }} />
                                    <div>
                                        <p style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>{label}</p>
                                        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════
          SECTION 5 — DISCLAIMER
      ══════════════════════════════════════════════════════════ */}
            <div style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                background: 'rgba(245,158,11,0.05)',
                border: '1px solid rgba(245,158,11,0.2)',
                borderRadius: 14, padding: '16px 20px'
            }}>
                <AlertTriangle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>Disclaimer</p>
                    <p style={{ fontSize: 12, color: '#78716c', lineHeight: 1.7 }}>
                        Mutual Fund investments are subject to market risks. Read all scheme related
                        documents carefully before investing. Past performance does not guarantee future
                        returns. The projections shown are based on assumed rates of return and are for
                        illustrative purposes only. Actual returns may be higher or lower.
                    </p>
                </div>
            </div>

        </div>
    );
}
