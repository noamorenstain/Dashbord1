# Deployment Guide

## 1. What this project is

- **Framework:** React 18 + TypeScript, built with Vite. Styling via Tailwind CSS, charts via Recharts, Excel parsing via SheetJS (`xlsx`).
- **Frontend-only.** There is no backend, no API server, and no database anywhere in this codebase (confirmed: zero `fetch`/`axios`/network calls, zero Node built-ins, zero server code). It compiles to static HTML/CSS/JS that any static file host can serve.
- **Where the data comes from:** you upload an Excel file in the browser. It's parsed entirely client-side (`src/data/loadExcel.ts` via SheetJS) — the file never leaves the browser, there's no upload endpoint.
- **Where the data is stored:** the parsed dataset is cached in the browser's `localStorage` (`src/data/DataContext.tsx`) so it survives a page refresh *on that browser, on that device*. Until a file is uploaded, the dashboard shows the built-in demo/mock data.
- **No local-machine dependencies found:** no hardcoded paths, no `localhost` references, no Node-only imports. Safe to host anywhere.
- There's also a second, independent artifact — `preview.html` — a single self-contained HTML file (Tailwind/SheetJS/Chart.js loaded from CDN, no build step) with the same functionality. It can be hosted as-is with zero build process if you ever want a zero-maintenance fallback.

## 2. Build verification — what I could and couldn't check

I reviewed every source file (36 files) and ran an automated cross-check of all 149 local `import`/`export` statements in the project — zero broken imports, zero missing exports. I also manually re-verified that every place the code builds a data object (`DataSet`, `Maintenance`, `PnLBreakdown`, etc.) supplies every field its TypeScript type requires, since that's the most common source of a real compile failure.

**What I was not able to do:** run `npm install` or `npm run build` myself. My sandbox's network policy blocks the npm registry and every alternative I tried (cdnjs, unpkg, esm.sh all returned 403 "blocked by allowlist"), and no browser was available to load the app live either. So I cannot claim the build is 100% guaranteed clean — only that static review found no issues.

**Two ways to close that gap before/while going live:**
1. If you have Node.js on your own computer: `cd` into the project, run `npm install && npm run build`. If it finishes with a `dist/` folder and no red errors, you're confirmed clean.
2. Or skip that and let the hosting platform build it for you (see below) — its build log will show any error immediately, and it's a real, authoritative build (unlike my sandbox).

## 3. About the data, once published

- **Yes, the site will load fine online** — it'll show the demo data by default, same as it does locally now.
- **No, data does not sync between devices or people.** Each person who opens the link, in their own browser, only sees what's saved in *that browser's* `localStorage`. If you upload your real Excel file on your laptop, your manager opening the same link on their phone will **not** see it — they'd need to upload the same file themselves, in their own browser.
- This is a real limitation of the current design, not a hosting issue — no backend is required to *publish* the site, but a backend (or a shared file store) **would** be required if you want everyone to see the same uploaded data automatically. Per your instructions, I have not added one — flagging it here so you can decide later if it matters for your workflow (e.g. everyone re-uploading the same file each session may be an acceptable habit, or not).

## 4. Recommended hosting: Netlify

Netlify is the best fit here: free tier is more than enough for a few managers viewing a static dashboard, zero server to manage, deploys in about a minute, and updates are just a `git push` once connected. (Cloudflare Pages is an equally solid alternative if you prefer it — nearly identical setup.)

## 5. Exact deployment steps

### Step 0 — get the code onto GitHub (skip if already done)
From a terminal on your own computer, in the project folder:
```
git init
git add -A
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### Step 1 — create a Netlify account
Go to **netlify.com** → "Sign up" → sign up with your GitHub account (easiest — it grants Netlify access to your repos automatically).

### Step 2 — create the site
- Click **"Add new site" → "Import an existing project"**.
- Choose **GitHub**, authorize if prompted, and select your repo.
- Netlify should auto-detect the settings from `netlify.toml` (already added to the project):
  - **Build command:** `npm run build`
  - **Publish directory:** `dist`
- **Environment variables:** none needed — this app has none.
- Click **"Deploy site"**.

### Step 3 — get your link
After ~1 minute, Netlify gives you a live URL like `https://random-name-123.netlify.app`. That's your shareable link — send it to your managers, works on any computer or phone. You can rename the subdomain (Site settings → "Change site name") to something like `your-company-dashboard.netlify.app`.

### No GitHub yet? Fastest possible path
If you just want a link *right now* without dealing with GitHub:
1. On your computer: `npm install && npm run build` (creates a `dist` folder).
2. Go to **app.netlify.com/drop** and drag the `dist` folder onto the page.
3. You get a live link immediately. (Downside: no auto-updates — you'd re-drag `dist` each time you make a change, until you connect GitHub later.)

### Publishing future updates
- If connected to GitHub: just `git push` — Netlify rebuilds and redeploys automatically within a minute.
- If using drag-and-drop: rebuild locally (`npm run build`) and drag the new `dist` folder onto your site's "Deploys" tab.

### Custom domain later
Site settings → **"Domain management" → "Add a custom domain"**. Netlify walks you through pointing your domain's DNS (usually one CNAME or a couple of A records) at Netlify — free SSL certificate included automatically. No code changes needed.

## 6. Summary report

| | |
|---|---|
| **Ready to publish?** | Yes, with one caveat: I could not run the actual build myself (sandbox network restriction) — recommend a quick local `npm run build` check or trust Netlify's build log on first deploy. |
| **Tests run** | Full manual source review (36 files); automated import/export graph check (149 imports, 0 broken); manual verification of all recent type/interface construction sites; scan for local-machine paths, hardcoded localhost, Node-only imports (none found). |
| **Tests not run** | `npm install`, `npm run dev`, `npm run build`, in-browser click-through, mobile viewport check, console-error check — all blocked by lack of registry access / no connected browser in my environment. |
| **Problems found** | None in the code. Missing: deployment config and a pinned Node version for reliable hosting builds. |
| **Problems fixed** | Added `netlify.toml` (build command + publish dir) and `"engines": {"node": ">=18"}` in `package.json`. No application code changed. |
| **Recommended host** | Netlify (free tier), GitHub-connected for auto-deploy on push. |
| **Key limitation** | No backend/database — uploaded Excel data lives only in the uploading browser's `localStorage`. It will not appear on other people's devices; each viewer sees demo data until they upload the file themselves. |
