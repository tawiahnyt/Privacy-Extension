/** @format */

// Function to format timestamp
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString();
}

// Function to update tracker list
function updateTrackerList(trackers) {
  const trackerList = document.getElementById("trackerList");
  trackerList.innerHTML = "";

  Object.entries(trackers).forEach(([hostname, data]) => {
    const trackerItem = document.createElement("div");
    trackerItem.className = "tracker-item";
    trackerItem.innerHTML = `
      <div>
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

// Function to update cookie list
function updateCookieList(cookies) {
  const cookieList = document.getElementById("cookieList");
  cookieList.innerHTML = "";

  Object.entries(cookies).forEach(([domain, cookieData]) => {
    const cookieItem = document.createElement("div");
    cookieItem.className = "tracker-item";
    cookieItem.innerHTML = `
      <div><strong>${domain}</strong></div>
      <div>Cookies: ${cookieData.length}</div>
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
