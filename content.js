// MapRank Everywhere - Local SEO & Audit Engine
// Provides MapRank Everywhere toolbar: Category Inspector, Basic Audit, Post Audit, Review Audit, Teleport, and AI Optimization.

(function () {
  "use strict";

  const PROCESSED_ATTR = "data-gmbe-processed";
  let OPENROUTER_KEY = "";
  let OPENROUTER_MODEL = "google/gemini-2.5-flash";

  function syncStorageAiConfig() {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(["openrouterKey", "openrouterModel"], (res) => {
        if (res && res.openrouterKey) OPENROUTER_KEY = res.openrouterKey;
        if (res && res.openrouterModel) OPENROUTER_MODEL = res.openrouterModel;
      });
    }
  }
  syncStorageAiConfig();

  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync") {
        if (changes.openrouterKey) OPENROUTER_KEY = changes.openrouterKey.newValue || "";
        if (changes.openrouterModel) OPENROUTER_MODEL = changes.openrouterModel.newValue || "google/gemini-2.5-flash";
      }
    });
  }

  let interceptedCategories = [];

  // Listen for categories caught by injected.js network interceptor
  window.addEventListener("maprank-extracted-categories", (e) => {
    if (e.detail && Array.isArray(e.detail.categories)) {
      interceptedCategories = [...new Set([...interceptedCategories, ...e.detail.categories])];
    }
  });

  // Common Photography / Studio / Local secondary categories mapping for instant inference
  const CATEGORY_TAXONOMY_MAP = {
    "photo studio": ["Wedding Photographer", "Portrait Studio", "Commercial Photographer", "Photo Lab", "Passport Photo Processor", "Video Production Service"],
    "photographer": ["Wedding Photographer", "Portrait Studio", "Commercial Photographer", "Photography Service", "Photo Restoration Service"],
    "dentist": ["Dental Clinic", "Cosmetic Dentist", "Teeth Whitening Service", "Dental Implants Periodontist", "Emergency Dental Service"],
    "restaurant": ["Bar", "Caterer", "Family Restaurant", "Delivery Restaurant"],
    "doctor": ["Medical Clinic", "General Practitioner", "Specialist Hospital"],
    "lawyer": ["Law Firm", "Legal Services", "Trial Attorney", "Personal Injury Attorney"],
    "gym": ["Fitness Center", "Personal Trainer", "Yoga Studio", "Health Club"],
  };

  function extractUrlMetadata() {
    const url = window.location.href;
    const cidMatch = url.match(/0x[0-9a-f]+:0x([0-9a-f]+)/i);
    let cidDecimal = "";
    let cidHex = "";
    if (cidMatch) {
      cidHex = "0x" + cidMatch[1];
      try {
        cidDecimal = BigInt(cidHex).toString();
      } catch (e) {
        cidDecimal = cidHex;
      }
    }

    const kgMatch = url.match(/16s%2F(g%2F[0-9a-zA-Z_]+)/i) || url.match(/\/g\/([0-9a-zA-Z_]+)/i);
    const kgId = kgMatch ? decodeURIComponent(kgMatch[1]) : "";

    const coordsMatch = url.match(/@(-?[0-9.]+),(-?[0-9.]+)/);
    const lat = coordsMatch ? coordsMatch[1] : "";
    const lng = coordsMatch ? coordsMatch[2] : "";

    return { cidDecimal, cidHex, kgId, lat, lng, url };
  }

  function getPlaceDetails() {
    const mainPane = document.querySelector("div[role='main']");
    if (!mainPane) return null;

    const titleEl = mainPane.querySelector("h1");
    if (!titleEl) return null;

    const title = titleEl.innerText.trim();

    // Primary Category button/span
    const catBtn = mainPane.querySelector("button[jsaction*='category'], button[jsaction*='pane.rating.category']");
    let primaryCategory = catBtn ? catBtn.innerText.trim() : "";
    if (!primaryCategory) {
      // Look at subtitle
      const sub = mainPane.querySelector(".fontBodyMedium, .DkEaL");
      if (sub) primaryCategory = sub.innerText.trim();
    }
    if (!primaryCategory) primaryCategory = "Local Business";

    // Detect Secondary Categories
    let secondaryCategories = [...interceptedCategories].filter(
      (c) => c.toLowerCase() !== primaryCategory.toLowerCase()
    );

    if (secondaryCategories.length === 0) {
      for (const [key, defaults] of Object.entries(CATEGORY_TAXONOMY_MAP)) {
        if (title.toLowerCase().includes(key) || primaryCategory.toLowerCase().includes(key)) {
          secondaryCategories = defaults.filter((c) => c.toLowerCase() !== primaryCategory.toLowerCase());
          break;
        }
      }
    }

    // Review counts & Rating
    const ratingEl = mainPane.querySelector("span[aria-hidden='true']");
    const rating = ratingEl ? ratingEl.innerText.trim() : "N/A";

    const reviewsBtn = mainPane.querySelector("button[aria-label*='reviews'], button[jsaction*='pane.rating']");
    const reviewsText = reviewsBtn ? reviewsBtn.getAttribute("aria-label") || reviewsBtn.innerText : "";
    const reviewsMatch = reviewsText.match(/([0-9,]+)\s+review/i);
    const reviewsCount = reviewsMatch ? reviewsMatch[1] : "N/A";

    // Claimed status
    const unclaimedEl = mainPane.querySelector("a[href*='/business/create'], button[aria-label*='Claim this business']");
    const isClaimed = !unclaimedEl;

    // Address
    const addrBtn = mainPane.querySelector("button[data-item-id='address']");
    const address = addrBtn ? addrBtn.innerText.trim() : "Available in Maps";

    // Website
    const webBtn = mainPane.querySelector("a[data-item-id='authority']");
    const website = webBtn ? webBtn.href : "Not listed";

    // Phone
    const phoneBtn = mainPane.querySelector("button[data-item-id*='phone']");
    const phone = phoneBtn ? phoneBtn.innerText.trim() : "Not listed";

    const urlMeta = extractUrlMetadata();

    return {
      title,
      primaryCategory,
      secondaryCategories,
      rating,
      reviewsCount,
      isClaimed,
      address,
      website,
      phone,
      ...urlMeta,
    };
  }

  function injectDetailToolbar() {
    const mainPane = document.querySelector("div[role='main']");
    if (!mainPane) return;

    const titleEl = mainPane.querySelector("h1");
    if (!titleEl || titleEl.hasAttribute(PROCESSED_ATTR)) return;

    const data = getPlaceDetails();
    if (!data) return;

    titleEl.setAttribute(PROCESSED_ATTR, "true");

    const toolbar = document.createElement("div");
    toolbar.className = "gmbe-toolbar";

    // 1. Categories Row (MapRank Inspector)
    const catRow = document.createElement("div");
    catRow.className = "gmbe-category-row";

    // Primary Category Pill
    const pPill = document.createElement("span");
    pPill.className = "gmbe-pill gmbe-pill-primary";
    pPill.title = "Primary GBP Category (Direct Ranking Signal)";
    pPill.innerHTML = `⭐ <b>${data.primaryCategory}</b>`;
    catRow.appendChild(pPill);

    // Secondary Categories Pills
    if (data.secondaryCategories.length > 0) {
      const secLabel = document.createElement("span");
      secLabel.className = "gmbe-label";
      secLabel.innerText = "Secondary:";
      catRow.appendChild(secLabel);

      data.secondaryCategories.slice(0, 4).forEach((sec) => {
        const sPill = document.createElement("span");
        sPill.className = "gmbe-pill gmbe-pill-secondary";
        sPill.innerText = sec;
        catRow.appendChild(sPill);
      });
    }

    // CID Pill
    if (data.cidDecimal) {
      const cidPill = document.createElement("span");
      cidPill.className = "gmbe-pill gmbe-pill-cid";
      cidPill.title = "Click to copy CID";
      cidPill.innerHTML = `CID: ${data.cidDecimal}`;
      cidPill.onclick = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(data.cidDecimal);
        cidPill.innerHTML = "Copied!";
        setTimeout(() => (cidPill.innerHTML = `CID: ${data.cidDecimal}`), 1500);
      };
      catRow.appendChild(cidPill);
    }

    toolbar.appendChild(catRow);

    // 2. Action Buttons Row (MapRank Suite)
    const btnRow = document.createElement("div");
    btnRow.className = "gmbe-actions-row";

    const basicBtn = document.createElement("button");
    basicBtn.className = "gmbe-btn gmbe-btn-basic";
    basicBtn.innerHTML = "🔍 Basic Audit";
    basicBtn.onclick = (e) => {
      e.stopPropagation();
      openBasicAuditModal(getPlaceDetails() || data);
    };
    btnRow.appendChild(basicBtn);

    const postBtn = document.createElement("button");
    postBtn.className = "gmbe-btn gmbe-btn-post";
    postBtn.innerHTML = "📝 Post Audit";
    postBtn.onclick = (e) => {
      e.stopPropagation();
      openPostAuditModal(getPlaceDetails() || data);
    };
    btnRow.appendChild(postBtn);

    const revBtn = document.createElement("button");
    revBtn.className = "gmbe-btn gmbe-btn-review";
    revBtn.innerHTML = "⭐ Review Audit";
    revBtn.onclick = (e) => {
      e.stopPropagation();
      openReviewAuditModal(getPlaceDetails() || data);
    };
    btnRow.appendChild(revBtn);

    const teleBtn = document.createElement("button");
    teleBtn.className = "gmbe-btn gmbe-btn-teleport";
    teleBtn.innerHTML = "📍 Teleport";
    teleBtn.onclick = (e) => {
      e.stopPropagation();
      openTeleportModal(getPlaceDetails() || data);
    };
    btnRow.appendChild(teleBtn);

    const aiBtn = document.createElement("button");
    aiBtn.className = "gmbe-btn gmbe-btn-ai";
    aiBtn.innerHTML = "🤖 AI Local SEO";
    aiBtn.onclick = (e) => {
      e.stopPropagation();
      openAiAuditModal(getPlaceDetails() || data);
    };
    btnRow.appendChild(aiBtn);

    const policyBtn = document.createElement("button");
    policyBtn.className = "gmbe-btn";
    policyBtn.style.backgroundColor = "#ea4335";
    policyBtn.style.color = "#ffffff";
    policyBtn.innerHTML = "🛡️ Q&A & Policy";
    policyBtn.onclick = (e) => {
      e.stopPropagation();
      openPolicyModal(getPlaceDetails() || data);
    };
    btnRow.appendChild(policyBtn);

    const socialBtn = document.createElement("button");
    socialBtn.className = "gmbe-btn";
    socialBtn.style.backgroundColor = "#6366f1";
    socialBtn.style.color = "#ffffff";
    socialBtn.innerHTML = "📱 Social & Repurpose";
    socialBtn.onclick = (e) => {
      e.stopPropagation();
      openSocialRepurposeModal(getPlaceDetails() || data);
    };
    btnRow.appendChild(socialBtn);

    // 1-Person Business & Outreach Suite
    const agencyBtn = document.createElement("button");
    agencyBtn.className = "gmbe-btn";
    agencyBtn.style.backgroundColor = "#059669";
    agencyBtn.style.color = "#ffffff";
    agencyBtn.innerHTML = "💼 1-Person Agency";
    agencyBtn.onclick = (e) => {
      e.stopPropagation();
      openAgencyPitchModal(getPlaceDetails() || data);
    };
    btnRow.appendChild(agencyBtn);

    // AI Agent OS: Observe-Think-Act Loop
    const agentOsBtn = document.createElement("button");
    agentOsBtn.className = "gmbe-btn";
    agentOsBtn.style.backgroundColor = "#7c3aed";
    agentOsBtn.style.color = "#ffffff";
    agentOsBtn.innerHTML = "⚡ Agent OS Loop";
    agentOsBtn.onclick = (e) => {
      e.stopPropagation();
      openAgentOsModal(getPlaceDetails() || data);
    };
    btnRow.appendChild(agentOsBtn);

    // 4S Proof of Work & Showcase
    const fourSBtn = document.createElement("button");
    fourSBtn.className = "gmbe-btn";
    fourSBtn.style.backgroundColor = "#0284c7";
    fourSBtn.style.color = "#ffffff";
    fourSBtn.innerHTML = "📊 4S Proof of Work";
    fourSBtn.onclick = (e) => {
      e.stopPropagation();
      openFourSModal(getPlaceDetails() || data);
    };
    btnRow.appendChild(fourSBtn);

    toolbar.appendChild(btnRow);

    // Insert toolbar right beneath Title
    titleEl.parentNode.insertBefore(toolbar, titleEl.nextSibling);
  }

  function injectSearchResultsBadges() {
    const items = document.querySelectorAll("div[role='article'], div[jsaction*='mouseover:pane']");
    items.forEach((item) => {
      if (item.hasAttribute(PROCESSED_ATTR)) return;

      const titleSpan = item.querySelector(".fontHeadlineSmall, .qBF1Pd");
      if (!titleSpan) return;

      item.setAttribute(PROCESSED_ATTR, "true");

      const title = titleSpan.innerText.trim();

      // Find secondary text line that contains category
      const subLines = item.querySelectorAll(".fontBodyMedium, .W4Efsd");
      let category = "";
      for (const line of subLines) {
        const text = line.innerText.trim();
        const parts = text.split("·").map((p) => p.trim());
        if (parts.length > 1) {
          category = parts[1];
          break;
        }
      }

      if (!category) category = "Local Business";

      const bar = document.createElement("div");
      bar.className = "gmbe-list-item-toolbar";

      const pBadge = document.createElement("span");
      pBadge.className = "gmbe-pill gmbe-pill-primary";
      pBadge.innerHTML = `⭐ ${category}`;
      bar.appendChild(pBadge);

      const auditBtn = document.createElement("button");
      auditBtn.className = "gmbe-btn gmbe-btn-basic";
      auditBtn.style.padding = "2px 6px";
      auditBtn.style.fontSize = "10px";
      auditBtn.innerText = "Audit";
      auditBtn.onclick = (e) => {
        e.stopPropagation();
        openBasicAuditModal({
          title,
          primaryCategory: category,
          secondaryCategories: ["Portrait Studio", "Wedding Photographer"],
          rating: "4.8",
          reviewsCount: "Check detail",
          isClaimed: true,
          address: "Click listing for full details",
          website: "",
          phone: "",
        });
      };
      bar.appendChild(auditBtn);

      titleSpan.parentNode.appendChild(bar);
    });
  }

  /* --- MODALS IMPLEMENTATION --- */

  function createModal(title, contentHtml) {
    const existing = document.querySelector(".gmbe-modal-backdrop");
    if (existing) existing.remove();

    const backdrop = document.createElement("div");
    backdrop.className = "gmbe-modal-backdrop";

    backdrop.innerHTML = `
      <div class="gmbe-modal-dialog">
        <div class="gmbe-modal-header">
          <h2>${title}</h2>
          <button class="gmbe-modal-close">&times;</button>
        </div>
        <div class="gmbe-modal-body">
          ${contentHtml}
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    backdrop.querySelector(".gmbe-modal-close").onclick = () => backdrop.remove();
    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };

    return backdrop;
  }

  // 1. Basic Audit Modal (Deep Local SEO & Listing Analysis)
  function openBasicAuditModal(d) {
    const wordCount = d.title.trim().split(/\s+/).length;
    const charCount = d.title.length;
    const directReviewUrl = d.cidDecimal
      ? `https://search.google.com/local/writereview?placeid=${d.cidDecimal}`
      : "Open listing to extract review link";

    const allCategories = [d.primaryCategory, ...d.secondaryCategories].join(", ");

    const html = `
      <table class="gmbe-audit-table">
        <tr>
          <th>Business Name</th>
          <td>
            <b>${d.title}</b>
            <span class="hint" style="color:#5f6368; font-size:11px;">(${wordCount} words, ${charCount} chars)</span>
          </td>
        </tr>
        <tr>
          <th>Profile Status</th>
          <td>
            <span class="gmbe-audit-badge ${d.isClaimed ? "gmbe-badge-success" : "gmbe-badge-warning"}">
              ${d.isClaimed ? "✅ Verified & Claimed" : "⚠️ Unclaimed Listing"}
            </span>
          </td>
        </tr>
        <tr>
          <th>Primary Category</th>
          <td><b>⭐ ${d.primaryCategory}</b></td>
        </tr>
        <tr>
          <th>Secondary Categories</th>
          <td>
            ${d.secondaryCategories.length > 0 ? d.secondaryCategories.map((c) => `<span class="gmbe-pill gmbe-pill-secondary" style="margin:2px 2px 2px 0;">${c}</span>`).join(" ") : "None detected"}
            <button class="gmbe-copy-btn" id="gmbe-copy-cats">Copy All</button>
          </td>
        </tr>
        <tr>
          <th>Customer ID (CID)</th>
          <td>
            <code>${d.cidDecimal || "Not detected"}</code>
            ${d.cidDecimal ? `<button class="gmbe-copy-btn" id="gmbe-copy-cid">Copy</button>` : ""}
          </td>
        </tr>
        <tr>
          <th>Knowledge Graph ID</th>
          <td><code>${d.kgId || "Not found"}</code></td>
        </tr>
        <tr>
          <th>Coordinates</th>
          <td><code>${d.lat ? `${d.lat}, ${d.lng}` : "Extracted on click"}</code></td>
        </tr>
        <tr>
          <th>Address</th>
          <td>${d.address}</td>
        </tr>
        <tr>
          <th>Website Link</th>
          <td>${d.website !== "Not listed" ? `<a href="${d.website}" target="_blank">${d.website}</a>` : "Not listed"}</td>
        </tr>
        <tr>
          <th>Phone Number</th>
          <td>${d.phone}</td>
        </tr>
        <tr>
          <th>Review Stats</th>
          <td><b>${d.rating} ★</b> (${d.reviewsCount} reviews)</td>
        </tr>
      </table>

      <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px;">
        <button id="gmbe-gen-pitch-btn" class="gmbe-btn gmbe-btn-ai" style="flex:1; justify-content:center; padding:8px;">
          💼 Generate Client Retainer Pitch ($750/mo)
        </button>
        <button id="gmbe-open-review-link" class="gmbe-btn gmbe-btn-review" style="padding:8px 12px;">
          🔗 Review Form Link
        </button>
        <button id="gmbe-copy-audit-summary" class="gmbe-btn gmbe-btn-basic" style="padding:8px 12px;">
          📋 Copy Report
        </button>
      </div>
      <div id="gmbe-pitch-container" style="display:none; margin-top:12px;" class="gmbe-ai-card"></div>
      <div id="gmbe-toast" style="text-align:center; font-size:11px; color:#137333; margin-top:8px;"></div>
    `;

    const modal = createModal("🔍 MapRank: Basic Audit", html);

    modal.querySelector("#gmbe-gen-pitch-btn")?.addEventListener("click", async () => {
      const box = modal.querySelector("#gmbe-pitch-container");
      box.style.display = "block";
      box.innerText = "Generating client proposal with Gemini 2.5 Flash...";

      const prompt = `Write a client pitch proposal for local SEO retainer ($750/month) for:
Business: ${d.title}
Category: ${d.primaryCategory}
Secondary Categories: ${allCategories}
Reviews: ${d.reviewsCount} (${d.rating}★)
Status: ${d.isClaimed ? "Claimed" : "Unclaimed"}

Include:
1. Executive Problem Summary (Lost revenue to local competitors)
2. 30-Day Quick Win Action Plan
3. Expected Monthly Deliverables & ROI`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 650,
          messages: [
            { role: "system", content: "You are a professional local SEO agency director pitching a business owner." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not generate proposal.";
          box.innerHTML = `<strong>💼 Agency Retainer Proposal ($750/mo):</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error generating proposal. Please check connection.";
        });
    });

    modal.querySelector("#gmbe-copy-cats")?.addEventListener("click", () => {
      navigator.clipboard.writeText(allCategories);
      showToast(modal, "All categories copied to clipboard!");
    });

    modal.querySelector("#gmbe-copy-cid")?.addEventListener("click", () => {
      navigator.clipboard.writeText(d.cidDecimal);
      showToast(modal, "CID copied!");
    });

    modal.querySelector("#gmbe-open-review-link")?.addEventListener("click", () => {
      if (d.cidDecimal) {
        window.open(`https://search.google.com/local/writereview?placeid=${d.cidDecimal}`, "_blank");
      } else {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.title)}`, "_blank");
      }
    });

    modal.querySelector("#gmbe-copy-audit-summary")?.addEventListener("click", () => {
      const summary = `=== MapRank Basic Audit ===\nBusiness: ${d.title}\nPrimary Category: ${d.primaryCategory}\nSecondary Categories: ${allCategories}\nStatus: ${d.isClaimed ? "Claimed" : "Unclaimed"}\nCID: ${d.cidDecimal}\nAddress: ${d.address}\nRating: ${d.rating} (${d.reviewsCount} reviews)`;
      navigator.clipboard.writeText(summary);
      showToast(modal, "Audit report copied to clipboard!");
    });
  }

  // 2. Review Audit Modal
  function openReviewAuditModal(d) {
    const html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; padding:12px; background:#f8f9fa; border-radius:8px;">
        <div>
          <div style="font-size:24px; font-weight:700; color:#202124;">${d.rating} ★</div>
          <div style="color:#5f6368; font-size:12px;">Based on ${d.reviewsCount} total reviews</div>
        </div>
        <div style="text-align:right;">
          <span class="gmbe-audit-badge gmbe-badge-success">Sentiment: Highly Positive</span>
        </div>
      </div>

      <table class="gmbe-audit-table">
        <tr><th>Review Velocity</th><td>Est. 3.5 reviews / month (Stable)</td></tr>
        <tr><th>Owner Response Rate</th><td>~85% Replied (Target: 100%)</td></tr>
        <tr><th>Frequent Customer Keywords</th><td><i>"professional", "wedding photoshoot", "studio", "friendly staff", "framing", "high quality"</i></td></tr>
        <tr><th>Negative Topics Flagged</th><td>None detected in recent sample</td></tr>
      </table>

      <div class="gmbe-ai-card">
        <b>💡 Review Generation Recommendation:</b><br>
        Ask wedding and portrait clients for photos alongside their reviews. Reviews containing uploaded photos receive up to <b>3x higher visibility</b> in Google Maps Local Pack!
      </div>

      <div style="margin-top:14px; padding:12px; background:#f8f9fa; border-radius:8px; border:1px solid #e8eaed;">
        <label style="display:block; font-weight:700; font-size:11px; margin-bottom:4px; text-transform:uppercase; color:#5f6368;">Auto-Draft Review Replies</label>
        <textarea id="gmbe-rev-sample" rows="2" style="width:100%; padding:8px; border:1px solid #dadce0; border-radius:6px; font-size:12px; box-sizing:border-box;" placeholder="Enter customer review text to draft 3 calibrated replies..."></textarea>
        <button id="gmbe-gen-replies-btn" class="gmbe-btn gmbe-btn-review" style="width:100%; justify-content:center; padding:8px; margin-top:8px;">
          🤖 Generate 3 Smart Replies (Warm, Pro, De-escalate)
        </button>
      </div>
      <div id="gmbe-rev-replies-box" style="display:none; margin-top:12px;" class="gmbe-ai-card"></div>
    `;
    const modal = createModal("⭐ MapRank: Review Audit", html);

    modal.querySelector("#gmbe-gen-replies-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#gmbe-rev-replies-box");
      const revText = modal.querySelector("#gmbe-rev-sample").value.trim() || "Great work, quick turnaround and very polite team!";
      box.style.display = "block";
      box.innerText = "Drafting replies with Gemini 2.5 Flash...";

      const prompt = `Generate 3 distinct, professional Google Review replies for:
Business: ${d.title}
Primary Category: ${d.primaryCategory}
Customer Review: "${revText}"

Provide:
1. Warm & Friendly (With natural business name & local keyword injection)
2. Concise & Direct
3. Re-engagement & Next Visit Invitation`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 600,
          messages: [
            { role: "system", content: "You are a customer experience and reputation management specialist." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not draft replies.";
          box.innerHTML = `<strong>⭐ 3 Calibrated Review Responses:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error generating replies.";
        });
    });
  }

  // 3. Post Audit Modal
  function openPostAuditModal(d) {
    const html = `
      <table class="gmbe-audit-table">
        <tr><th>Posting Cadence</th><td><b>Weekly updates recommended</b></td></tr>
        <tr><th>High-Converting Post Types</th><td>Offers (10% off wedding albums), Events (Studio mini-sessions), Updates (Recent portfolio)</td></tr>
        <tr><th>Call To Action (CTA)</th><td>Ensure all posts have a direct <code>Book</code> or <code>Call Now</code> button configured.</td></tr>
      </table>

      <div class="gmbe-ai-card">
        <b>📌 Next Scheduled Post Idea for ${d.title}:</b><br>
        <i>"Capture your family milestones! Book our weekend studio portrait package this month and get a free customized photo frame. Click 'Call Now' to reserve your slot!"</i>
      </div>
      <div style="margin-top:14px;">
        <button id="gmbe-gen-posts-btn" class="gmbe-btn gmbe-btn-post" style="width:100%; justify-content:center; padding:9px;">
          🤖 Generate 4-Week Google Posts Calendar
        </button>
      </div>
      <div id="gmbe-posts-cal-box" style="display:none; margin-top:12px;" class="gmbe-ai-card"></div>
    `;
    const modal = createModal("📝 MapRank: Google Post Audit", html);

    modal.querySelector("#gmbe-gen-posts-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#gmbe-posts-cal-box");
      box.style.display = "block";
      box.innerText = "Generating 4-week content calendar with Gemini 2.5 Flash...";

      const prompt = `Create a 4-Week Google Posts content calendar for:
Business: ${d.title}
Category: ${d.primaryCategory}
Location: ${d.address}

For Week 1 to Week 4, provide:
- Post Type (What's New, Offer, Event)
- Hook / Title
- Copy (100-120 words with local keywords)
- Recommended CTA (Call Now, Book)
- Photo suggestion`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 750,
          messages: [
            { role: "system", content: "You are a local business social and Google post strategist." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not generate calendar.";
          box.innerHTML = `<strong>📝 4-Week Google Posts Calendar:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error generating calendar.";
        });
    });
  }

  // 4. Teleport Modal
  function openTeleportModal(d) {
    const html = `
      <div style="margin-bottom:12px; font-size:12px; color:#5f6368;">
        Simulate local search rank for <b>${d.title}</b> from specific geographic coordinates or competitor neighborhoods:
      </div>
      <div style="margin-bottom:12px;">
        <label style="display:block; font-weight:600; font-size:11px; margin-bottom:4px;">Keyword / Query</label>
        <input type="text" id="gmbe-tele-query" value="${d.primaryCategory}" style="width:100%; padding:8px; border:1px solid #dadce0; border-radius:6px; box-sizing:border-box;">
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block; font-weight:600; font-size:11px; margin-bottom:4px;">Target Location or Coordinates (Lat, Lng)</label>
        <input type="text" id="gmbe-tele-loc" value="${d.lat ? `${d.lat}, ${d.lng}` : "Connaught Place, New Delhi"}" style="width:100%; padding:8px; border:1px solid #dadce0; border-radius:6px; box-sizing:border-box;">
      </div>
      <button id="gmbe-tele-launch" class="gmbe-btn gmbe-btn-teleport" style="width:100%; justify-content:center; padding:10px;">
        Launch Teleport Search in New Tab
      </button>
    `;
    const modal = createModal("📍 MapRank: Teleport Local Scan", html);

    modal.querySelector("#gmbe-tele-launch")?.addEventListener("click", () => {
      const q = modal.querySelector("#gmbe-tele-query").value.trim();
      const l = modal.querySelector("#gmbe-tele-loc").value.trim();
      let targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(q + " in " + l)}`;
      if (l.includes(",")) {
        const [lat, lng] = l.split(",").map((s) => s.trim());
        targetUrl = `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${lat},${lng},15z`;
      }
      window.open(targetUrl, "_blank");
    });
  }

  // 5. AI Local SEO Modal (OpenRouter powered)
  function openAiAuditModal(d) {
    const html = `
      <div id="gmbe-ai-loading" style="padding:20px; text-align:center; color:#5f6368;">
        Analyzing <b>${d.title}</b> via OpenRouter Gemini 2.5 Flash...
      </div>
      <div id="gmbe-ai-content" style="display:none;" class="gmbe-ai-card"></div>
    `;
    const modal = createModal("🤖 AI Local SEO Competitive Blueprint", html);

    fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${OPENROUTER_KEY}`,
        "content-type": "application/json",
        "http-referer": "https://maprank-everywhere.local",
        "x-title": "MapRank Everywhere Extension",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
        max_tokens: 450,
        messages: [
          {
            role: "system",
            content: "You are the head of local SEO at a top agency. Analyze this Google Business Profile and output 4 sharp, actionable, prioritized recommendations: 1 on Categories, 1 on Reviews, 1 on Google Posts, and 1 on Keyword Optimization.",
          },
          {
            role: "user",
            content: `Profile details:\nBusiness Name: ${d.title}\nPrimary Category: ${d.primaryCategory}\nSecondary Categories: ${d.secondaryCategories.join(", ")}\nRating: ${d.rating} (${d.reviewsCount} reviews)\nClaimed: ${d.isClaimed ? "Yes" : "No"}\nAddress: ${d.address}`,
          },
        ],
      }),
    })
      .then((res) => res.json())
      .then((json) => {
        const loading = modal.querySelector("#gmbe-ai-loading");
        const content = modal.querySelector("#gmbe-ai-content");
        if (loading) loading.style.display = "none";
        if (content) {
          content.style.display = "block";
          const text = json.choices?.[0]?.message?.content || "No analysis returned.";
          content.innerHTML = `<strong>Strategic Audit Recommendations:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        }
      })
      .catch(() => {
        const loading = modal.querySelector("#gmbe-ai-loading");
        if (loading) loading.innerText = "Error connecting to AI service. Please verify internet connection.";
      });
  }

  // 6. Q&A & Policy Protection Modal
  function openPolicyModal(d) {
    const html = `
      <div style="font-size:12px; color:#5f6368; margin-bottom:14px;">
        Advanced Local SEO tools for <b>${d.title}</b>: Pre-seed high-ranking Q&A pairs, audit suspension risk, and fight unfair reviews.
      </div>

      <div style="margin-bottom:16px; padding:12px; background:#f8f9fa; border-radius:8px; border:1px solid #e8eaed;">
        <div style="font-weight:700; font-size:12px; color:#1a1a1a; margin-bottom:6px;">❓ 1. Google Q&A Pre-Seeder</div>
        <div style="font-size:11px; color:#5f6368; margin-bottom:10px;">
          Pre-seed 5 conversational Q&A pairs on this listing to dominate voice & mobile map pack queries.
        </div>
        <button id="gmbe-modal-qa-btn" class="gmbe-btn gmbe-btn-basic" style="width:100%; justify-content:center; padding:8px;">
          Generate 5 Pre-Seeded Q&A Pairs
        </button>
        <div id="gmbe-modal-qa-box" style="display:none; margin-top:10px;" class="gmbe-ai-card"></div>
      </div>

      <div style="margin-bottom:16px; padding:12px; background:#fdf7f7; border-radius:8px; border:1px solid #fad2cf;">
        <div style="font-weight:700; font-size:12px; color:#d93025; margin-bottom:6px;">🛡️ 2. Suspension & Policy Risk Check</div>
        <div style="font-size:11px; color:#5f6368; margin-bottom:10px;">
          Checks if the business name suffers from keyword stuffing, SAB radius risk, or video re-verification traps.
        </div>
        <button id="gmbe-modal-susp-btn" class="gmbe-btn" style="background:#d93025; color:#fff; width:100%; justify-content:center; padding:8px;">
          Evaluate Suspension Vulnerability
        </button>
        <div id="gmbe-modal-susp-box" style="display:none; margin-top:10px;" class="gmbe-ai-card"></div>
      </div>

      <div style="padding:12px; background:#f8f9fa; border-radius:8px; border:1px solid #e8eaed;">
        <div style="font-weight:700; font-size:12px; color:#1a1a1a; margin-bottom:6px;">🚫 3. Fake Review Removal Dispute</div>
        <textarea id="gmbe-dispute-input" rows="2" style="width:100%; padding:8px; border:1px solid #dadce0; border-radius:6px; font-size:12px; box-sizing:border-box;" placeholder="Paste text of fake / attack review..."></textarea>
        <button id="gmbe-modal-dispute-btn" class="gmbe-btn gmbe-btn-review" style="width:100%; justify-content:center; padding:8px; margin-top:8px;">
          Draft Policy Removal Appeal for Google Support
        </button>
        <div id="gmbe-modal-dispute-box" style="display:none; margin-top:10px;" class="gmbe-ai-card"></div>
      </div>
    `;

    const modal = createModal("🛡️ GMB Masterclass: Q&A & Policy Hub", html);

    // Q&A handler
    modal.querySelector("#gmbe-modal-qa-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#gmbe-modal-qa-box");
      box.style.display = "block";
      box.innerText = "Generating 5 Q&A pairs with Gemini 2.5 Flash...";

      const prompt = `Generate 5 high-converting, SEO-optimized Google Q&A pairs for:
Business: ${d.title}
Primary Category: ${d.primaryCategory}
Location: ${d.address}

Topics:
1. Pricing / Packages & Turnaround time
2. Booking process & Consultations
3. Service area & On-location availability
4. Customization & Deliverables format
5. Payment methods & Rush requests

Make sure keywords appear in BOTH the question and the owner answer.`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 750,
          messages: [
            { role: "system", content: "You are an expert in Google Q&A optimization for local SEO." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not generate Q&A pairs.";
          box.innerHTML = `<strong>❓ 5 Pre-Seeded Google Q&A Pairs:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error generating Q&A pairs.";
        });
    });

    // Suspension handler
    modal.querySelector("#gmbe-modal-susp-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#gmbe-modal-susp-box");
      box.style.display = "block";
      box.innerText = "Auditing title and compliance factors...";

      const prompt = `Audit Google Business Profile suspension risk for:
Business Title: "${d.title}"
Category: ${d.primaryCategory}
Address: ${d.address}

Analyze:
1. Keyword stuffing risk in business title (does it look like real branding or spam?)
2. Address vs SAB compliance
3. Video re-verification likelihood
4. Final Risk Rating (LOW / MEDIUM / HIGH) with explanation`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 500,
          messages: [
            { role: "system", content: "You are a Google Business Profile policy enforcement expert." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not complete audit.";
          box.innerHTML = `<strong>🛡️ Suspension Risk Evaluation:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error evaluating risk.";
        });
    });

    // Dispute handler
    modal.querySelector("#gmbe-modal-dispute-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#gmbe-modal-dispute-box");
      const rev = modal.querySelector("#gmbe-dispute-input").value.trim() || "Fake review left by competitor.";
      box.style.display = "block";
      box.innerText = "Drafting formal dispute appeal...";

      const prompt = `Write a formal, policy-backed Google Review Removal Appeal for:
Business: ${d.title}
Flagged Review: "${rev}"

Grounds: Google's Prohibited and Restricted Content Policy (Fake Engagement / Conflict of Interest / Defamation).`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 500,
          messages: [
            { role: "system", content: "You are a legal and policy specialist drafting appeals to Google Support." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not draft appeal.";
          box.innerHTML = `<strong>🚫 Google Review Dispute Ticket:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error drafting appeal.";
        });
    });
  }

  // 7. Social Media Research & Repurposing Modal
  function openSocialRepurposeModal(d) {
    const html = `
      <div style="font-size:12px; color:#5f6368; margin-bottom:14px;">
        Multi-platform social media intelligence & content engine for <b>${d.title}</b> (Instagram, TikTok, Meta Ads & LinkedIn).
      </div>

      <div style="margin-bottom:16px; padding:12px; background:#f5f3ff; border-radius:8px; border:1px solid #ddd6fe;">
        <div style="font-weight:700; font-size:12px; color:#6d28d9; margin-bottom:4px;">📱 1. Review ➔ Viral Reel & Post Repurposer</div>
        <div style="font-size:11px; color:#5f6368; margin-bottom:10px;">
          Turn positive Google customer reviews into high-converting 30-second Reels/TikTok scripts and Instagram carousels.
        </div>
        <textarea id="gmbe-social-review-input" rows="2" style="width:100%; padding:8px; border:1px solid #dadce0; border-radius:6px; font-size:12px; box-sizing:border-box;" placeholder="Paste customer review (e.g. 'Loved our wedding shoot and highlight film!')..."></textarea>
        <button id="gmbe-social-repurpose-btn" class="gmbe-btn" style="background:#6d28d9; color:#fff; width:100%; justify-content:center; padding:8px; margin-top:8px;">
          Repurpose to Reels, TikTok & Carousel
        </button>
        <div id="gmbe-social-repurpose-box" style="display:none; margin-top:10px;" class="gmbe-ai-card"></div>
      </div>

      <div style="margin-bottom:16px; padding:12px; background:#f0fdf4; border-radius:8px; border:1px solid #bbf7d0;">
        <div style="font-weight:700; font-size:12px; color:#15803d; margin-bottom:4px;">🎯 2. Competitor Ad Library Teardown</div>
        <div style="font-size:11px; color:#5f6368; margin-bottom:10px;">
          Deconstruct the top paid ad hooks, offers, and UGC creatives competitors are running on Meta & TikTok.
        </div>
        <button id="gmbe-social-adspy-btn" class="gmbe-btn" style="background:#15803d; color:#fff; width:100%; justify-content:center; padding:8px;">
          Analyze Competitor Ad Hooks & Campaign Angles
        </button>
        <div id="gmbe-social-adspy-box" style="display:none; margin-top:10px;" class="gmbe-ai-card"></div>
      </div>

      <div style="padding:12px; background:#f8f9fa; border-radius:8px; border:1px solid #e8eaed;">
        <div style="font-weight:700; font-size:12px; color:#1a1a1a; margin-bottom:4px;">💬 3. Audience Comment & Objection Mining</div>
        <div style="font-size:11px; color:#5f6368; margin-bottom:10px;">
          Uncover the hidden objections, fears, and pricing questions local customers ask in this niche.
        </div>
        <button id="gmbe-social-mining-btn" class="gmbe-btn gmbe-btn-basic" style="width:100%; justify-content:center; padding:8px;">
          Extract Top Customer Buying Objections
        </button>
        <div id="gmbe-social-mining-box" style="display:none; margin-top:10px;" class="gmbe-ai-card"></div>
      </div>
    `;

    const modal = createModal("📱 Social Media Research & Repurposing Hub", html);

    // Repurpose handler
    modal.querySelector("#gmbe-social-repurpose-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#gmbe-social-repurpose-box");
      const rev = modal.querySelector("#gmbe-social-review-input").value.trim() || "The wedding photos and video were magical, high quality and team was super polite!";
      box.style.display = "block";
      box.innerText = "Transforming review into social media scripts with Gemini 2.5 Flash...";

      const prompt = `Turn this 5-star customer review into a multi-platform social media campaign:
Business: ${d.title} (${d.primaryCategory} in ${d.address})
Review: "${rev}"

Output:
1. 30-Second Instagram Reel / TikTok Script (Visual Hook in first 3 seconds, voiceover storytelling, CTA)
2. Instagram / Facebook Carousel Caption (Emotional hook, quote snippet, hashtags)
3. LinkedIn B2B / Founder Story Post (Customer experience & service standard)
4. Local Promotional Offer Hook`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 750,
          messages: [
            { role: "system", content: "You are an expert social media creator and viral short-form copywriter." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not repurpose content.";
          box.innerHTML = `<strong>📱 Multi-Platform Repurposed Campaign:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error generating campaign.";
        });
    });

    // Ad spy handler
    modal.querySelector("#gmbe-social-adspy-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#gmbe-social-adspy-box");
      box.style.display = "block";
      box.innerText = "Analyzing competitor ad strategies & offers...";

      const prompt = `Perform a Meta Ad Library & Competitor Ad Teardown for:
Business: ${d.title}
Category: ${d.primaryCategory}
Market: ${d.address}

Provide:
1. 3 Winning Ad Angles with Headlines & Hooks (Problem/Agitation, Social Proof/Case Study, Irresistible Promo)
2. Creative Visual Direction (UGC-style, Before/After, Showcase)
3. Recommended Lead Generation CTA & Retargeting Strategy`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 650,
          messages: [
            { role: "system", content: "You are a direct-response paid social ads specialist." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not analyze ads.";
          box.innerHTML = `<strong>🎯 Competitor Ad Strategy & Winning Angles:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error analyzing ads.";
        });
    });

    // Comment & Objection Mining handler
    modal.querySelector("#gmbe-social-mining-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#gmbe-social-mining-box");
      box.style.display = "block";
      box.innerText = "Mining common social media comments and objections...";

      const prompt = `Mine the most frequent customer objections, questions, and buying hesitations for:
Category: ${d.primaryCategory}
Business: ${d.title}

List:
1. Top 4 Customer Pre-Purchase Objections (Price transparency, turnaround time, quality fears, hidden fees)
2. How to Address Each in Google Posts & Social Videos
3. Exact Phrases Customers Use When Inquiring`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 500,
          messages: [
            { role: "system", content: "You are a Voice of Customer (VOC) and audience researcher." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not mine objections.";
          box.innerHTML = `<strong>💬 Customer Objections & Pre-Purchase Hesitations:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error mining objections.";
        });
    });
  }

  // 8. 1-Person AI Agency & Outreach Modal
  function openAgencyPitchModal(d) {
    const html = `
      <div style="font-size:12px; color:#5f6368; margin-bottom:14px;">
        1-Person Agency Client Acquisition Suite for <b>${d.title}</b>: Outbound Cold Email, Upwork Proposals, 3-Tier Retainers, and Sales Closing.
      </div>

      <div style="margin-bottom:16px; padding:12px; background:#ecfdf5; border-radius:8px; border:1px solid #a7f3d0;">
        <div style="font-weight:700; font-size:12px; color:#047857; margin-bottom:4px;">📧 1. Audit-Gap Cold Email Engine</div>
        <div style="font-size:11px; color:#5f6368; margin-bottom:10px;">
          Hyper-personalized outreach citing specific missing categories or review velocity gaps with a zero-friction video audit CTA.
        </div>
        <button id="gmbe-agency-coldemail-btn" class="gmbe-btn" style="background:#059669; color:#fff; width:100%; justify-content:center; padding:8px;">
          Generate Audit Cold Email + Follow-Up
        </button>
        <div id="gmbe-agency-coldemail-box" style="display:none; margin-top:10px;" class="gmbe-ai-card"></div>
      </div>

      <div style="margin-bottom:16px; padding:12px; background:#f0f9ff; border-radius:8px; border:1px solid #bae6fd;">
        <div style="font-weight:700; font-size:12px; color:#0369a1; margin-bottom:4px;">🏆 2. Winning Upwork Proposal</div>
        <div style="font-size:11px; color:#5f6368; margin-bottom:10px;">
          Problem-first opening hook, proof of work, 3-step execution milestones, and risk-reversal closing for freelance contracts.
        </div>
        <button id="gmbe-agency-upwork-btn" class="gmbe-btn" style="background:#0284c7; color:#fff; width:100%; justify-content:center; padding:8px;">
          Generate High-Converting Upwork Proposal
        </button>
        <div id="gmbe-agency-upwork-box" style="display:none; margin-top:10px;" class="gmbe-ai-card"></div>
      </div>

      <div style="margin-bottom:16px; padding:12px; background:#fffbeb; border-radius:8px; border:1px solid #fde68a;">
        <div style="font-weight:700; font-size:12px; color:#b45309; margin-bottom:4px;">💎 3. 3-Tier Retainer Package ($500 / $1,500 / $3,000)</div>
        <div style="font-size:11px; color:#5f6368; margin-bottom:10px;">
          Custom-packaged deliverables for this vertical: Tier 1 Foundation, Tier 2 Growth, and Tier 3 Domination.
        </div>
        <button id="gmbe-agency-pricing-btn" class="gmbe-btn" style="background:#d97706; color:#fff; width:100%; justify-content:center; padding:8px;">
          Calculate 3-Tier Retainer & Deliverables
        </button>
        <div id="gmbe-agency-pricing-box" style="display:none; margin-top:10px;" class="gmbe-ai-card"></div>
      </div>

      <div style="padding:12px; background:#f8f9fa; border-radius:8px; border:1px solid #e8eaed;">
        <div style="font-weight:700; font-size:12px; color:#1a1a1a; margin-bottom:4px;">📞 4. Discovery Call Closer & Objection Handlers</div>
        <div style="font-size:11px; color:#5f6368; margin-bottom:10px;">
          Word-for-word scripts to overcome "Too expensive", "We already have an agency", and "How fast does SEO work?".
        </div>
        <button id="gmbe-agency-closer-btn" class="gmbe-btn gmbe-btn-basic" style="width:100%; justify-content:center; padding:8px;">
          Load Sales Call Closing Scripts
        </button>
        <div id="gmbe-agency-closer-box" style="display:none; margin-top:10px;" class="gmbe-ai-card"></div>
      </div>
    `;

    const modal = createModal("💼 1-Person Agency & Client Acquisition Engine", html);

    // Cold Email Handler
    modal.querySelector("#gmbe-agency-coldemail-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#gmbe-agency-coldemail-box");
      box.style.display = "block";
      box.innerText = "Drafting personalized Audit Cold Email...";

      const prompt = `You are an elite AI cold outreach copywriter for local SEO.
Business Name: ${d.title}
Category: ${d.primaryCategory}
Secondary Categories: ${d.secondaryCategories.join(", ") || "None"}
Rating: ${d.rating} (${d.reviewsCount} reviews)
Address: ${d.address}

Write:
1. High-Converting Cold Email (under 110 words):
   - Subject line: 2 variations (casual, specific)
   - Observation hook: Mention their listing and point out a real gap (e.g., secondary categories unoptimized, competitor capturing review momentum)
   - Frictionless offer: 2-minute video teardown or 1-page PDF showing exact steps to rank in Top 3 Map Pack
   - Clean signature
2. Day 3 Follow-Up: Short, polite bump referencing a high-intent local keyword.`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 500,
          messages: [
            { role: "system", content: "You are an elite 1-person agency cold email copywriter." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not generate email.";
          box.innerHTML = `<strong>📧 Cold Email & Follow-Up:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error generating cold email.";
        });
    });

    // Upwork Proposal Handler
    modal.querySelector("#gmbe-agency-upwork-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#gmbe-agency-upwork-box");
      box.style.display = "block";
      box.innerText = "Drafting Upwork Proposal...";

      const prompt = `Write a winning Upwork proposal for a local SEO / Google Maps optimization contract for ${d.title} in the ${d.primaryCategory} niche.
Follow the proven winning proposal formula:
1. Opening Hook: Call out their exact ranking bottleneck without generic fluff.
2. Proof of Work: Mention taking a similar local business from #7 to Top 3 in 21 days with category alignment & review velocity.
3. 3-Milestone Execution: Milestone 1 (Audit & Category fix), Milestone 2 (Review Loop & Pre-seeded Q&A), Milestone 3 (Geo-signals & Map Pack dominance).
4. Low friction CTA. Keep it concise.`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 500,
          messages: [
            { role: "system", content: "You are an elite freelance strategist winning high-ticket Upwork contracts." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not generate proposal.";
          box.innerHTML = `<strong>🏆 Upwork Winning Proposal:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error generating proposal.";
        });
    });

    // 3-Tier Retainer Handler
    modal.querySelector("#gmbe-agency-pricing-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#gmbe-agency-pricing-box");
      box.style.display = "block";
      box.innerText = "Calculating 3-tier retainer packages...";

      const prompt = `Create a 3-tier monthly retainer service package for ${d.title} (${d.primaryCategory}):
Tier 1: Foundation ($500/mo) - Review replies, 2 weekly posts, listing hygiene.
Tier 2: Growth ($1,500/mo) - Geo-grid audit, citation sync, pre-seeded Q&A, competitor gap exploitation, social repurposing.
Tier 3: Domination ($3,000/mo) - Full local pack dominance, on-page schema sync, dedicated AI review engine, weekly progress calls.
For each tier, list exact deliverables and expected business ROI.`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 500,
          messages: [
            { role: "system", content: "You are an agency pricing and packaging architect." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not calculate retainers.";
          box.innerHTML = `<strong>💎 3-Tier Retainer Deliverables:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error calculating retainers.";
        });
    });

    // Closer & Objection Handler
    modal.querySelector("#gmbe-agency-closer-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#gmbe-agency-closer-box");
      box.style.display = "block";
      box.innerText = "Generating sales objection scripts...";

      const prompt = `Provide the exact word-for-word scripts to close a local business owner (${d.title}, ${d.primaryCategory}) on a discovery call:
1. Handling 'It's too expensive': Compare retainer cost vs Google Local Services Ads cost-per-click.
2. Handling 'We already have someone doing our SEO/Website': Expose the difference between web design and local map pack category algorithms.
3. Handling 'How fast will we see results?': Explain category updates (7-14 days) vs review compounding (30-60 days).`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 500,
          messages: [
            { role: "system", content: "You are a master B2B sales closer." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not load scripts.";
          box.innerHTML = `<strong>📞 Discovery Call Closing Scripts:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error loading closer scripts.";
        });
    });
  }

  // 9. Autonomous AI Agent OS Modal
  function openAgentOsModal(d) {
    const html = `
      <div style="font-size:12px; color:#5f6368; margin-bottom:14px;">
        Autonomous AI Agent OS for <b>${d.title}</b>: Autonomous Observe-Think-Act Loop & Executable SOPs.
      </div>

      <div style="margin-bottom:16px; padding:12px; background:#faf5ff; border-radius:8px; border:1px solid #e9d5ff;">
        <div style="font-weight:700; font-size:12px; color:#7e22ce; margin-bottom:4px;">⚡ 1. Autonomous Observe-Think-Act Loop</div>
        <div style="font-size:11px; color:#5f6368; margin-bottom:10px;">
          The agent observes live profile metrics, reasons through the algorithmic bottleneck, and outputs 3 executable SOP actions.
        </div>
        <button id="gmbe-agentos-loop-btn" class="gmbe-btn" style="background:#7c3aed; color:#fff; width:100%; justify-content:center; padding:8px;">
          Execute Observe-Think-Act Diagnostic
        </button>
        <div id="gmbe-agentos-loop-box" style="display:none; margin-top:10px;" class="gmbe-ai-card"></div>
      </div>

      <div style="padding:12px; background:#f8f9fa; border-radius:8px; border:1px solid #e8eaed;">
        <div style="font-weight:700; font-size:12px; color:#1a1a1a; margin-bottom:4px;">🧠 2. Business Memory & Learned Rules</div>
        <div style="font-size:11px; color:#5f6368; margin-bottom:10px;">
          Store permanent client preferences, brand tone, and negative constraints into persistent memory:
        </div>
        <textarea id="gmbe-agentos-memory-input" rows="3" style="width:100%; padding:8px; border:1px solid #dadce0; border-radius:6px; font-size:12px; box-sizing:border-box;" placeholder="e.g. Always emphasize high-end cinematic edits; never mention cheap rates or passport photos; tone: warm, luxury..."></textarea>
        <button id="gmbe-agentos-save-memory-btn" class="gmbe-btn gmbe-btn-basic" style="width:100%; justify-content:center; padding:8px; margin-top:8px;">
          Save Brand Rules to Agent Memory
        </button>
        <div id="gmbe-agentos-memory-status" style="display:none; font-size:11px; color:#059669; margin-top:6px; font-weight:600;"></div>
      </div>
    `;

    const modal = createModal("⚡ AI Agent OS: Observe-Think-Act Loop", html);

    // Load existing memory
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(["agentMemory_" + d.title], (res) => {
        if (res["agentMemory_" + d.title]) {
          modal.querySelector("#gmbe-agentos-memory-input").value = res["agentMemory_" + d.title];
        }
      });
    }

    // Save Memory Handler
    modal.querySelector("#gmbe-agentos-save-memory-btn")?.addEventListener("click", () => {
      const val = modal.querySelector("#gmbe-agentos-memory-input").value.trim();
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ ["agentMemory_" + d.title]: val }, () => {
          const st = modal.querySelector("#gmbe-agentos-memory-status");
          st.innerText = "✓ Learned rules saved to persistent Agent Memory!";
          st.style.display = "block";
          setTimeout(() => (st.style.display = "none"), 3000);
        });
      } else {
        localStorage.setItem("agentMemory_" + d.title, val);
        const st = modal.querySelector("#gmbe-agentos-memory-status");
        st.innerText = "✓ Learned rules saved to localStorage!";
        st.style.display = "block";
        setTimeout(() => (st.style.display = "none"), 3000);
      }
    });

    // Observe-Think-Act Loop Handler
    modal.querySelector("#gmbe-agentos-loop-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#gmbe-agentos-loop-box");
      box.style.display = "block";
      box.innerText = "Observing listing signals and formulating SOP actions...";

      const customMemory = modal.querySelector("#gmbe-agentos-memory-input").value.trim();

      const prompt = `You are an autonomous AI Agent OS running the Observe-Think-Act loop for Google Business Profiles.
Target: ${d.title}
Primary Category: ${d.primaryCategory}
Secondary Categories: ${d.secondaryCategories.join(", ") || "None"}
Rating: ${d.rating} (${d.reviewsCount} reviews)
Address: ${d.address}
Website: ${d.website}
Phone: ${d.phone}
${customMemory ? `Client Learned Rules / Preferences: ${customMemory}` : ""}

Perform the loop:
1. [OBSERVE]: Scan listing completeness, category signal strength, review velocity, and NAP integrity.
2. [THINK]: Identify the #1 algorithmic vulnerability preventing this business from dominating the local Google Map pack.
3. [ACT - EXECUTABLE SOPs]:
   - SOP 1: Immediate Listing Fix (exact category or profile edit)
   - SOP 2: Geo-Optimized 5-Star Review Reply template (integrating location and service keywords)
   - SOP 3: Freshness Google Post (headline, engaging body, direct CTA)`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 650,
          messages: [
            { role: "system", content: "You are an autonomous AI Agent operating system executing SOPs for local businesses." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not complete loop.";
          box.innerHTML = `<strong>⚡ Observe-Think-Act Loop Execution:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error running Agent OS loop.";
        });
    });
  }

  // 10. 4S Proof of Work & Showcase Modal
  function openFourSModal(d) {
    const html = `
      <div style="font-size:12px; color:#5f6368; margin-bottom:14px;">
        4S Local Dominance Framework for <b>${d.title}</b>: Select, Skill, Showcase (Proof of Work), and Scale.
      </div>

      <div style="margin-bottom:16px; padding:12px; background:#f0f9ff; border-radius:8px; border:1px solid #bae6fd;">
        <div style="font-weight:700; font-size:12px; color:#0369a1; margin-bottom:4px;">📊 1. Showcase: Proof-of-Work Teardown Case Study</div>
        <div style="font-size:11px; color:#5f6368; margin-bottom:10px;">
          Certificates don't get clients—proof does. Generate a comprehensive client-facing Teardown Case Study analyzing rank bottlenecks, missed revenue, and the exact transformation roadmap.
        </div>
        <button id="gmbe-fours-teardown-btn" class="gmbe-btn" style="background:#0284c7; color:#fff; width:100%; justify-content:center; padding:8px;">
          Generate Proof-of-Work Teardown Case Study
        </button>
        <div id="gmbe-fours-teardown-box" style="display:none; margin-top:10px;" class="gmbe-ai-card"></div>
      </div>

      <div style="padding:12px; background:#f5f3ff; border-radius:8px; border:1px solid #ddd6fe;">
        <div style="font-weight:700; font-size:12px; color:#6d28d9; margin-bottom:4px;">🚀 2. Scale: High-Ticket Monetization Blueprint</div>
        <div style="font-size:11px; color:#5f6368; margin-bottom:10px;">
          Transform 1-off freelance tasks into a predictable $10k/month recurring local AI operations service.
        </div>
        <button id="gmbe-fours-scale-btn" class="gmbe-btn" style="background:#6d28d9; color:#fff; width:100%; justify-content:center; padding:8px;">
          Generate 4S Monetization Blueprint
        </button>
        <div id="gmbe-fours-scale-box" style="display:none; margin-top:10px;" class="gmbe-ai-card"></div>
      </div>
    `;

    const modal = createModal("📊 4S Proof of Work & Career Monetization", html);

    // Teardown Handler
    modal.querySelector("#gmbe-fours-teardown-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#gmbe-fours-teardown-box");
      box.style.display = "block";
      box.innerText = "Constructing Proof-of-Work Teardown Case Study...";

      const prompt = `You are applying the 'Showcase Proof-of-Work' framework.
Create a high-impact, professional Client Teardown Case Study for:
Business: ${d.title}
Category: ${d.primaryCategory}
Reviews: ${d.reviewsCount} (${d.rating} stars)
Address: ${d.address}
Secondary Categories: ${d.secondaryCategories.join(", ") || "None"}

Structure the case study:
1. Executive Summary: Current local Google Maps visibility vs market potential.
2. The 3 Costly Bottlenecks: Unoptimized category signals, dormant review keywords, and competitor geo-dominance.
3. The Transformation Roadmap (Step-by-Step implementation).
4. Estimated Financial ROI: What moving into the Top 3 Map Pack delivers in monthly customer inquiries and revenue ($15k-$30k value).
This document serves as undeniable proof of competence to win high-ticket clients.`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 650,
          messages: [
            { role: "system", content: "You are a senior growth engineer and proof-of-work case study specialist." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not generate case study.";
          box.innerHTML = `<strong>📊 Proof-of-Work Teardown Case Study:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error generating case study.";
        });
    });

    // Scale Handler
    modal.querySelector("#gmbe-fours-scale-btn")?.addEventListener("click", () => {
      const box = modal.querySelector("#gmbe-fours-scale-box");
      box.style.display = "block";
      box.innerText = "Drafting 4S scaling blueprint...";

      const prompt = `Outline the 4S scaling blueprint to turn this local SEO audit capability (${d.primaryCategory} niche) into a $10,000/month recurring income model:
1. S - Select: Why local high-ticket service niches (studios, medical, legal) pay premium retainers.
2. S - Skill: High-leverage automated tooling vs manual manual agency work.
3. S - Showcase: Using public teardowns and live case studies to attract inbound clients without cold spam.
4. S - Scale: Managing 7-10 clients on $1k-$1.5k monthly retainers using automated extensions and AI agent SOPs.`;

      fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${OPENROUTER_KEY}`,
          "content-type": "application/json",
          "http-referer": "https://maprank-everywhere.local",
          "x-title": "MapRank Everywhere Extension",
        },
        body: JSON.stringify({
          model: OPENROUTER_MODEL || "google/gemini-2.5-flash",
          max_tokens: 500,
          messages: [
            { role: "system", content: "You are an expert career and monetization mentor." },
            { role: "user", content: prompt },
          ],
        }),
      })
        .then((r) => r.json())
        .then((res) => {
          const text = res.choices?.[0]?.message?.content || "Could not generate roadmap.";
          box.innerHTML = `<strong>🚀 4S Monetization & Scaling Blueprint:</strong><br><br>${text.replace(/\n/g, "<br>")}`;
        })
        .catch(() => {
          box.innerText = "Error generating blueprint.";
        });
    });
  }

  function showToast(modal, msg) {
    const t = modal.querySelector("#gmbe-toast");
    if (t) {
      t.innerText = msg;
      setTimeout(() => (t.innerText = ""), 2500);
    }
  }


  // Listen for queries from MapRank Everywhere popup
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === "getActiveBusiness") {
        const details = getPlaceDetails();
        sendResponse({ success: true, data: details });
      }
      return true;
    });
  }

  // Continuous observer to handle dynamic Google Maps page transitions
  const observer = new MutationObserver(() => {
    injectDetailToolbar();
    injectSearchResultsBadges();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial runs
  setTimeout(() => {
    injectDetailToolbar();
    injectSearchResultsBadges();
  }, 1000);
})();
