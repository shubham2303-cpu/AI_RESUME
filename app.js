// TailorFit — Phase 2: settings persistence, resume upload+extract, core tailor loop.

const KEYS = {
  apiKey: "tf_apiKey",
  resume: "tf_masterResume",
  pinned: "tf_pinnedSkills",
  contactLinks: "tf_contactLinks",
  entryLinks: "tf_entryLinks",
};
// Defaults are blank so the app ships with no personal data — each user fills their own.
const DEFAULT_PINNED = "";
const DEFAULT_CONTACT_LINKS = "";
const DEFAULT_ENTRY_LINKS = "";

const apiKeyEl = document.getElementById("apiKey");
const masterResumeEl = document.getElementById("masterResume");
const pinnedSkillsEl = document.getElementById("pinnedSkills");
const contactLinksEl = document.getElementById("contactLinks");
const entryLinksEl = document.getElementById("entryLinks");
const saveStatusEl = document.getElementById("save-status");
const setupWarning = document.getElementById("setup-warning");
const settingsEl = document.getElementById("settings");
const resumeFileEl = document.getElementById("resumeFile");
const extractStatusEl = document.getElementById("extract-status");

const jdEl = document.getElementById("jd");
const tailorBtn = document.getElementById("tailor");
const outputEl = document.getElementById("output");
const outputStatusEl = document.getElementById("output-status");
const outputErrorEl = document.getElementById("output-error");
const outputBodyEl = document.getElementById("output-body");
const resumeRenderEl = document.getElementById("resume-render");
const gapReportEl = document.getElementById("gap-report");
const stretchNotesEl = document.getElementById("stretch-notes");
const copyBtn = document.getElementById("copyBtn");
const pdfBtn = document.getElementById("pdfBtn");
const copyStatusEl = document.getElementById("copy-status");
const usageEl = document.getElementById("usage");

// Last successful tailored result (structured), used by Copy + PDF.
let lastResult = null;
// Running totals for this browser session.
let sessionCost = 0;
let sessionRuns = 0;

// ---- Settings ----

function load() {
  apiKeyEl.value = localStorage.getItem(KEYS.apiKey) || "";
  masterResumeEl.value = localStorage.getItem(KEYS.resume) || "";
  // First run: prefill + persist defaults so they apply immediately.
  pinnedSkillsEl.value = loadOrDefault(KEYS.pinned, DEFAULT_PINNED);
  contactLinksEl.value = loadOrDefault(KEYS.contactLinks, DEFAULT_CONTACT_LINKS);
  entryLinksEl.value = loadOrDefault(KEYS.entryLinks, DEFAULT_ENTRY_LINKS);
}

// Return saved value, or seed localStorage with a default on first run.
function loadOrDefault(key, def) {
  let v = localStorage.getItem(key);
  if (v === null) {
    v = def;
    localStorage.setItem(key, v);
  }
  return v;
}

function save() {
  localStorage.setItem(KEYS.apiKey, apiKeyEl.value.trim());
  localStorage.setItem(KEYS.resume, masterResumeEl.value);
  localStorage.setItem(KEYS.pinned, pinnedSkillsEl.value.trim());
  localStorage.setItem(KEYS.contactLinks, contactLinksEl.value.trim());
  localStorage.setItem(KEYS.entryLinks, entryLinksEl.value.trim());
  saveStatusEl.textContent = "Saved ✓";
  setTimeout(() => (saveStatusEl.textContent = ""), 2000);
  checkSetup();
}

function checkSetup() {
  const ready =
    Boolean(localStorage.getItem(KEYS.apiKey)) &&
    Boolean(localStorage.getItem(KEYS.resume));
  setupWarning.classList.toggle("hidden", ready);
  if (!ready) settingsEl.open = true;
}

function toggleKey() {
  const hidden = apiKeyEl.type === "password";
  apiKeyEl.type = hidden ? "text" : "password";
  document.getElementById("toggleKey").textContent = hidden
    ? "Hide key"
    : "Show key";
}

// ---- Resume upload: extract text into the editable box (user reviews + saves) ----

async function handleUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  extractStatusEl.textContent = `Extracting ${file.name}…`;
  try {
    const text = await extractTextFromFile(file);
    masterResumeEl.value = text;
    extractStatusEl.textContent = "Extracted — review below, then Save.";
  } catch (err) {
    extractStatusEl.textContent = `⚠ ${err.message}`;
  } finally {
    resumeFileEl.value = ""; // allow re-uploading the same file
  }
}

// ---- Core tailor loop ----

