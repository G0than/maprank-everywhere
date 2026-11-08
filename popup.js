// MapRank Everywhere Extension - Professional Popup Controller

async function getStoredAiConfig() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    const data = await chrome.storage.sync.get(["openrouterKey", "openrouterModel"]);
    return {
      key: data.openrouterKey || "",
      model: data.openrouterModel || "google/gemini-2.5-flash",
    };
  }
  return {
    key: localStorage.getItem("openrouterKey") || "",
    model: localStorage.getItem("openrouterModel") || "google/gemini-2.5-flash",
  };
}

async function callOpenRouter(prompt, system = "You are an elite Google Business Profile Local SEO expert.", maxTokens = 800) {
  const config = await getStoredAiConfig();

  if (!config.key) {
    return `⚠️ **OpenRouter API Key Required**\n\nPlease go to the **⚙️ Settings** tab and enter your OpenRouter API key.\n\nYou can grab a free key at [openrouter.ai/keys](https://openrouter.ai/keys).`;
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://maprank-everywhere.local",
        "X-Title": "MapRank Everywhere Extension",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `HTTP ${res.status}`;
      return `⚠️ **AI Service Error (${errMsg})**\n\nPlease verify your API key and quota in the **⚙️ Settings** tab.`;
    }

    const json = await res.json();
    return json.choices?.[0]?.message?.content || "No response received from AI service.";
  } catch (err) {
    return `⚠️ **Network Connection Error**\n\n${err.message}. Please check your internet connection.`;
  }
}

// Lightweight Markdown Formatter
function parseMarkdown(md) {
  if (!md) return "";
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*\*(.*?)\*\*\*/gim, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/gim, "<em>$1</em>")
    .replace(/`([^`]+)`/gim, "<code>$1</code>")
    .replace(/^\s*[-*]\s+(.*$)/gim, "<li>$1</li>")
    .replace(/^\s*\d+\.\s+(.*$)/gim, "<li>$1</li>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" style="color:#ea580c;">$1</a>')
    .replace(/\n\n+/g, "<br><br>")
    .replace(/\n/g, "<br>");
  return html;
}

function showLoading(boxElement, msg = "Generating AI intelligence...") {
  boxElement.style.display = "block";
  boxElement.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <span>${msg}</span>
    </div>
  `;
}

