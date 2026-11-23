import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";
import { createCaseRecord } from "./case-schema.js";

const SUPABASE_URL = "https://wpxvaqmzxhxlrutklypm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_8Dhvi0M8P31FLB9kH5-RiA_5qyq9A0O";
const BUCKET = "ironknuckle-case-files";
const LOCAL_STORE = "ironknuckle.sessions.v1";
const MAP_STORE = "ironknuckle.cloud-case-map.v1";
const $ = id => document.getElementById(id);
const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
let user = null;
let selectedCloudCase = null;
let cloudRows = [];

function status(message, state = "OFFLINE") {
  $("cloudMessage").textContent = message;
  $("cloudState").textContent = state;
}
function localCases() {
  try { return JSON.parse(localStorage.getItem(LOCAL_STORE) || "[]"); }
  catch { return []; }
}
function caseMap() {
  try { return JSON.parse(localStorage.getItem(MAP_STORE) || "{}"); }
  catch { return {}; }
}
function saveCaseMap(value) { localStorage.setItem(MAP_STORE, JSON.stringify(value)); }
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function titleFor(raw) {
  const v = raw?.vehicle || {};
  return [v.year, v.make, v.model, v.engine].filter(Boolean).join(" ") || raw?.complaint?.slice(0,80) || "Untitled diagnostic case";
}
function showSignedIn() {
  $("cloudLogin").hidden = true;
  $("cloudActions").hidden = false;
  $("cloudSignOut").hidden = false;
  $("cloudAttach").hidden = false;
}
function showSignedOut() {
  $("cloudLogin").hidden = false;
  $("cloudActions").hidden = true;
  $("cloudSignOut").hidden = true;
  $("cloudAttach").hidden = true;
  $("cloudCases").innerHTML = "";
}

const STORAGE_QUOTA_BYTES = 500 * 1024 * 1024;
function formatStorageBytes(value) {
  const bytes = Math.max(0, Number(value) || 0);
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}
async function loadStorageUsage() {
  const meter = $("storageMeter");
  if (!meter) return;
  if (!user) { meter.hidden = true; return; }
  meter.hidden = false;
  $("storageMeterTotal").textContent = "Checking usage…";
  $("storageMeterAlert").hidden = true;
  const { data, error } = await client.rpc("get_ironknuckle_storage_usage");
  if (error) {
    console.error("IronKnuckle storage usage lookup failed:", error);
    $("storageMeterTotal").textContent = "Usage unavailable";
    $("caseStorageBreakdown").textContent = "Case evidence: unavailable";
    $("libraryStorageBreakdown").textContent = "Technical library: unavailable";
    $("storageFileCount").textContent = "Files: unavailable";
    $("storageMeterNote")?.textContent;
    $("storageMeterAlert").textContent = "We couldn't retrieve your storage total. Your existing files are unchanged.";
    $("storageMeterAlert").hidden = false;
    return;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    $("storageMeterTotal").textContent = "Usage unavailable";
    return;
  }
  const used = Math.max(0, Number(row.used_bytes) || 0);
  const percent = used / STORAGE_QUOTA_BYTES * 100;
  const shownPercent = Math.min(100, percent);
  $("storageMeterTotal").textContent = formatStorageBytes(used) + " used · 500 MB reference";
  $("storageMeterFill").style.width = shownPercent.toFixed(1) + "%";
  $("storageMeterFill").classList.toggle("warn", percent >= 80 && percent < 95);
  $("storageMeterFill").classList.toggle("critical", percent >= 95);
  $("storageMeterProgress").setAttribute("aria-valuenow", String(Math.round(shownPercent)));
  $("caseStorageBreakdown").textContent = "Case evidence: " + formatStorageBytes(row.case_file_bytes);
  $("libraryStorageBreakdown").textContent = "Technical library: " + formatStorageBytes(row.technical_library_bytes);
  $("storageFileCount").textContent = "Files: " + (Number(row.file_count) || 0);
  const alert = $("storageMeterAlert");
  if (percent >= 95) {
    alert.textContent = "Storage is above 95% of the provisional starter reference. Review large files before adding more.";
    alert.classList.add("critical");
    alert.hidden = false;
  } else if (percent >= 80) {
    alert.textContent = "Storage is above 80% of the provisional starter reference. Keep an eye on larger evidence uploads.";
    alert.classList.remove("critical");
    alert.hidden = false;
  } else {
    alert.textContent = "";
    alert.classList.remove("critical");
    alert.hidden = true;
  }
}

