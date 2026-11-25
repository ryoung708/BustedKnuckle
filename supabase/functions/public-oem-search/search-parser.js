export function decodeHtml(value=""){
  return String(value).replace(/&amp;/g,"&").replace(/&#x([0-9a-f]+);/gi,(_,hex)=>String.fromCodePoint(parseInt(hex,16)))
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&quot;/g,'"').replace(/&#39;/g,"'")
    .replace(/&lt;/g,"<").replace(/&gt;/g,">");
}
export function cleanText(value=""){
  return decodeHtml(String(value).replace(/<!\[CDATA\[|\]\]>/g,"").replace(/<[^>]*>/g," "))
    .replace(/\s+/g," ").trim();
}
export function unwrapSearchUrl(value=""){
  try{
    const parsed=new URL(decodeHtml(value),"https://html.duckduckgo.com");
    const target=parsed.searchParams.get("uddg")||parsed.searchParams.get("url")||parsed.href;
    const url=new URL(target);
    return url.protocol==="https:"||url.protocol==="http:"?url.href:"";
  }catch{return "";}
}
export function parseDuckDuckGoResults(html="",query=""){
  const results=[];
  const anchors=String(html).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi);
  for(const match of anchors){
    const attrs=match[1]||"";
    if(!/result__a/i.test(attrs))continue;
    const href=attrs.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2]||"";
    const url=unwrapSearchUrl(href);
    if(!url)continue;
    const tail=String(html).slice((match.index||0)+match[0].length,(match.index||0)+match[0].length+1800);
    const snippet=tail.match(/<(?:a|div)[^>]*class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/(?:a|div)>/i)?.[1]||"";
    results.push({title:cleanText(match[2]).slice(0,220),url,snippet:cleanText(snippet).slice(0,420),query,provider:"DuckDuckGo"});
    if(results.length>=8)break;
  }
  return results;
}
export function parseBingRssResults(xml="",query=""){
  const results=[];
  for(const match of String(xml).matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){
    const item=match[1]||"";
    const read=tag=>item.match(new RegExp("<"+tag+"\\b[^>]*>([\\s\\S]*?)</"+tag+">","i"))?.[1]||"";
    const title=cleanText(read("title")),url=unwrapSearchUrl(cleanText(read("link"))),snippet=cleanText(read("description"));
    if(!title||!url)continue;
    results.push({title:title.slice(0,220),url,snippet:snippet.slice(0,420),query,provider:"Bing RSS"});
    if(results.length>=8)break;
  }
  return results;
}
const TECHNICAL_SOURCE_DOMAINS = [
  "nhtsa.gov", "oemdtc.com",
  "macktrucks.com", "volvotrucks.us", "volvo.com",
  "cummins.com", "detroitdiesel.com", "daimlertruck.com",
  "international.com", "navistar.com",
  "freightliner.com", "westernstartrucks.com",
  "peterbilt.com", "kenworth.com", "paccar.com",
  "isuzucv.com", "hino-trucks.com",
  "allisontransmission.com", "eaton.com", "bendix.com",
  "wabco-customercentre.com", "meritor.com"
];
function isTechnicalSourceHost(host=""){
  const normalized=host.toLowerCase().replace(/^www\./,"");
  return TECHNICAL_SOURCE_DOMAINS.some(domain=>normalized===domain||normalized.endsWith("."+domain));
}
function hasFaultCodeEvidence(item, code=""){
  const normalizedCode=String(code).toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(!normalizedCode)return false;
  const baseCode=normalizedCode.replace(/(\d{2})$/,"");
  const haystack=[item.title,item.snippet,item.url].join(" ").toUpperCase().replace(/[^A-Z0-9]/g," ");
  const tokens=haystack.split(/\s+/).filter(Boolean);
  return tokens.some(token=>token===normalizedCode||token===baseCode);
}
export function dedupeSearchResults(groups=[], code=""){
  const seen=new Set(),out=[];
  for(const item of groups.flat()){
    if(!item?.url)continue;
    let host="";try{host=new URL(item.url).hostname.replace(/^www\./,"");}catch{}
    // Only technical-source domains with evidence of the requested fault code qualify.
    if(!isTechnicalSourceHost(host)||!hasFaultCodeEvidence(item,code))continue;
    const canonicalUrl=item.url.split("#")[0];
    if(seen.has(canonicalUrl))continue;
    seen.add(canonicalUrl);
    const sourceType=/nhtsa\.gov$/i.test(host)?"NHTSA-hosted":/oemdtc\.com$/i.test(host)?"Public bulletin index":"Official OEM / supplier source";
    out.push({...item,url:canonicalUrl,host,sourceType});
  }
  return out.slice(0,12);
}
