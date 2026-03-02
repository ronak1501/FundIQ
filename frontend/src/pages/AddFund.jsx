import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Search, Plus, X, Loader, CheckCircle, Upload, Calendar, TrendingUp, Info } from 'lucide-react';
import api from '../api/client';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePortfolio } from '../context/PortfolioContext';

// Convert JS Date to DD-MM-YYYY (mfapi.in date format)
function toMfapiDate(dateStr) {
    const [y, m, d] = dateStr.split('-');
    return `${d}-${m}-${y}`;
}

// Find closest NAV in the historical data array for a given date
function findClosestNav(navHistory, targetDateStr) {
    // navHistory: [{date:"DD-MM-YYYY", nav:"123.45"}, ...]
    // targetDateStr: "YYYY-MM-DD"
    const target = toMfapiDate(targetDateStr); // convert to DD-MM-YYYY
    // Try exact match first
    const exact = navHistory.find(e => e.date === target);
    if (exact) return { nav: parseFloat(exact.nav), date: exact.date, isExact: true };

    // Parse target as timestamp
    const [td, tm, ty] = target.split('-').map(Number);
    const targetTs = new Date(ty, tm - 1, td).getTime();

    // Find nearest available trading day (within 7 days before)
    let closest = null;
    let minDiff = Infinity;
    for (const e of navHistory) {
        const [ed, em, ey] = e.date.split('-').map(Number);
        const eTs = new Date(ey, em - 1, ed).getTime();
        const diff = targetTs - eTs; // we want closest <= target (no future NAVs)
        if (diff >= 0 && diff < minDiff) {
            minDiff = diff;
            closest = e;
        }
    }
    if (closest) {
        const [ed, em, ey] = closest.date.split('-');
        return { nav: parseFloat(closest.nav), date: closest.date, isExact: false, displayDate: `${ed}-${em}-${ey}` };
    }
    return null;
}