async function loadCloudCases() {
  if (!user) return;
  status("Loading your private cases…", "SYNCING");
  const { data, error } = await client.from("diagnostic_cases")
    .select("id,title,status,raw_case,submitted_at,created_at")
    .order("submitted_at", { ascending: false });
  if (error) { status(error.message, "ERROR"); return; }
  cloudRows = data || [];
  renderCloudCases();
  status(cloudRows.length + " private case(s) in your vault. New saves sync automatically.", "CONNECTED");
  await loadStorageUsage();
}
function renderCloudCases() {
  const box = $("cloudCases");
  const query = ($("cloudCaseSearch")?.value || "").toLowerCase().trim();
  const visibleRows = cloudRows.filter(row => { const raw = row.raw_case || {}; const faultText = Object.values(raw.entries || {}).flatMap(entry => entry.faultCodes || []).map(f => [f.code, f.controller, f.status].join(" ")).join(" "); return !query || [row.title, raw.complaint, raw.workflowId, faultText, JSON.stringify(raw.vehicle || {})].join(" ").toLowerCase().includes(query); });
  if (!visibleRows.length) {
    box.innerHTML = '<p class="small">' + (cloudRows.length ? 'No private cases match this search.' : 'Your cloud vault is empty. Sync a local case to start.') + '</p>';
    return;
  }
  box.innerHTML = visibleRows.map(row => {
    const raw = row.raw_case || {};
    const vehicle = titleFor(raw);
    const faults = Object.values(raw.entries || {}).flatMap(entry => entry.faultCodes || []).map(f => f.code).filter(Boolean);
    return '<article class="case-card"><div class="case-card-head"><b>' + esc(row.title || vehicle) + '</b><span class="case-status">' + esc(row.status) + '</span></div><p>' + esc(raw.complaint || "No complaint recorded") + '</p>' + (faults.length ? '<p><b>Faults:</b> ' + esc(faults.join(", ")) + '</p>' : '') + '<div class="case-actions"><button class="btn primary" data-open-cloud="' + esc(row.id) + '">Open case</button><button class="btn" data-attach="' + esc(row.id) + '">Manage evidence</button><button class="btn" data-share-case="' + esc(row.id) + '">Share entire case</button></div></article>';
  }).join("");
  box.querySelectorAll("[data-open-cloud]").forEach(button => button.addEventListener("click", () => {
    const row = cloudRows.find(item => item.id === button.dataset.openCloud);
    if (!row) return;
    const raw = row.raw_case || {};
    if (raw.product === "IronKnuckle WiringHound" || raw.workflowId === "j1939_network") {
      sessionStorage.setItem("ironknuckle.open-cloud-case", JSON.stringify({ cloudId: row.id, raw }));
      window.location.href = "./wiringhound.html?cloudCase=" + encodeURIComponent(row.id);
      return;
    }
    if (location.pathname.endsWith("/case-vault.html")) {
      window.location.href = "./diagnostics.html?cloudCase=" + encodeURIComponent(row.id);
      return;
    }
    window.dispatchEvent(new CustomEvent("ironknuckle:open-case", { detail: { cloudId: row.id, raw } }));
    document.getElementById("work")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
  box.querySelectorAll("[data-share-case]").forEach(button => button.addEventListener("click", () => shareEntireCase(button.dataset.shareCase, button)));
  box.querySelectorAll("[data-attach]").forEach(button => button.addEventListener("click", () => {
    selectedCloudCase = cloudRows.find(row => row.id === button.dataset.attach) || null;
    $("attachTarget").textContent = selectedCloudCase ? selectedCloudCase.title : "Choose a cloud case.";
    $("attachmentList").innerHTML = '<p class="small">Loading evidence files…</p>';
    loadAttachments();
    $("cloudAttach").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }));
}
async function syncLocalCases() {
  if (!user) return;
  const local = localCases();
  if (!local.length) { status("No local cases found in this browser to sync.", "CONNECTED"); return; }
  const map = caseMap();
  let saved = 0, failed = 0;
  status("Uploading " + local.length + " older local case(s)…", "SYNCING");
  for (const raw of local) {
    try {
      let cloudId = map[raw.id];
      const payload = {
        owner_id: user.id,
        title: titleFor(raw),
        status: ["draft","submitted","in_review","reviewed","archived"].includes(raw.status) ? raw.status : "submitted",
        raw_case: createCaseRecord(raw, "diagnostic_command_center"),
        updated_at: new Date().toISOString()
      };
      let result;
      if (cloudId) {
        result = await client.from("diagnostic_cases").update(payload).eq("id", cloudId).select("id").single();
      } else {
        result = await client.from("diagnostic_cases").insert(payload).select("id").single();
      }
      if (result.error) throw result.error;
      map[raw.id] = result.data.id;
      saved++;
    } catch (error) {
      failed++;
      console.error("IronKnuckle case sync failed:", raw.id, error);
    }
  }
  saveCaseMap(map);
  await loadCloudCases();
  status(saved + " older case(s) uploaded" + (failed ? "; " + failed + " failed." : ".") + " Local copies were kept.", failed ? "PARTIAL" : "CONNECTED");
}

function cloudStatus(raw) {
  const s = String(raw?.status || "in-progress");
  if (s === "confirmed") return "reviewed";
  if (s === "needs-more-evidence") return "in_review";
  if (s === "ready-for-review") return "submitted";
  if (s === "archived") return "archived";
  return "draft";
}
const saveQueues = new Map();
async function saveCase(raw) {
  if (!user || !raw?.id) return;
  const previous = saveQueues.get(raw.id) || Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    const map = caseMap();
    const payload = {
      owner_id: user.id,
      title: titleFor(raw),
      status: cloudStatus(raw),
      raw_case: raw,
      updated_at: new Date().toISOString()
    };
    let cloudId = map[raw.id];
    let result;
    if (cloudId) {
      result = await client.from("diagnostic_cases").update(payload).eq("id", cloudId).select("id").maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) { delete map[raw.id]; cloudId = null; }
    }
    if (!cloudId) {
      result = await client.from("diagnostic_cases").insert(payload).select("id").single();
      if (result.error) throw result.error;
      map[raw.id] = result.data.id;
      saveCaseMap(map);
    }
    status("Case saved to your private cloud. Your browser copy is kept.", "CONNECTED");
    await loadCloudCases();
  }).catch(error => {
    console.error("IronKnuckle automatic cloud save failed:", error);
    status("Saved on this browser. Cloud save needs attention: " + (error.message || "connection issue"), "LOCAL SAVE");
  }).finally(() => {
    if (saveQueues.get(raw.id) === next) saveQueues.delete(raw.id);
  });
  saveQueues.set(raw.id, next);
  return next;
}
window.IronKnuckleCloud = { saveCase, getCases: () => cloudRows.map(row => row.raw_case ? { ...row.raw_case, cloudId: row.id } : null).filter(Boolean) };

