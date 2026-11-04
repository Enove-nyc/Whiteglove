// One-off preparation only. Public requests never call Wikipedia or Commons.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
const ua='WhiteGloveDestinationPhotoPreparation/1.0 (https://github.com/Enove-nyc/Whiteglove)';
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const failures=[];
async function api(host,params){
 const url='https://'+host+'/w/api.php?'+new URLSearchParams({format:'json',formatversion:'2',...params});
 for(let n=0;n<3;n++){
  try{const r=await fetch(url,{headers:{'User-Agent':ua},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('HTTP '+r.status);const j=await r.json();if(j.error)throw Error(j.error.code);return j;}catch(e){if(n===2){failures.push({host,error:String(e)});return null;}await pause(1000*(n+1));}
 }
}
const norm=s=>s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const titleKey=s=>s.replaceAll('_',' ').toLowerCase();
const aliases={'The Colosseum':'Colosseum','The Eiffel Tower':'Eiffel Tower','The Louvre':'Louvre','The Jungfrau region':'Jungfrau Region','The Dolomites':'Dolomites','The Austrian Tyrol':'Tyrol (federal state)','The French Alps':'French Alps','Hollywood':'Hollywood, Florida','Hallandale Beach':'Hallandale Beach, Florida','Miami Beach':'Miami Beach, Florida','Orlando':'Orlando, Florida','Nice and the Côte d\'Azur':'Nice','Hollywood and Hallandale':'Hollywood, Florida','Zurich':'Zürich','Lucerne':'Lucerne','Buna (Adriatic Sea)':'Buna (Adriatic Sea)'};
function title(s){return aliases[s]??s.replace(/^The /,'').replace(/\s+—.*$/,'').replace(/\s+and the .*$/,'');}
function coords(s){if(!s)return null;const a=s.split(',').map(Number);return a.length===2&&a.every(Number.isFinite)?{lat:a[0],lon:a[1]}:null;}
function distance(a,b){const toRad=n=>n*Math.PI/180;const dLat=toRad(a.lat-b.lat),dLon=toRad(a.lon-b.lon);const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(Math.max(0,1-x)));}
const existing=JSON.parse(readFileSync('research/existing-places.json','utf8'));
const seeds=readFileSync('research/new-places.tsv','utf8').trim().split('\n').map(line=>{const[country,city,article,name,kind,summary]=line.split('|');return{country,city,article,name,kind,summary};});
const requests=[];
for(const a of existing.attractions)requests.push({key:a.slug,scope:'attraction',title:title(a.name),expected:coords(a.coordinates),city:a.city,country:a.country});
for(const a of seeds)requests.push({key:'new-'+norm(a.country+' '+a.city+' '+a.name).replaceAll(' ','-'),scope:'new',title:a.article,seed:a,city:a.city,country:a.country});
const cities=new Map();for(const a of [...existing.attractions,...seeds]){const k=norm(a.city)+'|'+norm(a.country);if(!cities.has(k)||!cities.get(k).expected)cities.set(k,{key:k,scope:'city',title:title(a.city),expected:coords(a.coordinates),city:a.city,country:a.country});}
requests.push(...cities.values());
for(const d of existing.vacations)requests.push({key:d.slug,scope:'vacation',title:title(d.name),city:d.cities[0],country:d.country,expected:null});
const pages=new Map();const titles=[...new Set(requests.map(r=>r.title))];
for(let i=0;i<titles.length;i+=20){
 const batch=titles.slice(i,i+20);const data=await api('en.wikipedia.org',{action:'query',prop:'pageimages|coordinates|info|pageprops',ppprop:'wikibase_item',inprop:'url',piprop:'original',pilicense:'free',redirects:'1',coprimary:'primary',colimit:'max',titles:batch.join('|')});
 if(data?.query){const q=data.query;const rewrites=new Map([...(q.normalized??[]),...(q.redirects??[])].map(a=>[titleKey(a.from),a.to]));for(const t of batch){let key=t;const seen=new Set();while(rewrites.has(titleKey(key))&&!seen.has(titleKey(key))){seen.add(titleKey(key));key=rewrites.get(titleKey(key));}const p=q.pages.find(p=>titleKey(p.title)===titleKey(key));if(p&&!p.missing&&!p.invalid)pages.set(t,p);}}
 await pause(200);
}
const entities=new Map();const ids=[...new Set([...pages.values()].map(p=>p.pageprops?.wikibase_item).filter(Boolean))];
for(let i=0;i<ids.length;i+=30){const data=await api('www.wikidata.org',{action:'wbgetentities',ids:ids.slice(i,i+30).join('|'),props:'claims'});for(const [id,e]of Object.entries(data?.entities??{}))entities.set(id,e);await pause(200);}
const newPlaces=[],candidates=[],missing=[];
for(const r of requests){
 const p=pages.get(r.title),entity=entities.get(p?.pageprops?.wikibase_item),claimPoint=entity?.claims?.P625?.find(c=>c.mainsnak?.datavalue)?.mainsnak.datavalue.value,point=p?.coordinates?.[0]??(claimPoint?{lat:claimPoint.latitude,lon:claimPoint.longitude}:null);
 if(!p||!point){missing.push({key:r.key,scope:r.scope,reason:'No exact article with coordinates',title:r.title});continue;}
 // Exact titles and nearby coordinates protect against similarly named places.
 if(r.expected&&distance(r.expected,point)>(r.scope==='city'?100:25)){missing.push({key:r.key,scope:r.scope,reason:'Article coordinates do not match listing',title:r.title});continue;}
 if(r.scope==='new'){const a=r.seed;const slug=norm(a.city+' '+a.name).replaceAll(' ','-');newPlaces.push({slug,name:a.name,city:a.city,country:a.country,kind:a.kind,summary:a.summary,coordinates:`${point.lat}, ${point.lon}`,sourceUrl:p.fullurl});r.key=slug;}
 const source=p.original?.source;const claimedFile=entity?.claims?.P18?.find(c=>c.mainsnak?.datavalue)?.mainsnak.datavalue.value;const freeOriginal=source&&/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\//.test(source)&&/\.(jpe?g|webp)(?:\?|$)/i.test(source);if(!freeOriginal&&!(typeof claimedFile==='string'&&/\.(jpe?g|webp)$/i.test(claimedFile))){missing.push({key:r.key,scope:r.scope,reason:'No free Commons photograph on article',title:r.title});continue;}
 const file=freeOriginal?decodeURIComponent(new URL(source).pathname.split('/').at(-1)).replaceAll('_',' '):claimedFile.replaceAll('_',' ');
 candidates.push({...r,file:'File:'+file,article:p.fullurl,articleTitle:p.title});
}
const infoByFile=new Map();const files=[...new Set(candidates.map(c=>c.file))];
const plain=s=>(s??'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
for(let i=0;i<files.length;i+=20){const data=await api('commons.wikimedia.org',{action:'query',prop:'imageinfo',iiprop:'url|extmetadata|sha1|size',iiurlwidth:'960',titles:files.slice(i,i+20).join('|')});for(const p of data?.query?.pages??[]){if(p.imageinfo?.[0])infoByFile.set(titleKey(p.title),p.imageinfo[0]);}await pause(200);}
const accepted={attraction:{},city:{},vacation:{}};const credits={};
const permitted=/^(CC0|Public domain|CC BY(?:-SA)? [1-4]\.0)$/;
for(const c of candidates){
 const i=infoByFile.get(titleKey(c.file)),m=i?.extmetadata,license=plain(m?.LicenseShortName?.value),author=plain(m?.Artist?.value),description=plain(m?.ImageDescription?.value);
 if(!i||!permitted.test(license)||!author||i.width<400||i.height<250||/AI.generated|generative AI|stable diffusion|midjourney|DALL.E/i.test(description+' '+author)){missing.push({key:c.key,scope:c.scope,reason:'Photo rights, dimensions or authorship not eligible',license});continue;}
 const src=(i.thumburl??i.url).split('?')[0];
 const licenseUrl=plain(m.LicenseUrl?.value).replace(/^http:\/\/creativecommons\.org\//,'https://creativecommons.org/')|| (license==='Public domain'?'https://creativecommons.org/publicdomain/mark/1.0/':'');
 if(!/^https:\/\//.test(licenseUrl)){missing.push({key:c.key,scope:c.scope,reason:'No reusable license URL'});continue;}
 const id=i.sha1;credits[id]={id,title:c.file.slice(5),author,license,licenseUrl,sourcePage:i.descriptionurl,originalUrl:i.url.split('?')[0],sha1:i.sha1,checkedAt:new Date().toISOString().slice(0,10),changes:'Displayed with a responsive crop; no generative alteration.'};
 const entry={src,alt:c.scope==='city'?`View of ${c.city}, ${c.country}`:c.scope==='vacation'?c.articleTitle:c.articleTitle,creditId:id,article:c.article};
 accepted[c.scope==='new'?'attraction':c.scope][c.key]=entry;
}
mkdirSync('destination-research',{recursive:true});
const result={preparedAt:new Date().toISOString(),newPlaces,photos:accepted,credits,missing,failures,counts:{newPlaces:newPlaces.length,attractionPhotos:Object.keys(accepted.attraction).length,cityPhotos:Object.keys(accepted.city).length,vacationPhotos:Object.keys(accepted.vacation).length,credits:Object.keys(credits).length,requests:requests.length}};
writeFileSync('destination-research/manifest.json',JSON.stringify(result,null,2));console.log('DESTINATION_RESEARCH_SUMMARY '+JSON.stringify(result.counts));console.log('DESTINATION_RESEARCH_GZIP_B64 '+gzipSync(JSON.stringify(result)).toString('base64'));
console.log('DESTINATION_RESEARCH_NETWORK_NOTES '+JSON.stringify(failures));
