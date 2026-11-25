import { parseDuckDuckGoResults, parseBingRssResults, dedupeSearchResults } from "./search-parser.js";
const allowedOrigin = "https://ryoung708.github.io";
const corsHeaders = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const recentRequests = new Map<string, number[]>();
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
async function searchDuckDuckGo(query: string) {
  try {
    const response = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; IronKnucklePublicSourceFinder/1.1)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { provider: "DuckDuckGo HTML", query, ok: false, status: response.status, error: "Provider returned HTTP " + response.status, results: [] };
    const html = await response.text();
    const results = parseDuckDuckGoResults(html, query);
    if (!results.length && /anomaly-modal|captcha|unusual traffic|bot challenge/i.test(html))
      return { provider: "DuckDuckGo HTML", query, ok: false, status: response.status, error: "Provider challenge or anti-bot response", results: [] };
    return { provider: "DuckDuckGo HTML", query, ok: true, status: response.status, results };
  } catch (error) {
    return { provider: "DuckDuckGo HTML", query, ok: false, error: String(error?.message || error), results: [] };
  }
}
async function searchBingRss(query: string) {
  try {
    const response = await fetch("https://www.bing.com/search?format=rss&q=" + encodeURIComponent(query), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; IronKnucklePublicSourceFinder/1.1)", "Accept": "application/rss+xml, application/xml, text/xml" },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { provider: "Bing RSS", query, ok: false, status: response.status, error: "Provider returned HTTP " + response.status, results: [] };
    const xml = await response.text();
    const results = parseBingRssResults(xml, query);
    if (!results.length && !/<(?:rss|feed)\b/i.test(xml))
      return { provider: "Bing RSS", query, ok: false, status: response.status, error: "Provider response was not recognizable RSS/XML", results: [] };
    return { provider: "Bing RSS", query, ok: true, status: response.status, results };
  } catch (error) {
    return { provider: "Bing RSS", query, ok: false, error: String(error?.message || error), results: [] };
  }
}
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST for public bulletin discovery." }, 405);
  const origin = req.headers.get("origin");
  if (origin && origin !== allowedOrigin) return json({ error: "Origin not allowed." }, 403);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (recentRequests.get(ip) || []).filter(t => now - t < 60_000);
  if (recent.length >= 12) return json({ error: "Search limit reached. Wait a minute before trying again." }, 429);
  recent.push(now); recentRequests.set(ip, recent);
  try {
    const body = await req.json();
    const manufacturer = String(body.manufacturer || "").trim().slice(0, 50);
    const code = String(body.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
    const model = String(body.model || "").trim().slice(0, 70);
    const year = String(body.year || "").trim().replace(/[^0-9]/g, "").slice(0, 4);
    if (!manufacturer || !code) return json({ error: "Manufacturer and fault code are required." }, 400);
    const vehicle = [year, manufacturer, model].filter(Boolean).join(" ");
    const hyphenatedCode = code.replace(/^([A-Z]\d{3}[A-Z])(\d{2})$/, "$1-$2");
    const queries = [...new Set([
      [vehicle, code, "service bulletin OR CBR"].filter(Boolean).join(" "),
      [manufacturer, hyphenatedCode, "technical service bulletin OR CBR"].join(" "),
      ["site:oemdtc.com/tsb", manufacturer, code].join(" "),
      ["site:static.nhtsa.gov/odi/tsbs", manufacturer, code].join(" "),
    ])];
    const providerRuns = await Promise.all(queries.flatMap(query => [searchDuckDuckGo(query), searchBingRss(query)]));
    const results = dedupeSearchResults(providerRuns.map(run => run.results));
    const successfulRequests = providerRuns.filter(run => run.ok).length;
    const providerDiagnostics = ["DuckDuckGo HTML", "Bing RSS"].map(provider => {
      const runs = providerRuns.filter(run => run.provider === provider);
      return {
        provider,
        attempted: runs.length,
        successful: runs.filter(run => run.ok).length,
        resultCount: runs.reduce((sum, run) => sum + run.results.length, 0),
        errors: runs.filter(run => !run.ok).map(run => run.error).filter(Boolean).slice(0, 3),
      };
    });
    const searchStatus = results.length ? "results" : successfulRequests ? "no-results" : "provider-unavailable";
    console.log(JSON.stringify({ event: "public-oem-search", manufacturer, code, searchStatus, resultCount: results.length, providerDiagnostics }));
    return json({
      manufacturer, code, vehicle, results,
      searchedAt: new Date().toISOString(),
      searchProvider: "DuckDuckGo HTML + Bing RSS",
      searchStatus,
      providerDiagnostics,
      notice: "Discovery results only. Open each source and verify document contents, revision and exact vehicle applicability before using any procedure. Search snippets are not diagnostic evidence.",
      fallbackSearchUrl: "https://www.google.com/search?q=" + encodeURIComponent(queries[0]),
    });
  } catch (error) {
    console.error("Public OEM source search failed", error);
    return json({ error: "Public source search failed.", detail: String(error?.message || error) }, 502);
  }
});
