// Options page: load and save the master resume + API key in chrome.storage.local.

const apiKeyEl = document.getElementById("apiKey");
const masterResumeEl = document.getElementById("masterResume");
const statusEl = document.getElementById("status");
const toggleKeyBtn = document.getElementById("toggleKey");

// Load saved values into the form on open.
async function load() {
  const { apiKey, masterResume } = await chrome.storage.local.get([
    "apiKey",
    "masterResume",
  ]);
  if (apiKey) apiKeyEl.value = apiKey;
  if (masterResume) masterResumeEl.value = masterResume;
}

// Save both fields. Trim the key; leave resume formatting intact.
async function save() {
  await chrome.storage.local.set({
    apiKey: apiKeyEl.value.trim(),
    masterResume: masterResumeEl.value,
  });
  statusEl.textContent = "Saved ✓";
  setTimeout(() => (statusEl.textContent = ""), 2000);
}

// Toggle key visibility for editing convenience.
function toggleKey() {
  const isHidden = apiKeyEl.type === "password";
  apiKeyEl.type = isHidden ? "text" : "password";
  toggleKeyBtn.textContent = isHidden ? "Hide key" : "Show key";
}

document.getElementById("save").addEventListener("click", save);
toggleKeyBtn.addEventListener("click", toggleKey);

load();
