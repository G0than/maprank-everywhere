// MapRank Everywhere Extension - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log("MapRank Everywhere - Local SEO & Audit Engine installed.");
});

// Listener for messages from content scripts if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({ status: "ok" });
  }
  return true;
});

