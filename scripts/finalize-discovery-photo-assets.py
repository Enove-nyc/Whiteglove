import base64,gzip,hashlib,io,json,pathlib,re
from PIL import Image
root=pathlib.Path('.');p=root/'data/discovery-photos.generated.ts';text=p.read_text();index=json.loads(re.search(r'= (\{.*\});\s*$',text,re.S).group(1))
manifest=json.loads(gzip.decompress(base64.b64decode((root/'research/result.gzip.b64').read_text())))
reviewed_out=[20,108,114,115,127,143,200,235,270,304,332,350,365,459,471,537,568,719]
credit_order=list(manifest['credits']);excluded={credit_order[n] for n in reviewed_out}
for group in ['attraction','city','vacation']:
 index[group]={k:v for k,v in index[group].items() if v['creditId'] not in excluded}
used={photo['creditId'] for group in ['attraction','city','vacation'] for photo in index[group].values()}
index['credits']={k:v for k,v in index['credits'].items() if k in used}
original={p['creditId']:p for group in ['attraction','city','vacation'] for p in index[group].values()}
folder=root/'public/photos/discovery';old_paths=set(folder.glob('*.webp'));prepared={};new_paths=set()
for ident,photo in original.items():
 src=root/'public'/photo['src'].lstrip('/');assert src.parent==folder
 image=Image.open(src).convert('RGB');image.thumbnail((640,480),Image.Resampling.LANCZOS);buf=io.BytesIO();image.save(buf,'WEBP',quality=68,method=6);raw=buf.getvalue();digest=hashlib.sha256(raw).hexdigest();dest=folder/(digest+'.webp');dest.write_bytes(raw);new_paths.add(dest)
 prepared[ident]={'src':'/photos/discovery/'+dest.name,'width':image.width,'height':image.height,'bytes':len(raw)}
for old in old_paths-new_paths:old.unlink()
for group in ['attraction','city','vacation']:
 for photo in index[group].values():photo.update(prepared[photo['creditId']])
p.write_text('import type { DiscoveryPhotoIndex } from "@/lib/discovery-photo-types";\n\n// Licensed photographs; required credits appear on /sources. Prepared files use their own content hashes.\nexport const discoveryPhotos: DiscoveryPhotoIndex = '+json.dumps(index,ensure_ascii=False,indent=2)+';\n')
places=[a for a in manifest['newPlaces'] if a['slug']!='blagaj-buna-river-spring']
records=re.sub(r'"([a-zA-Z][a-zA-Z0-9]*)":',r'\1:',json.dumps(places,ensure_ascii=False,indent=2))
(root/'data/expanded-attractions.ts').write_text('import type { Attraction } from "@/data/attractions";\n\n// Original descriptions; identity and location checked against linked public references.\nexport const expandedAttractions: Attraction[] = '+records+';\n')
summary={'prepared':len(prepared),'bytes':sum(p['bytes'] for p in prepared.values()),'newPlaces':len(places),'photoCounts':{group:len(index[group]) for group in ['attraction','city','vacation']},'excludedAfterReview':len(excluded)}
print('DISCOVERY_FINAL_ASSET_SUMMARY '+json.dumps(summary),flush=True)
