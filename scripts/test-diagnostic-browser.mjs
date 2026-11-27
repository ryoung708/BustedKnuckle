import assert from "node:assert/strict";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile,mkdir } from "node:fs/promises";
import { resolve,extname,sep } from "node:path";
const root=process.cwd();
const mime={".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png"};
const server=createServer(async(req,res)=>{
 try{
  const file=resolve(root,"."+decodeURIComponent(new URL(req.url,"http://localhost").pathname));
  if(!file.startsWith(root+sep))throw Error("Invalid path");
  const bytes=await readFile(file);res.writeHead(200,{"Content-Type":mime[extname(file)]||"application/octet-stream"});res.end(bytes);
 }catch{res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,"127.0.0.1",r));
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true});
await mkdir("browser-evidence",{recursive:true});
const stub='export const supabase={auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},rpc:async()=>({data:[],error:null})}; export const SUPABASE_URL="https://example.invalid";export const SUPABASE_PUBLISHABLE_KEY="test";';
try{
 for(const [name,viewport] of [["desktop",{width:1440,height:900}],["mobile",{width:390,height:844}]]){
  const context=await browser.newContext({viewport,isMobile:name==="mobile",hasTouch:name==="mobile"});
  await context.route("**/*",route=>{
   const url=new URL(route.request().url());
   if(url.origin!==origin)return route.abort();
   if(url.pathname==="/js/supabase-client.js")return route.fulfill({contentType:"text/javascript",body:stub});
   return route.continue();
  });
  const page=await context.newPage(),errors=[];
  page.on("pageerror",error=>errors.push(error.message));page.on("dialog",dialog=>dialog.accept());
  page.setDefaultTimeout(10000);
  async function title(selector,pattern){await page.locator(selector).waitFor({state:"visible"});assert.match(await page.locator(selector).innerText(),pattern);}
  async function screen(label,selector){
   await page.locator(selector).scrollIntoViewIfNeeded();
   const dimensions=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,body:document.body.scrollWidth}));
   assert.ok(dimensions.body<=dimensions.viewport+2,JSON.stringify(dimensions));
   const box=await page.locator(selector).boundingBox();assert.ok(box&&box.x>=-1&&box.x+box.width<=viewport.width+1,"Control outside viewport: "+selector);
   await page.screenshot({path:"browser-evidence/"+name+"-"+label+".png"});
  }
  async function dcc(choice,expected){await page.getByLabel(choice,{exact:true}).check();await page.locator("#next").click();await title(".step-focus h2",expected);}
  async function wh(index,expected){await page.locator('[data-observation="'+index+'"]').click();await page.locator("#nextStep").click();await title(".step-title",expected);}
  try{
   await page.goto(origin+"/diagnostics.html");
   await page.locator('#workflow option[value="crank_no_start"]').waitFor({state:"attached"});
   await page.locator("#complaint").fill("No crank; starter does not engage");
   await page.locator("#vin").fill("654321");
   await page.locator("#intakeFaultCodes").fill("P016F00");
   await page.locator("#start").click();
   await page.getByRole("button",{name:"Use transferred case details"}).click();
   assert.equal(new URL(page.url()).search,"?handoff=1");
   assert.equal(await page.locator("#vin").inputValue(),"654321");
   assert.equal(await page.locator("#complaint").inputValue(),"No crank; starter does not engage");
   await page.locator("#startCase").click();
   await title(".step-title",/What happens when you request a start/i);
   await page.getByText("Transferred findings — Diagnostic Command Center",{exact:true}).click();
   assert.ok(await page.getByText("Previous scan: P016F00",{exact:false}).isVisible());
   await page.goto(origin+"/diagnostics.html");
   await page.locator('#workflow option[value="crank_no_start"]').waitFor({state:"attached"});
   for(const [id,value] of Object.entries({year:"2020",make:"Mack",model:"Anthem",engine:"MP8",vin:"123456",complaint:"Cranks but will not start"}))await page.locator("#"+id).fill(value);
   await page.locator("#workflow").selectOption("crank_no_start");await page.locator("#start").click();
   await title(".step-focus h2",/Scan all relevant/i);
   await dcc("No relevant faults found",/start authorization/i);
   await screen("dcc-authorization",".choice-list");
   await page.locator("#next").click();
   await title(".step-focus h2",/start authorization/i);
   assert.ok(await page.getByText("Stage saved as incomplete.",{exact:false}).isVisible());
   await dcc("Start enable missing",/Isolate the start inhibit/i);
   await dcc("Inhibit cause corrected",/start authorization/i);
   await dcc("Enable and sync appear valid",/fuel supply/i);
   await dcc("Fuel supply meets specification",/injection delivery/i);
   await dcc("Injection delivery and authorization meet OEM criteria",/air, exhaust/i);
   await dcc("Concern isolated and corrected; prerequisites now pass",/Confirm root cause/i);
   await page.locator("#saveOutcome").waitFor({state:"visible"});
   await page.reload();
   await page.locator(".library-panel > summary").click();
   await page.locator("[data-open]").first().click();
   await title(".step-focus h2",/Confirm root cause/i);
   await page.locator("[data-ik-handoff]").click();
   await page.getByRole("button",{name:"Use transferred case details"}).click();
   assert.equal(await page.locator("#vin").inputValue(),"123456");
   await page.locator("#complaint").fill("Fuel pressure sensor circuit short");
   await page.locator("#startCase").click();
   await title(".step-title",/Identify the sensor/i);
   assert.equal(await page.locator("#observation").inputValue(),"");
   assert.ok(await page.getByText("Transferred findings — Diagnostic Command Center",{exact:true}).isVisible());
   await wh(0,/sensor supply and return/i);
   await screen("wh-sensor",'[data-observation="0"]');
   await page.locator("#workflowSelect").evaluate(el=>{el.value="light_inop";el.dispatchEvent(new Event("change"));});
   await title(".step-title",/sensor supply and return/i);
   await wh(1,/Isolate the supply or return/i);
   await wh(0,/sensor supply and return/i);
   await wh(0,/signal and scan data/i);
   await page.locator('[data-observation="-1"]').click();await page.locator("#nextStep").click();
   await title(".step-title",/signal and scan data/i);
   assert.equal(errors.length,0,errors.join("\n"));
   console.log("PASS "+name+" DCC branching, blank-result hold, intake and saved handoffs, active workflow isolation and sensor retest");
  }catch(error){await page.screenshot({path:"browser-evidence/"+name+"-failure.png",fullPage:true});throw error;}
  finally{await context.close();}
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
