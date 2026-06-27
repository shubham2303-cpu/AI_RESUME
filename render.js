// Rendering: structured resume -> on-page HTML (with edit/stretch flags),
// -> plain text (for copy), and -> Harvard-styled printable HTML (for PDF).

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Escape text, then convert **bold** spans (Markdown) to <strong>. Safe: esc runs first.
function escBold(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

// Strip **bold** markers for plain-text output.
function stripBold(s) {
  return String(s == null ? "" : s).replace(/\*\*(.+?)\*\*/g, "$1");
}

// Derive an href from a raw contact string, or null if it isn't a link.
function toHref(s, kind) {
  const v = String(s == null ? "" : s).trim();
  if (!v) return null;
  if (kind === "email") return "mailto:" + v;
  if (kind === "phone") return "tel:" + v.replace(/[^\d+]/g, "");
  if (/^https?:\/\//i.test(v)) return v;
  if (/^www\./i.test(v)) return "https://" + v;
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(v)) return "mailto:" + v; // bare email
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return "https://" + v; // bare domain/path
  return null;
}

// A link entry may be "LinkedIn: https://…", "GitHub (github.com/x)", a bare URL,
// or just a label with no URL. Extract {label, href}; href is null if no URL found.
function parseLinkPiece(raw) {
  const s = String(raw || "").trim();
  // Find an embedded URL/domain anywhere in the string.
  const m = s.match(
    /(https?:\/\/[^\s|()<>]+|www\.[^\s|()<>]+|[\w-]+\.[\w./~#?=&%-]{2,})/i
  );
  if (!m) return { label: s, href: null };
  const url = m[0].replace(/[).,]+$/, ""); // strip trailing punctuation
  // Label = text with the URL/separators removed; fall back to the URL itself.
  let label = s.replace(m[0], "").replace(/[|:()\-•\s]+$/, "").replace(/^[|:()\-•\s]+/, "").trim();
  if (!label) label = url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  return { label, href: toHref(url, "link") };
}

// Build contact entries as clickable anchors where possible. Returns HTML strings.
// linkAttr lets the on-page version open in a new tab; PDF omits it.
function contactPieces(c, linkAttr) {
  const out = [];
  const pushSimple = (val, kind) => {
    if (!val) return;
    const href = toHref(val, kind);
    out.push(href ? `<a href="${esc(href)}"${linkAttr}>${esc(val)}</a>` : esc(val));
  };
  pushSimple(c.email, "email");
  pushSimple(c.phone, "phone");
  pushSimple(c.location, "text");
  for (const link of c.links || []) {
    const { label, href } = parseLinkPiece(link);
    out.push(href ? `<a href="${esc(href)}"${linkAttr}>${esc(label)}</a>` : esc(label));
  }
  return out;
}

// --- On-page render: shows what changed (edited) and what to review (stretch) ---

function renderResume(data) {
  const c = data.contact || {};
  const contactBits = contactPieces(c, ' target="_blank" rel="noopener"').join(" · ");

  let html = "";
  if (c.name) html += `<h2 class="r-name">${esc(c.name)}</h2>`;
  if (contactBits) html += `<p class="r-contact">${contactBits}</p>`;

  for (const sec of data.sections || []) {
    html += `<h3 class="r-section">${esc(sec.title)}</h3>`;
    for (const e of sec.entries || []) {
      html += `<div class="r-entry">`;
      let line1 = [e.heading, e.subheading].filter(Boolean).map(esc).join(" — ");
      const href = toHref(e.link, "link");
      if (href) line1 += ` <a href="${esc(href)}" target="_blank" rel="noopener" class="entry-link">↗ link</a>`;
      const meta = [e.location, e.dateRange].filter(Boolean).map(esc).join(", ");
      if (line1 || meta) {
        html += `<div class="r-entry-head"><span>${line1}</span><span class="r-meta">${meta}</span></div>`;
      }
      if ((e.bullets || []).length) {
        html += `<ul>`;
        for (const b of e.bullets) {
          const cls = ["r-bullet"];
          if (b.edited) cls.push("hl-edited");
          if (b.stretch) cls.push("hl-stretch");
          if (b.userAdded) cls.push("hl-added");
          let flag = "";
          if (b.userAdded) flag = ` <span class="added-tag">✓ you added</span>`;
          else if (b.stretch) flag = ` <span class="stretch-tag">⚑ stretch</span>`;
          html += `<li class="${cls.join(" ")}">${escBold(b.text)}${flag}</li>`;
        }
        html += `</ul>`;
      }
      html += `</div>`;
    }
  }
  return html;
}

function renderGaps(data) {
  // Normalize: gaps may be objects (new) or plain strings (legacy/fallback).
  const gaps = (data.gaps || []).map((g) =>
    typeof g === "string" ? { requirement: g, impact: "", suggestedSkill: "" } : g
  );
  if (!gaps.length) {
    return `<h3 class="r-section">Gap report</h3><p class="gap-none">No unmet requirements detected. Still review against the JD yourself.</p>`;
  }

  const items = gaps
    .map((g, i) => {
      if (g.added) return ""; // already added by the user; hide
      const impact = (g.impact || "").toLowerCase();
      const badge = impact
        ? `<span class="impact impact-${esc(impact)}">${esc(impact)} impact</span>`
        : "";
      const rationale = g.rationale ? `<div class="gap-rationale">${esc(g.rationale)}</div>` : "";
      // High-impact gaps with a suggested phrasing get a human-in-the-loop Add button.
      const canAdd = impact === "high" && g.suggestedSkill;
      const addBtn = canAdd
        ? `<button class="add-skill secondary" type="button" data-gap="${i}">+ Add "${esc(g.suggestedSkill)}"</button>`
        : "";
      return `<li><div class="gap-head"><span>${esc(g.requirement)} ${badge}</span>${addBtn}</div>${rationale}</li>`;
    })
    .join("");

  return (
    `<h3 class="r-section">Gap report — JD requirements your resume does NOT support</h3>` +
    `<p class="hint">High-impact gaps offer an <strong>Add</strong> button. Only add a skill you genuinely have — you confirm the truth, not the model.</p>` +
    `<ul class="gap-list">${items}</ul>`
  );
}

// Deterministically set contact links from user settings ("Label: URL" per line).
// Overrides whatever the model produced, so links are reliable + clickable.
function injectContactLinks(data, text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return;
  data.contact = data.contact || {};
  data.contact.links = lines; // each line "Label: URL" — parseLinkPiece handles it
}

// Deterministically attach a link to an entry by keyword ("keyword = URL" per line).
// If a section entry's heading/subheading contains the keyword, set entry.link.
function injectEntryLinks(data, text) {
  const map = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("=");
      if (i === -1) return null;
      return { kw: l.slice(0, i).trim().toLowerCase(), url: l.slice(i + 1).trim() };
    })
    .filter((m) => m && m.kw && m.url);
  if (!map.length) return;

  for (const sec of data.sections || []) {
    for (const e of sec.entries || []) {
      const hay = `${e.heading || ""} ${e.subheading || ""}`.toLowerCase();
      const hit = map.find((m) => hay.includes(m.kw));
      if (hit) e.link = hit.url;
    }
  }
}

