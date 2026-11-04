import base64,datetime,hashlib,json,pathlib
from PIL import Image
root=pathlib.Path('.');image=Image.open(root/'destination-research/basic-map.png').convert('RGB');path=root/'public/photos/homepage/map.webp';image.save(path,'WEBP',quality=82,method=6)
record={'key':'map','title':'Street map of central Europe','sourcePage':'https://www.openstreetmap.org/copyright','originalUrl':'https://www.openstreetmap.org/#map=5/48/12','downloadedUrl':'https://tile.openstreetmap.org/{z}/{x}/{y}.png','author':'OpenStreetMap contributors','attribution':'© OpenStreetMap contributors; attribution retained in the image','license':'Open Database License (ODbL 1.0)','licenseUrl':'https://www.openstreetmap.org/copyright','originalSha1':hashlib.sha1((root/'destination-research/basic-map.png').read_bytes()).hexdigest(),'file':'/photos/homepage/map.webp','width':image.width,'height':image.height,'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'changes':'Street map rendered with Leaflet from OpenStreetMap tiles, attribution retained, converted to WebP. No compass or generative imagery.','verifiedAt':datetime.date.today().isoformat()}
for target in ['data/homepage-photo-sources.json','public/photos/homepage/LICENSES.json']:
 p=root/target;records=json.loads(p.read_text());records=[record if r['key']=='map' else r for r in records];p.write_text(json.dumps(records,ensure_ascii=False,indent=2)+'\n')
print('MAP_THUMBNAIL_B64 '+base64.b64encode(path.read_bytes()).decode(),flush=True)
print('MAP_THUMBNAIL_META '+json.dumps(record),flush=True)
