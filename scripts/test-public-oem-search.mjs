import assert from "node:assert/strict";
import { parseDuckDuckGoResults, parseBingRssResults, dedupeSearchResults } from "../supabase/functions/public-oem-search/search-parser.js";

const ddg = `
<div class="result">
  <a rel="nofollow" href="https://duckduckgo.com/l/?uddg=https%3A%2F%2Foemdtc.com%2Ftsb%2F10153480%2F" class="result__a">Mack CBR K01029637</a>
  <a class="result__snippet">Common rail fuel pressure diagnostic bulletin applies to P016F00</a>
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

const irrelevant = [
  { title: "Watch 20/20 Friday Nights", url: "https://abcnews.go.com/2020", snippet: "P016F is not a vehicle service bulletin." },
  { title: "2020 in the United States", url: "https://en.wikipedia.org/wiki/2020_in_the_United_States", snippet: "Events and births." },
  { title: "Mack fuel pressure discussion P016F", url: "https://randomblog.example.com/p016f", snippet: "Forum discussion." },
  { title: "Mack bulletin for P0087", url: "https://oemdtc.com/tsb/999999/", snippet: "Different fault code." },
];
const combined = dedupeSearchResults([ddgResults, bingResults, ddgResults, irrelevant], "P016F00");
assert.equal(combined.length, 2);
assert.equal(combined.find(item => item.host === "oemdtc.com").sourceType, "Public bulletin index");
assert.equal(combined.find(item => item.host === "static.nhtsa.gov").sourceType, "NHTSA-hosted");
assert.equal(combined.some(item => /abcnews|wikipedia|randomblog/.test(item.host)), false);
assert.equal(dedupeSearchResults([ddgResults, bingResults], "P205B64").length, 0);
const official = dedupeSearchResults([[{ title: "Mack service information P016F", url: "https://www.macktrucks.com/support/p016f", snippet: "Official Mack support page for P016F00." }]], "P016F00");
assert.equal(official.length, 1);
assert.equal(official[0].sourceType, "Official OEM / supplier source");
console.log("Public OEM search parser tests passed.");
