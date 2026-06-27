# Social Media Manager

An AI-powered Instagram growth manager that runs entirely in your browser — no server, no installation required.

## Features

- **🎬 Content Studio** — Generate type-specific content briefs for Reels, Posts & Carousels with fresh research on what's working right now on Instagram
- **⚡ Daily Check-ins** — Timed check-in system (30min / 2hr / 24hr / 72hr) with metric logging and AI action plans after each post
- **📊 Content Tracker** — Track every Reel, Post and Carousel you publish with per-type check-in progress
- **🧠 MI Dashboard** — Marketing Intelligence that tracks every AI suggestion against actual outcomes (views, saves, follows gained)

## Content Types Supported

| Type | Primary KPI | Check-in Schedule |
|---|---|---|
| 🎬 Reel | Views (target: 20k–30k) | 30min · 2hr · 24hr · 72hr |
| 🖼️ Post | Saves (rate >3%) | 2hr · 24hr · 7day |
| 📂 Carousel | Saves + Swipe-through | 2hr · 24hr · 7day |

## How to Run

### Option 1 — Run locally (no setup needed)
1. Download `social_media_manager.html`
2. Double-click to open in any browser (Chrome, Safari, Edge, Firefox)
3. Enter your Anthropic API key when prompted

### Option 2 — Deploy to GitHub Pages
1. Go to your repo **Settings → Pages**
2. Set source to **main branch / root**
3. Your app will be live at `https://yourusername.github.io/Social-Media-Manager/social_media_manager.html`

## API Key Setup

The app uses the [Anthropic Claude API](https://console.anthropic.com) for AI features.

1. Create a free account at [console.anthropic.com](https://console.anthropic.com)
2. Go to **API Keys → Create Key**
3. Paste the key into the app when prompted — it's saved locally in your browser

Your API key never leaves your browser except to make direct calls to Anthropic's API.

## Data Storage

All your data (profile, posts, check-in logs) is saved in your browser's `localStorage`. It persists across sessions on the same browser/device.

## Files

| File | Description |
|---|---|
| `social_media_manager.html` | **Run this** — fully self-contained app, no dependencies |
| `social_media_manager.jsx` | React source code (for reference / customisation) |

## Roadmap

- [ ] YouTube management
- [ ] Twitter/X management  
- [ ] LinkedIn management
- [ ] Cross-platform MI Dashboard
- [ ] Export data to CSV
- [ ] Scheduled posting reminders

## Tech Stack

- React 18 (loaded via CDN)
- Babel standalone (JSX in browser)
- Anthropic Claude API (`claude-sonnet-4-6`)
- Browser localStorage for persistence
- Zero dependencies to install

---

Built with Claude · [Anthropic](https://anthropic.com)
