"""Prepare bounded local thumbnails from a reviewed Commons license manifest; no runtime API dependency."""
import base64, concurrent.futures, gzip, hashlib, html, io, json, pathlib, re, textwrap, time, urllib.request, urllib.parse
from PIL import Image, ImageOps, ImageDraw, ImageFont

root=pathlib.Path('.')
manifest=json.loads(gzip.decompress(base64.b64decode((root/'research/result.gzip.b64').read_text())))
out=root/'public/photos/discovery';out.mkdir(parents=True,exist_ok=True)
results=root/'destination-research';results.mkdir(exist_ok=True)
headers={'User-Agent':'WhiteGlovePhotoPreparation/1.0 (https://github.com/Enove-nyc/Whiteglove)'}
Image.MAX_IMAGE_PIXELS=40_000_000
photos=manifest['photos'];credits=manifest['credits']
source_by_id={p['creditId']:p['src'] for group in photos.values() for p in group.values()}

def prepare(item):
 ident,url=item
 if not re.fullmatch('[0-9a-f]{40}',ident):return ident,None,'Invalid source hash'
 if urllib.parse.urlparse(url).hostname not in ['upload.wikimedia.org','thumb.wikimedia.org']:return ident,None,'Unsupported source host'
 for attempt in range(3):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=25) as response:
    if response.headers.get_content_type() not in ['image/jpeg','image/webp']:raise ValueError('Not a photograph response')
    raw=response.read(8*1024*1024+1)
   if len(raw)>8*1024*1024:raise ValueError('Image exceeds preparation limit')
   image=ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB')
   if image.width<300 or image.height<200:raise ValueError('Image too small')
   image.thumbnail((800,600),Image.Resampling.LANCZOS)
   path=out/(ident+'.webp');image.save(path,'WEBP',quality=72,method=6)
   return ident,{'src':'/photos/discovery/'+ident+'.webp','width':image.width,'height':image.height,'bytes':path.stat().st_size},None
  except Exception as e:
   if attempt==2:return ident,None,str(e)
   time.sleep(2*(attempt+1))

prepared={};failed=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for ident,record,error in pool.map(prepare,source_by_id.items()):
  if record:prepared[ident]=record
  else:failed.append({'id':ident,'error':error})

for scope,group in photos.items():
 for key,photo in list(group.items()):
  if photo['creditId'] not in prepared:del group[key];continue
  photo.update(prepared[photo['creditId']])

credits={ident:{**record,'changes':'Resized and converted to WebP; displayed with a responsive crop. No generative alteration.'} for ident,record in credits.items() if ident in prepared}
index={'attraction':photos['attraction'],'city':photos['city'],'vacation':photos['vacation'],'credits':credits}
data=root/'data';data.mkdir(exist_ok=True)
(data/'discovery-photos.generated.ts').write_text('import type { DiscoveryPhotoIndex } from "@/lib/discovery-photo-types";\n\n// Prepared from Wikimedia Commons; full author, license and source details appear on /sources.\nexport const discoveryPhotos: DiscoveryPhotoIndex = '+json.dumps(index,ensure_ascii=False,indent=2)+';\n')
records=json.dumps(manifest['newPlaces'],ensure_ascii=False,indent=2)
records=re.sub(r'"([a-zA-Z][a-zA-Z0-9]*)":',r'\1:',records)
(data/'expanded-attractions.ts').write_text('import type { Attraction } from "@/data/attractions";\n\n// Original descriptions; location and identity checked against the linked public reference.\n// No opening-hours, ticket-price or kosher claims.\nexport const expandedAttractions: Attraction[] = '+records+';\n')

try:font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',11)
except OSError:font=ImageFont.load_default()
ids=list(credits)
for start in range(0,len(ids),48):
 sheet=Image.new('RGB',(1200,1536),'#fbf8f1');draw=ImageDraw.Draw(sheet)
 for slot,ident in enumerate(ids[start:start+48]):
  photo=Image.open(out/(ident+'.webp'));thumb=ImageOps.fit(photo,(196,140),method=Image.Resampling.LANCZOS);x=(slot%6)*200;y=(slot//6)*192
  sheet.paste(thumb,(x,y));label=f'{start+slot}: '+credits[ident]['title']
  for row,line in enumerate(textwrap.wrap(label,width=29)[:3]):draw.text((x+3,y+143+row*14),line,font=font,fill='#162a40')
 target=results/f'photos-{start//48:02d}.jpg';sheet.save(target,quality=62)
 print('DISCOVERY_SHEET_B64|'+target.name+'|'+base64.b64encode(target.read_bytes()).decode(),flush=True)

summary={'prepared':len(prepared),'bytes':sum(p['bytes'] for p in prepared.values()),'newPlaces':len(manifest['newPlaces']),'photoCounts':{k:len(v) for k,v in photos.items()},'failed':failed}
(results/'asset-summary.json').write_text(json.dumps(summary,indent=2))
(results/'photo-review-order.json').write_text(json.dumps(ids))
print('DISCOVERY_ASSET_SUMMARY '+json.dumps(summary),flush=True)
if not prepared:raise RuntimeError('No reusable photo assets could be prepared')
