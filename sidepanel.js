// Side panel logic. Phase 1: only checks setup state and links to settings.
// The Tailor button stays disabled until Phase 2.

const setupWarning = document.getElementById("setup-warning");

// Show a warning if resume or API key is missing.
async function checkSetup() {
  const { masterResume, apiKey } = await chrome.storage.local.get([
    "masterResume",
    "apiKey",
  ]);
  const ready = Boolean(masterResume && apiKey);
  setupWarning.classList.toggle("hidden", ready);
}

function openOptions() {
  chrome.runtime.openOptionsPage();
}

document.getElementById("open-options").addEventListener("click", openOptions);
document.getElementById("goto-options").addEventListener("click", (e) => {
  e.preventDefault();
  openOptions();
});

// Re-check whenever storage changes (e.g. after saving in options).
chrome.storage.onChanged.addListener(checkSetup);

checkSetup();
