// Options page: load and save provider, API keys, and master resume.

const providerEl = document.getElementById("provider");
const anthropicSection = document.getElementById("anthropic-key-section");
const openaiSection = document.getElementById("openai-key-section");
const apiKeyEl = document.getElementById("apiKey");
const openaiKeyEl = document.getElementById("openaiApiKey");
const masterResumeEl = document.getElementById("masterResume");
const statusEl = document.getElementById("status");
const toggleKeyBtn = document.getElementById("toggleKey");
const toggleOpenaiKeyBtn = document.getElementById("toggleOpenaiKey");

function updateProviderUI() {
  const isOpenAI = providerEl.value === "openai";
  anthropicSection.style.display = isOpenAI ? "none" : "";
  openaiSection.style.display = isOpenAI ? "" : "none";
}

async function load() {
  const { provider, apiKey, openaiApiKey, masterResume } =
    await chrome.storage.local.get(["provider", "apiKey", "openaiApiKey", "masterResume"]);
  providerEl.value = provider || "anthropic";
  if (apiKey) apiKeyEl.value = apiKey;
  if (openaiApiKey) openaiKeyEl.value = openaiApiKey;
  if (masterResume) masterResumeEl.value = masterResume;
  updateProviderUI();
}

async function save() {
  await chrome.storage.local.set({
    provider: providerEl.value,
    apiKey: apiKeyEl.value.trim(),
    openaiApiKey: openaiKeyEl.value.trim(),
    masterResume: masterResumeEl.value,
  });
  statusEl.textContent = "Saved ✓";
  setTimeout(() => (statusEl.textContent = ""), 2000);
}

function toggleKey() {
  const isHidden = apiKeyEl.type === "password";
  apiKeyEl.type = isHidden ? "text" : "password";
  toggleKeyBtn.textContent = isHidden ? "Hide key" : "Show key";
}

function toggleOpenaiKey() {
  const isHidden = openaiKeyEl.type === "password";
  openaiKeyEl.type = isHidden ? "text" : "password";
  toggleOpenaiKeyBtn.textContent = isHidden ? "Hide key" : "Show key";
}

document.getElementById("save").addEventListener("click", save);
providerEl.addEventListener("change", updateProviderUI);
toggleKeyBtn.addEventListener("click", toggleKey);
toggleOpenaiKeyBtn.addEventListener("click", toggleOpenaiKey);

load();
