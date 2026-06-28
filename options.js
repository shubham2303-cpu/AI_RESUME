// Settings page: load and save provider, API keys, master resume, and extra settings.

const providerEl = document.getElementById("provider");
const anthropicSection = document.getElementById("anthropic-key-section");
const openaiSection = document.getElementById("openai-key-section");
const apiKeyEl = document.getElementById("apiKey");
const openaiKeyEl = document.getElementById("openaiApiKey");
const masterResumeEl = document.getElementById("masterResume");
const pinnedSkillsEl = document.getElementById("pinnedSkills");
const contactLinksEl = document.getElementById("contactLinks");
const entryLinksEl = document.getElementById("entryLinks");
const statusEl = document.getElementById("status");
const toggleKeyBtn = document.getElementById("toggleKey");
const toggleOpenaiKeyBtn = document.getElementById("toggleOpenaiKey");

const KEYS = {
  provider: "tf_provider",
  apiKey: "tf_apiKey",
  openaiApiKey: "tf_openaiApiKey",
  resume: "tf_masterResume",
  pinned: "tf_pinnedSkills",
  contactLinks: "tf_contactLinks",
  entryLinks: "tf_entryLinks",
};

function updateProviderUI() {
  const isOpenAI = providerEl.value === "openai";
  anthropicSection.style.display = isOpenAI ? "none" : "";
  openaiSection.style.display = isOpenAI ? "" : "none";
}

function load() {
  providerEl.value = localStorage.getItem(KEYS.provider) || "anthropic";
  apiKeyEl.value = localStorage.getItem(KEYS.apiKey) || "";
  openaiKeyEl.value = localStorage.getItem(KEYS.openaiApiKey) || "";
  masterResumeEl.value = localStorage.getItem(KEYS.resume) || "";
  pinnedSkillsEl.value = localStorage.getItem(KEYS.pinned) || "";
  contactLinksEl.value = localStorage.getItem(KEYS.contactLinks) || "";
  entryLinksEl.value = localStorage.getItem(KEYS.entryLinks) || "";
  updateProviderUI();
}

function save() {
  localStorage.setItem(KEYS.provider, providerEl.value);
  localStorage.setItem(KEYS.apiKey, apiKeyEl.value.trim());
  localStorage.setItem(KEYS.openaiApiKey, openaiKeyEl.value.trim());
  localStorage.setItem(KEYS.resume, masterResumeEl.value);
  localStorage.setItem(KEYS.pinned, pinnedSkillsEl.value.trim());
  localStorage.setItem(KEYS.contactLinks, contactLinksEl.value.trim());
  localStorage.setItem(KEYS.entryLinks, entryLinksEl.value.trim());
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