async function shareEntireCase(caseId, button) {
  if (!user || !caseId) return;
  const originalText = button?.textContent || "Share entire case";
  if (button) { button.disabled = true; button.textContent = "Preparing case…"; }
  status("Collecting the case record and original evidence files…", "PREPARING");

  const safeBaseName = value => String(value || "ironknuckle-case")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "ironknuckle-case";

  try {
    const { data: caseRecord, error: caseError } = await client.from("diagnostic_cases")
      .select("id,title,status,raw_case,submitted_at,created_at,updated_at,complaint,vehicle_context,fault_codes,tests_performed,confirmed_root_cause,repair_performed,verification_result,verification_notes,verified_at,technician_confidence")
      .eq("id", caseId).single();
    if (caseError) throw caseError;

    const { data: attachments, error: attachmentError } = await client.from("case_attachments")
      .select("id,storage_path,original_name,mime_type,size_bytes,category,created_at")
      .eq("case_id", caseId).eq("owner_id", user.id).order("created_at", { ascending: true });
    if (attachmentError) throw attachmentError;

    const packageName = safeBaseName(caseRecord.title || caseId);
    const attachmentManifest = (attachments || []).map(file => ({
      id: file.id,
      name: file.original_name,
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
      category: file.category,
      createdAt: file.created_at
    }));
    const casePackage = {
      product: "IronKnuckle Diagnostics",
      exportedAt: new Date().toISOString(),
      case: caseRecord,
      attachments: attachmentManifest,
      note: "Original evidence files are included alongside this case record."
    };
    const files = [new File([JSON.stringify(casePackage, null, 2)], packageName + "-case.json", {
      type: "application/json",
      lastModified: Date.now()
    })];

    for (const attachment of attachments || []) {
      status("Downloading private evidence: " + attachment.original_name, "PREPARING FILES");
      const { data: blob, error: downloadError } = await client.storage.from(BUCKET).download(attachment.storage_path);
      if (downloadError || !blob) {
        throw new Error("Could not retrieve evidence file " + attachment.original_name + (downloadError?.message ? ": " + downloadError.message : "."));
      }
      files.push(new File([blob], attachment.original_name, {
        type: attachment.mime_type || blob.type || "application/octet-stream",
        lastModified: attachment.created_at ? new Date(attachment.created_at).getTime() : Date.now()
      }));
    }

    const shareText = "IronKnuckle diagnostic case: " + (caseRecord.title || "Untitled case") +
      ". Includes the case record and " + (attachments?.length || 0) + " original evidence file(s).";
    if (navigator.share && navigator.canShare?.({ files })) {
      try {
        await navigator.share({
          files,
          title: "IronKnuckle diagnostic case",
          text: shareText
        });
        status("Case record and " + (attachments?.length || 0) +
          " original evidence file(s) sent to the share sheet. Choose ChatGPT to attach them to your conversation.", "READY TO SHARE");
        return;
      } catch (shareError) {
        if (shareError?.name === "AbortError") {
          status("Share cancelled. Your case and evidence remain safely stored in your private vault.", "CANCELLED");
          return;
        }
        console.warn("Direct evidence sharing was unavailable; using secure-link fallback:", shareError);
      }
    }

    status("This browser cannot share files directly. Preparing the secure case link instead…", "LINK FALLBACK");
    const { data, error } = await client.functions.invoke("share-case", { body: { caseId } });
    if (error) throw error;
    const shareUrl = data?.url;
    if (!shareUrl || !shareUrl.startsWith(SUPABASE_URL + "/functions/v1/share-case?token=")) {
      throw new Error("The secure share link was not returned.");
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: "IronKnuckle diagnostic case",
          text: shareText + " The secure link expires in 24 hours.",
          url: shareUrl
        });
        status("Secure case link shared. It expires in 24 hours.", "READY TO SHARE");
      } catch (shareError) {
        if (shareError?.name === "AbortError") {
          status("Share cancelled. Your case and evidence remain safely stored in your private vault.", "CANCELLED");
          return;
        }
        throw shareError;
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      status("Secure case link copied. It expires in 24 hours.", "LINK COPIED");
    }
  } catch (error) {
    console.error("IronKnuckle complete case share failed:", error);
    status("Could not prepare the case share: " + (error.message || "Please try again."), "ERROR");
  } finally {
    if (button) { button.disabled = false; button.textContent = originalText; }
  }
}

