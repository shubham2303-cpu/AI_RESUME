// File text extraction for resume uploads: PDF (pdf.js), DOCX (mammoth), TXT.
// Returns extracted plain text. Throws Error with a clear message on failure.

// pdf.js needs its worker; point it at the local vendored copy.
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
}

async function extractTextFromFile(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith(".txt")) return await file.text();
  if (name.endsWith(".pdf")) return await extractPdf(file);
  if (name.endsWith(".docx")) return await extractDocx(file);

  throw new Error("Unsupported file type. Use PDF, DOCX, or TXT.");
}

// Concatenate text from every page of a PDF.
async function extractPdf(file) {
  if (!window.pdfjsLib) throw new Error("PDF library failed to load.");
  const buf = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: buf }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((it) => it.str).join(" "));
  }
  const text = pages.join("\n\n").trim();
  if (!text)
    throw new Error(
      "No text found in the PDF (it may be a scanned image). Paste manually."
    );
  return text;
}

// Extract raw text from a DOCX file.
async function extractDocx(file) {
  if (!window.mammoth) throw new Error("DOCX library failed to load.");
  const buf = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer: buf });
  const text = (result.value || "").trim();
  if (!text) throw new Error("No text found in the DOCX file. Paste manually.");
  return text;
}
