import assert from "node:assert/strict";
import { parseDuckDuckGoResults, parseBingRssResults, dedupeSearchResults } from "../supabase/functions/public-oem-search/search-parser.js";

const ddg = `
<div class="result">
  <a rel="nofollow" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Foemdtc.com%2Ftsb%2F10153480%2F" class="result__a">Mack CBR K01029637</a>
  <a class="result__snippet">Common rail fuel pressure diagnostic bulletin</a>
</div>`;
const ddgResults = parseDuckDuckGoResults(ddg, "Mack P016F00");
assert.equal(ddgResults.length, 1);
assert.equal(ddgResults[0].title, "Mack CBR K01029637");
assert.equal(ddgResults[0].url, "https://oemdtc.com/tsb/10153480/");
assert.match(ddgResults[0].snippet, /Common rail/);

const bing = `<?xml version="1.0"?><rss><channel><item>
<title>Mack Common Rail CBR K40914241</title>
<link>https://static.nhtsa.gov/odi/tsbs/2019/MC-10170139-9999.pdf</link>
<description>Fault family includes P016F and related common rail codes.</description>
</item></channel></rss>`;
const bingResults = parseBingRssResults(bing, "Mack P016F");
assert.equal(bingResults.length, 1);
assert.equal(bingResults[0].provider, "Bing RSS");
assert.match(bingResults[0].url, /MC-10170139/);
assert.match(bingResults[0].snippet, /P016F/);

const combined = dedupeSearchResults([ddgResults, bingResults, ddgResults]);
assert.equal(combined.length, 2);
assert.equal(combined.find(item => item.host === "oemdtc.com").sourceType, "Public bulletin index");
assert.equal(combined.find(item => item.host === "static.nhtsa.gov").sourceType, "NHTSA-hosted");
console.log("Public OEM search parser tests passed.");
