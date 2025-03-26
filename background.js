/** @format */

// Static blocklist patterns
const blocklist = {
  trackers: {
    analytics: [
      "google-analytics.com",
      "analytics",
      "tracking",
      "matomo",
      "mixpanel",
    ],
    advertising: ["doubleclick.net", "ad.", "ads.", "adsystem", "adnxs"],
    social: ["facebook.com", "twitter.com", "linkedin.com", "tiktok"],
    fingerprinting: ["fingerprintjs", "analytics", "tracking"],
  },
  // Heuristic detection patterns
  heuristics: {
    suspicious_apis: [
      "navigator.userAgent",
      "canvas.toDataURL",
      "navigator.plugins",
      "navigator.hardwareConcurrency",
    ],
    tracking_behaviors: [
      '.addEventListener("mousemove"',
      '.addEventListener("keypress"',
      "localStorage.setItem",
      "document.cookie",
    ],
  },
};

// User preferences with default values
let userPreferences = {
  blockAnalytics: true,
  blockAds: true,
  blockSocial: true,
  preventFingerprinting: true,
  enableHeuristics: true,
};

// Store for tracking and blocking data
let trackingData = {
  trackers: {},
  cookies: {},
  requests: 0,
  blocked: {
    analytics: 0,
    advertising: 0,
    social: 0,
    fingerprinting: 0,
  },
  riskAssessment: {
    dataCollection: 0,
    thirdPartySharing: 0,
    cookieUsage: 0,
  },
};

// Initialize storage
chrome.storage.local.get(["trackingData", "userPreferences"], (result) => {
  if (result.trackingData) {
    trackingData = result.trackingData;
  }
  if (result.userPreferences) {
    userPreferences = result.userPreferences;
  }
  chrome.storage.local.set({ userPreferences });
});

// Inject fingerprint prevention script
chrome.scripting.registerContentScripts([
  {
    id: "fingerprintProtection",
    matches: ["<all_urls>"],
    js: ["fingerprint-protection.js"],
    runAt: "document_start",
  },
]);

// Heuristic detection function
function detectSuspiciousActivity(details) {
  const url = new URL(details.url);
  let isSuspicious = false;

  // Check for known fingerprinting patterns
  if (userPreferences.enableHeuristics) {
    isSuspicious = blocklist.heuristics.suspicious_apis.some(
      (api) =>
        details.url.includes(api) ||
        (details.requestBody &&
          details.requestBody.raw &&
          details.requestBody.raw.some((data) => data.toString().includes(api)))
    );
  }

  return isSuspicious;
}

// Monitor and intercept web requests
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    const url = new URL(details.url);
    trackingData.requests++;
    let shouldBlock = false;
    let blockCategory = null;

    // Check against blocklist
    for (const [category, patterns] of Object.entries(blocklist.trackers)) {
      if (patterns.some((pattern) => url.hostname.includes(pattern))) {
        if (!trackingData.trackers[url.hostname]) {
          trackingData.trackers[url.hostname] = {
            category,
            count: 0,
            lastSeen: Date.now(),
            blocked: 0,
          };
        }
        trackingData.trackers[url.hostname].count++;
        trackingData.trackers[url.hostname].lastSeen = Date.now();

        // Check user preferences for blocking
        switch (category) {
          case "analytics":
            shouldBlock = userPreferences.blockAnalytics;
            break;
          case "advertising":
            shouldBlock = userPreferences.blockAds;
            break;
          case "social":
            shouldBlock = userPreferences.blockSocial;
            break;
          case "fingerprinting":
            shouldBlock = userPreferences.preventFingerprinting;
            break;
        }

        if (shouldBlock) {
          blockCategory = category;
          trackingData.trackers[url.hostname].blocked++;
          trackingData.blocked[category]++;
        }
      }
    }

    // Heuristic detection
    if (!shouldBlock && detectSuspiciousActivity(details)) {
      shouldBlock = true;
      blockCategory = "fingerprinting";
      trackingData.blocked.fingerprinting++;
    }

    // Update risk assessment
    updateRiskAssessment();

    // Save tracking data
    chrome.storage.local.set({ trackingData });

    return shouldBlock ? { cancel: true } : {};
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestBody"]
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

// Update risk assessment scores
function updateRiskAssessment() {
  const totalTrackers = Object.keys(trackingData.trackers).length;
  const blockedTrackers = Object.values(trackingData.blocked).reduce(
    (a, b) => a + b,
    0
  );
  const unsecureCookies = Object.values(trackingData.cookies)
    .flat()
    .filter((cookie) => !cookie.secure || !cookie.httpOnly).length;

  trackingData.riskAssessment = {
    dataCollection: Math.min(100, (totalTrackers / 10) * 100),
    thirdPartySharing: Math.min(
      100,
      ((totalTrackers - blockedTrackers) / totalTrackers) * 100 || 0
    ),
    cookieUsage: Math.min(100, (unsecureCookies / 5) * 100),
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case "getTrackingData":
      sendResponse(trackingData);
      break;
    case "clearData":
      trackingData = {
        trackers: {},
        cookies: {},
        requests: 0,
        blocked: {
          analytics: 0,
          advertising: 0,
          social: 0,
          fingerprinting: 0,
        },
        riskAssessment: {
          dataCollection: 0,
          thirdPartySharing: 0,
          cookieUsage: 0,
        },
      };
      chrome.storage.local.set({ trackingData });
      sendResponse({ success: true });
      break;
    case "updatePreferences":
      userPreferences = { ...userPreferences, ...request.preferences };
      chrome.storage.local.set({ userPreferences });
      sendResponse({ success: true });
      break;
  }
  return true;
});
