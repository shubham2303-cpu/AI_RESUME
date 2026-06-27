# TailorFit

A tiny, no-backend web app that tailors your **real** resume to a specific job
description — then exports a clean, Harvard-style one-page PDF.

It **reframes** truthful content; it never invents skills, employers, metrics, or
experience. Anything the job wants but your resume lacks is listed honestly in a
**gap report** instead of being faked.

## Features

- Paste a job description → get a tailored resume in a few seconds.
- **Anti-fabrication by design** — only rewords, reorders, and re-emphasizes what's
  already in your master resume. Mirrors the JD's vocabulary only where you genuinely
  have the experience.
- **Gap report** — JD requirements your resume doesn't support, with impact ratings.
- **Stretch flags** — aggressive rephrasings marked for your review.
- **Human-in-the-loop** — for high-impact gaps, a one-click "Add" (with a truth
  confirmation) lets *you* decide whether to include a skill. The model never adds it.
- **Always-include skills** — pin skills you always want; the model slots each into the
  right category.
- **Edit highlights** — see which bullets were reworded; impact metrics are bolded.
- **Harvard-style PDF** — auto-fits to one page; clickable contact + project links.
- **Bring your own key** — your Anthropic key and resume live only in your browser.

## Tech

Vanilla HTML/CSS/JS. **No build step, no framework, no backend.** Calls the Anthropic
Messages API directly from the browser. Two vendored libraries (local, no runtime CDN):
[`pdf.js`](https://mozilla.github.io/pdf.js/) (PDF text extraction) and
[`mammoth.js`](https://github.com/mwilliamson/mammoth.js) (DOCX extraction).

```
index.html      app.js       prompts.js     render.js
extract.js      llm.js       styles.css     vendor/   (pdf.js, mammoth.js)
```

Model: `claude-sonnet-4-6`. Browser access uses the
`anthropic-dangerous-direct-browser-access: true` header.

## Run locally

The app needs HTTPS or `localhost` (the Anthropic API + clipboard won't work from a
`file://` page). Serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Use the **same** URL every time — settings are stored per-origin in `localStorage`.

## Deploy (so friends can use it)

It's a static site — host the folder anywhere with HTTPS. Two free options:

- **Netlify drop:** drag the project folder onto <https://app.netlify.com/drop>.
  Instant HTTPS URL. Share it.
- **GitHub Pages:**
  ```bash
  git init && git add . && git commit -m "TailorFit"
  # push to a GitHub repo, then: Settings → Pages → deploy from branch (root)
  ```

No build, no environment variables, no server config.

## Using it (each user)

1. Open the site. In **Settings**, enter your own
   [Anthropic API key](https://console.anthropic.com) and paste/upload your master
   resume (PDF, DOCX, or TXT). Add profile/project links and always-include skills if you like.
2. Paste a job description → **Tailor my resume**.
3. Review the highlights, gap report, and stretch flags.
4. **Copy text** or **Download PDF** (in the print dialog, untick *Headers and footers*
   to remove the date / URL / page number).

## Privacy & security

- Your API key and resume are stored **only in your browser's `localStorage`**.
- They are sent **only** to `api.anthropic.com`, using your key. There is no backend —
  no other server ever receives them.
- The key is never logged.
- It's only as safe as your device — **don't use on a shared/public computer.**
- Each user brings their own key and their own billing.

## Cost

Only the "Tailor" call uses the API (PDF export and file reading are local, free). The
app shows token usage and an estimated cost per run, plus a session total. Pricing is
set in `llm.js` (`PRICING`) — update it if Anthropic's rates change.
