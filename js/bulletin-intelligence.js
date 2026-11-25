/**
 * Free-first bulletin extraction helpers.
 * This is deterministic text parsing, not AI inference. Every extracted item
 * carries a page reference and excerpt so a technician can verify it.
 */
export function splitBulletinPages(text) {
  const source = String(text || "");
  const matches = [...source.matchAll(/^\[Page\s+(\d+)(?:\s*[·|]\s*([^\]]+))?\]\s*$/gim)];
  if (!matches.length) return [{ page: null, method: "text", text: source.trim() }].filter(page => page.text);
  return matches.map((match, index) => ({
    page: Number(match[1]),
    method: /ocr/i.test(match[2] || "") ? "ocr" : "text",
    text: source.slice(match.index + match[0].length, matches[index + 1]?.index ?? source.length).trim()
  })).filter(page => page.text);
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").replace(/^[:\-–—\s]+|[:\-–—\s]+$/g, "").trim();
}

function findField(lines, patterns) {
  for (let index = 0; index < lines.length; index++) {
    const line = clean(lines[index].text);
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) return { value: clean(match[1] || line), sourcePage: lines[index].page, excerpt: line };
    }
  }
  return null;
}

function collectSection(pages, headingPattern, stopPattern) {
  const lines = pages.flatMap(page => page.text.split(/\r?\n/).map(text => ({ text: clean(text), page: page.page })))
    .filter(line => line.text);
  let active = false;
  const found = [];
  for (const line of lines) {
    const isHeading = headingPattern.test(line.text);
    if (isHeading) {
      active = true;
      const inline = clean(line.text.replace(headingPattern, ""));
      if (inline && inline.length > 2) found.push({ text: inline, sourcePage: line.page, excerpt: line.text });
      continue;
    }
    if (active && stopPattern.test(line.text)) active = false;
    if (active && line.text.length > 2) found.push({ text: line.text, sourcePage: line.page, excerpt: line.text });
  }
  return found.slice(0, 80);
}

export function parseBulletinIntelligence(extractedText, metadata = {}) {
  const pages = splitBulletinPages(extractedText);
  const lines = pages.flatMap(page => page.text.split(/\r?\n/).map(text => ({ text, page: page.page })))
    .filter(line => clean(line.text));
  const allText = pages.map(page => page.text).join("\n");
  const bulletinNumber = findField(lines, [
    /\b(?:CBR|TSB|SB|Bulletin)\s*(?:No\.?|Number|#|:)?\s*([A-Z]{0,5}[- ]?\d{2,}[A-Z0-9-]*)/i,
    /\b(?:document|publication)\s*(?:number|no\.?|#)\s*[:#-]?\s*([A-Z0-9-]{4,})/i
  ]);
  const revision = findField(lines, [
    /\b(?:revision|rev\.?|version)\s*[:#-]?\s*([A-Z0-9][A-Z0-9._ -]{0,30})/i
  ]);
  const publicationDate = findField(lines, [
    /\b(?:published|publication date|issued|release date|date)\s*[:#-]?\s*((?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[a-z]*\s+\d{1,2},?\s+\d{4}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i
  ]);
  const applicability = collectSection(
    pages,
    /^(?:vehicle\s+)?(?:applicability|application|models?\s+affected|affected\s+vehicles|applies\s+to|models?\s*:)\s*/i,
    /^(?:not\s+applicable|does\s+not\s+apply|exclusions?|excluded\s+models?|procedure|service\s+procedure|correction|repair|warranty|parts|labor|symptom|condition)\b/i
  );
  const exclusions = collectSection(
    pages,
    /^(?:exclusions?|not\s+applicable|does\s+not\s+apply|excluded\s+models?|this\s+bulletin\s+does\s+not\s+apply)\s*[:\-–—]?\s*/i,
    /^(?:procedure|service\s+procedure|correction|repair|warranty|parts|labor|applicability|application|models?\s+affected)\b/i
  );
  const procedureHeadings = /^(?:service\s+)?(?:procedure|repair\s+procedure|service\s+procedure|diagnostic\s+procedure|instructions|correction|action\s+required|work\s+instructions)\b/i;
  const procedureLines = collectSection(
    pages,
    procedureHeadings,
    /^(?:warranty|labor\s+time|parts\s+(?:information|list)|revision\s+history|copyright|disclaimer|end\s+of\s+document)\b/i
  );
  const procedureSteps = [];
  for (const item of procedureLines) {
    const text = clean(item.text);
    const numbered = text.match(/^(?:(?:step\s*)?\d{1,2}[.)]|\(\d{1,2}\))\s*(.+)$/i);
    const bullet = text.match(/^(?:[-•▪]\s+)(.+)$/);
    if (numbered || bullet) {
      procedureSteps.push({
        stepNumber: procedureSteps.length + 1,
        text: clean((numbered || bullet)[1]),
        sourcePage: item.sourcePage,
        sourceExcerpt: item.excerpt
      });
    } else if (procedureSteps.length && text.length > 12) {
      procedureSteps[procedureSteps.length - 1].text += " " + text;
      procedureSteps[procedureSteps.length - 1].sourceExcerpt += " " + item.excerpt;
    }
  }
  const faultCodes = [...new Set((allText.match(/\bP[0-9A-F]{4}[0-9A-F]{0,2}\b/gi) || []).map(code => code.toUpperCase()))];
  const references = [];
  for (const page of pages) {
    for (const match of page.text.matchAll(/\b(?:TSB|CBR|SB| bulletin|publication|document)\s*(?:No\.?|#|number)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9-]{3,})/gi)) {
      references.push({ reference: clean(match[1]), sourcePage: page.page, sourceExcerpt: clean(match[0]) });
    }
  }
  const uniqueReferences = [...new Map(references.map(item => [item.reference.toUpperCase(), item])).values()];
  const manufacturer = metadata.manufacturer || findField(lines, [/\bmanufacturer\s*[:#-]?\s*([A-Z][A-Z0-9 &-]{1,30})/i])?.value || null;
  const model = metadata.model || null;
  const warnings = [];
  if (!applicability.length) warnings.push("Applicability was not confidently identified. Verify model, year, serial range and configuration in the original document.");
  if (!exclusions.length) warnings.push("No explicit exclusions section was identified. Check the original bulletin for exclusions.");
  if (!procedureSteps.length) warnings.push("No numbered or bulleted procedure steps were identified. The procedure may be in a table, image, or differently formatted section.");
  if (!revision) warnings.push("Document revision was not confidently identified.");
  warnings.push("Automatically extracted text is a draft. Verify every instruction and applicability statement against the original document before using it for diagnosis.");
  return {
    schemaVersion: 1,
    extractionMethod: pages.some(page => page.method === "ocr") ? "text+ocr" : "text",
    document: {
      title: metadata.title || null,
      manufacturer,
      model,
      bulletinNumber: bulletinNumber?.value || metadata.source_reference || null,
      revision: revision?.value || metadata.revision || null,
      publicationDate: publicationDate?.value || null,
      pageCount: metadata.pageCount ?? pages.length
    },
    applicability,
    exclusions,
    faultCodes,
    procedureSteps,
    references: uniqueReferences,
    warnings,
    source: {
      fileName: metadata.fileName || null,
      pageReferencesPreserved: pages.every(page => page.page !== null),
      extractedAt: new Date().toISOString()
    },
    reviewStatus: "candidate"
  };
}
