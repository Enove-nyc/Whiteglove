"""Targeted Commons review candidates; only commercial-reuse licenses are accepted."""
import base64,datetime,gzip,hashlib,html,io,json,pathlib,re,time,urllib.parse,urllib.request
from PIL import Image,ImageOps,ImageDraw,ImageFont
root=pathlib.Path('.');path=root/'data/discovery-photos.generated.ts';index=json.loads(re.search(r'= (\{.*\});\s*$',path.read_text(),re.S).group(1));folder=root/'public/photos/discovery'
headers={'User-Agent':'WhiteGlovePhotoReview/1.0 (https://github.com/Enove-nyc/Whiteglove)'}
def api(host,params):
 url='https://'+host+'/w/api.php?'+urllib.parse.urlencode({'format':'json','formatversion':2,**params})
 for n in range(3):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=25) as r:return json.load(r)
  except Exception:
   if n==2:return {}
   time.sleep(2*(n+1))
def plain(s):return html.unescape(re.sub('<[^>]*>','',s or '')).strip()
original_manifest=json.loads(gzip.decompress(base64.b64decode((root/'research/result.gzip.b64').read_text())));credit_order=list(original_manifest['credits']);excluded={credit_order[n] for n in [20,108,114,115,127,143,200,235,270,304,332,350,365,459,471,537,568,719]}
results=[];missing=[]
for place in json.loads((root/'research/photo-gaps.json').read_text()):
 data=api('en.wikipedia.org',{'action':'query','prop':'images|pageimages','piprop':'original','pilicense':'free','imlimit':'max','redirects':1,'titles':place['article']});pages=data.get('query',{}).get('pages',[])
 if not pages or pages[0].get('missing'):missing.append(place['name']);continue
 page=pages[0];src=page.get('original',{}).get('source','');lead=urllib.parse.unquote(src.split('/')[-1]).replace('_',' ') if '/commons/' in src else ''
 files=[('File:'+lead)] if lead else []
 files += [a['title'] for a in page.get('images',[]) if re.search(r'\.(jpg|jpeg|webp)$',a['title'],re.I) and not re.search(r'map|logo|portrait|painting|drawing|diagram|flag|plan |194[0-9]|193[0-9]|nude|naked',a['title'],re.I)]
 files=list(dict.fromkeys(files))[:20]
 info=api('commons.wikimedia.org',{'action':'query','prop':'imageinfo','iiprop':'url|extmetadata|sha1|size','iiurlwidth':960,'titles':'|'.join(files)}) if files else {}
 by_title={p['title'].replace('_',' ').lower():p.get('imageinfo',[None])[0] for p in info.get('query',{}).get('pages',[])}
 selected=None
 for file in files:
  i=by_title.get(file.replace('_',' ').lower());m=i.get('extmetadata',{}) if i else {};license=plain(m.get('LicenseShortName',{}).get('value'));author=plain(m.get('Artist',{}).get('value'));license_url=plain(m.get('LicenseUrl',{}).get('value')).replace('http://creativecommons.org/','https://creativecommons.org/');description=plain(m.get('ImageDescription',{}).get('value'))
  if not i or i.get('sha1') in excluded or i.get('width',0)<400 or i.get('height',0)<250 or not author:continue
  if not re.fullmatch(r'CC BY(?:-SA)? (?:[1-4]\.0|2\.5)(?: [a-z]{2})?',license) and license not in ['CC0','Public domain']:continue
  if license=='Public domain' and not license_url:license_url='https://creativecommons.org/publicdomain/mark/1.0/'
  if not license_url.startswith('https://creativecommons.org/'):continue
  if re.search('AI.generated|generative AI|stable diffusion|midjourney|DALL.E',description+' '+author,re.I):continue
  try:
   url=(i.get('thumburl') or i['url']).split('?')[0]
   if urllib.parse.urlparse(url).hostname not in ['upload.wikimedia.org','thumb.wikimedia.org']:continue
   with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=25) as r:raw=r.read(8*1024*1024+1)
   if len(raw)>8*1024*1024:continue
   image=ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB');image.thumbnail((800,600),Image.Resampling.LANCZOS);ident=i['sha1'];dest=folder/(ident+'.webp');image.save(dest,'WEBP',quality=72,method=6)
   credit={'id':ident,'title':file.removeprefix('File:'),'author':author,'license':license,'licenseUrl':license_url,'sourcePage':i['descriptionurl'],'originalUrl':i['url'].split('?')[0],'sha1':ident,'checkedAt':datetime.date.today().isoformat(),'changes':'Resized and converted to WebP; displayed with a responsive crop. No generative alteration.'}
   photo={'src':'/photos/discovery/'+dest.name,'alt':page['title'],'creditId':ident,'width':image.width,'height':image.height,'bytes':dest.stat().st_size,'article':'https://en.wikipedia.org/wiki/'+urllib.parse.quote(page['title'].replace(' ','_'))}
   index['credits'][ident]=credit;index['attraction'][place['slug']]=photo;selected={'place':place['name'],'file':file,'creditId':ident};results.append(selected);break
  except Exception:continue
 if not selected:missing.append(place['name'])
 time.sleep(.2)
path.write_text('import type { DiscoveryPhotoIndex } from "@/lib/discovery-photo-types";\nexport const discoveryPhotos: DiscoveryPhotoIndex = '+json.dumps(index,ensure_ascii=False,indent=2)+';\n')
sheet=Image.new('RGB',(1200,192*((len(results)+5)//6)),'#faf7f0');draw=ImageDraw.Draw(sheet)
try:font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',11)
except OSError:font=ImageFont.load_default()
for n,r in enumerate(results):
 image=Image.open(folder/(r['creditId']+'.webp'));x=n%6*200;y=n//6*192;sheet.paste(ImageOps.fit(image,(196,140)),(x,y));draw.text((x+3,y+144),str(n)+': '+r['place'][:25],font=font,fill='#102f35');draw.text((x+3,y+160),r['creditId'][:18],font=font,fill='#102f35')
out=root/'destination-research';out.mkdir(exist_ok=True);target=out/'supplemental-photos.jpg';sheet.save(target,quality=70);print('SUPPLEMENTAL_PHOTO_SHEET_B64 '+base64.b64encode(target.read_bytes()).decode(),flush=True);print('SUPPLEMENTAL_PHOTO_RESULT '+json.dumps({'selected':results,'missing':missing}),flush=True)
