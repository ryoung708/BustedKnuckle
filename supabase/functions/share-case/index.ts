import { createClient } from "npm:@supabase/supabase-js@2.81.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BUCKET = "ironknuckle-case-files";
const SHARE_TTL_SECONDS = 24 * 60 * 60;
const FILE_TTL_SECONDS = 60 * 60;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Cache-Control": "no-store",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function escapeHtml(value: unknown): string {
  const replacements: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, char => replacements[char] ?? char);
}

function htmlReport(payload: {
  product: string;
  shareCreatedAt: string;
  expiresAt: string;
  case: Record<string, unknown>;
  attachments: Array<Record<string, unknown>>;
  instructions: string;
}) {
  const caseData = payload.case;
  const raw = (caseData.raw_case && typeof caseData.raw_case === "object")
    ? caseData.raw_case as Record<string, unknown>
    : {};
  const title = String(caseData.title || raw.title || "Diagnostic case");
  const complaint = String(caseData.complaint || raw.complaint || "");
  const evidence = payload.attachments.map((file, index) => {
    const url = typeof file.url === "string" ? file.url : "";
    const name = escapeHtml(file.name || "Evidence file " + (index + 1));
    const type = String(file.mimeType || "");
    const link = url
      ? '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + name + '</a>'
      : '<span>' + name + ' — temporarily unavailable</span>';
    const preview = url && type.startsWith("image/")
      ? '<p><img src="' + escapeHtml(url) + '" alt="' + name + '" style="max-width:100%;height:auto;border:1px solid #bbb;border-radius:8px"></p>'
      : url && type === "application/pdf"
        ? '<p><a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">Open PDF evidence</a></p>'
        : "";
    return '<li><strong>' + name + '</strong><br><small>' +
      escapeHtml(type || "File") + " · " +
      escapeHtml(file.category || "Evidence") + " · " +
      escapeHtml(file.sizeBytes || "Size unavailable") +
      '</small><p>' + link + '</p>' + preview + '</li>';
  }).join("");

  const fields = [
    ["Status", caseData.status],
    ["Complaint", complaint],
    ["Vehicle context", caseData.vehicle_context],
    ["Fault codes", caseData.fault_codes],
    ["Tests performed", caseData.tests_performed],
    ["Confirmed root cause", caseData.confirmed_root_cause],
    ["Repair performed", caseData.repair_performed],
    ["Verification result", caseData.verification_result],
    ["Verification notes", caseData.verification_notes],
    ["Technician confidence", caseData.technician_confidence],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");
  const fieldMarkup = fields.map(([label, value]) =>
    '<section><h2>' + escapeHtml(label) + '</h2><pre>' +
    escapeHtml(typeof value === "string" ? value : JSON.stringify(value, null, 2)) +
    '</pre></section>'
  ).join("");
  const jsonDump = escapeHtml(JSON.stringify(payload, null, 2));

  const page = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="no-referrer">
<title>${escapeHtml(title)} · IronKnuckle Diagnostics</title>
<style>
:root{color-scheme:light}body{font:16px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;max-width:900px;margin:0 auto;padding:20px;color:#20252b;background:#f5f6f7}
header,section,.evidence,.raw{background:#fff;border:1px solid #d9dde1;border-radius:10px;padding:16px;margin:0 0 14px}
h1{font-size:1.5rem;margin:0 0 8px}h2{font-size:1rem;margin:0 0 8px;color:#39434d}
p{white-space:pre-wrap}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.5 ui-monospace,monospace;margin:0}
a{color:#075eaa;overflow-wrap:anywhere}li{margin:0 0 18px}small,.muted{color:#59636e}
summary{cursor:pointer;font-weight:600}img{max-height:700px;object-fit:contain}
</style>
</head>
<body>
<header><h1>IronKnuckle Diagnostics — Shared Case</h1>
<p><strong>${escapeHtml(title)}</strong></p>
<p class="muted">Read-only share · Expires ${escapeHtml(payload.expiresAt)} · ${payload.attachments.length} evidence file(s)</p>
<p><strong>Technician complaint:</strong> ${escapeHtml(complaint || "Not recorded")}</p></header>
${fieldMarkup}
<section class="evidence"><h2>Attached evidence</h2>
${evidence ? "<ol>" + evidence + "</ol>" : "<p>No evidence files are attached to this case.</p>"}
<p class="muted">${escapeHtml(payload.instructions)}</p></section>
<section class="raw"><details><summary>Complete case package (machine-readable JSON)</summary><pre>${jsonDump}</pre></details></section>
</body></html>`;
  return new Response(page, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src https:; frame-src https:; base-uri 'none'; form-action 'none'; object-src 'none'",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer",
    },
  });
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function getAdmin() {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Server configuration is incomplete.");
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = getAdmin();

    if (req.method === "POST") {
      const authorization = req.headers.get("Authorization") ?? "";
      const jwt = authorization.replace(/^Bearer\s+/i, "");
      if (!jwt || jwt === authorization) return json({ error: "Sign in to share a case." }, 401);

      const { data: authData, error: authError } = await admin.auth.getUser(jwt);
      if (authError || !authData.user) return json({ error: "Your sign-in session is invalid. Please sign in again." }, 401);

      const body = await req.json().catch(() => ({}));
      const caseId = String(body?.caseId ?? "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(caseId)) {
        return json({ error: "A valid case ID is required." }, 400);
      }

      const { data: caseRow, error: caseError } = await admin
        .from("diagnostic_cases")
        .select("id,owner_id,title,status,raw_case,submitted_at,created_at,updated_at,complaint,vehicle_context,fault_codes,tests_performed,confirmed_root_cause,repair_performed,verification_result,verification_notes,verified_at,technician_confidence")
        .eq("id", caseId)
        .eq("owner_id", authData.user.id)
        .maybeSingle();

      if (caseError) throw caseError;
      if (!caseRow) return json({ error: "That case was not found in your private vault." }, 404);

      const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
      const token = base64Url(tokenBytes);
      const tokenHash = await hashToken(token);
      const expiresAt = new Date(Date.now() + SHARE_TTL_SECONDS * 1000).toISOString();

      await admin.from("ironknuckle_case_shares").delete().lt("expires_at", new Date().toISOString());
      const { error: insertError } = await admin.from("ironknuckle_case_shares").insert({
        token_hash: tokenHash,
        case_id: caseId,
        owner_id: authData.user.id,
        expires_at: expiresAt,
      });
      if (insertError) throw insertError;

      const { data: attachments, error: attachmentError } = await admin
        .from("case_attachments")
        .select("id")
        .eq("case_id", caseId)
        .eq("owner_id", authData.user.id);

      if (attachmentError) throw attachmentError;

      const shareUrl = SUPABASE_URL + "/functions/v1/share-case?token=" + encodeURIComponent(token) + "&format=html";
      return json({
        url: shareUrl,
        expiresAt,
        attachmentCount: attachments?.length ?? 0,
      });
    }

    if (req.method === "GET") {
      const requestUrl = new URL(req.url);
      const token = requestUrl.searchParams.get("token") ?? "";
      if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return json({ error: "This case-sharing link is invalid or incomplete." }, 400);

      const tokenHash = await hashToken(token);
      const { data: share, error: shareError } = await admin
        .from("ironknuckle_case_shares")
        .select("case_id,owner_id,created_at,expires_at")
        .eq("token_hash", tokenHash)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (shareError) throw shareError;
      if (!share) return json({ error: "This case-sharing link has expired or is no longer available." }, 404);

      const { data: caseRow, error: caseError } = await admin
        .from("diagnostic_cases")
        .select("id,title,status,raw_case,submitted_at,created_at,updated_at,complaint,vehicle_context,fault_codes,tests_performed,confirmed_root_cause,repair_performed,verification_result,verification_notes,verified_at,technician_confidence")
        .eq("id", share.case_id)
        .eq("owner_id", share.owner_id)
        .maybeSingle();

      if (caseError) throw caseError;
      if (!caseRow) return json({ error: "The shared case is no longer available." }, 404);

      const { data: attachments, error: attachmentError } = await admin
        .from("case_attachments")
        .select("id,storage_path,original_name,mime_type,size_bytes,category,created_at")
        .eq("case_id", share.case_id)
        .eq("owner_id", share.owner_id)
        .order("created_at", { ascending: true });

      if (attachmentError) throw attachmentError;

      const evidence = [];
      for (const file of attachments ?? []) {
        const { data: signed, error: signError } = await admin.storage
          .from(BUCKET)
          .createSignedUrl(file.storage_path, FILE_TTL_SECONDS, { download: file.original_name });
        evidence.push({
          id: file.id,
          name: file.original_name,
          mimeType: file.mime_type,
          sizeBytes: file.size_bytes,
          category: file.category,
          createdAt: file.created_at,
          url: signError ? null : signed?.signedUrl ?? null,
          accessError: signError ? "Could not create a temporary link for this file." : undefined,
        });
      }

      const payload = {
        product: "IronKnuckle Diagnostics",
        shareCreatedAt: share.created_at,
        expiresAt: share.expires_at,
        case: caseRow,
        attachments: evidence,
        instructions: "Review the case data and retrieve attached evidence using each evidence link. Evidence links expire one hour after this page is opened.",
      };
      if (requestUrl.searchParams.get("format") === "html") return htmlReport(payload);
      return json(payload);
    }

    return json({ error: "Method not allowed." }, 405);
  } catch (error) {
    console.error("share-case error:", error);
    return json({ error: "The case could not be shared right now. Please try again." }, 500);
  }
});
