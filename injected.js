// MapRank Everywhere - In-page Network Interceptor (MAIN world)
// Intercepts Google Maps gRPC & JSON responses to capture secondary categories and deep metadata.

(function () {
  "use strict";

  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    try {
      const url = typeof args[0] === "string" ? args[0] : (args[0] && args[0].url ? args[0].url : "");
      if (url.includes("/maps/rpc/") || url.includes("/preview/place") || url.includes("/search")) {
        const clone = response.clone();
        clone.text().then((text) => {
          parseGoogleMapsPayload(text);
        }).catch(() => {});
      }
    } catch (e) {}
    return response;
  };

  function parseGoogleMapsPayload(rawText) {
    if (!rawText) return;
    const cleanText = rawText.replace(/^\)]\}'\s*/, "");
    try {
      const json = JSON.parse(cleanText);
      extractCategoriesFromTree(json);
    } catch (e) {}
  }

  function extractCategoriesFromTree(node) {
    if (!node || typeof node !== "object") return;

    if (Array.isArray(node)) {
      // Look for array of strings that look like Google Maps categories
      if (node.length > 1 && node.length < 15 && node.every((item) => typeof item === "string" && item.length > 2 && item.length < 45)) {
        // Broadcast potential category list
        window.dispatchEvent(
          new CustomEvent("maprank-extracted-categories", {
            detail: { categories: node },
          })
        );
      }
      for (const item of node) {
        extractCategoriesFromTree(item);
      }
    } else {
      for (const key of Object.keys(node)) {
        extractCategoriesFromTree(node[key]);
      }
    }
  }
})();