// Inject user's always-include (pinned) skills into the Skills section, MERGED into
// a single AI/ML category line (not separate bullets). User-asserted, JD-independent.
function injectPinnedSkills(data, pinnedList) {
  const pinned = (pinnedList || []).map((s) => s.trim()).filter(Boolean);
  if (!pinned.length) return;

  // Find the Skills section (create if absent, before Education).
  let skills = (data.sections || []).find((s) => /skill/i.test(s.title || ""));
  if (!skills) {
    skills = { title: "Skills & Interests", entries: [{ bullets: [] }] };
    data.sections = data.sections || [];
    const eduIdx = data.sections.findIndex((s) => /education/i.test(s.title || ""));
    if (eduIdx === -1) data.sections.push(skills);
    else data.sections.splice(eduIdx, 0, skills);
  }
  if (!skills.entries || !skills.entries.length) skills.entries = [{ bullets: [] }];

  // Prefer an existing AI/ML-style category line; else we'll create one.
  let target = null;
  for (const e of skills.entries)
    for (const b of e.bullets || [])
      if (/\b(ai\/ml|ai\s*\/\s*ml|machine learning|genai|gen ai|ml)\b/i.test(b.text)) {
        target = b;
        break;
      }

  // Dedup only against the AI/ML line (so e.g. Redis still appears here even if it's
  // also listed under Databases — the user wants it grouped under AI/ML).
  const base = (target ? target.text : "").toLowerCase();
  const missing = pinned.filter((s) => !base.includes(s.toLowerCase()));
  if (!missing.length) return;

  if (target) {
    target.text = target.text.replace(/\s*$/, "") + ", " + missing.join(", ");
    target.edited = true;
  } else {
    skills.entries[0].bullets = skills.entries[0].bullets || [];
    skills.entries[0].bullets.push({
      text: "AI/ML: " + missing.join(", "),
      edited: true,
      stretch: false,
      userAdded: true,
    });
  }
}

// Human-in-the-loop: insert a user-confirmed skill into the structured resume.
// Adds to an existing Skills section, or creates one. Marked userAdded for review.
function addSkillToResume(data, skillText) {
  const bullet = { text: skillText, edited: true, stretch: false, userAdded: true };
  let skills = (data.sections || []).find((s) =>
    /skill/i.test(s.title || "")
  );
  if (!skills) {
    skills = { title: "Skills & Interests", entries: [{ bullets: [] }] };
    data.sections = data.sections || [];
    // Insert before Education so Education stays last; else append.
    const eduIdx = data.sections.findIndex((s) => /education/i.test(s.title || ""));
    if (eduIdx === -1) data.sections.push(skills);
    else data.sections.splice(eduIdx, 0, skills);
  }
  if (!skills.entries || !skills.entries.length) skills.entries = [{ bullets: [] }];
  const entry = skills.entries[0];
  entry.bullets = entry.bullets || [];
  entry.bullets.push(bullet);
}

