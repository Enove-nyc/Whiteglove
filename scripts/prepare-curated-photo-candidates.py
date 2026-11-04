import base64,datetime,hashlib,html,io,json,pathlib,re,time,urllib.parse,urllib.request
from PIL import Image,ImageOps,ImageDraw,ImageFont
root=pathlib.Path('.');out=root/'destination-research';out.mkdir(exist_ok=True);folder=root/'public/photos/discovery';headers={'User-Agent':'WhiteGlovePhotoReview/1.0 (https://github.com/Enove-nyc/Whiteglove)'}
topics=[
 ('dachau-memorial','Dachau Memorial','"Dachau" "entrance" -1945 -1933 -Eichmann'),
 ('caesarea','Caesarea Maritima','"Caesarea" "theatre"'),
 ('rhodes-grand-master-palace','Palace of the Grand Master, Rhodes','"Rhodes" "Grand Master"'),
 ('windsor-castle','Windsor Castle','"Windsor Castle" "exterior"'),
 ('iceland-thingvellir','Þingvellir','"Thingvellir" "landscape"'),
 ('cluj-st-michael',"St Michael’s Church, Cluj-Napoca",'"Cluj" "Mihail" -1859 -painting'),
 ('cluj-botanical-garden','Cluj-Napoca Botanical Garden','"Cluj" "Botanical"'),
 ('cyprus-larnaca-seafront','Larnaca promenade','"Larnaca" "promenade"'),
 ('colonia-del-sacramento-colonia-historic-quarter','Colonia del Sacramento historic quarter','"Colonia del Sacramento" "street"'),
 ('swarovski-kristallwelten','Swarovski Kristallwelten','"Swarovski" "Riese"'),
]
def api(params):
 url='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode({'format':'json','formatversion':2,**params})
 for n in range(3):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=25) as r:return json.load(r)
  except Exception:
   if n==2:return {}
   time.sleep(2*(n+1))
def plain(s):return html.unescape(re.sub('<[^>]*>','',s or '')).strip()
candidates=[];missing=[]
for key,label,query in topics:
 data=api({'action':'query','generator':'search','gsrsearch':query+' filetype:bitmap -map -drawing -portrait -engraving','gsrnamespace':6,'gsrlimit':12,'prop':'imageinfo','iiprop':'url|extmetadata|sha1|size','iiurlwidth':960})
 selected=0
 for p in sorted(data.get('query',{}).get('pages',[]),key=lambda p:p.get('index',100)):
  if selected>=3:break
  i=p.get('imageinfo',[None])[0];m=i.get('extmetadata',{}) if i else {};license=plain(m.get('LicenseShortName',{}).get('value'));author=plain(m.get('Artist',{}).get('value'));license_url=plain(m.get('LicenseUrl',{}).get('value')).replace('http://creativecommons.org/','https://creativecommons.org/');description=plain(m.get('ImageDescription',{}).get('value'))
  if not i or i.get('width',0)<400 or i.get('height',0)<250 or not author:continue
  if not re.fullmatch(r'CC BY(?:-SA)? (?:[1-4]\.0|2\.5)(?: [a-z]{2})?',license) and license not in ['CC0','Public domain']:continue
  if license=='Public domain' and not license_url:license_url='https://creativecommons.org/publicdomain/mark/1.0/'
  if not license_url.startswith('https://creativecommons.org/'):continue
  if re.search('AI.generated|generative AI|stable diffusion|midjourney|DALL.E',description+' '+author,re.I):continue
  try:
   url=(i.get('thumburl') or i['url']).split('?')[0]
   if urllib.parse.urlparse(url).hostname not in ['upload.wikimedia.org','thumb.wikimedia.org']:continue
   with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=25) as r:raw=r.read(8*1024*1024+1)
   if len(raw)>8*1024*1024:continue
   image=ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB');image.thumbnail((640,480),Image.Resampling.LANCZOS);buf=io.BytesIO();image.save(buf,'WEBP',quality=68,method=6);raw=buf.getvalue();sha=hashlib.sha256(raw).hexdigest();dest=folder/(sha+'.webp');dest.write_bytes(raw);ident=i['sha1']
   credit={'id':ident,'title':p['title'].removeprefix('File:'),'author':author,'license':license,'licenseUrl':license_url,'sourcePage':i['descriptionurl'],'originalUrl':i['url'].split('?')[0],'sha1':ident,'checkedAt':datetime.date.today().isoformat(),'changes':'Resized and converted to WebP; displayed with a responsive crop. No generative alteration.'}
   photo={'src':'/photos/discovery/'+dest.name,'alt':label,'creditId':ident,'width':image.width,'height':image.height,'bytes':len(raw),'article':credit['sourcePage']}
   candidates.append({'key':key,'label':label,'photo':photo,'credit':credit});selected+=1
  except Exception:continue
 if not selected:missing.append(key)
 time.sleep(.2)
try:font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',11)
except OSError:font=ImageFont.load_default()
sheet=Image.new('RGB',(1200,192*((len(candidates)+5)//6)),'#faf7f0');draw=ImageDraw.Draw(sheet)
for n,c in enumerate(candidates):
 image=Image.open(root/'public'/c['photo']['src'].lstrip('/'));x=n%6*200;y=n//6*192;sheet.paste(ImageOps.fit(image,(196,140)),(x,y));draw.text((x+3,y+144),str(n)+': '+c['label'][:25],font=font,fill='#102f35');draw.text((x+3,y+160),c['credit']['title'][:28],font=font,fill='#102f35')
target=out/'curated-candidates.jpg';sheet.save(target,quality=70);(root/'research/curated-photo-candidates.json').write_text(json.dumps({'candidates':candidates,'missing':missing},ensure_ascii=False,indent=2));print('CURATED_PHOTO_SHEET_B64 '+base64.b64encode(target.read_bytes()).decode(),flush=True);print('CURATED_PHOTO_COUNTS '+json.dumps({'candidates':len(candidates),'missing':missing}),flush=True)
