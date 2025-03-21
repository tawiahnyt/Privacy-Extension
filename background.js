/** @format */

// Tracker detection patterns
const trackerPatterns = {
  analytics: ["google-analytics.com", "analytics", "tracking"],
  advertising: ["doubleclick.net", "ad.", "ads."],
  social: ["facebook.com", "twitter.com", "linkedin.com"],
};

// Store for tracking data
let trackingData = {
  trackers: {},
  cookies: {},
  requests: 0,
};

// Initialize storage
chrome.storage.local.get(["trackingData"], (result) => {
  if (result.trackingData) {
    trackingData = result.trackingData;
  }
});

// Monitor web requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = new URL(details.url);
    trackingData.requests++;

    // Check for trackers
    for (const [category, patterns] of Object.entries(trackerPatterns)) {
      if (patterns.some((pattern) => url.hostname.includes(pattern))) {
        if (!trackingData.trackers[url.hostname]) {
          trackingData.trackers[url.hostname] = {
            category,
            count: 0,
            lastSeen: Date.now(),
          };
        }
        trackingData.trackers[url.hostname].count++;
        trackingData.trackers[url.hostname].lastSeen = Date.now();
      }
    }

    // Save tracking data
    chrome.storage.local.set({ trackingData });
  },
  { urls: ["<all_urls>"] }
);

// Monitor cookies
chrome.cookies.onChanged.addListener((changeInfo) => {
  const { cookie, removed } = changeInfo;
  if (!removed) {
    if (!trackingData.cookies[cookie.domain]) {
      trackingData.cookies[cookie.domain] = [];
    }
    trackingData.cookies[cookie.domain].push({
      name: cookie.name,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      timestamp: Date.now(),
    });

    // Save tracking data
    chrome.storage.local.set({ trackingData });
  }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "getTrackingData") {
    sendResponse(trackingData);
  } else if (request.type === "clearData") {
    trackingData = {
      trackers: {},
      cookies: {},
      requests: 0,
    };
    chrome.storage.local.set({ trackingData });
    sendResponse({ success: true });
  }
});
