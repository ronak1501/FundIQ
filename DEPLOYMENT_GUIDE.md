# 🌐 FundIQ: Deployment & Hosting Guide

This guide explains how to take FundIQ from your local machine to a live URL that anyone can access.

---

## 🏗️ 1. Prepare Your Database (MongoDB Atlas)
Since your local app might be using "In-Memory" mode, you **must** use a real database for production.
1.  Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2.  Create a **Free Tier** Cluster.
3.  **Network Access**: Whitelist `0.0.0.0/0` (allows connections from hosting providers).
4.  **Database Access**: Create a user with a username and password.
5.  Get your **Connection String** (e.g., `mongodb+srv://<user>:<password>@cluster.mongodb.net/fundiq`).

---

## 🚀 2. Deploy the Backend (Node.js)
**Recommended Platform**: [Render](https://render.com/) or [Railway](https://railway.app/).

### Steps:
1.  Push your code to a **GitHub Repository**.
2.  Connect the repository to Render/Railway.
3.  **Build Command**: `cd backend && npm install`
4.  **Start Command**: `cd backend && node server.js`
5.  **Environment Variables**: Add the following in the hosting dashboard:
    *   `MONGODB_URI`: Your MongoDB Atlas connection string.
    *   `JWT_SECRET`: A long random string (e.g., `super-secret-123`).
    *   `PORT`: `5000` (Hosting providers usually auto-fill this).
    *   `NAV_CACHE_TTL_HOURS`: `24`

---

## 🎨 3. Deploy the Frontend (React/Vite)
**Recommended Platform**: [Vercel](https://vercel.com/) or [Netlify](https://www.netlify.com/).

### Important Code Change:
Before deploying, ensure your `frontend/src/api/index.js` (or wherever your Axios base URL is) points to your **Live Backend URL** instead of `localhost:5000`.

### Steps:
1.  Connect your GitHub Repo to Vercel.
2.  **Framework Preset**: Vite.
3.  **Build Command**: `npm run build`
4.  **Output Directory**: `dist`
5.  **Environment Variables**:
    *   `VITE_API_URL`: Your live Backend URL (e.g., `https://fundiq-api.onrender.com/api`).

---

## 🔗 4. Connect the Two (CORS)
In `backend/server.js`, you must update the CORS configuration to allow your live frontend URL:

```javascript
// Change this:
app.use(cors({ origin: ['http://localhost:5173'], credentials: true }));

// To this (or use an environment variable):
app.use(cors({ 
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
    credentials: true 
}));
```

---

## ✅ 5. Final Checklist
- [ ] **SSL (HTTPS)**: Most providers like Vercel and Render provide this automatically.
- [ ] **Build Check**: Run `npm run build` locally in the frontend to ensure there are no TypeScript or Linting errors.
- [ ] **Database Connection**: Test that your live backend can successfully connect to MongoDB Atlas.

---

## 🛠️ Typical "Free" Stack
*   **Database**: MongoDB Atlas (Shared Tier - $0)
*   **Backend**: Render (Web Service Free Tier - $0)
*   **Frontend**: Vercel (Hobby Tier - $0)

**Total Cost: $0/month**
