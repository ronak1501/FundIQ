import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    TrendingUp, LayoutDashboard, PieChart, Plus, Calculator,
    Lightbulb, LogOut, Menu, X, Bell, ChevronDown, User, BookOpen
} from 'lucide-react';

const navGroups = [
    {
        label: 'Main Menu',
        items: [
            { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
            { icon: PieChart, label: 'Portfolio', path: '/portfolio' },
            { icon: Plus, label: 'Add Fund', path: '/add-fund' },
        ]
    },
    {
        label: 'Planning & Insights',
        items: [
            { icon: BookOpen, label: 'Investment Planner', path: '/investment-planner' },
            { icon: Calculator, label: 'SIP Calculator', path: '/sip-calculator' },
            { icon: Lightbulb, label: 'AI Insights', path: '/insights' },
        ]
    }
];
const navItems = navGroups.flatMap(g => g.items);

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const handleNav = (path) => {
        navigate(path);
        setSidebarOpen(false);
    };

    return (
        <div className="flex h-screen bg-[#0a0e1a] overflow-hidden text-[#f1f5f9]">
            {/* Sidebar Overlay (mobile) */}
            {sidebarOpen && (
                <div onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden" />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:relative inset-y-0 left-0 z-50 w-60 shrink-0 flex flex-col pt-5 pb-5 px-3 transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
                style={{
                    background: '#0f1629',
                    borderRight: '1px solid rgba(99,130,255,0.12)',
                }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, padding: '0 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
                        <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: 10, padding: 8 }}>
                            <TrendingUp size={18} color="white" />
                        </div>
                        <div>
                            <p style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.5px' }}>FundIQ</p>
                            <p style={{ fontSize: 9, color: '#6366f1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>AI Portfolio</p>
                        </div>
                    </div>
                    {/* Mobile close button */}
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden" style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Nav */}
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
                    {navGroups.map((group) => (
                        <div key={group.label} style={{ marginBottom: 8 }}>
                            <p style={{ fontSize: 10, color: '#334155', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, padding: '0 16px', marginBottom: 6, marginTop: 8 }}>
                                {group.label}
                            </p>
                            {group.items.map(item => (
                                <button
                                    key={item.path}
                                    onClick={() => handleNav(item.path)}
                                    className={`sidebar-link ${location.pathname === item.path ? 'active' : ''}`}
                                    style={location.pathname === item.path ? { position: 'relative' } : {}}>
                                    {location.pathname === item.path && (
                                        <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 20, background: 'linear-gradient(#6366f1,#8b5cf6)', borderRadius: '0 4px 4px 0' }} />
                                    )}
                                    <item.icon size={17} />
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* User section */}
                <div style={{ borderTop: '1px solid rgba(99,130,255,0.1)', paddingTop: 16 }}>
                    <button
                        onClick={() => setUserMenuOpen(!userMenuOpen)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, border: 'none', background: 'rgba(99,102,241,0.08)', cursor: 'pointer', color: '#f1f5f9' }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>
                            {user?.name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{user?.name}</p>
                            <p style={{ fontSize: 11, color: '#475569' }}>{user?.riskProfile}</p>
                        </div>
                        <ChevronDown size={14} color="#475569" />
                    </button>
                    {userMenuOpen && (
                        <div style={{ marginTop: 8, padding: 8, background: '#111827', borderRadius: 10, border: '1px solid rgba(99,130,255,0.15)' }}>
                            <button onClick={logout} className="sidebar-link" style={{ color: '#f87171', width: '100%' }}>
                                <LogOut size={15} /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden lg:pl-4">
                {/* Topbar */}
                <header className="shrink-0 flex items-center justify-center sticky top-0 z-30 px-6 h-16"
                    style={{
                        background: 'rgba(10,14,26,0.95)', backdropFilter: 'blur(20px)',
                        borderBottom: '1px solid rgba(99,130,255,0.1)'
                    }}>
                    <div className="max-w-[1400px] w-full flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setSidebarOpen(true)} className="lg:hidden bg-transparent border-none text-[#f1f5f9] cursor-pointer flex">
                                <Menu size={22} />
                            </button>
                            <div>
                                <h2 className="font-bold text-lg">
                                    {navItems.find(n => n.path === location.pathname)?.label || 'Dashboard'}
                                </h2>
                                <p className="text-xs text-[#475569] hidden sm:block">
                                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="relative bg-[#6366f11a] border border-[#6366f133] rounded-lg p-2 cursor-pointer flex">
                                <Bell size={17} color="#818cf8" />
                                <span className="notification-dot" />
                            </button>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#6366f114] rounded-lg border border-[#6366f133]">
                                <div className="w-7 h-7 rounded bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center font-bold text-xs">
                                    {user?.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <span className="hidden sm:inline text-sm font-semibold">{user?.name?.split(' ')[0]}</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <div className="max-w-[1400px] mx-auto w-full pb-10">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