async function loadAttachments() {
  if (!selectedCloudCase || !user) return;
  const { data, error } = await client.from("case_attachments")
    .select("id,storage_path,original_name,mime_type,size_bytes,category,created_at")
    .eq("case_id", selectedCloudCase.id).order("created_at", { ascending: false });
  if (error) { $("attachmentList").textContent = error.message; return; }
  const box = $("attachmentList");
  if (!data?.length) { box.innerHTML = '<p class="small">No evidence files attached yet.</p>'; return; }
  box.innerHTML = data.map(file => '<article class="case-card"><b>' + esc(file.original_name) + '</b><p>' + esc(file.category) + ' · ' + Math.ceil((file.size_bytes || 0) / 1024) + ' KB</p><div class="case-actions"><button class="btn" data-view="' + esc(file.id) + '">View file</button><button class="btn" data-download="' + esc(file.id) + '">Download</button><button class="btn primary" data-share="' + esc(file.id) + '">Copy file link</button></div></article>').join("");
  box.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", async () => {
    const file = data.find(item => item.id === button.dataset.view);
    const { data: signed, error: viewError } = await client.storage.from(BUCKET).createSignedUrl(file.storage_path, 60);
    if (viewError) { status("File preview failed: " + viewError.message, "ERROR"); return; }
    window.open(signed.signedUrl, "_blank", "noopener");
  }));
  box.querySelectorAll("[data-download]").forEach(button => button.addEventListener("click", async () => {
    const file = data.find(item => item.id === button.dataset.download);
    const { data: blob, error: downloadError } = await client.storage.from(BUCKET).download(file.storage_path);
    if (downloadError) { alert("Download failed: " + downloadError.message); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = file.original_name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }));
  box.querySelectorAll("[data-share]").forEach(button => button.addEventListener("click", async () => {
    const file = data.find(item => item.id === button.dataset.share);
    if (!file) return;
    status("Preparing a temporary ChatGPT link…", "SHARING");
    const { data: signed, error: shareError } = await client.storage.from(BUCKET)
      .createSignedUrl(file.storage_path, 86400);
    if (shareError) { status("Share link failed: " + shareError.message, "ERROR"); return; }
    const shareUrl = signed.signedUrl;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(shareUrl);
      status("Temporary file link copied. It expires in 24 hours.", "LINK COPIED");
    } catch {
      window.prompt("Copy this temporary file link. It expires in 24 hours:", shareUrl);
      status("Temporary link created. It expires in 24 hours.", "LINK READY");
    }
  }));
}
async function uploadEvidence() {
  if (!user || !selectedCloudCase) { alert("Choose a cloud case first."); return; }
  const file = $("attachmentFile").files?.[0];
  if (!file) { alert("Choose a file first."); return; }
  if (file.size > 25 * 1024 * 1024) { alert("This file is larger than the 25 MB limit."); return; }
  const allowed = ["image/jpeg","image/png","image/webp","application/pdf","text/plain","application/json"];
  if (!allowed.includes(file.type)) { alert("That file type is not allowed. Use JPG, PNG, WebP, PDF, TXT or JSON."); return; }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "evidence";
  const path = user.id + "/" + selectedCloudCase.id + "/" + crypto.randomUUID() + "-" + safeName;
  status("Uploading evidence privately…", "UPLOADING");
  const { error: uploadError } = await client.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) { status(uploadError.message, "ERROR"); return; }
  const { error: rowError } = await client.from("case_attachments").insert({
    case_id: selectedCloudCase.id, owner_id: user.id, storage_path: path,
    original_name: file.name, mime_type: file.type, size_bytes: file.size,
    category: $("attachmentCategory").value
  });
  if (rowError) {
    await client.storage.from(BUCKET).remove([path]);
    status("File upload metadata failed; uploaded object was rolled back: " + rowError.message, "ERROR");
    return;
  }
  $("attachmentFile").value = "";
  await loadAttachments();
  await loadStorageUsage();
  status("Evidence uploaded to your private vault.", "CONNECTED");
}
async function init() {
  const { data: { session } } = await client.auth.getSession();
  user = session?.user || null;
  if (user) {
    showSignedIn();
    await loadCloudCases();
    const requestedCase = new URLSearchParams(location.search).get("cloudCase");
    if (requestedCase && location.pathname.endsWith("/diagnostics.html")) {
      const row = cloudRows.find(item => item.id === requestedCase);
      if (row?.raw_case) window.dispatchEvent(new CustomEvent("ironknuckle:open-case", { detail: { cloudId: row.id, raw: row.raw_case } }));
    }
  } else { showSignedOut(); status("Sign in to access your private cross-device case vault.", "OFFLINE"); }
  client.auth.onAuthStateChange((_event, sessionNow) => {
    user = sessionNow?.user || null;
    if (user) { showSignedIn(); loadCloudCases(); }
    else { showSignedOut(); status("Signed out. Local cases remain on this browser.", "OFFLINE"); }
  });
}
$("cloudSignIn").addEventListener("click", async () => {
  const email = $("cloudEmail").value.trim();
  if (!email) { alert("Enter your authorized account email."); return; }
  status("Sending secure sign-in link…", "SENDING");
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: location.href.split("#")[0].split("?")[0] }
  });
  status(error ? error.message : "Check your email for the one-time sign-in link. New account creation is disabled.", error ? "ERROR" : "EMAIL SENT");
});
$("cloudSignOut").addEventListener("click", async () => {
  const { error } = await client.auth.signOut();
  if (error) status(error.message, "ERROR");
});
$("cloudSync").addEventListener("click", syncLocalCases);
$("cloudRefresh").addEventListener("click", loadCloudCases);
$("cloudCaseSearch").addEventListener("input", renderCloudCases);
$("uploadEvidence").addEventListener("click", uploadEvidence);
init().catch(error => status(error.message || String(error), "ERROR"));
