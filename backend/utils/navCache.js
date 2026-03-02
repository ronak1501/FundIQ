/**
 * Persistent Daily NAV Cache
 * - Stores NAV data keyed by schemeCode in a JSON file
 * - TTL: 24 hours (configurable via NAV_CACHE_TTL_HOURS env)
 * - File survives server restarts; stale entries are auto-cleared
 */

const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../data/nav-cache.json');
const TTL_MS = (parseInt(process.env.NAV_CACHE_TTL_HOURS) || 24) * 60 * 60 * 1000;

// ── Load cache from disk on startup ───────────────────────────────────────
let store = {};
try {
    if (fs.existsSync(CACHE_FILE)) {
        store = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        const total = Object.keys(store).length;
        const valid = Object.values(store).filter(e => e.expiresAt > Date.now()).length;
        console.log(`📦 NAV cache loaded: ${valid}/${total} entries valid`);
    }
} catch (e) {
    console.warn('⚠️  Could not load NAV cache:', e.message);
    store = {};
}

// ── Save cache to disk ─────────────────────────────────────────────────────
let saveTimer = null;
function persistCache() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        try {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(store, null, 2), 'utf8');
        } catch (e) {
            console.warn('⚠️  Could not save NAV cache:', e.message);
        }
    }, 500); // debounce — batch writes
}

// ── Public API ─────────────────────────────────────────────────────────────
const navCache = {
    /**
     * Get cached NAV data for a scheme code.
     * Returns the data if it exists and is not expired; null otherwise.
     */
    get(schemeCode) {
        const entry = store[schemeCode];
        if (!entry) return null;
        if (entry.expiresAt < Date.now()) {
            delete store[schemeCode];
            return null;
        }
        return entry.data;
    },

    /**
     * Store NAV data for a scheme code.
     * Automatically sets expiry and persists to disk.
     */
    set(schemeCode, data) {
        store[schemeCode] = {
            data,
            cachedAt: Date.now(),
            expiresAt: Date.now() + TTL_MS,
        };
        persistCache();
    },

    /**
     * Get raw entry including metadata (cachedAt, expiresAt).
     */
    getMeta(schemeCode) {
        return store[schemeCode] || null;
    },

    /**
     * Force-expire a set of scheme codes (or all if none given).
     * Call before a manual force-refresh.
     */
    invalidate(schemeCodes = null) {
        if (!schemeCodes) {
            store = {};
        } else {
            schemeCodes.forEach(c => delete store[c]);
        }
        persistCache();
    },

    /**
     * Return all scheme codes that currently have a valid (non-expired) cache entry.
     */
    validKeys() {
        const now = Date.now();
        return Object.entries(store)
            .filter(([, v]) => v.expiresAt > now)
            .map(([k]) => k);
    },

    /**
     * Timestamp of oldest cached entry (useful to show "last updated" on UI).
     */
    oldestCachedAt() {
        const entries = Object.values(store).filter(e => e.expiresAt > Date.now());
        if (!entries.length) return null;
        return Math.min(...entries.map(e => e.cachedAt));
    },

    /**
     * Returns { schemeCode: cachedAt } for all valid entries.
     */
    getCacheStatus() {
        const now = Date.now();
        const result = {};
        Object.entries(store).forEach(([k, v]) => {
            if (v.expiresAt > now) result[k] = v.cachedAt;
        });
        return result;
    },

    /**
   * Store any arbitrary object under a key with the given TTL (ms).
   * Used for caching historical NAV objects that don't fit the standard shape.
   */
    setRaw(key, data, ttlMs = TTL_MS) {
        store[key] = {
            data,
            cachedAt: Date.now(),
            expiresAt: Date.now() + ttlMs,
        };
        persistCache();
    },

    get size() {
        return Object.keys(store).length;
    }
};

module.exports = navCache;
