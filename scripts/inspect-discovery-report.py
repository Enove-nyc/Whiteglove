import base64,json,pathlib
root=pathlib.Path('/tmp/discovery-validation-report')
for p in root.rglob('report.json'):
 r=json.loads(p.read_text())
 print('DISCOVERY_BROWSER_FAILURES '+json.dumps({'file':str(p),'failed':[s for s in r['scenarios'] if s['status']!='passed'],'accessibility':[a for a in r['accessibility'] if a['violations']]}),flush=True)
 for s in r['scenarios']:
  if s['status']=='passed' or not s.get('screenshot'):continue
  image=p.parent/s['screenshot']
  if image.exists():print('DISCOVERY_FAILURE_IMAGE|'+s['name']+'|'+base64.b64encode(image.read_bytes()).decode(),flush=True)