function renderStretchNotes(data) {
  const notes = data.stretchNotes || [];
  if (!notes.length) return "";
  return (
    `<h3 class="r-section">Stretch flags — review before using</h3>` +
    `<ul class="stretch-list">${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`
  );
}

// --- Plain text (for copy-to-clipboard) ---

function resumeToText(data) {
  const c = data.contact || {};
  const lines = [];
  if (c.name) lines.push(c.name);
  const contact = [c.email, c.phone, c.location, ...(c.links || [])]
    .filter(Boolean)
    .join(" | ");
  if (contact) lines.push(contact);
  lines.push("");

  for (const sec of data.sections || []) {
    lines.push(sec.title.toUpperCase());
    for (const e of sec.entries || []) {
      const head = [e.heading, e.subheading].filter(Boolean).join(" — ");
      const meta = [e.location, e.dateRange].filter(Boolean).join(", ");
      if (head || meta) lines.push([head, meta].filter(Boolean).join("   "));
      if (e.link) lines.push(e.link);
      for (const b of e.bullets || []) lines.push(`• ${stripBold(b.text)}`);
      lines.push("");
    }
  }
  return lines.join("\n").trim() + "\n";
}

// --- Harvard-styled printable HTML (clean final resume — no flags/highlights) ---

function buildPrintHtml(data) {
  const c = data.contact || {};
  const contactBits = contactPieces(c, "").join("  •  ");

  let body = "";
  if (c.name) body += `<h1>${esc(c.name)}</h1>`;
  if (contactBits) body += `<p class="contact">${contactBits}</p>`;

  for (const sec of data.sections || []) {
    body += `<h2>${esc(sec.title)}</h2>`;
    for (const e of sec.entries || []) {
      let left = [e.heading, e.subheading].filter(Boolean).map(esc).join(", ");
      const href = toHref(e.link, "link");
      if (href && left) left = `<a href="${esc(href)}">${left}</a>`;
      else if (href) left = `<a href="${esc(href)}">${esc(href)}</a>`;
      const right = [e.location, e.dateRange].filter(Boolean).map(esc).join(", ");
      if (left || right) {
        body += `<div class="entry-head"><span class="left">${left}</span><span class="right">${right}</span></div>`;
      }
      const bullets = (e.bullets || []).map((b) => `<li>${escBold(b.text)}</li>`).join("");
      if (bullets) body += `<ul>${bullets}</ul>`;
    }
  }

  // Self-contained doc with compact Harvard-leaning print styles.
  // An auto-fit script shrinks the font (within limits) so it stays on ONE page,
  // then triggers the print dialog.
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title> </title>
<style>
  @page { size: letter; margin: 0.5in; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  /* Spacing is em-based so it shrinks together with the font during auto-fit. */
  body { font-family: Georgia, "Times New Roman", serif; font-size: 10pt; line-height: 1.18; color: #000; }
  a { color: #000; text-decoration: none; }
  #sheet { width: 7.5in; }            /* Letter width minus 0.5in margins */
  h1 { font-size: 1.5em; text-align: center; margin: 0 0 0.15em; letter-spacing: 0.5px; }
  .contact { text-align: center; font-size: 0.9em; margin: 0 0 0.6em; }
  h2 { font-size: 1.05em; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #000; padding-bottom: 0.1em; margin: 0.6em 0 0.2em; }
  .entry-head { display: flex; justify-content: space-between; gap: 12px; margin-top: 0.2em; }
  .entry-head .left { font-weight: bold; }
  .entry-head .right { font-style: italic; white-space: nowrap; }
  ul { margin: 0.1em 0 0.25em; padding-left: 1.3em; }
  li { margin: 0.07em 0; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style></head>
<body>
<div id="sheet">${body}</div>
<script>
  // Shrink to fit ONE Letter page (usable height = 10in at 96dpi = 960px).
  (function () {
    var maxH = 960, size = 10, min = 6;
    var sheet = document.getElementById('sheet');
    while (sheet.scrollHeight > maxH && size > min) {
      size -= 0.25;
      document.body.style.fontSize = size + 'pt';
    }
    // If still over after hitting the floor, tighten line-height as a last resort.
    var lh = 1.18;
    while (sheet.scrollHeight > maxH && lh > 1.0) {
      lh -= 0.02;
      document.body.style.lineHeight = lh.toFixed(2);
    }
    window.focus();
    window.print();
  })();
</script>
</body></html>`;
}
