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
function decode(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function cleanText(value: string) {
  return decode(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}
function unwrapUrl(value: string) {
  const decoded = decode(value);
  try {
    const url = new URL(decoded, "https://html.duckduckgo.com");
    const redirect = url.searchParams.get("uddg");
    const target = redirect ? decodeURIComponent(redirect) : url.href;
    const parsed = new URL(target);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    return parsed.href;
  } catch { return ""; }
}
function parseResults(html: string, query: string) {
  const results: Array<{ title: string; url: string; snippet: string; query: string }> = [];
  const blocks = html.split(/<div[^>]+class=["'][^"']*result[^"']*["'][^>]*>/i).slice(1);
  for (const block of blocks) {
    const link = block.match(/<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<a[^>]+href=["']([^"']+)["'][^>]+class=["'][^"']*result__a[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const url = unwrapUrl(link[1]);
    if (!url) continue;
    const snippetMatch = block.match(/<a[^>]+class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/i)
      || block.match(/<div[^>]+class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    results.push({ title: cleanText(link[2]).slice(0, 220), url, snippet: snippetMatch ? cleanText(snippetMatch[1]).slice(0, 420) : "", query });
    if (results.length >= 8) break;
  }
  return results;
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
    const code = String(body.code || "").trim().toUpperCase().replace(/[^A-Z0-9._-]/g, "").slice(0, 32);
    const model = String(body.model || "").trim().slice(0, 70);
    const year = String(body.year || "").trim().replace(/[^0-9]/g, "").slice(0, 4);
    if (!manufacturer || !code) return json({ error: "Manufacturer and fault code are required." }, 400);
    const vehicle = [year, manufacturer, model].filter(Boolean).join(" ");
    const queries = [
      [vehicle, code, "service bulletin OR CBR OR technical service bulletin"].filter(Boolean).join(" "),
      [manufacturer, code, "site:oemdtc.com"].join(" "),
      [manufacturer, code, "site:nhtsa.gov OR site:static.oemdtc.com"].join(" "),
    ];
    const batches = await Promise.all(queries.map(async query => {
      const url = "https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query);
      try {
        const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; IronKnucklePublicSourceFinder/1.0)" }, signal: AbortSignal.timeout(9000) });
        if (!response.ok) return [];
        return parseResults(await response.text(), query);
      } catch { return []; }
    }));
    const seen = new Set<string>();
    const results = batches.flat().filter(item => {
      if (seen.has(item.url)) return false;
      seen.add(item.url); return true;
    }).slice(0, 12).map(item => {
      let host = "";
      try { host = new URL(item.url).hostname.replace(/^www\./, ""); } catch {}
      return { ...item, host, sourceType: /nhtsa\.gov$/i.test(host) ? "NHTSA-hosted" : /oemdtc\.com$/i.test(host) ? "Public bulletin index" : "Public web result" };
    });
    return json({
      manufacturer, code, vehicle, results,
      searchedAt: new Date().toISOString(),
      searchProvider: "DuckDuckGo HTML public results",
      notice: "Discovery results only. Open the source and verify document contents, revision and vehicle applicability before using any procedure. Search snippets are not diagnostic evidence.",
      fallbackSearchUrl: "https://www.google.com/search?q=" + encodeURIComponent(queries[0]),
    });
  } catch (error) {
    return json({ error: "Public source search failed.", detail: String(error?.message || error) }, 502);
  }
});