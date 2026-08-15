# Content Multiplier

Turns one piece of content into platform-native posts (Instagram, X, LinkedIn, TikTok, email) using Claude.

## What's in this project

- `src/App.jsx` — the app itself
- `api/generate.js` — a server-side function that calls Claude with your API key (the key never touches the browser)
- History is saved in the browser via `localStorage` — it's per-device, not per-account. That's fine for testing; see "Adding real accounts" below for the upgrade path.

## Run it locally

1. Install [Node.js](https://nodejs.org) if you don't have it (v18+).
2. In this folder, run:
   ```
   npm install
   ```
3. Copy `.env.example` to `.env` and add your real Anthropic API key (get one at console.anthropic.com under API Keys).
4. Run:
   ```
   npm run dev
   ```
   This starts the frontend, but note: the `/api/generate` function only runs when deployed to Vercel (or via `vercel dev`, see below). For local testing with the API working, use `vercel dev` instead — see next section.

## Deploy it for real (Vercel — free tier is enough)

1. Push this folder to a GitHub repo (create a new repo on github.com, then `git init`, `git add .`, `git commit -m "first commit"`, `git remote add origin <your repo url>`, `git push -u origin main`).
2. Go to vercel.com, sign in with GitHub, click "Add New Project," and pick this repo.
3. In the project's Settings → Environment Variables, add:
   - `ANTHROPIC_API_KEY` = your real key
4. Click Deploy. In about a minute you'll get a live URL like `content-multiplier.vercel.app`.

That's it — it's live, real, and the API key stays safely on the server the whole time.

## Testing locally with the API working

Install the Vercel CLI and run `vercel dev` instead of `npm run dev` — this runs both the frontend and the `/api` function together, matching production behavior exactly.

```
npm install -g vercel
vercel dev
```

## Adding real user accounts + saved history across devices

Right now history lives in the browser (`localStorage`), so it disappears if someone clears their browser or switches devices. To make it a real per-user account system:

1. Create a free project at supabase.com.
2. Use Supabase Auth for login (email/password or Google) — a few lines of client code, well documented.
3. Replace the `localStorage` calls in `App.jsx` with calls to a Supabase table (`history`) scoped to the logged-in user's ID.

This is a real, well-trodden path — Supabase's own quickstart docs walk through exactly this pattern.

## Adding payments / subscriptions

Use Stripe Checkout:
1. Create a Stripe account, create a Product + Price for your subscription.
2. Add a "Subscribe" button that calls a new `/api/checkout` function, which creates a Stripe Checkout session and redirects the user to Stripe's hosted payment page.
3. Add a `/api/webhook` function that listens for Stripe's `checkout.session.completed` event and marks that user as subscribed in your database.

Stripe's own docs for "Checkout + Node" walk through this exact flow step by step.
