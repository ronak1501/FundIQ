# FundIQ — AI Mutual Fund Portfolio Intelligence Platform

## 🚀 Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18 + Vite + TailwindCSS 4     |
| Backend    | Node.js + Express                   |
| Database   | MongoDB (Atlas or Local)            |
| Charts     | Chart.js + react-chartjs-2          |
| Auth       | JWT Bearer Tokens                   |
| NAV Data   | AMFI via mfapi.in (live)            |
| Icons      | Lucide React                        |
| Animations | Framer Motion + CSS                 |

---

## ✨ Features

- 🔐 **Login / Signup** with JWT authentication
- 🔍 **Live Fund Search** — 10,000+ AMFI mutual funds
- 📊 **Real-time NAV** fetched directly from AMFI API
- 💰 **Portfolio Tracker** — invested amount, current value, units
- 📈 **P&L & Returns** — gain/loss with percentage
- 🍩 **Allocation Charts** — donut + bar charts via Chart.js
- 🛡️ **AI Risk Score** — 0-100 score based on asset allocation
- 💡 **AI Suggestions** — diversification recommendations
- 📉 **SIP Calculator** — project wealth with sliders + line chart
- 🎯 **Portfolio Rebalance** — suggested allocation targets
- 🕸️ **Radar Chart** — diversification map across asset classes

---

## 📦 Project Structure

```
New folder/
├── frontend/            # React + Vite app
│   ├── src/
│   │   ├── api/         # Axios client with JWT interceptors
│   │   ├── components/  # Layout, Sidebar
│   │   ├── context/     # AuthContext
│   │   └── pages/       # Dashboard, Portfolio, AddFund, SIPCalculator, Insights
│   └── vite.config.js
├── backend/             # Node.js + Express API
│   ├── models/          # Mongoose models (User, Portfolio)
│   ├── routes/          # auth.js, portfolio.js
│   ├── middleware/       # JWT auth middleware
│   ├── server.js
│   └── .env             # ⚠️ Configure your MongoDB URI here!
├── start.ps1            # Launches both servers
└── README.md
```

---

## ⚡ Quick Start

### Step 1 — Set up MongoDB

**Option A: MongoDB Atlas (Free Cloud — Recommended)**
1. Go to [https://cloud.mongodb.com](https://cloud.mongodb.com) → Sign up free
2. Create a free **M0 Cluster**
3. Go to **Database Access** → Add User (username + password)
4. Go to **Network Access** → Add IP Address → **Allow Access from Anywhere** (0.0.0.0/0)
5. Go to **Connect** → **Drivers** → Copy the SRV connection string
6. Open `backend/.env` and replace `MONGODB_URI` with your string:

```env
MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/mf_portfolio?retryWrites=true&w=majority
```

**Option B: Local MongoDB**
1. Install [MongoDB Community Server](https://www.mongodb.com/try/download/community)
2. Start the service: `net start MongoDB`
3. Set `MONGODB_URI=mongodb://localhost:27017/mf_portfolio` in `backend/.env`

---

### Step 2 — Install Dependencies

```powershell
# Frontend
cd frontend
npm install

# Backend
cd ..\backend
npm install
```

---

### Step 3 — Start the App

**Quick way (both at once):**
```powershell
.\start.ps1
```

**Or manually in two terminals:**

*Terminal 1 — Frontend:*
```powershell
cd frontend
npm run dev
```

*Terminal 2 — Backend:*
```powershell
cd backend
npm run dev
```

---

### Step 4 — Open the App

| Service  | URL                         |
|----------|-----------------------------|
| Frontend | http://localhost:5173        |
| Backend  | http://localhost:5000/api   |
| Health   | http://localhost:5000/api/health |

---

## 🔧 Environment Variables (`backend/.env`)

```env
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/mf_portfolio
JWT_SECRET=your_very_secret_key_here
NODE_ENV=development
```

---

## 📱 Pages Overview

| Page            | Route             | Description                              |
|-----------------|-------------------|------------------------------------------|
| Login / Signup  | `/login`          | Auth page with risk profile selection    |
| Dashboard       | `/dashboard`      | Overview: stats, charts, AI suggestions  |
| Portfolio       | `/portfolio`      | Full holdings table + allocation chart   |
| Add Fund        | `/add-fund`       | Search AMFI funds + SIP toggle           |
| SIP Calculator  | `/sip-calculator` | Projection calculator with chart         |
| AI Insights     | `/insights`       | Risk analysis, radar chart, rebalancing  |

---

## 🔌 API Endpoints

| Method | Endpoint                      | Description               |
|--------|-------------------------------|---------------------------|
| POST   | `/api/auth/register`          | Register new user         |
| POST   | `/api/auth/login`             | Login, get JWT token      |
| GET    | `/api/auth/me`                | Get current user          |
| GET    | `/api/portfolio`              | Get portfolio + NAVs      |
| POST   | `/api/portfolio/add`          | Add/update holding        |
| DELETE | `/api/portfolio/holding/:id`  | Remove holding            |
| GET    | `/api/portfolio/search?q=...` | Search AMFI funds         |
| GET    | `/api/portfolio/nav/:code`    | Get NAV for scheme        |
| POST   | `/api/portfolio/sip-projection`| SIP calculator            |
