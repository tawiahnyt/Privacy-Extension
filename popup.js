/** @format */

// Function to format timestamp
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString();
}

// Get category icon
function getCategoryIcon(category) {
  const icons = {
    analytics: "\u{1F4CA}",
    advertising: "\u{1F3AF}",
    social: "\u{1F465}",
    fingerprinting: "\u{1F440}"
  };
  return icons[category] || "🔍";
}

// Update blocking preferences
function updateBlockingPreferences() {
  const preferences = {
    blockAnalytics: document.getElementById('blockAnalytics').checked,
    blockAds: document.getElementById('blockAds').checked,
    blockSocial: document.getElementById('blockSocial').checked,
    preventFingerprinting: document.getElementById('preventFingerprinting').checked,
    enableHeuristics: document.getElementById('enableHeuristics').checked
  };
  
  chrome.runtime.sendMessage(
    { type: 'updatePreferences', preferences },
    response => {
      if (response.success) {
        showNotification('Preferences updated successfully');
      }
    }
  );
}

// Show notification
function showNotification(message) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.classList.add('show');
  setTimeout(() => notification.classList.remove('show'), 3000);
}

// Function to filter trackers
function filterTrackers(trackers, searchTerm) {
  if (!searchTerm) return trackers;
  searchTerm = searchTerm.toLowerCase();
  return Object.fromEntries(
    Object.entries(trackers).filter(
      ([hostname, data]) =>
        hostname.toLowerCase().includes(searchTerm) ||
        data.category.toLowerCase().includes(searchTerm)
    )
  );
}

// Function to update tracker list
function updateTrackerList(trackers) {
  const trackerList = document.getElementById("trackerList");
  const searchTerm = document.getElementById("trackerSearch")?.value || "";
  const filteredTrackers = filterTrackers(trackers, searchTerm);

  trackerList.innerHTML = "";

  if (Object.keys(filteredTrackers).length === 0) {
    trackerList.innerHTML = `<div class="tracker-item">No trackers found${
      searchTerm ? ' matching "' + searchTerm + '"' : ""
    }.</div>`;
    return;
  }

  Object.entries(filteredTrackers).forEach(([hostname, data]) => {
    const trackerItem = document.createElement("div");
    trackerItem.className = "tracker-item";
    trackerItem.innerHTML = `
      <div>
        <span class="category-icon">${getCategoryIcon(data.category)}</span>
        <strong class="category-${
          data.category
        }">${data.category.toUpperCase()}</strong>
        <span>${hostname}</span>
      </div>
      <div>Detected ${data.count} times</div>
      <div>Last seen: ${formatTime(data.lastSeen)}</div>
    `;
    trackerList.appendChild(trackerItem);
  });
}

// Function to filter cookies
function filterCookies(cookies, searchTerm) {
  if (!searchTerm) return cookies;
  searchTerm = searchTerm.toLowerCase();
  return Object.fromEntries(
    Object.entries(cookies).filter(([domain]) =>
      domain.toLowerCase().includes(searchTerm)
    )
  );
}

// Function to update cookie list
function updateCookieList(cookies) {
  const cookieList = document.getElementById("cookieList");
  const searchTerm = document.getElementById("cookieSearch")?.value || "";
  const filteredCookies = filterCookies(cookies, searchTerm);

  cookieList.innerHTML = "";

  if (Object.keys(filteredCookies).length === 0) {
    cookieList.innerHTML = `<div class="empty-state">No cookies found${
      searchTerm ? ' matching "' + searchTerm + '"' : ""
    }.</div>`;
    return;
  }

  Object.entries(filteredCookies).forEach(([domain, cookieData]) => {
    const cookieItem = document.createElement("div");
    cookieItem.className = "tracker-item";
    const secureCount = cookieData.filter((c) => c.secure).length;
    const httpOnlyCount = cookieData.filter((c) => c.httpOnly).length;

    cookieItem.innerHTML = `
      <div>
        <span class="cookie-icon">\u{1F36A}</span>
        <strong>${domain}</strong>
      </div>
      <div>
        <span title="Total cookies">Total: ${cookieData.length}</span> |
        <span title="Secure cookies">\u{1F512} ${secureCount}</span> |
        <span title="HTTP-only cookies">\u{1F6E1} ${httpOnlyCount}</span>
      </div>
      <div>Latest: ${formatTime(
        cookieData[cookieData.length - 1].timestamp
      )}</div>
    `;
    cookieList.appendChild(cookieItem);
  });
}

// Function to update stats and risk assessment
function updateStats(data) {
  // Update basic stats
  document.getElementById('trackerCount').textContent = Object.keys(data.trackers).length;
  document.getElementById('requestCount').textContent = data.requests;
  
  // Update blocking stats
  Object.entries(data.blocked).forEach(([category, count]) => {
    const element = document.getElementById(`${category}BlockedCount`);
    if (element) element.textContent = count;
  });

  // Update risk assessment bars
  Object.entries(data.riskAssessment).forEach(([key, value]) => {
    const riskBar = document.getElementById(`risk-${key}`);
    if (riskBar) {
      riskBar.style.width = `${value}%`;
      riskBar.className = `risk-level ${getRiskClass(value)}`;
    }
  });

  // Update recommendations
  updateRecommendations(data);
}

// Get risk level class
function getRiskClass(value) {
  if (value < 30) return 'low';
  if (value < 70) return 'medium';
  return 'high';
}

// Update privacy recommendations
function updateRecommendations(data) {
  const recommendationsList = document.getElementById('recommendationsList');
  recommendationsList.innerHTML = '';
  
  const recommendations = [];
  
  // Add recommendations based on risk assessment
  if (data.riskAssessment.dataCollection > 70) {
    recommendations.push('High number of trackers detected. Consider enabling additional blocking features.');
  }
  
  if (data.riskAssessment.thirdPartySharing > 50) {
    recommendations.push('Significant third-party data sharing detected. Review and adjust blocking settings.');
  }
  
  if (data.riskAssessment.cookieUsage > 60) {
    recommendations.push('Multiple unsecure cookies found. Enable strict cookie controls.');
  }

  recommendations.forEach(rec => {
    const li = document.createElement('li');
    li.textContent = rec;
    recommendationsList.appendChild(li);
  });
}

// Function to refresh all data
function refreshData() {
  chrome.runtime.sendMessage({ type: "getTrackingData" }, (response) => {
    if (response) {
      updateTrackerList(response.trackers);
      updateCookieList(response.cookies);
      updateStats(response);
    }
  });
}

// Initialize blocking preferences
function initializePreferences() {
  chrome.storage.local.get('userPreferences', (result) => {
    const prefs = result.userPreferences || {};
    Object.entries(prefs).forEach(([key, value]) => {
      const element = document.getElementById(key);
      if (element) element.checked = value;
    });
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  refreshData();
  initializePreferences();

  // Setup blocking preference listeners
  const prefToggles = [
    'blockAnalytics',
    'blockAds',
    'blockSocial',
    'preventFingerprinting',
    'enableHeuristics'
  ];

  prefToggles.forEach(pref => {
    const element = document.getElementById(pref);
    if (element) {
      element.addEventListener('change', updateBlockingPreferences);
    }
  });

  // Clear data button handler
  document.getElementById('clearData').addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'clearData' }, (response) => {
      if (response && response.success) {
        refreshData();
        showNotification('Data cleared successfully');
      }
    });
  });
});

// Refresh data periodically
setInterval(refreshData, 3000);