export default function AddFund() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const query = searchParams.get('search');
    const { fetchPortfolio } = usePortfolio();

    const [searchQuery, setSearchQuery] = useState(query || '');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedFund, setSelectedFund] = useState(null);
    const [navData, setNavData] = useState(null);      // current NAV info
    const [historicalNavData, setHistoricalNavData] = useState(null); // {nav, date, isExact}
    const [navHistory, setNavHistory] = useState([]);        // full history array
    const [loadingNav, setLoadingNav] = useState(false);
    const [loadingHistNav, setLoadingHistNav] = useState(false);
    const [form, setForm] = useState({
        investedAmount: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        isSIP: false, sipAmount: '', sipDay: '1'
    });
    const [submitting, setSubmitting] = useState(false);
    const searchTimeout = useRef(null);

    // Effective NAV to use: historical (if past date selected) or current NAV
    const today = new Date().toISOString().split('T')[0];
    const isPastDate = form.purchaseDate < today;
    const activeNav = isPastDate ? historicalNavData?.nav : navData?.nav;
    const units = activeNav && form.investedAmount
        ? (parseFloat(form.investedAmount) / activeNav).toFixed(4)
        : '';

    // ── Select fund: fetch current NAV + full history ─────────────────────
    const selectFund = useCallback(async (fund) => {
        setSelectedFund(fund);
        setSearchResults([]);
        setSearchQuery(fund.schemeName);
        setNavData(null);
        setNavHistory([]);
        setHistoricalNavData(null);
        setLoadingNav(true);
        try {
            // Fetch full history (used for historical NAV lookup on date change)
            const { data } = await api.get(`/portfolio/nav-history/${fund.schemeCode}`);
            setNavData({ nav: data.currentNav, schemeCategory: data.schemeCategory, fundHouse: data.fundHouse });
            setNavHistory(data.history || []);
            // If a past date is already selected, resolve its NAV immediately
            if (form.purchaseDate < today && data.history?.length) {
                const h = findClosestNav(data.history, form.purchaseDate);
                setHistoricalNavData(h);
            }
        } catch (err) {
            // Fallback: try fetching just current NAV
            try {
                const res = await api.get(`/portfolio/nav/${fund.schemeCode}`);
                setNavData({ nav: res.data.nav, schemeCategory: res.data.schemeCategory, fundHouse: res.data.fundHouse });
                toast('⚠️ Historical NAV unavailable — using current NAV only', { icon: '🕐' });
            } catch {
                toast.error('Could not fetch NAV data. Please check your connection and try again.');
                setSelectedFund(null);
            }
        } finally {
            setLoadingNav(false);
        }
    }, [form.purchaseDate, today]);

    // ── Search ────────────────────────────────────────────────────────────
    const handleSearch = useCallback((q, immediate = false) => {
        setSearchQuery(q);
        clearTimeout(searchTimeout.current);
        if (q.length < 3) { setSearchResults([]); return; }

        const executeSearch = async () => {
            setSearching(true);
            try {
                const res = await api.get('/portfolio/search?q=' + encodeURIComponent(q));
                setSearchResults(res.data);

                // Smart Auto-select for Suggestions
                if (immediate && res.data.length > 0) {
                    const first = res.data[0];
                    const qNorm = q.toLowerCase().replace(/\s+/g, '');
                    const fNorm = first.schemeName.toLowerCase().replace(/\s+/g, '');

                    if (fNorm.includes(qNorm) || qNorm.includes(fNorm)) {
                        toast.success(`AI Selected: ${first.schemeName.slice(0, 30)}...`, { duration: 4000 });
                        selectFund(first);
                    }
                }
            } catch { setSearchResults([]); }
            finally { setSearching(false); }
        };

        if (immediate) {
            executeSearch();
        } else {
            searchTimeout.current = setTimeout(executeSearch, 400);
        }
    }, [selectFund]);

    // Trigger search if coming from a suggestion
    useEffect(() => {
        if (query && query.length >= 3) {
            setSearchQuery(query); // Ensure input shows the name immediately
            toast('AI Recommendation: Finding fund details...', { icon: '🔍', duration: 3000 });
            handleSearch(query, true); // Use immediate flag for suggestions
        }
    }, [query, handleSearch]);



    // ── Date changes: re-resolve historical NAV ───────────────────────────
    useEffect(() => {
        if (!selectedFund || !navHistory.length) return;
        if (form.purchaseDate >= today) {
            setHistoricalNavData(null);  // use current NAV
            return;
        }
        setLoadingHistNav(true);
        const h = findClosestNav(navHistory, form.purchaseDate);
        setHistoricalNavData(h);
        setLoadingHistNav(false);
    }, [form.purchaseDate, navHistory]);

    // ── Submit ────────────────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFund) return toast.error('Please select a fund first');
        if (!activeNav) return toast.error('Could not determine NAV for selected date. Try a different date.');
        if (!form.investedAmount) return toast.error('Please enter the invested amount');

        const computedUnits = parseFloat(form.investedAmount) / activeNav;

        setSubmitting(true);
        try {
            await api.post('/portfolio/add', {
                schemeCode: selectedFund.schemeCode,
                units: parseFloat(computedUnits.toFixed(4)),
                investedAmount: parseFloat(form.investedAmount),
                purchaseDate: form.purchaseDate,
                buyNav: activeNav,
                isSIP: form.isSIP,
                sipAmount: form.sipAmount ? parseFloat(form.sipAmount) : 0,
                sipDay: form.sipDay ? parseInt(form.sipDay) : 1
            });
            toast.success(`${selectedFund.schemeName.slice(0, 30)} added to portfolio! 🎉`);
            // Invalidate context so dashboard refreshes
            await fetchPortfolio({ silent: true });
            navigate('/portfolio');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to add fund');
        } finally {
            setSubmitting(false);
        }
    };

    const reset = () => {
        setSelectedFund(null); setNavData(null); setNavHistory([]); setHistoricalNavData(null);
        setSearchQuery(''); setSearchResults([]);
        setForm({ investedAmount: '', purchaseDate: today, isSIP: false, sipAmount: '', sipDay: '1' });
    };

    const currentValue = activeNav && units ? parseFloat(navData?.nav || 0) * parseFloat(units) : 0;
    const pnl = currentValue - parseFloat(form.investedAmount || 0);
    const pnlPct = form.investedAmount > 0 ? (pnl / parseFloat(form.investedAmount)) * 100 : 0;
    const daysHeld = (new Date(today) - new Date(form.purchaseDate)) / 86400000;
    const cagr = daysHeld > 30 && form.investedAmount > 0 && currentValue > 0
        ? (Math.pow(currentValue / parseFloat(form.investedAmount), 365 / daysHeld) - 1) * 100
        : null;

    return (
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
                <h1 style={{ fontSize: 22, fontWeight: 700 }}>Add Mutual Fund</h1>
                <p style={{ color: '#475569', fontSize: 14 }}>Search from 10,000+ funds · Historical NAV auto-fetched for past purchases</p>
            </div>

            {/* ── Step 1: Search ── */}
            <div className="glass-card animate-fade-in" style={{ padding: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'white' }}>1</span>
                    Search &amp; Select Fund
                </h3>
                <div style={{ position: 'relative' }}>
                    <input
                        className="input-field"
                        value={searchQuery}
                        onChange={e => handleSearch(e.target.value)}
                        placeholder="Type fund name, e.g. HDFC Midcap, Axis Bluechip..."
                        style={{ paddingLeft: 40 }}
                    />
                    <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
                    {searching && <Loader size={14} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#6366f1', animation: 'spin 1s linear infinite' }} />}
                    {selectedFund && (
                        <button onClick={reset} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#af6464' }}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                {searchResults.length > 0 && (
                    <div style={{ background: '#111827', border: '1px solid rgba(99,130,255,0.2)', borderRadius: 12, marginTop: 8, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', maxHeight: 260, overflowY: 'auto' }}>
                        {searchResults.map((f, i) => (
                            <button key={i} onClick={() => selectFund(f)}
                                style={{ width: '100%', textAlign: 'left', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid rgba(99,130,255,0.06)', color: '#f1f5f9', transition: 'background 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.08)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                <p style={{ fontWeight: 500, fontSize: 13 }}>{f.schemeName}</p>
                                <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>Code: {f.schemeCode}</p>
                            </button>
                        ))}
                    </div>
                )}

                {selectedFund && (
                    <div className="animate-fade-in" style={{ marginTop: 16, padding: 16, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                    <CheckCircle size={16} color="#10b981" />
                                    <p style={{ fontWeight: 700, fontSize: 14 }}>{selectedFund.schemeName}</p>
                                </div>
                                <p style={{ fontSize: 12, color: '#475569' }}>Scheme Code: {selectedFund.schemeCode}</p>
                                {navData?.schemeCategory && <span className="badge badge-blue" style={{ marginTop: 6, display: 'inline-block' }}>{navData.schemeCategory?.slice(0, 30)}</span>}
                            </div>
                            {loadingNav ? (
                                <Loader size={20} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                            ) : navData && (
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: 11, color: '#64748b' }}>Current NAV</p>
                                    <p className="font-numeric" style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>₹{navData.nav?.toFixed(4)}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Step 2: Investment Details ── */}
            {selectedFund && (
                <form onSubmit={handleSubmit} className="animate-fade-in">
                    <div className="glass-card" style={{ padding: 24 }}>
                        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'white' }}>2</span>
                            Investment Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                            {/* Invested Amount */}
                            <div>
                                <label className="form-label">Amount Invested (₹) *</label>
                                <input className="input-field" type="number" placeholder="10000" min="1"
                                    value={form.investedAmount}
                                    onChange={e => setForm(f => ({ ...f, investedAmount: e.target.value }))}
                                    required />
                            </div>

                            {/* Purchase Date */}
                            <div>
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Calendar size={12} color="#6366f1" />
                                    Purchase Date *
                                    {isPastDate && <span className="badge badge-blue" style={{ fontSize: 10 }}>Historical NAV</span>}
                                </label>
                                <input
                                    className="input-field"
                                    type="date"
                                    value={form.purchaseDate}
                                    max={today}
                                    onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))}
                                    required
                                />
                            </div>

                            {/* NAV display (historical or current) */}
                            <div>
                                <label className="form-label">
                                    {isPastDate ? `NAV on ${form.purchaseDate}` : 'Current NAV (Buy NAV)'}
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        className="input-field"
                                        type="text"
                                        readOnly
                                        value={
                                            loadingHistNav ? 'Fetching…'
                                                : activeNav ? `₹${activeNav.toFixed(4)}`
                                                    : 'Select a fund'
                                        }
                                        style={{ opacity: 0.8, background: 'rgba(99,102,241,0.05)' }}
                                    />
                                    {loadingHistNav && <Loader size={13} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6366f1', animation: 'spin 1s linear infinite' }} />}
                                </div>
                                {/* Show which date's NAV was actually used */}
                                {isPastDate && historicalNavData && !loadingHistNav && (
                                    <p style={{ fontSize: 11, marginTop: 4, color: historicalNavData.isExact ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Info size={10} />
                                        {historicalNavData.isExact
                                            ? `Exact NAV found for ${form.purchaseDate}`
                                            : `Using nearest trading day NAV (${historicalNavData.date})`
                                        }
                                    </p>
                                )}
                                {isPastDate && !historicalNavData && !loadingHistNav && navHistory.length > 0 && (
                                    <p style={{ fontSize: 11, marginTop: 4, color: '#ef4444' }}>⚠ No NAV data available before this date</p>
                                )}
                            </div>

                            {/* Auto-calculated units */}
                            <div>
                                <label className="form-label">Units Allotted (auto-calculated)</label>
                                <input
                                    className="input-field"
                                    type="text"
                                    readOnly
                                    value={units ? `${units} units` : activeNav ? 'Enter amount' : '—'}
                                    style={{ opacity: 0.8, background: 'rgba(99,102,241,0.05)', fontWeight: 600, color: '#a78bfa' }}
                                />
                                {units && activeNav && (
                                    <p style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                                        {parseFloat(units).toFixed(4)} × ₹{activeNav.toFixed(4)} = ₹{parseFloat(form.investedAmount).toFixed(2)}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* SIP Toggle */}
                        <div style={{ marginTop: 20, padding: 16, background: 'rgba(139,92,246,0.06)', borderRadius: 12, border: '1px solid rgba(139,92,246,0.15)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: form.isSIP ? 16 : 0 }}>
                                <input type="checkbox" id="isSIP" checked={form.isSIP}
                                    onChange={e => setForm({ ...form, isSIP: e.target.checked })}
                                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#8b5cf6' }} />
                                <label htmlFor="isSIP" style={{ cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#a78bfa' }}>
                                    🔄 This is a SIP (Systematic Investment Plan)
                                </label>
                            </div>
                            {form.isSIP && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="animate-fade-in">
                                    <div>
                                        <label className="form-label">Monthly SIP Amount (₹)</label>
                                        <input className="input-field" type="number" placeholder="5000"
                                            value={form.sipAmount} onChange={e => setForm({ ...form, sipAmount: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="form-label">SIP Date (Day of month)</label>
                                        <input className="input-field" type="number" min="1" max="28" placeholder="1"
                                            value={form.sipDay} onChange={e => setForm({ ...form, sipDay: e.target.value })} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ── Performance Preview Card ── */}
                        {activeNav && form.investedAmount && units && (
                            <div className="animate-fade-in" style={{ marginTop: 16, padding: 20, background: 'rgba(16,185,129,0.05)', borderRadius: 14, border: '1px solid rgba(16,185,129,0.18)' }}>
                                <p style={{ fontSize: 12, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
                                    <TrendingUp size={12} style={{ marginRight: 5 }} />
                                    Performance Snapshot
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                                    {/* Buy NAV */}
                                    <div style={{ textAlign: 'center', padding: '10px 6px', background: 'rgba(99,102,241,0.07)', borderRadius: 10 }}>
                                        <p style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>{isPastDate ? 'BUY NAV' : 'NAV'}</p>
                                        <p className="font-numeric" style={{ fontWeight: 800, color: '#818cf8', fontSize: 16 }}>₹{activeNav.toFixed(2)}</p>
                                    </div>
                                    {/* Current Value */}
                                    <div style={{ textAlign: 'center', padding: '10px 6px', background: 'rgba(16,185,129,0.07)', borderRadius: 10 }}>
                                        <p style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>CURRENT VALUE</p>
                                        <p className="font-numeric" style={{ fontWeight: 800, color: '#10b981', fontSize: 16 }}>₹{Math.round(currentValue).toLocaleString('en-IN')}</p>
                                    </div>
                                    {/* P&L */}
                                    <div style={{ textAlign: 'center', padding: '10px 6px', background: `${pnl >= 0 ? 'rgba(16,185,129' : 'rgba(239,68,68'}.07)`, borderRadius: 10 }}>
                                        <p style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>P&amp;L ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%)</p>
                                        <p className="font-numeric" style={{ fontWeight: 800, color: pnl >= 0 ? '#10b981' : '#ef4444', fontSize: 16 }}>
                                            {pnl >= 0 ? '+' : ''}₹{Math.round(pnl).toLocaleString('en-IN')}
                                        </p>
                                    </div>
                                    {/* CAGR */}
                                    <div style={{ textAlign: 'center', padding: '10px 6px', background: 'rgba(245,158,11,0.07)', borderRadius: 10 }}>
                                        <p style={{ fontSize: 10, color: '#475569', marginBottom: 4 }}>CAGR</p>
                                        <p className="font-numeric" style={{ fontWeight: 800, color: '#f59e0b', fontSize: 16 }}>
                                            {cagr !== null ? `${cagr >= 0 ? '+' : ''}${cagr.toFixed(1)}%` : `${daysHeld > 0 ? Math.floor(daysHeld) + 'd' : 'Today'}`}
                                        </p>
                                    </div>
                                </div>
                                {isPastDate && daysHeld > 0 && (
                                    <p style={{ fontSize: 11, color: '#475569', marginTop: 10, textAlign: 'center' }}>
                                        📅 Held for <strong style={{ color: '#94a3b8' }}>{Math.floor(daysHeld)} days</strong>
                                        {daysHeld >= 365 && ` (${(daysHeld / 365).toFixed(1)} years)`}
                                        {daysHeld >= 365 && <> · <span style={{ color: '#f59e0b' }}>Long-term capital gains apply</span></>}
                                        {daysHeld < 365 && daysHeld >= 30 && <> · <span style={{ color: '#f97316' }}>Short-term gains (STCG)</span></>}
                                    </p>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                            <button type="submit" className="btn-primary" disabled={submitting || !activeNav || !form.investedAmount} style={{ flex: 1, justifyContent: 'center', padding: '13px', opacity: (!activeNav || !form.investedAmount) ? 0.5 : 1 }}>
                                {submitting
                                    ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Adding…</>
                                    : <><Plus size={14} /> Add to Portfolio</>
                                }
                            </button>
                            <button type="button" className="btn-secondary" onClick={reset}>Reset</button>
                        </div>
                    </div>
                </form>
            )}

            {/* Info box when no fund selected */}
            {!selectedFund && (
                <div className="glass-card animate-fade-in" style={{ padding: 28, borderStyle: 'dashed', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, opacity: 0.7 }}>
                    <Upload size={36} color="#475569" />
                    <p style={{ color: '#475569', textAlign: 'center', fontSize: 14, lineHeight: 1.7 }}>
                        Search and select a mutual fund above to add it to your portfolio.<br />
                        <strong style={{ color: '#6366f1' }}>🕐 Past Purchase?</strong> Select the date you bought — we'll auto-fetch that day's NAV<br />
                        and compute your exact units &amp; returns since then.
                    </p>
                </div>
            )}
        </div>
    );
}
