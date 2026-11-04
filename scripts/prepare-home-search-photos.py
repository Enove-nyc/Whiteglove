import base64,hashlib,html,io,json,pathlib,re,urllib.parse,urllib.request
from PIL import Image,ImageOps,ImageDraw
root=pathlib.Path('.');folder=root/'public/photos/discovery';out=root/'destination-research';out.mkdir(exist_ok=True)
headers={'User-Agent':'WhiteGloveHeroPhotoPreparation/1.0 (https://github.com/Enove-nyc/Whiteglove)'}
records=[];sheet=Image.new('RGB',(1000,620),'#f8f5ee');draw=ImageDraw.Draw(sheet)
for n,source in enumerate(json.loads((root/'research/hero-photos.json').read_text())):
 params=urllib.parse.urlencode({'action':'query','format':'json','prop':'imageinfo','iiprop':'url|extmetadata|sha1','iiurlwidth':1600,'titles':'File:'+source['title']})
 with urllib.request.urlopen(urllib.request.Request('https://commons.wikimedia.org/w/api.php?'+params,headers=headers),timeout=30) as response:data=json.load(response)
 info=next(iter(data['query']['pages'].values()))['imageinfo'][0];license=html.unescape(re.sub('<[^>]+>','',info['extmetadata']['LicenseShortName']['value'])).strip()
 if info['sha1']!=source['id'] or license!=source['license']:raise ValueError('Source changed since license review: '+source['label'])
 url=(info.get('thumburl') or info['url']).split('?')[0]
 if urllib.parse.urlparse(url).hostname not in ['upload.wikimedia.org','thumb.wikimedia.org']:raise ValueError('Unsupported photo host')
 with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=30) as response:raw=response.read(8*1024*1024+1)
 if len(raw)>8*1024*1024:raise ValueError('Source exceeds preparation limit')
 image=ImageOps.exif_transpose(Image.open(io.BytesIO(raw))).convert('RGB');large=ImageOps.fit(image,(1600,900),method=Image.Resampling.LANCZOS)
 variants={}
 for size in [800,1600]:
  photo=large.resize((size,size*9//16),Image.Resampling.LANCZOS);buf=io.BytesIO();photo.save(buf,'WEBP',quality=75,method=6);data=buf.getvalue();digest=hashlib.sha256(data).hexdigest();target=folder/(digest+'.webp');target.write_bytes(data);variants[size]='/photos/discovery/'+target.name
 records.append({'src':variants[1600],'smallSrc':variants[800],'label':source['label'],'creditId':source['id'],'width':1600,'height':900})
 x=n%2*500;y=n//2*310;sheet.paste(large.resize((500,281)),(x,y));draw.text((x+8,y+286),source['label'],fill='#183047')
code='export type HomeSearchPhoto = { src: string; smallSrc: string; label: string; creditId: string; width: number; height: number };\n\nexport const HOME_SEARCH_PHOTOS: readonly HomeSearchPhoto[] = '+json.dumps(records,ensure_ascii=False,indent=2)+';\n'
(root/'data/homepage-search-photos.ts').write_text(code);target=out/'search-background-photos.jpg';sheet.save(target,quality=76)
print('HERO_PHOTO_RECORDS '+json.dumps(records),flush=True);print('HERO_PHOTO_SHEET_B64 '+base64.b64encode(target.read_bytes()).decode(),flush=True)
