// MapRank Everywhere Extension - Popup Controller with AI Skills

const DEFAULT_KEY = ""; // Set your OpenRouter API key below

async function callOpenRouter(prompt, system = "You are an elite Google Business Profile Local SEO expert.") {
  let key = DEFAULT_KEY;
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    const data = await chrome.storage.sync.get(["openrouterKey"]);
    if (data.openrouterKey) key = data.openrouterKey;
  } else {
    key = localStorage.getItem("openrouterKey") || DEFAULT_KEY;
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://maprank-everywhere.local",
      "X-Title": "MapRank Everywhere Extension",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      max_tokens: 800,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  const json = await res.json();
  return json.choices?.[0]?.message?.content || "No response received from AI service.";
}

document.addEventListener("DOMContentLoaded", () => {
  // Tab Switching
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

  // Settings Load
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(["syncUrl", "syncToken", "openrouterKey"], (data) => {
      if (data.syncUrl) document.getElementById("server-url").value = data.syncUrl;
      if (data.syncToken) document.getElementById("api-token").value = data.syncToken;
      document.getElementById("openrouter-key").value = data.openrouterKey || DEFAULT_KEY;
    });
  } else {
    document.getElementById("server-url").value = localStorage.getItem("syncUrl") || "http://localhost:8080";
    document.getElementById("api-token").value = localStorage.getItem("syncToken") || "";
    document.getElementById("openrouter-key").value = localStorage.getItem("openrouterKey") || DEFAULT_KEY;
  }

  // Save Settings
  document.getElementById("save-settings-btn")?.addEventListener("click", () => {
    const url = document.getElementById("server-url").value.trim();
    const token = document.getElementById("api-token").value.trim();
    const openrouterKey = document.getElementById("openrouter-key").value.trim();
    const msg = document.getElementById("settings-msg");

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ syncUrl: url, syncToken: token, openrouterKey }, () => {
        msg.innerText = "Configuration saved successfully!";
        msg.style.color = "#137333";
        setTimeout(() => (msg.innerText = ""), 2500);
      });
    } else {
      localStorage.setItem("syncUrl", url);
      localStorage.setItem("syncToken", token);
      localStorage.setItem("openrouterKey", openrouterKey);
      msg.innerText = "Configuration saved successfully!";
    }
  });

  // Test Server Connection
  document.getElementById("test-conn-btn")?.addEventListener("click", async () => {
    const url = document.getElementById("server-url").value.trim() || "http://localhost:8080";
    const token = document.getElementById("api-token").value.trim();
    const msg = document.getElementById("settings-msg");
    msg.innerText = "Pinging sync server...";
    try {
      const res = await fetch(`${url}/api/v1/healthcheck`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      msg.innerText = res.ok ? "Connected to Sync Server!" : `Server returned status ${res.status}`;
      msg.style.color = res.ok ? "#137333" : "#b06000";
    } catch {
      msg.innerText = "Server not reachable.";
      msg.style.color = "#d93025";
    }
  });

  // 1. Run 100-Point Audit
  document.getElementById("btn-run-audit")?.addEventListener("click", async () => {
    const biz = document.getElementById("audit-biz").value.trim() || "Bhardwaj Photo Studio";
    const cat = document.getElementById("audit-cat").value.trim() || "Photography Studio";
    const city = document.getElementById("audit-city").value.trim() || "Local Area";
    const resBox = document.getElementById("audit-results");

    resBox.style.display = "block";
    resBox.innerText = `Analyzing ${biz} with Gemini 2.5 Flash...`;

    const prompt = `Run a comprehensive 100-Point Local SEO & Google Business Profile audit for:
Business: ${biz}
Category: ${cat}
City: ${city}

Output:
1. Health Score (0-100)
2. 4 Missing High-Impact Secondary Categories
3. High-Intent Keywords for Description & Services
4. Optimized 750-Character Description
5. 3 Action Steps to Rank in Local 3-Pack`;

    try {
      const result = await callOpenRouter(prompt);
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error running audit: " + e.message;
    }
  });

  // 2. Generate Client Pitch ($750/mo retainer)
  document.getElementById("btn-gen-pitch")?.addEventListener("click", async () => {
    const biz = document.getElementById("audit-biz").value.trim() || "Local Business Client";
    const cat = document.getElementById("audit-cat").value.trim() || "Photography Studio";
    const city = document.getElementById("audit-city").value.trim() || "Local Market";
    const resBox = document.getElementById("audit-results");

    resBox.style.display = "block";
    resBox.innerText = `Drafting $750/mo Retainer Pitch Proposal for ${biz}...`;

    const prompt = `Write a high-converting Local SEO agency client proposal for:
Client: ${biz} (${cat} in ${city})
Retainer: $750/month

Include:
- Executive Summary (Lost calls & directions to competitors)
- 30-Day Quick Win Sprint (Categories, Review QR system, Weekly Posts)
- Expected Deliverables & Measurable ROI
- Closing Call to Action`;

    try {
      const result = await callOpenRouter(prompt);
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error drafting pitch: " + e.message;
    }
  });

  // 3. Generate Review Replies
  document.getElementById("btn-gen-reply")?.addEventListener("click", async () => {
    const biz = document.getElementById("reply-biz").value.trim() || "Bhardwaj Photo Studio";
    const stars = document.getElementById("reply-stars").value;
    const text = document.getElementById("reply-text").value.trim();
    const resBox = document.getElementById("reply-results");

    if (!text) {
      resBox.style.display = "block";
      resBox.innerText = "Please paste a customer review first.";
      return;
    }

    resBox.style.display = "block";
    resBox.innerText = "Drafting 3 calibrated replies...";

    const prompt = `Generate 3 distinct, professional Google Review replies for:
Business: ${biz}
Rating: ${stars} Stars
Review: "${text}"

Provide:
1. Friendly & Warm (Appreciation + keyword injection)
2. Concise & Professional
3. Engagement & Next Visit / De-escalation (if low rating)`;

    try {
      const result = await callOpenRouter(prompt);
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error: " + e.message;
    }
  });

  // 4. Generate 4-Week Post Calendar
  document.getElementById("btn-gen-posts")?.addEventListener("click", async () => {
    const biz = document.getElementById("posts-biz").value.trim() || "Bhardwaj Photo Studio";
    const promo = document.getElementById("posts-promo").value.trim() || "Seasonal Service Discount";
    const resBox = document.getElementById("posts-results");

    resBox.style.display = "block";
    resBox.innerText = `Generating 4-Week Post Calendar for ${biz}...`;

    const prompt = `Create a 4-Week Google Posts content calendar for:
Business: ${biz}
Special Focus: ${promo}

For each week (Week 1 to Week 4), provide:
- Post Type (What's New, Offer, or Event)
- Hook / Headline
- Body Copy (100-120 words with local keywords)
- Recommended CTA Button (Call Now, Book, Learn More)
- Suggested Photo / Graphic`;

    try {
      const result = await callOpenRouter(prompt);
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error: " + e.message;
    }
  });

  // 5. Pre-Seed Google Q&A Pairs (Course Strategy)
  document.getElementById("btn-gen-qa")?.addEventListener("click", async () => {
    const biz = document.getElementById("qa-biz").value.trim() || "Bhardwaj Photo Studio";
    const cat = document.getElementById("qa-cat").value.trim() || "Photography Studio";
    const city = document.getElementById("qa-city").value.trim() || "Local City";
    const resBox = document.getElementById("qa-results");

    resBox.style.display = "block";
    resBox.innerText = `Pre-seeding 5 high-ranking Q&A pairs for ${biz}...`;

    const prompt = `Generate 5 high-converting, SEO-optimized Google Q&A pairs for:
Business: ${biz}
Category: ${cat}
City: ${city}

Cover:
1. Pricing / Packages & Turnaround time
2. Booking process & Consultations
3. Service area & On-location availability
4. Customization & Deliverables format
5. Payment methods & Rush requests

Make sure keywords appear in BOTH the question and the owner answer for conversational search.`;

    try {
      const result = await callOpenRouter(prompt);
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error: " + e.message;
    }
  });

  // 6. Suspension Risk Audit
  document.getElementById("btn-audit-suspension")?.addEventListener("click", async () => {
    const biz = document.getElementById("policy-biz").value.trim() || "Bhardwaj Photo Studio";
    const resBox = document.getElementById("policy-results");

    resBox.style.display = "block";
    resBox.innerText = `Auditing suspension risks for "${biz}"...`;

    const prompt = `Perform a Google Business Profile Policy & Suspension Risk Audit for:
Listing Title: "${biz}"

Analyze:
1. Name Keyword Stuffing Risk (Is non-legal text/location/phone added?)
2. Storefront vs SAB risk triggers
3. Video re-verification likelihood
4. Suspension Prevention Checklist
5. Final Risk Score: LOW, MEDIUM, or HIGH risk`;

    try {
      const result = await callOpenRouter(prompt);
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error: " + e.message;
    }
  });

  // Repurpose to Social Media (Multi-Platform Content Engine)
  document.getElementById("btn-repurpose-social")?.addEventListener("click", async () => {
    const biz = document.getElementById("social-biz").value.trim() || "Bhardwaj Photo Studio";
    const win = document.getElementById("social-win").value.trim() || "Best photo studio in town! Delivered beautiful wedding photos and frames.";
    const resBox = document.getElementById("social-results");

    resBox.style.display = "block";
    resBox.innerText = `Repurposing review into viral social media assets for ${biz}...`;

    const prompt = `Turn this 5-star Google review into a multi-platform social media campaign:
Business: ${biz}
Review / Win: "${win}"

Output:
1. 30-Second Instagram Reel / TikTok Script (Visual Hook in first 3s, Voiceover story, Call-To-Action)
2. Facebook / Instagram Carousel Caption (Emotional hook, quote snippet, hashtags)
3. LinkedIn B2B / Founder Story Angle
4. Promotional Offer Hook to pair with this post`;

    try {
      const result = await callOpenRouter(prompt);
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error: " + e.message;
    }
  });

  // Competitor Ad Library Teardown
  document.getElementById("btn-spy-ads")?.addEventListener("click", async () => {
    const biz = document.getElementById("social-biz").value.trim() || "Bhardwaj Photo Studio";
    const resBox = document.getElementById("social-results");

    resBox.style.display = "block";
    resBox.innerText = `Analyzing competitor ad strategies for ${biz}...`;

    const prompt = `Perform a Meta Ad Library & Competitor Social Ad Teardown for:
Business / Niche: ${biz}

Provide:
1. 3 Winning Ad Angles (Problem/Agitation, Social Proof/Case Study, and Irresistible Hook)
2. Creative Visual Direction (UGC, BTS, Before/After)
3. Ad Copy & Headline examples
4. Local Audience Retargeting Strategy`;

    try {
      const result = await callOpenRouter(prompt);
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error: " + e.message;
    }
  });

  // 7. Fake Review Removal Dispute Ticket
  document.getElementById("btn-gen-dispute")?.addEventListener("click", async () => {
    const biz = document.getElementById("policy-biz").value.trim() || "Bhardwaj Photo Studio";
    const rev = document.getElementById("policy-review").value.trim() || "Terrible service, completely fake and rude staff!";
    const resBox = document.getElementById("policy-results");

    resBox.style.display = "block";
    resBox.innerText = "Drafting formal policy dispute ticket for Google Support...";

    const prompt = `Write a formal, policy-backed Google Review Dispute Ticket for Google Business Profile Support:
Business Name: ${biz}
Flagged Review: "${rev}"

Grounds:
- Violates Google's Prohibited and Restricted Content Policy (Misinformation / Conflict of Interest / Fake engagement).
- Professional tone requesting removal from local map listing.`;

    try {
      const result = await callOpenRouter(prompt);
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error: " + e.message;
    }
  });

  // 5. Teleport Launch
  document.getElementById("teleport-btn")?.addEventListener("click", () => {
    const q = document.getElementById("teleport-query").value.trim() || "photo studio";
    const l = document.getElementById("teleport-location").value.trim() || "28.6139, 77.2090";

    let url = `https://www.google.com/maps/search/${encodeURIComponent(q + " in " + l)}`;
    if (l.includes(",")) {
      const [lat, lng] = l.split(",").map((s) => s.trim());
      url = `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${lat},${lng},15z`;
    }

    if (typeof chrome !== "undefined" && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank");
    }
  });

  // 8. 1-Person Agency & Client Acquisition Handlers
  document.getElementById("btn-agency-coldemail")?.addEventListener("click", async () => {
    const biz = document.getElementById("agency-biz").value.trim() || "Bhardwaj Photo Studio";
    const cat = document.getElementById("agency-cat").value.trim() || "Photography Studio";
    const loc = document.getElementById("agency-loc").value.trim() || "Delhi";
    const gap = document.getElementById("agency-gap").value.trim() || "Missing secondary categories & 15 reviews vs competitor's 180";
    const resBox = document.getElementById("agency-results");

    resBox.style.display = "block";
    resBox.innerText = "Drafting personalized Audit Cold Email...";

    const prompt = `You are an elite AI outbound cold email copywriter for local SEO.
Target Business: ${biz}
Category: ${cat} in ${loc}
Observed Bottleneck: ${gap}

Write:
1. High-Converting Cold Email (under 100 words):
   - Subject Line: 2 casual, hyper-targeted variations
   - Observation Hook: Acknowledge their business and call out their exact ranking bottleneck (${gap})
   - Frictionless Offer: Free 2-minute video teardown showing exact steps to rank in Top 3 Map Pack
   - Clean signature
2. Day 3 Follow-Up: 2-sentence polite bump mentioning a high-intent local search query.`;

    try {
      const result = await callOpenRouter(prompt, "You are an elite 1-person agency cold outreach copywriter.");
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error: " + e.message;
    }
  });

  document.getElementById("btn-agency-upwork")?.addEventListener("click", async () => {
    const biz = document.getElementById("agency-biz").value.trim() || "Bhardwaj Photo Studio";
    const cat = document.getElementById("agency-cat").value.trim() || "Photography Studio";
    const gap = document.getElementById("agency-gap").value.trim() || "Competitors dominating the Map Pack";
    const resBox = document.getElementById("agency-results");

    resBox.style.display = "block";
    resBox.innerText = "Writing winning Upwork proposal...";

    const prompt = `Write a winning Upwork proposal for a local SEO / Google Maps optimization contract for a client in the ${cat} niche (${biz}):
1. Opening Hook: Reference their ranking struggle (${gap}) directly in the first line.
2. Proof of Work: Explain taking a similar client from #8 to #2 in 21 days with category alignment & review velocity.
3. 3-Milestone Execution: Audit & Category fix (Day 1-3), Review Loop & Q&A (Day 4-7), Geo-Grid signals (Day 8-14).
4. Low friction CTA. Under 180 words.`;

    try {
      const result = await callOpenRouter(prompt, "You are an elite Upwork proposal specialist.");
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error: " + e.message;
    }
  });

  document.getElementById("btn-agency-pricing")?.addEventListener("click", async () => {
    const biz = document.getElementById("agency-biz").value.trim() || "Bhardwaj Photo Studio";
    const cat = document.getElementById("agency-cat").value.trim() || "Photography Studio";
    const resBox = document.getElementById("agency-results");

    resBox.style.display = "block";
    resBox.innerText = "Calculating 3-tier retainer packages...";

    const prompt = `Create a 3-tier monthly retainer package for ${biz} in the ${cat} niche:
Tier 1: Foundation ($500/month) - Review responses, 2 weekly posts, listing hygiene.
Tier 2: Growth ($1,500/month) - Geo-grid competitor audit, citation cleanup, pre-seeded Q&A, social repurposing to Reels/TikTok.
Tier 3: Domination ($3,000/month) - Full local pack domination, dedicated AI review engine, on-page schema sync, weekly calls.
Detail exact deliverables and expected business ROI for each.`;

    try {
      const result = await callOpenRouter(prompt, "You are an agency pricing and packaging architect.");
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error: " + e.message;
    }
  });

  document.getElementById("btn-agency-closer")?.addEventListener("click", async () => {
    const biz = document.getElementById("agency-biz").value.trim() || "Bhardwaj Photo Studio";
    const cat = document.getElementById("agency-cat").value.trim() || "Photography Studio";
    const resBox = document.getElementById("agency-results");

    resBox.style.display = "block";
    resBox.innerText = "Generating discovery call closing scripts...";

    const prompt = `Provide the exact word-for-word scripts to close the owner of ${biz} (${cat}) on a discovery call:
1. Handling 'It's too expensive': Compare retainer cost vs Google Local Services Ads cost-per-click.
2. Handling 'We already have someone doing our SEO/Website': Expose the difference between web design and local map pack category algorithms.
3. Handling 'How fast will we see results?': Explain category updates (7-14 days) vs review compounding (30-60 days).`;

    try {
      const result = await callOpenRouter(prompt, "You are a master B2B sales closer.");
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error: " + e.message;
    }
  });

  // 9. Autonomous AI Agent OS Handlers
  const DEFAULT_MEMORY = "Never mention passport photos or cheap rates. Brand tone: luxury, warm, emotional, authoritative. Priority keywords: best wedding photographer in Delhi NCR, pre-wedding shoot Delhi, candid cinematic wedding film.";

  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(["globalAgentMemory"], (res) => {
      const memInput = document.getElementById("agentos-memory-text");
      if (memInput) memInput.value = res.globalAgentMemory || DEFAULT_MEMORY;
    });
  } else {
    const memInput = document.getElementById("agentos-memory-text");
    if (memInput && !memInput.value) memInput.value = localStorage.getItem("globalAgentMemory") || DEFAULT_MEMORY;
  }

  document.getElementById("btn-agentos-save-mem")?.addEventListener("click", () => {
    const val = document.getElementById("agentos-memory-text")?.value.trim() || "";
    const status = document.getElementById("agentos-mem-status");
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ globalAgentMemory: val }, () => {
        if (status) {
          status.innerText = "✓ Rules committed to Agent Memory!";
          status.style.display = "block";
          setTimeout(() => (status.style.display = "none"), 2500);
        }
      });
    } else {
      localStorage.setItem("globalAgentMemory", val);
      if (status) {
        status.innerText = "✓ Rules saved to localStorage!";
        status.style.display = "block";
        setTimeout(() => (status.style.display = "none"), 2500);
      }
    }
  });

  document.getElementById("btn-agentos-run")?.addEventListener("click", async () => {
    const biz = document.getElementById("agentos-biz").value.trim() || "Bhardwaj Photo Studio";
    const data = document.getElementById("agentos-data").value.trim() || "Rating: 4.8, 42 reviews, missing website, last post 45 days ago";
    const mem = document.getElementById("agentos-memory-text")?.value.trim() || "";
    const resBox = document.getElementById("agentos-results");

    resBox.style.display = "block";
    resBox.innerText = "Executing autonomous Observe-Think-Act loop...";

    const prompt = `You are an autonomous AI Agent OS executing the Observe-Think-Act loop for Google Business Profiles.
Business Name: ${biz}
Raw Signals: ${data}
${mem ? `Persistent Memory & SOP Rules: ${mem}` : ""}

Perform the loop:
1. [OBSERVE]: Scan listing completeness, review recency, category signal strength.
2. [THINK]: Pinpoint the #1 algorithmic bottleneck holding them back from #1 on Google Maps.
3. [ACT - EXECUTABLE SOPs]:
   - SOP 1: Immediate Listing Fix
   - SOP 2: Geo-Optimized 5-Star Review Reply template (with local keywords)
   - SOP 3: Google Post Update (catchy headline, value snippet, call to action)`;

    try {
      const result = await callOpenRouter(prompt, "You are an autonomous AI Agent OS executing local business SOPs.");
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error: " + e.message;
    }
  });

  // 10. 4S Proof of Work & Showcase Handlers
  document.getElementById("btn-fours-teardown")?.addEventListener("click", async () => {
    const biz = document.getElementById("fours-biz").value.trim() || "Bhardwaj Photo Studio";
    const niche = document.getElementById("fours-niche").value.trim() || "Wedding & Commercial Photography";
    const city = document.getElementById("fours-city").value.trim() || "Delhi";
    const resBox = document.getElementById("fours-results");

    resBox.style.display = "block";
    resBox.innerText = "Constructing Proof-of-Work Teardown Case Study...";

    const prompt = `You are applying the 'Showcase Proof-of-Work' framework.
Create a high-impact, professional Client Teardown Case Study for:
Business: ${biz}
Niche: ${niche}
Market: ${city}

Structure the case study:
1. Executive Summary: Current local Google Maps visibility vs market potential.
2. The 3 Costly Bottlenecks: Unoptimized category signals, dormant review keywords, and competitor geo-dominance.
3. The Transformation Roadmap (Step-by-Step implementation).
4. Estimated Financial ROI: What moving into the Top 3 Map Pack delivers in monthly customer inquiries and revenue ($15k-$30k value).
This document serves as undeniable proof of competence to win high-ticket clients.`;

    try {
      const result = await callOpenRouter(prompt, "You are a growth engineer creating proof-of-work case studies.");
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error: " + e.message;
    }
  });

  document.getElementById("btn-fours-blueprint")?.addEventListener("click", async () => {
    const niche = document.getElementById("fours-niche").value.trim() || "Wedding & Commercial Photography";
    const resBox = document.getElementById("fours-results");

    resBox.style.display = "block";
    resBox.innerText = "Generating 4S $10k/Month Scaling Blueprint...";

    const prompt = `Outline the 4S scaling blueprint to turn local SEO & AI audit capabilities (${niche} niche) into a $10,000/month recurring income model:
1. S - Select: Why local high-ticket service niches (studios, medical, legal) pay premium retainers.
2. S - Skill: High-leverage automated tooling vs manual manual agency work.
3. S - Showcase: Using public teardowns and live case studies to attract inbound clients without cold spam.
4. S - Scale: Managing 7-10 clients on $1k-$1.5k monthly retainers using automated extensions and AI agent SOPs.`;

    try {
      const result = await callOpenRouter(prompt, "You are an expert career and monetization mentor.");
      resBox.innerText = result;
    } catch (e) {
      resBox.innerText = "Error: " + e.message;
    }
  });
});
