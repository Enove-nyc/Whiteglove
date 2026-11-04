import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {chromium} from 'playwright';
const base='http://127.0.0.1:3002',email='discovery-save@example.test',secret='isolated-companion-test-secret';
async function redis(...args){const r=await fetch('http://127.0.0.1:6380',{method:'POST',body:JSON.stringify(args)});return(await r.json()).result;}
const at=new Date().toISOString();
await redis('SET','white-glove:account:'+email,JSON.stringify({email,name:'Traveler',salt:'fixture',passwordHash:'fixture',verifiedAt:at,createdAt:at}));
await redis('SET','white-glove:account-data:'+email,JSON.stringify({route:[],favorites:[],activeTripId:'saved',trips:[{id:'saved',name:'My Rome trip',createdAt:at,updatedAt:at,route:[],itinerary:{title:'My Rome trip',startDate:'2026-12-01',endDate:'2026-12-03',flights:[],lodging:[],activities:[],notes:''}}]}));
const browser=await chromium.launch(),ctx=await browser.newContext({viewport:{width:390,height:844}});
await ctx.addCookies([{name:'white_glove_account',value:encodeURIComponent(email)+'.'+createHmac('sha256',secret).update(email).digest('base64url'),domain:'127.0.0.1',path:'/'}]);
await ctx.route('**/api/account/me',async route=>{await new Promise(resolve=>setTimeout(resolve,800));await route.continue();});
const page=await ctx.newPage();
await page.addLocatorHandler(page.getByRole('dialog').filter({has:page.locator('a[href="/verification"]')}), async dialog=>{await dialog.getByRole('button',{name:'Close',exact:true}).click();});
try{
 page.on('response',r=>{if(r.url().includes('/api/account/'))console.log('ACCOUNT_RESPONSE',r.request().method(),new URL(r.url()).pathname,r.status());});
 await page.goto(base+'/things-to-do?country=Italy&city=Rome');await page.waitForTimeout(1000);
 const close=page.getByRole('dialog').getByRole('button',{name:/close/i});if(await close.isVisible().catch(()=>false))await close.click();
 const card=page.getByRole('region',{name:'Things to do results'}).locator(':scope > article').first();
 const name=(await card.getByRole('heading').first().innerText()).trim();
 await Promise.all([page.waitForResponse(r=>r.url().includes('/api/account/itinerary')&&r.request().method()==='POST'),card.getByRole('button',{name:'Add to itinerary',exact:true}).click()]);
 await page.getByText(/On .*not on a day yet/).waitFor();await page.goto(base+'/itinerary');await page.getByText(name,{exact:true}).first().waitFor();
 console.log('DISCOVERY_SAVE_PASS',name);assert.equal(await page.getByRole('dialog',{name:'Sign in to add this to your itinerary'}).count(),0);
}catch(e){console.log('DISCOVERY_SAVE_ERROR',String(e));console.log('DISCOVERY_BODY',(await page.locator('body').innerText()).slice(-10000));console.log('DISCOVERY_IMAGE|'+(await page.screenshot({type:'jpeg',quality:65})).toString('base64'));process.exitCode=1;}finally{await browser.close();}
