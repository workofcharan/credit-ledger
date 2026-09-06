# Deployment Guide — Explainable Credit Ledger

This application is configured for instant 1-click deployment on **Vercel** as well as **Firebase Hosting & Cloud Functions**.

---

## ⚡ Option 1: Deploy to Vercel (Recommended & Easiest)

The project includes `vercel.json` and a serverless API handler (`api/index.js`) requiring **zero external setup or build steps**.

### Method A: Deploy via Vercel Web Dashboard (GitHub)
1. Push this repository to your **GitHub** / **GitLab** / **Bitbucket**.
2. Go to [vercel.com/new](https://vercel.com/new) and log in.
3. Import your repository.
4. Keep the default settings:
   - **Framework Preset**: *Other*
   - **Root Directory**: `./`
   - **Build Command**: *Leave blank* or `echo Build complete`
   - **Output Directory**: *Leave blank* (managed automatically via `vercel.json`)
5. Click **Deploy**.
6. Your application is live within 30 seconds with a production URL like `https://credit-ledger-xyz.vercel.app`!

---

### Method B: Deploy via Vercel CLI
Run the following in your project folder:

```powershell
# 1. Install Vercel CLI if not already installed
npm install -g vercel

# 2. Deploy preview
vercel

# 3. Deploy to production
vercel --prod
```

### Default Login Credentials on Vercel:
- **Officer Code:** `DEMO001`
- **Password:** `Demo@123`

*(You can also register new officers or test immediately using client-side offline presets).*

---

## 🔥 Option 2: Deploy to Firebase

### 1. One-time Firebase setup
1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com) and note your **Project ID**.
2. Upgrade to Blaze plan (free quota covers hackathon usage).
3. Enable **Firestore Database** in production mode.
4. Install Firebase CLI:
   ```powershell
   npm install -g firebase-tools
   firebase login
   ```

### 2. Configure `.firebaserc`
Edit `.firebaserc` to specify your project ID:
```json
{
  "projects": { "default": "your-firebase-project-id" }
}
```

### 3. Install Function Dependencies & Deploy
```powershell
cd functions
npm install
cd ..
firebase deploy
```

---

## 💻 Local Development Server

To run the local standalone dev server:

```powershell
node server.js
```
Then open `http://localhost:3000` in your browser.
