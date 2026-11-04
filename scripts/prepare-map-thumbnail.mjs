// Capture a real street map, with its required attribution and no decorative compass.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
const require=createRequire(import.meta.url);
const { chromium }=require('/tmp/map-capture/node_modules/playwright');
const css=readFileSync('/tmp/map-capture/node_modules/leaflet/dist/leaflet.css','utf8');
const js=readFileSync('/tmp/map-capture/node_modules/leaflet/dist/leaflet.js','utf8');
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1000,height:750},deviceScaleFactor:1,userAgent:'WhiteGloveMapThumbnail/1.0 (https://github.com/Enove-nyc/Whiteglove)'});
await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Map of central Europe</title><style>html,body,#map{width:100%;height:100%;margin:0}'+css+'</style></head><body><div id="map"></div></body></html>');
await page.addScriptTag({content:js});
await page.evaluate(()=>{window.previewMap=L.map('map',{zoomControl:false,fadeAnimation:false,scrollWheelZoom:false,dragging:false}).setView([48,12],5);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(window.previewMap);});
await page.waitForFunction(()=>{const tiles=[...document.querySelectorAll('img.leaflet-tile')];return tiles.length>=9&&tiles.every(img=>img.complete&&img.naturalWidth>0);},{},{timeout:45000});
await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
await page.screenshot({path:'destination-research/basic-map.png'});
await browser.close();
// Keep a retrievable policy reference with the prepared asset's review evidence.
const copyright=await fetch('https://www.openstreetmap.org/copyright',{signal:AbortSignal.timeout(20000)});
const text=await copyright.text();writeFileSync('destination-research/map-copyright.html',text);
console.log('MAP_SOURCE_POLICY '+JSON.stringify({status:copyright.status,mentionsODbL:/Open Data Commons Open Database License|ODbL/.test(text),mentionsTileLicense:/creativecommons.org\/licenses\/by-sa\/2.0|CC BY-SA 2.0/.test(text),licenseExcerpts:(text.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').match(/.{0,100}(?:cartography|map tiles|Attribution-ShareAlike|Open Database License).{0,200}/gi)??[]).slice(0,8),attributionRetained:true,source:'https://www.openstreetmap.org/copyright'}));
