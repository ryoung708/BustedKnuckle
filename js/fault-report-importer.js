const PDFJS_URL="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";
const TESSERACT_URL="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js";
const MAX_PDF_PAGES=25;
function normalizeCode(value){return String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"");}
function codeKey(item){return normalizeCode(item.code);}
function sameFault(left,right){const a=codeKey(left),b=codeKey(right);if(!a||a!==b)return false;const lc=String(left.controller||"").trim().toUpperCase(),rc=String(right.controller||"").trim().toUpperCase();return !lc||!rc||lc===rc;}
export function parseFaultReportText(text){
 const lines=String(text||"").replace(/\r/g,"\n").split(/\n+/).map(line=>line.replace(/\s+/g," ").trim()).filter(Boolean);
 const found=new Map();
 const add=(code,codeType,line)=>{
  const normalized=normalizeCode(code);if(!normalized)return;
  const description=line.toUpperCase().replace(String(code).toUpperCase(),"").replace(/^[\s|,:;\-]+|[\s|,:;\-]+$/g,"").trim();
  const prior=found.get(normalized);
  if(prior){if(description.length>prior.description.length)prior.description=description;return;}
  found.set(normalized,{code:String(code).toUpperCase().replace(/\s+/g," ").trim(),codeType,description,sourceLine:line.slice(0,240)});
 };
 for(const line of lines){
  let match;
  const triple=/\b(\d{1,3})\s*\/\s*(\d{1,6})\s*\/\s*(\d{1,2})\b/g;
  while((match=triple.exec(line)))add(match[0],"j1939",line);
  const spn=/\bSPN\s*[:#=-]?\s*(\d{1,6})(?:\s*[,/;| -]?\s*FMI\s*[:#=-]?\s*(\d{1,2}))?\b/gi;
  while((match=spn.exec(line)))add("SPN "+match[1]+(match[2]?" FMI "+match[2]:""),"j1939",line);
  const pcode=/\bP[0-3][0-9A-F]{3}(?:[-_ ]?[0-9A-F]{2})?\b/gi;
  while((match=pcode.exec(line)))add(match[0],"obd2-or-oem",line);
 }
 return [...found.values()];
}
export function findFaultDuplicates(candidates,existing){
 const seen=[...(existing||[])],duplicates=new Set();
 (candidates||[]).forEach((item,index)=>{if(seen.some(prior=>sameFault(item,prior)))duplicates.add(index);else seen.push(item);});
 return duplicates;
}
async function getTesseractWorker(onProgress){
 const module=await import(TESSERACT_URL);
 return module.createWorker("eng",1,{logger:event=>{if(event.status==="recognizing text")onProgress?.("OCR reading report… "+Math.round((event.progress||0)*100)+"%");}});
}
async function recognizeImage(file,onProgress){
 const worker=await getTesseractWorker(onProgress);
 try{const result=await worker.recognize(file);return result.data.text||"";}finally{await worker.terminate();}
}
export async function extractFaultReport(file,{onProgress=()=>{}}={}){
 const name=String(file?.name||"").toLowerCase(),isPdf=file?.type==="application/pdf"||name.endsWith(".pdf");
 if(!isPdf){
  if(!/^image\/(jpeg|png|webp)$/i.test(file?.type||"")&&!/\.(jpe?g|png|webp)$/i.test(name))throw new Error("Use a PDF, JPG, PNG or WebP image.");
  onProgress("Loading browser OCR engine…");return {text:await recognizeImage(file,onProgress),sourceKind:"image OCR"};
 }
 onProgress("Opening PDF locally…");
 const pdfjs=await import(PDFJS_URL);pdfjs.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
 const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
 if(pdf.numPages>MAX_PDF_PAGES)throw new Error("This PDF has "+pdf.numPages+" pages. The first version supports up to "+MAX_PDF_PAGES+" pages per report.");
 const pages=[];let ocrWorker=null;
 try{
  for(let number=1;number<=pdf.numPages;number++){
   onProgress("Reading PDF page "+number+" of "+pdf.numPages+"…");
   const page=await pdf.getPage(number),content=await page.getTextContent(),text=content.items.map(item=>item.str||"").join(" ").trim();
   if(text.length>25){pages.push(text);continue;}
   if(!ocrWorker){onProgress("Scanned PDF detected. Loading OCR engine…");ocrWorker=await getTesseractWorker(onProgress);}
   const viewport=page.getViewport({scale:1.6}),canvas=document.createElement("canvas");canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
   const result=await ocrWorker.recognize(canvas);pages.push(result.data.text||"");canvas.width=0;canvas.height=0;
  }
 }finally{if(ocrWorker)await ocrWorker.terminate();}
 return {text:pages.join("\n"),sourceKind:"PDF text extraction / OCR"};
}
