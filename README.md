# NextStep Career 🚀

A modern, animated job-updates website built with **React + Vite**, **Framer Motion** and **Supabase** (free online database).

## Design
Quiet graphite and light themes with one orange accent from the logo, Geist type, line icons and calm motion. The redesign follows the [unslop](https://github.com/heydamir/unslop) method by Damir Sokolovsky ([@heydamir](https://x.com/heydamir)), licensed CC BY 4.0. Colours and fonts live at the top of `src/index.css`.

## Features
- 🔎 Search & filter jobs by **company, role, years of experience, fresher / experienced, job type, remote/hybrid, location**
- 🔥 **Trending jobs** (based on apply clicks + views + freshness) and **Latest jobs**
- ❤️ **Save to favourites** (stored on the visitor's device)
- 📄 **Resume ⇄ JD checker** for every job: upload a PDF/DOCX/TXT and get a match score, matched and missing keywords, an ATS checklist and tips. It runs 100% in the browser, so resumes are never uploaded.
- ⚡ **Latest job popup**: the newest job you post pops up for every visitor, with an Apply button
- 💬 Floating **Telegram chat button** + Telegram & WhatsApp channel links
- ⚠️ Scrolling **"Apply at your own risk"** notice at the top + disclaimer in the footer and on every job
- 🛠 **Admin dashboard** at `/admin`: post / edit / duplicate / hide / delete jobs, with stats (views, apply clicks) and auto-detect skills from JD
- 📱 Fully responsive with binary-rain hero, scroll animations, card spotlight hover, marquee and more

---

## 1. Run it on your computer

You need **Node.js 18 or newer** → https://nodejs.org

```bash
cd nextstep-career
npm install
npm run dev
```
Open http://localhost:5173

> Without a database it runs in **DEMO mode**: sample jobs, and admin login `admin@demo.com` / `admin123`. Anything you post in demo mode is saved only in your own browser.

---

## 2. Connect the online database (Supabase, free)

1. Go to https://supabase.com → **Start your project** → create a new project.
2. Open **SQL Editor** → **New query** → paste everything from `supabase/schema.sql` → **Run**.
3. Open **Authentication → Users → Add user → Create new user**, enter **your** email + a strong password, and tick **Auto Confirm User**. This is your admin login.
4. **Important:** go to **Authentication → Sign In / Providers** and turn **OFF "Allow new users to sign up"**. Then nobody else can become an admin.
5. Click **Connect** at the top of the dashboard and copy the **Project URL**. Then open **Project Settings → API Keys** and copy the **Publishable key** (starts with `sb_publishable_`). If you don't have one yet, click **Create new API keys** first.
6. In the project folder, copy `.env.example` to `.env` and paste them in:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
7. Restart `npm run dev`. Go to http://localhost:5173/admin, log in, and post your first job 🎉

You can also view or edit all jobs directly in Supabase → **Table Editor → jobs** (like a spreadsheet).

---

## 3. Change your links

Edit **`src/config.js`**:
- `telegramUsername` → your Telegram username (for the chat button)
- `telegramChannel` → your Telegram channel link
- `whatsappChannel` → **put your WhatsApp channel link here** (it is currently a placeholder)
- `disclaimer` → the scrolling notice text

---

## 4. Upload to GitHub

```bash
cd nextstep-career
git init
git add .
git commit -m "NextStep Career website"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/nextstep-career.git
git push -u origin main
```
(Create the empty repo on github.com first. Your `.env` file is **not** uploaded; that's intentional.)

## 5. Put it live (free) with Vercel

1. Go to https://vercel.com → sign in with GitHub → **Add New → Project** → pick `nextstep-career`.
2. Framework: **Vite** (auto-detected).
3. Open **Environment Variables** and add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (same values as your `.env`).
4. **Deploy**. You get a link like `nextstep-career.vercel.app`. You can add your own domain later.

Netlify works too (the `public/_redirects` file is already included): build command `npm run build`, publish folder `dist`.

---

## 📈 Visitor analytics (dashboard → "Visitors & analytics" tab)
Shows visitors today (and the change vs yesterday), page views, people online now, a daily visitors chart (7 / 30 / 90 days), where visitors come from (Telegram, WhatsApp, Google, Instagram, the installed app…), devices, and the most viewed pages and jobs.
- It's anonymous: each browser gets a random ID, and no names, emails or IP addresses are stored. Bots are ignored.
- **Your own visits aren't counted** once you've logged in to `/admin` on that browser.
- It needs the `visits` table, which is in `supabase/schema.sql`. If you ran the file **before** this feature existed, run the whole file again in the SQL Editor. It's safe to re-run.
- **For accurate sources**, share links with a tag: `https://your-site.vercel.app/?ref=telegram`, `?ref=whatsapp`, `?ref=instagram`, etc. Telegram and WhatsApp often hide where a visitor came from.

## 📲 Install as an app (phone home-screen shortcut)
The site is a **PWA (Progressive Web App)**, so visitors can install it like an app without the Play Store or App Store:
- **Android (Chrome):** tap **Get App** in the top bar or **Install** in the bottom banner, and Chrome shows its install popup.
- **iPhone (Safari):** tap **Get App** to see a 3-step guide: Share → Add to Home Screen → Add.
- After installing, it opens full-screen with your logo. Long-press the icon for shortcuts (Fresher jobs, Trending, Saved, Resume check).
- Installing only works on the live site (**https**, e.g. on Vercel) or on `localhost`. It does not work on a local network IP.
- App icons are in `public/icons/`, and the app name and colours are in `public/manifest.webmanifest`.
- After a big update, change `CACHE = 'nextstep-v1'` in `public/sw.js` to `v2` so installed apps pick up the new version straight away.

## Pages
| URL | What it is |
|---|---|
| `/` | Home: hero, trending, latest jobs, categories |
| `/jobs` | All jobs with search + filters (filters are in the URL, so they're shareable) |
| `/job/:id` | Job details + resume checker + similar jobs |
| `/saved` | Saved jobs |
| `/resume-check` | Resume checker for any job, or paste your own JD |
| `/admin` | Your dashboard |

## Project structure
```
src/
  config.js            ← your links & settings
  admin/Admin.jsx      ← dashboard (login, post/edit jobs, stats)
  components/          ← Navbar, JobCard, popup, Telegram button, resume checker…
  pages/               ← Home, Jobs, JobDetail, Saved, ResumeCheck
  lib/jobsApi.js       ← all database calls (Supabase or demo)
  lib/resumeMatcher.js ← resume vs JD scoring logic
  index.css            ← the whole design system (colours, animations)
supabase/schema.sql    ← database setup
```

## Tips when posting jobs
- Start JD lines with `-` to show them as bullet points.
- Click **Auto-detect from JD** to fill the skills automatically.
- Set **Min experience = 0** for fresher jobs; they get the "Fresher" tag and filter.
- Use **Hide** instead of Delete to take a job down temporarily.