function renderResult(boxElement, markdownContent, title = "Generated Output") {
  boxElement.style.display = "block";
  const htmlContent = parseMarkdown(markdownContent);

  boxElement.innerHTML = `
    <div class="result-toolbar">
      <span>${title}</span>
      <div class="result-actions">
        <button class="action-btn copy-btn" title="Copy text to clipboard">📋 Copy</button>
        <button class="action-btn download-btn" title="Export as Markdown document">💾 Export .md</button>
      </div>
    </div>
    <div class="result-content">${htmlContent}</div>
  `;

  const copyBtn = boxElement.querySelector(".copy-btn");
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(markdownContent).then(() => {
      copyBtn.innerText = "✓ Copied!";
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.innerText = "📋 Copy";
        copyBtn.classList.remove("copied");
      }, 2000);
    });
  });

  const downloadBtn = boxElement.querySelector(".download-btn");
  downloadBtn.addEventListener("click", () => {
    const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // 1. Tab Navigation
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      const tabId = "tab-" + btn.dataset.tab;
      document.getElementById(tabId)?.classList.add("active");
    });
  });

  // 2. Settings Load & Status Check
  async function loadSettings() {
    const config = await getStoredAiConfig();
    const keyInput = document.getElementById("openrouter-key");
    const modelSelect = document.getElementById("openrouter-model");
    const statusText = document.getElementById("status-text");
    const statusDot = document.getElementById("status-dot");

    if (keyInput) keyInput.value = config.key;
    if (modelSelect && config.model) modelSelect.value = config.model;

    if (config.key) {
      if (statusText) statusText.innerText = "AI Ready";
      if (statusDot) {
        statusDot.className = "live-dot";
      }
    } else {
      if (statusText) statusText.innerText = "Key Missing";
      if (statusDot) {
        statusDot.className = "live-dot warn";
      }
    }

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(["syncUrl", "syncToken"], (data) => {
        if (data.syncUrl) document.getElementById("server-url").value = data.syncUrl;
        if (data.syncToken) document.getElementById("api-token").value = data.syncToken;
      });
    }
  }
  loadSettings();

  // 3. Auto-Detect Active Google Maps Tab & Pre-fill inputs
  function syncWithActiveMapsTab() {
    if (typeof chrome === "undefined" || !chrome.tabs || !chrome.tabs.query) return;

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs?.[0];
      if (!activeTab || !activeTab.id) return;

      const isMaps = activeTab.url && (activeTab.url.includes("google.com/maps") || activeTab.url.includes("google.com/search"));
      const banner = document.getElementById("active-tab-banner");
      const label = document.getElementById("active-biz-label");

      if (!isMaps) {
        if (banner) banner.style.display = "none";
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, { action: "getActiveBusiness" }, (response) => {
        if (chrome.runtime.lastError || !response || !response.data) {
          if (banner) {
            banner.style.display = "flex";
            if (label) label.innerText = "Maps tab detected: open any business to auto-populate";
          }
          return;
        }

        const d = response.data;
        if (!d.title) return;

        if (banner) {
          banner.style.display = "flex";
          if (label) label.innerHTML = `Connected: <strong>${d.title}</strong> (${d.primaryCategory || "Business"})`;
        }

        const autoFields = [
          { id: "audit-biz", val: d.title },
          { id: "audit-cat", val: d.primaryCategory },
          { id: "audit-city", val: d.address || "" },
          { id: "agency-biz", val: d.title },
          { id: "agency-cat", val: d.primaryCategory },
          { id: "agency-loc", val: d.address || "" },
          { id: "agentos-biz", val: d.title },
          { id: "fours-biz", val: d.title },
          { id: "fours-niche", val: d.primaryCategory },
          { id: "fours-city", val: d.address || "" },
          { id: "reply-biz", val: d.title },
          { id: "posts-biz", val: d.title },
          { id: "social-biz", val: d.title },
          { id: "qa-biz", val: d.title },
          { id: "qa-cat", val: d.primaryCategory },
          { id: "qa-city", val: d.address || "" },
          { id: "policy-biz", val: d.title },
        ];

        autoFields.forEach(({ id, val }) => {
          const el = document.getElementById(id);
          if (el && (!el.value || el.value === "My Business" || el.value === "Local Business")) {
            if (val) el.value = val;
          }
        });
      });
    });
  }
  syncWithActiveMapsTab();

  document.getElementById("btn-sync-active")?.addEventListener("click", () => {
    syncWithActiveMapsTab();
  });

  // 4. Save Settings
  document.getElementById("save-settings-btn")?.addEventListener("click", () => {
    const key = document.getElementById("openrouter-key").value.trim();
    const model = document.getElementById("openrouter-model").value;
    const url = document.getElementById("server-url").value.trim();
    const token = document.getElementById("api-token").value.trim();
    const msg = document.getElementById("settings-msg");

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ openrouterKey: key, openrouterModel: model, syncUrl: url, syncToken: token }, () => {
        msg.innerText = "✓ Configuration saved securely.";
        msg.style.color = "#16a34a";
        loadSettings();
        setTimeout(() => (msg.innerText = ""), 2500);
      });
    } else {
      localStorage.setItem("openrouterKey", key);
      localStorage.setItem("openrouterModel", model);
      localStorage.setItem("syncUrl", url);
      localStorage.setItem("syncToken", token);
      msg.innerText = "✓ Configuration saved locally.";
      msg.style.color = "#16a34a";
      loadSettings();
      setTimeout(() => (msg.innerText = ""), 2500);
    }
  });

  // 5. Run 100-Point Audit
  document.getElementById("btn-run-audit")?.addEventListener("click", async () => {
    const biz = document.getElementById("audit-biz").value.trim() || "Local Business";
    const cat = document.getElementById("audit-cat").value.trim() || "Local Services";
    const city = document.getElementById("audit-city").value.trim() || "Local Area";
    const resBox = document.getElementById("audit-results");

    showLoading(resBox, `Running 100-Point Audit for ${biz}...`);

    const prompt = `Perform a comprehensive 100-point Google Business Profile (GBP) audit for:
Business Name: ${biz}
Category: ${cat}
Location: ${city}

Audit the listing across these 5 pillars:
1. Category Optimization & Map Pack Relevancy (Primary vs Secondary Categories)
2. Review Velocity, Rating & Semantic Keyword Sentiment
3. Listing Completeness & Citation Signal Strength
4. Local Search Grid Prominence vs Competitors
5. High-Impact Quick Wins to Reach Top 3 Map Pack in 30 Days

Provide an actionable report with bullet points and clear priority ratings.`;

    const result = await callOpenRouter(prompt, "You are an elite Google Business Profile Local SEO auditor.");
    renderResult(resBox, result, `GBP Audit — ${biz}`);
  });

  // 6. Generate Client Pitch ($750/mo retainer)
  document.getElementById("btn-gen-pitch")?.addEventListener("click", async () => {
    const biz = document.getElementById("audit-biz").value.trim() || "Target Prospect";
    const cat = document.getElementById("audit-cat").value.trim() || "Local Business";
    const city = document.getElementById("audit-city").value.trim() || "Local Market";
    const resBox = document.getElementById("audit-results");

    showLoading(resBox, `Drafting $750/mo Retainer Proposal for ${biz}...`);

    const prompt = `Write a high-converting Local SEO agency client proposal for:
Business: ${biz}
Niche: ${cat}
City: ${city}
Monthly Retainer: $750/month

Include:
1. Executive Problem Summary (Lost calls/leads to map pack competitors)
2. 30-Day Quick Win Action Plan (Categories, Q&A, review acceleration)
3. Month 2-3 Growth Strategy (Geo-grid prominence, weekly posts)
4. Deliverables Matrix & Expected Return on Investment`;

    const result = await callOpenRouter(prompt, "You are a master local SEO agency director.");
    renderResult(resBox, result, `Agency Proposal — ${biz}`);
  });

  // 7. Review Replies
  document.getElementById("btn-gen-reply")?.addEventListener("click", async () => {
    const biz = document.getElementById("reply-biz").value.trim() || "Our Business";
    const stars = document.getElementById("reply-stars").value;
    const text = document.getElementById("reply-text").value.trim();
    const resBox = document.getElementById("reply-results");

    if (!text) {
      renderResult(resBox, "⚠️ Please paste customer review text to generate replies.", "Input Required");
      return;
    }

    showLoading(resBox, "Drafting 3 calibrated review replies...");

    const prompt = `Generate 3 distinct, professional Google Review replies for:
Business: ${biz}
Rating: ${stars} Stars
Customer Review: "${text}"

Provide:
1. Warm & Grateful (Natural keyword & location integration)
2. Professional & Concise
3. Retention-Focused (Inviting back for next visit or VIP service)`;

    const result = await callOpenRouter(prompt, "You are a reputation management expert.");
    renderResult(resBox, result, `Review Replies — ${stars} Stars`);
  });

  // 8. 4-Week Post Calendar
  document.getElementById("btn-gen-posts")?.addEventListener("click", async () => {
    const biz = document.getElementById("posts-biz").value.trim() || "My Business";
    const promo = document.getElementById("posts-promo").value.trim() || "Seasonal Service Promotion";
    const resBox = document.getElementById("posts-results");

    showLoading(resBox, `Drafting 4-week post calendar for ${biz}...`);

    const prompt = `Create a high-retention 4-Week Google Business Profile post schedule for:
Business: ${biz}
Special Offer / Angle: ${promo}

For each week (Week 1 to Week 4), provide:
- Post Theme (Offer, Behind the Scenes, Customer Spotlight, Educational)
- Full Post Copy (with high-converting CTA & relevant local keywords)
- Suggested Photo/Visual Type
- Recommended Call To Action Button (Call Now, Book, Learn More)`;

    const result = await callOpenRouter(prompt, "You are a local business content strategist.");
    renderResult(resBox, result, `Google Posts Calendar — ${biz}`);
  });

  // 9. Pre-Seed Google Q&A Pairs
  document.getElementById("btn-gen-qa")?.addEventListener("click", async () => {
    const biz = document.getElementById("qa-biz").value.trim() || "My Business";
    const cat = document.getElementById("qa-cat").value.trim() || "Local Business";
    const city = document.getElementById("qa-city").value.trim() || "Local City";
    const resBox = document.getElementById("qa-results");

    showLoading(resBox, `Pre-seeding 5 high-ranking Q&A pairs for ${biz}...`);

    const prompt = `Generate 5 strategic, geo-targeted Google Maps Q&A pairs for:
Business: ${biz}
Primary Category: ${cat}
Location: ${city}

Target:
- Voice search queries ("Hey Google, who is the top...")
- High-intent commercial questions (Pricing, appointments, turnaround time)
- Natural primary and secondary category keyword injection in BOTH the question and owner response`;

    const result = await callOpenRouter(prompt, "You are a conversational search and local voice SEO architect.");
    renderResult(resBox, result, `Pre-Seeded Q&A — ${biz}`);
  });

  // 10. Suspension Risk Audit
  document.getElementById("btn-audit-suspension")?.addEventListener("click", async () => {
    const biz = document.getElementById("policy-biz").value.trim() || "My Business";
    const resBox = document.getElementById("policy-results");

    showLoading(resBox, `Auditing suspension risks for ${biz}...`);

    const prompt = `Audit the Google Business Profile title and setup for:
Listing Title: "${biz}"

Analyze:
1. Title Keyword Stuffing Risk (Violation of Google Guidelines)
2. Address Type Risk (Residential, P.O. Box, or Co-working space)
3. Actionable remediation steps to avoid hard/soft suspension`;

    const result = await callOpenRouter(prompt, "You are a former Google Policy and Business Profile compliance auditor.");
    renderResult(resBox, result, `Suspension Audit — ${biz}`);
  });

  // 11. Review Dispute Removal Ticket
  document.getElementById("btn-gen-dispute")?.addEventListener("click", async () => {
    const biz = document.getElementById("policy-biz").value.trim() || "My Business";
    const review = document.getElementById("policy-review").value.trim() || "Fake review with zero transaction history.";
    const resBox = document.getElementById("policy-results");

    showLoading(resBox, "Drafting formal Google Support removal ticket...");

    const prompt = `Draft a formal, policy-cited Google Business Profile review removal ticket for:
Business: ${biz}
Violating Review: "${review}"

Cite exact sections of the Google Prohibited and Restricted Content Policy (Conflict of Interest, Harassment, Misinformation, or Off-Topic Content) and formulate a clear legal/policy argument for escalation.`;

    const result = await callOpenRouter(prompt, "You are a Google Policy escalation specialist.");
    renderResult(resBox, result, `Removal Ticket — ${biz}`);
  });

  // 12. Social Media Repurposing
  document.getElementById("btn-repurpose-social")?.addEventListener("click", async () => {
    const biz = document.getElementById("social-biz").value.trim() || "My Business";
    const win = document.getElementById("social-win").value.trim();
    const resBox = document.getElementById("social-results");

    showLoading(resBox, "Repurposing review into multi-platform social assets...");

    const prompt = `Transform this customer review for ${biz} into 3 viral social media formats:
Review: "${win}"

1. 30-Second Instagram Reel / TikTok Script (Visual cue, hook, retention story, CTA)
2. 5-Slide Carousel Breakdown (Slide by slide copy with hook)
3. Meta / Facebook Ad Copy (Pain point, customer proof, compelling offer)`;

    const result = await callOpenRouter(prompt, "You are a direct-response social media content strategist.");
    renderResult(resBox, result, `Social Assets — ${biz}`);
  });

  // 13. Competitor Ad Library Teardown
  document.getElementById("btn-spy-ads")?.addEventListener("click", async () => {
    const biz = document.getElementById("social-biz").value.trim() || "My Business";
    const resBox = document.getElementById("social-results");

    showLoading(resBox, `Generating competitor ad teardown framework for ${biz}...`);

    const prompt = `Generate a high-leverage Meta Ad Library competitor teardown plan for a business like ${biz}:
1. 3 Top Hook Formats competitors in this niche use to win customers
2. Creative Angles (UGC vs Clean Studio vs Founder Story)
3. One Counter-Ad Campaign blueprint to steal market share`;

    const result = await callOpenRouter(prompt, "You are a master performance marketer.");
    renderResult(resBox, result, `Competitor Ad Teardown — ${biz}`);
  });

  // 14. Maps Teleport
  document.getElementById("teleport-btn")?.addEventListener("click", () => {
    const q = document.getElementById("teleport-query").value.trim() || "restaurants near me";
    const l = document.getElementById("teleport-location").value.trim() || "40.7128, -74.0060";
    let targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${encodeURIComponent(l.replace(/\s+/g, ""))},14z`;
    if (!l.includes(",")) {
      targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(q + " in " + l)}`;
    }
    window.open(targetUrl, "_blank");
  });

  // 15. 1-Person Agency Handlers
  document.getElementById("btn-agency-coldemail")?.addEventListener("click", async () => {
    const biz = document.getElementById("agency-biz").value.trim() || "Local Business";
    const cat = document.getElementById("agency-cat").value.trim() || "Local Business";
    const loc = document.getElementById("agency-loc").value.trim() || "Local City";
    const gap = document.getElementById("agency-gap").value.trim() || "Missing secondary categories & lower review count vs #1 competitor";
    const resBox = document.getElementById("agency-results");

    showLoading(resBox, `Drafting personalized cold email for ${biz}...`);

    const prompt = `Write an authentic, zero-fluff cold email to the owner of ${biz} (${cat} in ${loc}):
Identified Gap: ${gap}

Rules:
- 3-sentence high-response subject line options
- Low friction CTA (Offer a 90-second Loom audit breakdown with zero pitch)
- Sound like a helpful local growth partner, not an automated agency spammer`;

    const result = await callOpenRouter(prompt, "You are an elite 1-person agency cold outreach copywriter.");
    renderResult(resBox, result, `Cold Outreach — ${biz}`);
  });

  document.getElementById("btn-agency-upwork")?.addEventListener("click", async () => {
    const biz = document.getElementById("agency-biz").value.trim() || "Client";
    const cat = document.getElementById("agency-cat").value.trim() || "Local Business";
    const gap = document.getElementById("agency-gap").value.trim() || "Competitors dominating the Map Pack";
    const resBox = document.getElementById("agency-results");

    showLoading(resBox, "Drafting winning Upwork proposal...");

    const prompt = `Write a winning Upwork proposal for a local SEO / Google Maps contract in the ${cat} niche (${biz}):
Problem: ${gap}

Structure:
1. Hook acknowledging their specific struggle
2. 3-step solution blueprint (Category architecture, Review pacing, Citation cleanup)
3. Proof of competency and closing question`;

    const result = await callOpenRouter(prompt, "You are an elite Upwork proposal specialist.");
    renderResult(resBox, result, `Upwork Proposal — ${cat}`);
  });

  document.getElementById("btn-agency-pricing")?.addEventListener("click", async () => {
    const biz = document.getElementById("agency-biz").value.trim() || "Client";
    const cat = document.getElementById("agency-cat").value.trim() || "Local Business";
    const resBox = document.getElementById("agency-results");

    showLoading(resBox, "Calculating 3-tier monthly retainer packages...");

    const prompt = `Create a 3-tier monthly retainer package for ${biz} in the ${cat} niche:
Tier 1: Foundation ($500/month) - Review responses, weekly posts, profile hygiene.
Tier 2: Growth ($1,500/month) - Geo-grid audit, citation cleanup, pre-seeded Q&A, social repurposing.
Tier 3: Domination ($3,000/month) - Full Map Pack takeover, competitor review conquest, video shorts.

Detail exact deliverables and ROI rationale for each tier.`;

    const result = await callOpenRouter(prompt, "You are an agency pricing and packaging architect.");
    renderResult(resBox, result, `3-Tier Retainer — ${biz}`);
  });

  document.getElementById("btn-agency-closer")?.addEventListener("click", async () => {
    const biz = document.getElementById("agency-biz").value.trim() || "Client";
    const cat = document.getElementById("agency-cat").value.trim() || "Local Business";
    const resBox = document.getElementById("agency-results");

    showLoading(resBox, "Generating discovery call closing script...");

    const prompt = `Write a 5-minute discovery call script for closing a local SEO retainer with the owner of ${biz} (${cat}):
Include:
1. Handling 'It's too expensive': Compare retainer cost vs Google Local Services Ads cost-per-click
2. Handling 'I don't have time': Explain done-for-you approval workflow
3. The exact closing question that gets payment upfront`;

    const result = await callOpenRouter(prompt, "You are a master B2B sales closer.");
    renderResult(resBox, result, `Closing Script — ${biz}`);
  });

  // 16. Persistent Agent OS Memory
  const DEFAULT_MEMORY = "Brand tone: professional, warm, authoritative. Priority: highlight positive reviews, quality service, and local presence.";

  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(["globalAgentMemory"], (res) => {
      const box = document.getElementById("agentos-memory-text");
      if (box && res.globalAgentMemory) {
        box.value = res.globalAgentMemory;
      }
    });
  }

  document.getElementById("btn-save-memory")?.addEventListener("click", () => {
    const text = document.getElementById("agentos-memory-text").value.trim();
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ globalAgentMemory: text }, () => {
        const btn = document.getElementById("btn-save-memory");
        btn.innerText = "✓ Saved";
        setTimeout(() => (btn.innerText = "💾 Save Memory"), 2000);
      });
    }
  });

  document.getElementById("btn-agentos-run")?.addEventListener("click", async () => {
    const biz = document.getElementById("agentos-biz").value.trim() || "My Business";
    const data = document.getElementById("agentos-data").value.trim() || "Rating: 4.8, 38 reviews, missing website link, last post 60 days ago";
    const mem = document.getElementById("agentos-memory-text")?.value.trim() || "";
    const resBox = document.getElementById("agentos-results");

    showLoading(resBox, `Executing Autonomous Agent OS Loop for ${biz}...`);

    const prompt = `You are an autonomous AI Agent OS executing the Observe-Think-Act loop for Google Business Profiles.
Business: ${biz}
Current Listing Signals: ${data}
Client Memory & Constraints: ${mem || DEFAULT_MEMORY}

Perform the loop:
1. OBSERVE: Parse listing signals & algorithmic deficiencies
2. THINK: Diagnose root causes of lost Map Pack visibility
3. ACT: Output 3 executable, prioritized SOP tasks ready for immediate execution`;

    const result = await callOpenRouter(prompt, "You are an autonomous AI Agent OS executing local business SOPs.");
    renderResult(resBox, result, `Agent OS SOP — ${biz}`);
  });

  // 17. 4S Proof of Work & Showcase Handlers
  document.getElementById("btn-fours-teardown")?.addEventListener("click", async () => {
    const biz = document.getElementById("fours-biz").value.trim() || "Prospect";
    const niche = document.getElementById("fours-niche").value.trim() || "Local Services";
    const city = document.getElementById("fours-city").value.trim() || "Local City";
    const resBox = document.getElementById("fours-results");

    showLoading(resBox, `Building Proof-of-Work case study for ${biz}...`);

    const prompt = `Apply the 'Showcase Proof-of-Work' framework to create a high-authority client teardown case study:
Client/Niche: ${biz} (${niche} in ${city})

Include:
1. The Teardown (Algorithmic vulnerabilities & missed revenue)
2. The Prescription (3-step technical and category fix)
3. Projected Financial Impact (Estimated calls, bookings, and revenue ROI)`;

    const result = await callOpenRouter(prompt, "You are a growth engineer creating proof-of-work case studies.");
    renderResult(resBox, result, `4S Case Study — ${biz}`);
  });

  document.getElementById("btn-fours-blueprint")?.addEventListener("click", async () => {
    const niche = document.getElementById("fours-niche").value.trim() || "Local Services";
    const resBox = document.getElementById("fours-results");

    showLoading(resBox, `Synthesizing 4S scaling blueprint for ${niche}...`);

    const prompt = `Synthesize an agency monetization roadmap for local high-ticket service businesses (${niche}):
1. Select: Why this local niche pays premium retainers
2. Skill: High-leverage automated tooling vs manual agency grind
3. Showcase: Positioning proof-of-work audits to close inbound clients
4. Scale: Managing 7-10 clients on $1,000-$1,500 monthly retainers with automated tooling`;

    const result = await callOpenRouter(prompt, "You are an expert career and monetization mentor.");
    renderResult(resBox, result, `4S Monetization Blueprint`);
  });

  // 18. Test Connection
  document.getElementById("test-conn-btn")?.addEventListener("click", async () => {
    const key = document.getElementById("openrouter-key").value.trim();
    const msg = document.getElementById("settings-msg");
    if (!key) {
      msg.innerText = "❌ Please enter an OpenRouter API key first.";
      msg.style.color = "#dc2626";
      return;
    }
    msg.innerText = "Testing OpenRouter connection...";
    msg.style.color = "#64748b";

    try {
      const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (res.ok) {
        msg.innerText = "✓ Connection verified! API key is active.";
        msg.style.color = "#16a34a";
      } else {
        msg.innerText = `❌ Invalid API key (HTTP ${res.status}).`;
        msg.style.color = "#dc2626";
      }
    } catch (err) {
      msg.innerText = "❌ Connection test failed: " + err.message;
      msg.style.color = "#dc2626";
    }
  });
});