async function tailor() {
  // Fall back to live form fields if nothing is saved yet, and persist them —
  // so "forgot to click Save" no longer blocks tailoring.
  if (!localStorage.getItem(KEYS.apiKey) && apiKeyEl.value.trim()) {
    localStorage.setItem(KEYS.apiKey, apiKeyEl.value.trim());
  }
  if (!localStorage.getItem(KEYS.resume) && masterResumeEl.value.trim()) {
    localStorage.setItem(KEYS.resume, masterResumeEl.value);
  }

  const apiKey = localStorage.getItem(KEYS.apiKey) || "";
  const masterResume = localStorage.getItem(KEYS.resume) || "";
  const jd = jdEl.value.trim();

  // Clear prior output state.
  outputEl.classList.remove("hidden");
  outputErrorEl.classList.add("hidden");
  outputBodyEl.classList.add("hidden");

  if (!apiKey || !masterResume) {
    showError("Add your API key and master resume in Settings first.");
    return;
  }
  if (!jd) {
    showError("Paste a job description first.");
    return;
  }

  setLoading(true);
  outputStatusEl.textContent = "Tailoring… (a few seconds)";

  try {
    const pinnedSkills = localStorage.getItem(KEYS.pinned) || "";
    const { data, usage } = await tailorResume({
      apiKey,
      system: SYSTEM_PROMPT,
      userPrompt: buildUserPrompt(masterResume, jd, pinnedSkills),
    });
    // Skills (incl. always-include) are categorized by the model now.
    // Links stay deterministic — the model is unreliable for URLs.
    injectContactLinks(data, localStorage.getItem(KEYS.contactLinks));
    injectEntryLinks(data, localStorage.getItem(KEYS.entryLinks));

    lastResult = data;
    outputStatusEl.textContent = "";
    renderUsage(usage);
    resumeRenderEl.innerHTML = renderResume(data);
    gapReportEl.innerHTML = renderGaps(data);
    stretchNotesEl.innerHTML = renderStretchNotes(data);
    outputBodyEl.classList.remove("hidden");
  } catch (err) {
    showError(err.message);
  } finally {
    setLoading(false);
  }
}

// Show token usage + cost for this tailoring call, plus the session total.
// PDF export and resume/JD reading are local — they cost $0.
function renderUsage(usage) {
  const c = estimateCost(usage);
  if (!c) {
    usageEl.textContent = "Token usage unavailable for this run.";
    return;
  }
  sessionCost += c.cost;
  sessionRuns += 1;
  const total = `${c.input.toLocaleString()} in + ${c.output.toLocaleString()} out tokens · ≈ $${c.cost.toFixed(4)}`;
  const session =
    sessionRuns > 1
      ? `  ·  session: ${sessionRuns} runs ≈ $${sessionCost.toFixed(4)}`
      : "";
  usageEl.textContent = `This tailoring: ${total}${session}  ·  (PDF & file reading are local, $0)`;
}

// Copy the tailored resume as plain text.
async function copyResume() {
  if (!lastResult) return;
  try {
    await navigator.clipboard.writeText(resumeToText(lastResult));
    copyStatusEl.textContent = "Copied ✓";
  } catch (_) {
    copyStatusEl.textContent = "Copy failed — select manually.";
  }
  setTimeout(() => (copyStatusEl.textContent = ""), 2000);
}

// Human-in-the-loop: user clicks "Add" on a high-impact gap. Confirm truth, then insert.
function handleGapClick(e) {
  const btn = e.target.closest(".add-skill");
  if (!btn || !lastResult) return;

  const idx = Number(btn.dataset.gap);
  const gap = (lastResult.gaps || [])[idx];
  if (!gap || !gap.suggestedSkill) return;

  // Explicit honesty check — the human, not the model, asserts this is true.
  const ok = window.confirm(
    `Add "${gap.suggestedSkill}" to your resume?\n\n` +
      `Only add this if you GENUINELY have this skill/experience. ` +
      `TailorFit will not verify it — you are confirming it is true.`
  );
  if (!ok) return;

  addSkillToResume(lastResult, gap.suggestedSkill);
  gap.added = true; // hide from gap list now that it's incorporated

  // Re-render resume + gaps so the addition flows to Copy and PDF too.
  resumeRenderEl.innerHTML = renderResume(lastResult);
  gapReportEl.innerHTML = renderGaps(lastResult);
}

// Open a Harvard-styled print view; user saves as PDF from the browser dialog.
function downloadPdf() {
  if (!lastResult) return;
  const win = window.open("", "_blank");
  if (!win) {
    copyStatusEl.textContent = "Allow pop-ups to download the PDF.";
    setTimeout(() => (copyStatusEl.textContent = ""), 3000);
    return;
  }
  win.document.write(buildPrintHtml(lastResult));
  win.document.close();
}

function setLoading(on) {
  tailorBtn.disabled = on;
  tailorBtn.textContent = on ? "Tailoring…" : "Tailor my resume";
}

function showError(msg) {
  outputEl.classList.remove("hidden");
  outputBodyEl.classList.add("hidden");
  outputStatusEl.textContent = "";
  outputErrorEl.textContent = msg;
  outputErrorEl.classList.remove("hidden");
}

// ---- Wire up ----

document.getElementById("save").addEventListener("click", save);
document.getElementById("toggleKey").addEventListener("click", toggleKey);
resumeFileEl.addEventListener("change", handleUpload);
tailorBtn.addEventListener("click", tailor);
copyBtn.addEventListener("click", copyResume);
pdfBtn.addEventListener("click", downloadPdf);
gapReportEl.addEventListener("click", handleGapClick);

load();
checkSetup();
