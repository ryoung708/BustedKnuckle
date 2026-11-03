import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

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
    return '<article class="case-card"><div class="case-card-head"><b>' + esc(row.title || vehicle) + '</b><span class="case-status">' + esc(row.status) + '</span></div><p>' + esc(raw.complaint || "No complaint recorded") + '</p>' + (faults.length ? '<p><b>Faults:</b> ' + esc(faults.join(", ")) + '</p>' : '') + '<div class="case-actions"><button class="btn" data-attach="' + esc(row.id) + '">Manage evidence</button></div></article>';
  }).join("");
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
        raw_case: raw,
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
window.IronKnuckleCloud = { saveCase };

async function loadAttachments() {
  if (!selectedCloudCase || !user) return;
  const { data, error } = await client.from("case_attachments")
    .select("id,storage_path,original_name,mime_type,size_bytes,category,created_at")
    .eq("case_id", selectedCloudCase.id).order("created_at", { ascending: false });
  if (error) { $("attachmentList").textContent = error.message; return; }
  const box = $("attachmentList");
  if (!data?.length) { box.innerHTML = '<p class="small">No evidence files attached yet.</p>'; return; }
  box.innerHTML = data.map(file => '<article class="case-card"><b>' + esc(file.original_name) + '</b><p>' + esc(file.category) + ' · ' + Math.ceil((file.size_bytes || 0) / 1024) + ' KB</p><div class="case-actions"><button class="btn" data-view="' + esc(file.id) + '">View file</button><button class="btn" data-download="' + esc(file.id) + '">Download</button></div></article>').join("");
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
  status("Evidence uploaded to your private vault.", "CONNECTED");
}
async function init() {
  const { data: { session } } = await client.auth.getSession();
  user = session?.user || null;
  if (user) { showSignedIn(); await loadCloudCases(); }
  else { showSignedOut(); status("Sign in to access your private cross-device case vault.", "OFFLINE"); }
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
