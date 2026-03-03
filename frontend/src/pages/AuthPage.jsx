import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Eye, EyeOff, Loader, Shield, BarChart2, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '', email: '', password: '', riskProfile: 'Moderate'
    });
    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isLogin) {
                await login(form.email, form.password);
                toast.success('Welcome back! 🚀');
            } else {
                await register(form.name, form.email, form.password, form.riskProfile);
                toast.success('Account created! Let\'s start investing 🎉');
            }
            navigate('/dashboard');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const features = [
        { icon: BarChart2, title: 'Real-time NAV Tracking', desc: 'Live data from AMFI for all mutual funds' },
        { icon: Shield, title: 'AI Risk Analysis', desc: 'Smart portfolio risk scoring & suggestions' },
        { icon: Zap, title: 'SIP Projections', desc: 'Visualize your wealth growth with compounding' },
    ];

    return (
        <div className="auth-bg min-h-screen flex justify-center w-full">
            <div className="max-w-[1400px] w-full flex">
                {/* Left Panel */}
                <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 xl:p-20">
                    <div className="flex items-center gap-3">
                        <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 12, padding: '8px' }}>
                            <TrendingUp size={24} color="white" />
                        </div>
                        <div>
                            <h1 className="font-numeric" style={{ fontSize: 20, fontWeight: 800, color: '#f1f5f9' }}>FundIQ</h1>
                            <p style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>AI Portfolio Intelligence</p>
                        </div>
                    </div>

                    <div>
                        <h2 style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
                            <span className="gradient-text">Intelligent</span><br />
                            Mutual Fund<br />Portfolio Manager
                        </h2>
                        <p style={{ color: '#64748b', fontSize: 16, marginBottom: 40, lineHeight: 1.6 }}>
                            Track, analyze, and optimize your mutual fund portfolio with AI-driven insights and real-time NAV data.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {features.map((f, i) => (
                                <div key={i} className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 10, padding: 10 }}>
                                        <f.icon size={18} color="white" />
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 600, fontSize: 14 }}>{f.title}</p>
                                        <p style={{ color: '#64748b', fontSize: 12 }}>{f.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ padding: 20, borderRadius: 12, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                            {['₹2.4Cr+', '1,247', '18.4%'].map((v, i) => (
                                <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                                    <p className="font-numeric" style={{ fontSize: 22, fontWeight: 800, color: '#818cf8' }}>{v}</p>
                                    <p style={{ fontSize: 11, color: '#475569' }}>{['Assets Tracked', 'Active Portfolios', 'Avg CAGR'][i]}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full max-w-md">
                        {/* Mobile logo */}
                        <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
                            <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 12, padding: '8px' }}>
                                <TrendingUp size={22} color="white" />
                            </div>
                            <span className="font-numeric" style={{ fontSize: 22, fontWeight: 800 }}>FundIQ</span>
                        </div>

                        <div className="glass-card" style={{ padding: 32 }}>
                            {/* Tab Switcher */}
                            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 4, marginBottom: 28 }}>
                                {['Login', 'Sign Up'].map((tab, i) => (
                                    <button key={i}
                                        onClick={() => setIsLogin(i === 0)}
                                        style={{
                                            flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                            fontWeight: 600, fontSize: 14, transition: 'all 0.3s',
                                            background: isLogin === (i === 0) ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                                            color: isLogin === (i === 0) ? 'white' : '#64748b'
                                        }}>
                                        {tab}
                                    </button>
                                ))}
                            </div>

                            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
                                {isLogin ? 'Welcome back' : 'Create account'}
                            </h3>
                            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24 }}>
                                {isLogin ? 'Login to your portfolio dashboard' : 'Start your investment journey today'}
                            </p>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {!isLogin && (
                                    <div>
                                        <label className="form-label">Full Name</label>
                                        <input
                                            className="input-field"
                                            type="text" placeholder="Arjun Sharma"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            required={!isLogin}
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="form-label">Email Address</label>
                                    <input
                                        className="input-field"
                                        type="email" placeholder="arjun@example.com"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Password</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className="input-field"
                                            type={showPass ? 'text' : 'password'}
                                            placeholder="Min 6 characters"
                                            value={form.password}
                                            onChange={e => setForm({ ...form, password: e.target.value })}
                                            required style={{ paddingRight: 44 }}
                                        />
                                        <button type="button" onClick={() => setShowPass(!showPass)}
                                            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                            {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                {!isLogin && (
                                    <div>
                                        <label className="form-label">Risk Profile</label>
                                        <select className="input-field"
                                            value={form.riskProfile}
                                            onChange={e => setForm({ ...form, riskProfile: e.target.value })}>
                                            <option>Conservative</option>
                                            <option>Moderate</option>
                                            <option>Aggressive</option>
                                        </select>
                                    </div>
                                )}

                                <button className="btn-primary" type="submit" disabled={loading}
                                    style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: 15, marginTop: 8 }}>
                                    {loading ? <><Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</> : isLogin ? '🚀 Login to Dashboard' : '✨ Create Account'}
                                </button>
                            </form>

                            {isLogin && (
                                <p style={{ textAlign: 'center', fontSize: 13, color: '#475569', marginTop: 20 }}>
                                    Demo: <span style={{ color: '#818cf8', fontWeight: 600 }}>test@demo.com</span> / <span style={{ color: '#818cf8', fontWeight: 600 }}>password123</span>
                                </p>
                            )}
                        </div>

                        <p style={{ textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 16 }}>
                            By continuing, you agree to our Terms & Privacy Policy
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
