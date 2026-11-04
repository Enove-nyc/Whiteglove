import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
const isolated=false,brand='travel',origin='https://www.whiteglovekoshertravel.com';
const out='journey-results/homepage-polish';mkdirSync(out,{recursive:true});
const report={scenarios:[],errors:[],accessibility:[]};
const browser=await chromium.launch();let page,fixtureClient=0;
async function scenario(name,fn){try{await fn();report.scenarios.push({name,status:'passed'});}catch(e){const shot=name.replace(/[^a-z0-9]+/gi,'-')+'.jpg';const failureImage=await page?.screenshot({path:out+'/'+shot,fullPage:false,type:'jpeg',quality:65}).catch(()=>null);if(failureImage)console.log('SITE_PREVIEW_IMAGE|'+brand+'|'+shot+'|'+failureImage.toString('base64'));report.scenarios.push({name,status:'failed',error:String(e).slice(0,700),screenshot:shot});}console.log('JOURNEY',name,report.scenarios.at(-1).status);}
async function context(width,height=900){const clientIp='192.0.2.'+(++fixtureClient);const ctx=await browser.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500,extraHTTPHeaders:{'x-wg-brand':brand==='itineraries'?'itineraries':'kosher',...(isolated?{'cf-connecting-ip':clientIp,'x-forwarded-for':clientIp}:{})}});
 await ctx.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(req.url().startsWith(origin+'/api/analytics'))return route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});if(isolated&&!['127.0.0.1','localhost'].includes(u.hostname))return route.abort();if(!isolated&&!['GET','HEAD','OPTIONS'].includes(req.method()))return route.fulfill({status:409,contentType:'application/json',body:'{"error":"Audit blocked this write"}'});return route.continue();});ctx.on('page',p=>p.on('pageerror',e=>report.errors.push({width,url:p.url(),error:String(e)})));return ctx;}
async function go(path){const response=await page.goto(origin+path,{waitUntil:'load',timeout:30000});assert(response.status()<400,path+' HTTP '+response.status());await page.waitForTimeout(800);await page.locator('html').evaluate(()=>scrollTo(0,680));await page.waitForTimeout(150);const close=page.getByRole('dialog').getByRole('button',{name:/close/i});if(await close.isVisible().catch(()=>false))await close.click();else await page.keyboard.press('Escape');await page.locator('html').evaluate(()=>scrollTo(0,0));}
async function scan(path,width){await page.waitForTimeout(350);const r=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();report.accessibility.push({path,width,violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.slice(0,5).map(n=>n.html)}))});}


for(const [width,height] of [[320,667],[390,844],[1280,900]]){
 const ctx=await context(width,height);page=await ctx.newPage();
 await scenario('homepage layout and photo credits '+width,async()=>{
  await go('/');const hero=page.locator('[data-search-photo]');
  assert.equal(await hero.getByRole('button',{name:/^(Next|Play|Pause) background/}).count(),0);
  assert.equal(await hero.getByRole('group',{name:'Background photo controls'}).count(),0);
  assert.equal(await page.locator('main a[href^="/sources#"]').count(),0);
  await hero.locator('img').first().evaluate(img=>img.decode());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.getByRole('navigation',{name:'Footer',exact:true}).getByRole('link',{name:'Sources',exact:true}).waitFor();
  await scan('/',width);
  const shot=await page.screenshot({path:out+'/home-'+width+'.jpg',type:'jpeg',quality:60});
  console.log('SITE_PREVIEW_IMAGE|travel|home-'+width+'.jpg|'+shot.toString('base64'));
 });
 await scenario('search photos cycle automatically without controls and stay still while typing',async()=>{
  await page.clock.install();await go('/');
  const hero=page.locator('[data-search-photo]');
  assert.equal(await hero.getByRole('button').filter({hasText:/Next|Pause|Play/}).count(),0);
  assert.equal(await hero.getByRole('link',{name:/credit/i}).count(),0);
  assert.equal(await page.locator('main a[href^="/sources#"]').count(),0);
  await page.waitForFunction(()=>document.querySelector('[data-search-photo]').getAttribute('data-photo-playing')==='true');
  await page.waitForFunction(()=>document.querySelectorAll('[data-search-photo] img').length>=2);
  const first=await hero.getAttribute('data-search-photo');await page.clock.fastForward(10000);assert.notEqual(await hero.getAttribute('data-search-photo'),first);
  const input=page.locator('#home-hero-search');await input.fill('Venice');const before=await input.boundingBox();const typing=await hero.getAttribute('data-search-photo');await page.clock.fastForward(20000);assert.equal(await hero.getAttribute('data-search-photo'),typing);assert.equal(await input.inputValue(),'Venice');const after=await input.boundingBox();assert(before&&after&&Math.abs(before.y-after.y)<1);
  await input.blur();await page.waitForFunction(()=>document.querySelector('[data-search-photo]').getAttribute('data-photo-playing')==='true');
  await page.waitForFunction(()=>document.querySelectorAll('[data-search-photo] img').length>=3);
  await page.clock.fastForward(10000);assert.notEqual(await hero.getAttribute('data-search-photo'),typing);
  assert(await page.locator('main.wg-travel-home').evaluate(el=>getComputedStyle(el).backgroundImage.includes('radial-gradient')));
 });

 await ctx.close();
}
const ctx=await context(390);page=await ctx.newPage();
await scenario('reduced motion remains static',async()=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.clock.install();await go('/');
 const hero=page.locator('[data-search-photo]'),first=await hero.getAttribute('data-search-photo');
 await page.clock.fastForward(30000);assert.equal(await hero.getAttribute('data-search-photo'),first);assert.equal(await hero.getAttribute('data-photo-playing'),'false');
});
await ctx.close();
const credits=await context(390);page=await credits.newPage();
await scenario('Sources footer retains all licensed photograph attribution',async()=>{
 await go('/');await page.getByRole('navigation',{name:'Footer',exact:true}).getByRole('link',{name:'Sources',exact:true}).click();
 await page.locator('#discovery-photography').waitFor();assert(await page.locator('#discovery-photography li[id^="photo-"]').count()>=731);
 await go('/things-to-do?country=Italy&city=Rome');assert.equal(await page.locator('article figure a').count(),0);
 await go('/destinations/rome');assert.equal(await page.getByRole('region',{name:'Pictures of Rome'}).getByRole('link',{name:/credits/i}).count(),0);
});
await credits.close();await browser.close();
writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
console.log('JOURNEY_REPORT_B64|travel|'+Buffer.from(JSON.stringify(report)).toString('base64'));
console.log('JOURNEY_SUMMARY',JSON.stringify({passed:report.scenarios.filter(s=>s.status==='passed').length,failed:report.scenarios.filter(s=>s.status==='failed'),errors:report.errors,accessibility:report.accessibility.flatMap(s=>s.violations)}));
if(report.scenarios.some(s=>s.status==='failed')||report.errors.length||report.accessibility.some(s=>s.violations.some(v=>v.impact==='serious'||v.impact==='critical')))process.exitCode=1;
