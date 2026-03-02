# 🎓 FundIQ: Interview Technical Deep-Dive

This guide explains the "Why" and "How" behind the most critical parts of the FundIQ codebase. Use this to explain your architectural decisions during an interview.

---

## 1. Backend: High-Performance NAV Caching (`fetchNAV`)
**File**: `backend/routes/portfolio.js`

### How it works:
Instead of calling the external API every time a user loads the dashboard (which would be slow and hit rate limits), we use a two-layer caching system:
1.  **Memory Cache**: Stores NAV data in a JS Map for instant retrieval.
2.  **File Cache (`nav-cache.json`)**: Persists the memory cache to disk so that if the server restarts, we don't lose the data.

### Key Logic:
```javascript
// Step 1: Check if we have "fresh" data in cache
const cached = navCache.get(schemeCode);
if (cached && cached.returns) return cached; // Served in < 1ms

// Step 2: If not, fetch for the last ~10 years of data
const { data } = await axios.get(`https://api.mfapi.in/mf/${schemeCode}`);

// Step 3: Calculate returns (1Y, 3Y, 5Y, SI) and store it
const returns = calculateReturns(data.data);
navCache.set(schemeCode, { nav, returns, meta });
```

### Potential Interview Question:
**"How would you handle a case where the External API is down?"**
**Your Answer**: "I implemented a fallback mechanism. The `fetchNAV` function is wrapped in a try/catch block. If the API fails, the code looks for 'Stale' data in the cache (older than 24h) and serves that instead of showing an error. This ensures a resilient User Experience."

---

## 2. Frontend: Deep Linking & Auto-Search Logic
**File**: `frontend/src/pages/AddFund.jsx`

### How it works:
We use a "Deep Link" pattern. When a user clicks a suggestion, we pass a query parameter in the URL.

### Key Logic:
```javascript
const [searchParams] = useSearchParams();
const query = searchParams.get('search'); // Read from URL ?search=HDFC...

useEffect(() => {
    if (query) {
        handleSearch(query, true); // The 'true' flag triggers "Immediate Select"
    }
}, [query]);
```

### Why this is impressive:
*   **UX Design**: It removes the "Friction" of a user having to remember a fund name, navigate to a page, type it in, and click. It bridges the gap between "Insight" and "Action".
*   **Smart Selection**: The `handleSearch` has a "Confidence Check" that auto-selects the first result if the name matches the query, making the transition feel like magic.

---

## 3. Frontend: State Management (`PortfolioContext.jsx`)
**File**: `frontend/src/context/PortfolioContext.jsx`

### How it works:
Managing portfolio data (holdings, total value, XIRR) is complex. We use a single **Global Context** so that if you add a fund on the "Add Fund" page, the "Dashboard" and "Portfolio" pages update automatically without a page reload.

### Key Logic:
```javascript
export const PortfolioProvider = ({ children }) => {
    const [data, setData] = useState(null);
    
    const fetchPortfolio = async () => {
        const res = await api.get('/portfolio');
        setData(res.data); // Updates Dashboard, Stats, and Insights at once
    }
    // ...
}
```

### Potential Interview Question:
**"Why use Context instead of just fetching data on every page?"**
**Your Answer**: "Efficiency and Consistency. By using Context, the data is fetched once when the app loads. This reduces API load and ensures that the 'Total Value' shown on the Dashboard is always exactly the same as the 'Portfolio Value', preventing data mismatch bugs."

---

## 4. Backend: Dynamic AI Suggestions
**File**: `backend/routes/portfolio.js` -> `generateSuggestions()`

### How it works:
This is a rule-based engine that acts as a "Financial Advisor". It analyzes the array of user holdings and compares it against target risk profiles.

### Key Logic:
```javascript
function generateSuggestions(holdings, riskScore) {
    const cats = holdings.map(h => h.category.toLowerCase());
    const hasIndex = cats.some(c => c.includes('index'));
    
    if (!hasIndex) {
        suggestions.push({
            title: 'Consider Index Funds',
            action: 'Try UTI Nifty 50 Index Fund', // String used for deep-link
            suggestedFunds: ['UTI Nifty 50 Index Fund'] // Array used for buttons
        });
    }
    // ...
}
```

### Potential Interview Question:
**"How would you scale this to real AI like ChatGPT?"**
**Your Answer**: "Currently, it uses a high-speed rule-based approach. To scale, I would replace this function with an OpenAI API call, passing the anonymized portfolio data (percentages, not values) to the LLM to get more conversational and personalized advice."

---

## 5. Security: JWT & Protected Routes
**File**: `backend/routes/auth.js` & `frontend/src/App.jsx`

### How it works:
We use stateless **JWT (JSON Web Tokens)**. 
1.  **Backend**: Signs a token with the user ID after a successful login.
2.  **Frontend**: Stores this token and sends it in the `Authorization` header for every request.
3.  **Protected Routes**: In `App.jsx`, we wrap pages in a `<PrivateRoute>` component that checks if a user object exists; otherwise, it redirects them to `/login`.

---

## 🚀 Key Skills to Mention:
1.  **Full-Stack Integration**: How you connected React to Node using REST APIs.
2.  **Performance Optimization**: Caching and parallel API calls (`Promise.all`).
3.  **Responsive Design**: Modern CSS with Glassmorphism and Mobile-first layout.
4.  **Error Handling**: Gracious fallbacks when external services fail.
