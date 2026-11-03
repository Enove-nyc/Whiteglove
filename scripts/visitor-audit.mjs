import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const brand=process.env.AUDIT_BRAND;
const origin=brand==='travel'?'https://www.whiteglovekoshertravel.com':'https://www.whitegloveitineraries.com';
const out=`audit-results/${brand}`;mkdirSync(out,{recursive:true});
const report={brand,origin,startedAt:new Date().toISOString(),policy:'Live anonymous GET/HEAD browsing only; non-read requests blocked. No account, payment, email or customer-data writes.',sitemap:[],pages:[],findings:[],blocked:[],scenarios:[]};
const common=['/','/pricing','/about','/contact','/privacy','/terms','/login','/account','/app','/itinerary','/sample-itinerary','/offline'];
const specific=brand==='travel'?['/plan','/book','/destinations','/kosher','/shuls','/mikvaos','/near','/map','/search','/hotels','/things-to-do','/directory','/kosher-travel','/verification','/sources','/travel-gear']:['/advisor','/plan','/book','/forms','/clients','/payments','/pipeline','/library','/packing','/proposal','/command-center'];
const paths=new Set([...common,...specific]);
const browser=await chromium.launch({headless:true});
const api=await browser.newContext();
async function sitemap(url,depth=0){
 if(depth>2)return;
 try{const r=await api.request.get(url,{timeout:20000});const body=await r.text();if(r.status()!==200){report.findings.push({kind:'sitemap-status',url,status:r.status()});return;}
 const locs=[...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1].replaceAll('&amp;','&'));
 for(const loc of locs){if(!loc.startsWith(origin))continue;if(loc.endsWith('.xml'))await sitemap(loc,depth+1);else report.sitemap.push(loc);}
 }catch(e){report.findings.push({kind:'sitemap-unreachable',detail:String(e)});}
}
await sitemap(origin+'/sitemap.xml');
// Inventory every advertised URL at a low, sequential request rate.
for(const url of [...new Set(report.sitemap)]){
 try{const r=await api.request.get(url,{timeout:25000});const text=await r.text();const p=new URL(url).pathname;
 const title=text.match(/<title>([^<]*)<\/title>/)?.[1]??'';
 const record={url,status:r.status(),finalUrl:r.url(),title};
 report.sitemap[report.sitemap.indexOf(url)]=record;
 if(r.status()>=400)report.findings.push({kind:'advertised-page-fails',...record});
 if(/application error|internal server error|something went wrong/i.test(title))report.findings.push({kind:'error-page-title',...record});
 // A representative detail for each data-driven route family, plus all short public paths.
 if(p.split('/').filter(Boolean).length<=1 && paths.size<65)paths.add(p);
 if(/\/(destinations|cemeteries|tzaddikim|heritage\/towns)\//.test(p)){
   const family=p.split('/').slice(0,-1).join('/');
   if(![...paths].some(x=>x.startsWith(family+'/')))paths.add(p);
 }
 }catch(e){report.findings.push({kind:'advertised-page-unreachable',url,detail:String(e).slice(0,150)});}
 await new Promise(r=>setTimeout(r,150));
}
console.log('SITEMAP_CHECKED',brand,report.sitemap.length);
async function dismiss(page){
 await page.evaluate(()=>window.scrollTo(0,680));await page.waitForTimeout(200);
 const dialog=page.getByRole('dialog');
 if(await dialog.count()){
  const close=dialog.getByRole('button',{name:/close|continue|got it|understand/i}).first();
  if(await close.isVisible().catch(()=>false))await close.click({timeout:2000}).catch(()=>{});
  else await page.keyboard.press('Escape');
 }
 await page.evaluate(()=>window.scrollTo(0,0));
}
for(const width of [1280,390]){
 const ctx=await browser.newContext({viewport:{width,height:900},isMobile:width<500,hasTouch:width<500});
 await ctx.route('**/*',async route=>{
  const req=route.request();if(!['GET','HEAD','OPTIONS'].includes(req.method())){
   report.blocked.push({method:req.method(),url:req.url().split('?')[0]});return route.abort('blockedbyclient');
  }return route.continue();
 });
 const page=await ctx.newPage();
 for(const path of paths){
  if(report.pages.length>=140)break;
  const errors=[],bad=[];const onError=e=>errors.push(String(e).slice(0,240));
  const onResponse=r=>{if(r.url().startsWith(origin)&&r.status()>=400)bad.push({status:r.status(),url:r.url().replace(origin,'').split('?')[0]});};
  page.on('pageerror',onError);page.on('response',onResponse);
  const item={path,width};let response;
  try{
   const began=Date.now();response=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForTimeout(1000);await dismiss(page);
   if(await page.locator('[class*="animate-spin"]:visible').count())await page.waitForTimeout(3500);
   item.status=response?.status();item.finalUrl=page.url();item.loadMs=Date.now()-began;item.title=await page.title();
   const data=await page.evaluate(()=>{
    const visible=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';};
    const main=document.querySelector('main')||document.body;
    return {text:main.innerText.slice(0,7500),h1:[...document.querySelectorAll('h1')].map(e=>e.innerText),overflow:document.documentElement.scrollWidth>innerWidth+3,
     overflowElements:[...document.querySelectorAll('body *')].filter(e=>visible(e)&&e.getBoundingClientRect().right>innerWidth+3&&e.getBoundingClientRect().width>40).slice(0,5).map(e=>({tag:e.tagName,class:String(e.className).slice(0,100),text:e.innerText?.slice(0,80)})),
     links:[...main.querySelectorAll('a[href]')].filter(visible).map(e=>({text:e.innerText.trim().slice(0,70),href:e.getAttribute('href')})).slice(0,90),
     nav:[...document.querySelectorAll('nav a[href]')].filter(visible).map(e=>({text:e.innerText.trim().slice(0,60),href:e.getAttribute('href')})).slice(0,50),
     buttons:[...document.querySelectorAll('button')].filter(visible).map(e=>({text:(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,90),type:e.type,disabled:e.disabled,role:e.getAttribute('role')})).slice(0,60),
     inputs:[...document.querySelectorAll('input,select,textarea')].filter(visible).map(e=>({tag:e.tagName,type:e.type,name:e.name,placeholder:e.getAttribute('placeholder'),label:e.getAttribute('aria-label')||[...e.labels||[]].map(l=>l.innerText).join(' ')})),
     brokenImages:[...document.images].filter(e=>visible(e)&&e.getBoundingClientRect().top<innerHeight&&e.complete&&e.naturalWidth===0).map(e=>({src:e.currentSrc,alt:e.alt})),
     loading:[...main.querySelectorAll('*')].filter(e=>visible(e)&&e.children.length===0&&/^loading[….]*$/i.test(e.textContent.trim())).map(e=>e.textContent),
    };
   });Object.assign(item,data);item.errors=errors;item.failedRequests=bad;
   if(item.status>=500)report.findings.push({kind:'page-500',path,width,status:item.status});
   if(item.overflow)report.findings.push({kind:'horizontal-overflow',path,width,elements:item.overflowElements});
   if(item.brokenImages.length)report.findings.push({kind:'broken-visible-image',path,width,images:item.brokenImages});
   if(errors.length)report.findings.push({kind:'javascript-error',path,width,errors});
   if(item.loading.length)report.findings.push({kind:'persistent-loading-candidate',path,width,text:item.loading});
   try{const a11y=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();item.accessibility=a11y.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.slice(0,5).map(n=>({target:n.target,html:n.html.slice(0,220)}))}));}catch(e){item.accessibilityError=String(e).slice(0,150);}
   const shot=['/','/pricing'].includes(path)||width===390&&['/itinerary','/book','/app'].includes(path);
   if(shot){const name=(path==='/'?'home':path.slice(1).replaceAll('/','-'))+'-'+width+'.jpg';const buffer=await page.screenshot({path:out+'/'+name,type:'jpeg',quality:40,fullPage:false});item.screenshot=name;console.log('VISITOR_IMAGE|'+brand+'|'+name+'|'+buffer.toString('base64'));}
  }catch(e){item.error=String(e).slice(0,250);report.findings.push({kind:'browser-navigation-failure',path,width,detail:item.error});}
  report.pages.push(item);page.off('pageerror',onError);page.off('response',onResponse);
  console.log('BROWSER_CHECKED',brand,path,width,item.status,item.error??'');
 }
 await ctx.close();
}
await api.close();await browser.close();
report.finishedAt=new Date().toISOString();
writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
console.log('VISITOR_REPORT_B64|'+brand+'|'+Buffer.from(JSON.stringify(report)).toString('base64'));
console.log('VISITOR_SUMMARY',JSON.stringify({brand,sitemap:report.sitemap.length,pages:report.pages.length,findings:report.findings.length}));
