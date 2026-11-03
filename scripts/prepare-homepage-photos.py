import base64, hashlib, html, io, json, pathlib, re, time, urllib.parse, urllib.request
from PIL import Image, ImageOps, ImageDraw

PHOTOS = [
 ('things-to-do','Colosseum in Rome (9).jpg','CC BY-SA 4.0'),
 ('where-to-stay','Hotel Room (32259665218).jpg','CC0'),
 ('kosher-food','Liat Portal for Foodie Disorder - Challa bread.jpg','CC BY-SA 4.0'),
 ('heritage','Praha Old Jewish Cemetery 20170501 04.jpg','CC BY-SA 4.0'),
 ('map','Compass on map.jpg','CC BY-SA 4.0'),
 ('local-help','Taxis in front of the Terminal 1, Prague Airport.jpg','CC BY-SA 4.0'),
]
out=pathlib.Path('photo-results');out.mkdir(exist_ok=True)
headers={'User-Agent':'WhiteGloveHomepagePhotoReview/1.0 (https://github.com/Enove-nyc/Whiteglove)'}
def fetch(url):
 for attempt in range(3):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=40) as response:
    return response.read(35*1024*1024)
  except Exception:
   if attempt==2:raise
   time.sleep(2*(attempt+1))
def plain(value):return html.unescape(re.sub('<[^>]*>','',value)).strip()
records=[];sheet=Image.new('RGB',(1000,840),'#fcfaf6');draw=ImageDraw.Draw(sheet)
for index,(key,title,expected) in enumerate(PHOTOS):
 query=urllib.parse.urlencode({'action':'query','format':'json','prop':'imageinfo','iiprop':'url|extmetadata|sha1','iiurlwidth':1280,'titles':'File:'+title})
 response=json.loads(fetch('https://commons.wikimedia.org/w/api.php?'+query))
 page=next(iter(response['query']['pages'].values()));info=page['imageinfo'][0];meta=info['extmetadata']
 license_name=plain(meta['LicenseShortName']['value'])
 if license_name!=expected:raise ValueError(f'{title}: expected {expected}, got {license_name}')
 source=info.get('thumburl') or info['url'];raw=fetch(source)
 original=ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB')
 if original.width<900:raise ValueError(f'{title}: image too small {original.size}')
 image=ImageOps.fit(original,(1000,750),method=Image.Resampling.LANCZOS)
 target=out/(key+'.webp');image.save(target,'WEBP',quality=78,method=6)
 record={'key':key,'title':title,'sourcePage':info['descriptionurl'],'originalUrl':info['url'],'downloadedUrl':source,'author':plain(meta.get('Artist',{}).get('value','')),'attribution':plain(meta.get('Attribution',{}).get('value','')),'license':license_name,'licenseUrl':meta.get('LicenseUrl',{}).get('value',''),'originalSha1':info['sha1'],'file':'/photos/homepage/'+key+'.webp','width':1000,'height':750,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'changes':'Cropped to 4:3, resized and converted to WebP. No generative alteration.','verifiedAt':'2026-11-03'}
 records.append(record);sheet.paste(image.resize((480,360)),((index%2)*500,(index//2)*280+24),None) if False else None
 thumb=ImageOps.fit(image,(320,240));x=(index%3)*333;y=(index//3)*420;sheet.paste(thumb,(x,y+28));draw.text((x+8,y+8),key,fill='#102f35')
 print('PHOTO_META|'+json.dumps(record),flush=True)
 print('PHOTO_B64|'+key+'|'+base64.b64encode(target.read_bytes()).decode(),flush=True)
 time.sleep(1)
(out/'sources.json').write_text(json.dumps(records,indent=2))
sheet.save(out/'contact-sheet.jpg',quality=85)
print('PHOTO_SHEET_B64|'+base64.b64encode((out/'contact-sheet.jpg').read_bytes()).decode(),flush=True)
