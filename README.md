<div align="center">

# 🗺️ MapRank Everywhere

### Local SEO & Audit Engine — Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![OpenRouter](https://img.shields.io/badge/AI-OpenRouter-6C47FF?style=for-the-badge)](https://openrouter.ai)

**Professional Local SEO, Category Inspector, Map Pack Audits, Review Analysis, Teleport, and AI Optimization — directly on Google Maps.**

[Features](#-features) · [Install](#-installation) · [Setup](#️-setup) · [Tabs](#-tabs-overview) · [Contributing](#-contributing)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Category Inspector** | Auto-reveals Primary & hidden secondary GBP categories on Google Maps + one-click CID copy |
| ⚡ **100-Point GBP Audit** | Scores listing completeness, review velocity, category signals & contact integrity |
| 💼 **1-Person Agency Suite** | Cold email generator, Upwork proposals, 3-tier retainer pricing calculator |
| 🤖 **Agent OS (OTA Loop)** | Observe-Think-Act: scans live signals, diagnoses vulnerabilities, outputs executable SOPs |
| 📅 **4-Week Post Calendar** | Generates a complete GMB post calendar for any business with one click |
| 📱 **Social & Ads Repurposing** | Turns 5-star reviews into Reels/TikTok scripts, carousels & Meta ad hooks |
| ❓ **Q&A Pre-Seed** | Generates geo-targeted Q&A pairs to capture voice search rankings |
| 🛡️ **Policy & Dispute** | Suspension risk audit + fake review Google removal ticket drafter |
| 📍 **Teleport / Geo Simulator** | Simulates Google Maps search from any GPS coordinates to test local map pack rankings |

---

## 📦 Installation

> No Chrome Web Store needed — load it directly as an unpacked extension.

1. **Download / Clone this repo**
   ```bash
   git clone https://github.com/G0tham/maprank-everywhere.git
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions/` (or `brave://extensions/` / `edge://extensions/`)
   - Toggle **Developer mode** ON (top-right)

3. **Load Unpacked**
   - Click **Load unpacked**
   - Select the cloned `maprank-everywhere/` folder

4. **Go to Google Maps**  
   Navigate to [google.com/maps](https://www.google.com/maps) — the MapRank toolbar appears automatically on any business listing.

---

## ⚙️ Setup

### 1. Get a Free OpenRouter API Key
- Sign up at [openrouter.ai](https://openrouter.ai) — free tier available
- Copy your key (starts with `sk-or-v1-...`)
- The extension uses **Google Gemini 2.5 Flash** by default (very fast & cheap)

### 2. Add Key in Extension Settings
- Click the MapRank Everywhere icon in your browser toolbar
- Go to the **⚙️ Settings** tab
- Paste your OpenRouter API key → click **Save Configuration**

> 🔒 Your key is stored locally in `chrome.storage.local` — never sent anywhere except directly to OpenRouter.

---

## 🗂️ Tabs Overview

### 🔍 Category Inspector (Auto — on Google Maps)
Automatically badges every business in search results with its **Primary Google category** and reveals hidden secondary categories. Shows **CID** (Customer ID) with one-click copy.

### ⚡ GBP Audit
Run a **100-point audit** on any listing:
- Listing completeness score
- Review velocity & sentiment
- Category signal strength
- Contact point integrity (phone, website, address)

### 💼 Agency Suite
Built for local SEO freelancers and agencies:
- **Cold Email Generator** — audit-gap outreach with high-response subject lines
- **Upwork Proposal Writer** — winning proposals for local SEO gigs
- **3-Tier Retainer Calculator** — auto-calculates \$500 / \$1,500 / \$3,000/mo packages
- **Discovery Call Scripts** — closing scripts & objection handlers

### 🤖 Agent OS
Autonomous Observe-Think-Act loop:
- Scans live listing signals
- Diagnoses algorithmic vulnerabilities  
- Outputs executable SOPs with priority actions
- Saves persistent business memory (brand tone, keywords, constraints)

### 📅 GMB Post Calendar
Generates a full **4-week Google Business Profile post calendar** including:
- Promotional offers posts
- Behind-the-scenes posts
- Review-spotlight posts
- Event / seasonal posts

### 📱 Social & Ads Intelligence
- Repurpose any 5-star review → 30-second Reels/TikTok script
- Generate LinkedIn/Instagram carousel copy
- Create Meta/Google ad hooks from real customer wins
- Competitor Ad Library teardown prompts

### ❓ Q&A Pre-Seed
Generates **5 geo-targeted Q&A pairs** optimized for:
- Voice search ("Hey Google, who is the best...")
- Conversational queries
- Near-me intent keywords

Copy-paste directly into your Google Maps Q&A section.

### 🛡️ Policy & Dispute
- **Suspension Risk Audit** — checks your listing against Google's policy triggers
- **Fake Review Removal Ticket** — drafts a formal dispute for Google Support

### 📍 Teleport
Simulate a Google Maps search from **any location in the world**:
- Enter GPS coordinates or a city name
- Enter your keyword
- Opens Google Maps as if you're physically at that location
- Perfect for testing map pack rankings without a VPN

---

## 🏗️ Architecture

```
maprank-everywhere/
├── manifest.json        # Chrome Manifest V3 config
├── content.js           # Main toolbar injected into Google Maps (1,600 lines)
├── injected.js          # Network interceptor in MAIN world (captures GBP category data)
├── popup.html           # Extension popup UI (all tabs)
├── popup.js             # Popup logic + AI prompts
├── background.js        # Service worker
├── styles.css           # Injected styles for Maps toolbar
└── README.md
```

**How the category interception works:**
`injected.js` runs in the `MAIN` world (same JS context as Google Maps) and intercepts the internal XHR/fetch responses that carry GBP category data before it reaches the page. It fires a custom event that `content.js` listens to — giving us raw category names that Google never shows publicly.

---

## 🤖 AI Stack

| Component | Detail |
|-----------|--------|
| Provider | [OpenRouter](https://openrouter.ai) |
| Default Model | `google/gemini-2.5-flash` |
| Fallback | Any OpenAI-compatible model |
| Local option | Point to `http://localhost:11434` (Ollama) |
| Cost | ~\$0.001–0.003 per audit |

---

## 🛣️ Roadmap

- [ ] Export audit reports as PDF
- [ ] Bulk audit mode (scan all results on a Maps search)
- [ ] Competitor tracking dashboard
- [ ] Integration with OpenGMB backend
- [ ] Chrome Web Store listing

---

## 🤝 Contributing

PRs welcome! Please open an issue first for major changes.

1. Fork the repo
2. Create your branch: `git checkout -b feature/my-feature`
3. Commit: `git commit -m 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

Built with ❤️ for Local SEO professionals & GBP agency owners.

**[⭐ Star this repo](https://github.com/G0tham/maprank-everywhere)** if it saved you time!

</div>

