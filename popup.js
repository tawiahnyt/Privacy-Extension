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
  };
  return icons[category] || "🔍";
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

// Function to update stats
function updateStats(data) {
  document.getElementById("trackerCount").textContent = Object.keys(
    data.trackers
  ).length;
  document.getElementById("requestCount").textContent = data.requests;
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

// Clear data button handler
document.getElementById("clearData").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "clearData" }, (response) => {
    if (response && response.success) {
      refreshData();
    }
  });
});

// Initial data load
document.addEventListener("DOMContentLoaded", refreshData);

// Refresh data periodically
setInterval(refreshData, 5000);
