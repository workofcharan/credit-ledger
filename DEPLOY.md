# Deploying the Explainable Credit Ledger to Firebase

## 0. One-time setup

1. **Create a Firebase project**
   https://console.firebase.google.com → Add project → note the **Project ID**.

2. **Upgrade to the Blaze (pay-as-you-go) plan**
   Required for Cloud Functions. The free tier is generous — a hackathon demo
   will not incur charges. Console: ⚙ → Usage and billing → Modify plan → Blaze.

3. **Enable Firestore**
   Console → Build → Firestore Database → Create database → pick a nearby
   location (e.g. `asia-south1`) → Production mode.

4. **Install the Firebase CLI** (once, on your computer):
   ```powershell
   npm install -g firebase-tools
   firebase login
   ```

## 1. Point this project at your Firebase project

Edit `.firebaserc`:
```json
{
  "projects": { "default": "your-actual-project-id" }
}
```

## 2. Install the Cloud Function's dependencies

```powershell
cd functions
npm install
cd ..
```

## 3. (Recommended) Set a real JWT secret

The function falls back to a dev secret. For anything beyond a quick demo,
open `functions/index.js` and replace this fallback string with your own
long random value:

```js
const SECRET = process.env.JWT_SECRET || 'credit-ledger-dev-secret-change-in-production';
```

## 4. Deploy

```powershell
firebase deploy
```

First deploy takes a few minutes. At the end you'll get a live URL like:

```
Hosting URL: https://your-project-id.web.app
```

## 5. Log in

- Officer Code: `DEMO001`
- Password: `Demo@123`

(Auto-created the first time anyone logs in.)

## Redeploying after changes

- Only `public/` changed → `firebase deploy --only hosting`
- Only `functions/` changed → `firebase deploy --only functions`
- Both → `firebase deploy`

## Testing locally before deploying (optional)

```powershell
firebase emulators:start --only functions,hosting,firestore
```
Then open the URL the CLI prints (usually `http://localhost:5000`). The very
first run downloads a Firestore emulator `.jar` file — this needs normal
internet access to `storage.googleapis.com`, so it should work fine on your
own machine even though it couldn't be tested inside the sandbox this was
built in.

## Troubleshooting

- **"Your project must be on the Blaze plan"** → finish step 0.2.
- **Permission denied on Firestore** → make sure you created the database in
  step 0.3 before deploying.
- **Login works locally but not live** → check the browser console (F12) →
  Network tab on the live site; the most common cause is `.firebaserc` still
  pointing at the wrong project ID.
