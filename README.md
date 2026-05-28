# Best Ball Scorecard — Deployment Guide

A shared, live-updating scorecard. One URL, everyone sees the same scores in real time.

This guide walks you from zero to a working public link in about 20–30 minutes. You don't need to know how to code — you'll just be clicking buttons and copy-pasting two values.

---

## What you're building

- A website hosted on Vercel (free)
- A small database on Supabase (free) that everyone's phones read and write to
- When anyone enters a score, all other phones see it within a second

---

## Step 1 — Create a Supabase project (5 min)

1. Go to **https://supabase.com** and click **Start your project**. Sign in with GitHub or email.
2. Click **New Project**.
   - Name: `bestball` (anything works)
   - Database password: click "Generate a password" and save it somewhere (you won't need it for this app, but Supabase requires one)
   - Region: pick the one nearest you (us-east-1 for the East Coast)
   - Plan: Free
3. Click **Create new project** and wait ~2 minutes for it to provision.

---

## Step 2 — Create the database table (1 min)

1. In your Supabase project's left sidebar, click the **SQL Editor** icon (looks like a database with a play button).
2. Click **+ New query**.
3. Open the file `supabase-schema.sql` from this project, copy everything in it, and paste it into the SQL editor.
4. Click **Run** (or press Cmd/Ctrl + Enter).
5. You should see "Success. No rows returned." That's good.

---

## Step 3 — Grab your two secrets (1 min)

In your Supabase project, click **Project Settings** (gear icon, bottom left) → **API**.

You need two values from this page:

1. **Project URL** — looks like `https://abcdefghij.supabase.co`
2. **anon / public key** — a long string starting with `eyJ...`

Keep this tab open. You'll paste these into Vercel in a minute.

> The "anon key" is safe to expose publicly — that's its design. Don't use the "service_role" key.

---

## Step 4 — Put the code on GitHub (5 min)

Vercel deploys from GitHub. If you don't have a GitHub account, make one at https://github.com (free).

**Easiest path: use GitHub Desktop**

1. Install GitHub Desktop: https://desktop.github.com
2. Open it, sign in.
3. File → **Add Local Repository** → choose the `bestball` folder you got from Claude.
4. It will say "this isn't a git repository — create one?" — click **Create a Repository**.
5. Click **Publish repository** at the top. Uncheck "Keep this code private" if you want it public (either is fine). Click **Publish Repository**.

You now have a GitHub repo with the code.

---

## Step 5 — Deploy to Vercel (5 min)

1. Go to **https://vercel.com** and **Sign Up** with your GitHub account.
2. On the Vercel dashboard, click **Add New...** → **Project**.
3. Find your `bestball` repo in the list and click **Import**.
4. Before clicking Deploy, expand **Environment Variables** and add these two:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | (paste your Project URL from Step 3) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (paste your anon key from Step 3) |

5. Click **Deploy**. Wait ~2 minutes.
6. When it's done, Vercel gives you a URL like `bestball-xyz.vercel.app`. **That's your link.** Send it to the group.

---

## Step 6 — Test it

1. Open the URL on your phone. You should see the scorecard with your groups and the Clifton Park pars already loaded.
2. Open the same URL on another phone (or in an incognito tab on your laptop).
3. Tap a score on one device. Within a second, it should appear on the other.

If both show "Live" in the top-right corner, you're connected. If you see "Offline," check that you pasted the env vars correctly in Vercel (see Troubleshooting below).

---

## Sharing tips

- **Custom URL:** In Vercel → your project → Settings → Domains, you can buy a domain like `bestball.golf` and hook it up. Optional.
- **Add to home screen:** On iPhone, open the URL in Safari → Share → Add to Home Screen. It then opens like a real app.
- **Reset between rounds:** Anyone can hit "Reset Round" on the entry screen — it clears everyone's scores instantly. Don't tap it mid-round.

---

## Troubleshooting

**"Offline" in the corner, scores don't sync**
- Most common: env vars weren't saved correctly. In Vercel → your project → Settings → Environment Variables, confirm both are present and there are no extra spaces. After fixing, go to the Deployments tab and click "..." on the latest deployment → Redeploy.

**Page is blank / errors**
- Open the Vercel dashboard → your project → check the latest deployment for build errors. If something is missing, paste the error into a new conversation with me.

**Two people edit the same score at the same time**
- Last write wins. With a 300ms save delay this almost never matters, but if a conflict happens, just re-tap the correct score.

**Want a fresh round next weekend without losing this one?**
- Edit `lib/supabase.js` and change `ROUND_ID` to something new (e.g., `'clifton-park-2026-07-04'`). Commit, push, Vercel redeploys, you're on a fresh slate. The old round is still in the database.

---

## What it costs

Nothing, for what you're doing. Supabase free tier handles many thousands of edits per month. Vercel free tier handles personal sites easily. You will not be charged unless you explicitly upgrade.
