/**
 * PortfolioContext — fetches portfolio data ONCE and shares it across all pages.
 * Dashboard, Insights, Portfolio pages all read from here — no duplicate API calls.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';
import { useAuth } from './AuthContext';

const PortfolioContext = createContext(null);

export function PortfolioProvider({ children }) {
    const { user } = useAuth();

    const [data, setData] = useState(() => {
        // Hydrate from sessionStorage for instant first paint
        try {
            const c = sessionStorage.getItem('portfolio_cache');
            return c ? JSON.parse(c) : null;
        } catch { return null; }
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [forceRefreshing, setForceRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const fetchedOnce = useRef(false);

    // ── Normal load — reads MongoDB + daily NAV cache (near-instant) ──────────
    const fetchPortfolio = useCallback(async ({ silent = false } = {}) => {
        if (!user) return;
        if (!silent) {
            if (!data) setLoading(true);
            else setRefreshing(true);
        }
        setError(null);
        try {
            const res = await api.get('/portfolio');
            setData(res.data);
            try { sessionStorage.setItem('portfolio_cache', JSON.stringify(res.data)); } catch { }
        } catch (err) {
            setError(err?.response?.data?.message || 'Failed to load portfolio');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [user]);

    // ── Force refresh — bypasses cache, hits mfapi.in fresh ──────────────────
    const forceRefresh = useCallback(async () => {
        if (!user) return;
        setForceRefreshing(true);
        setError(null);
        try {
            const res = await api.post('/portfolio/refresh-nav');
            setData(res.data);
            try { sessionStorage.setItem('portfolio_cache', JSON.stringify(res.data)); } catch { }
        } catch (err) {
            setError(err?.response?.data?.message || 'Refresh failed');
        } finally {
            setForceRefreshing(false);
        }
    }, [user]);

    // Fetch once when user logs in
    useEffect(() => {
        if (user && !fetchedOnce.current) {
            fetchedOnce.current = true;
            // If we have cached data, load silently in background so UI is instant
            fetchPortfolio({ silent: !!data });
        }
        if (!user) {
            // Clear data on logout
            setData(null);
            setLoading(true);
            fetchedOnce.current = false;
            try { sessionStorage.removeItem('portfolio_cache'); } catch { }
        }
    }, [user]);

    return (
        <PortfolioContext.Provider value={{
            data,
            loading,
            refreshing,
            forceRefreshing,
            error,
            fetchPortfolio,
            forceRefresh,
            // Convenience accessors
            holdings: data?.holdings || [],
            summary: data?.summary || {},
            allocation: data?.allocation || {},
            suggestions: data?.suggestions || [],
            navUpdatedAt: data?.navUpdatedAt,
        }}>
            {children}
        </PortfolioContext.Provider>
    );
}

export function usePortfolio() {
    const ctx = useContext(PortfolioContext);
    if (!ctx) throw new Error('usePortfolio must be used inside PortfolioProvider');
    return ctx;
}
