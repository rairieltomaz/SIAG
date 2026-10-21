import re, base64, json, os, sys

D = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(D, 'SIAG-app.dc.html')
LOGO = os.path.join(D, 'cea-logo.png')
OUT = os.path.join(D, 'siag')
os.makedirs(OUT, exist_ok=True)

s = open(SRC, encoding='utf-8').read()
xa = s.index('<x-dc>') + len('<x-dc>'); xb = s.index('</x-dc>')
body = s[xa:xb]
ha = body.index('<helmet>'); hb = body.index('</helmet>') + len('</helmet>')
helmet = body[ha:hb]
tpl = body[:ha] + body[hb:]
css = re.search(r'<style>(.*?)</style>', helmet, re.S).group(1)
sa = s.index('>', s.index('data-dc-script')) + 1; sb = s.index('</script>', sa)
logic = s[sa:sb]
props = json.loads(re.search(r"data-props='(.*?)'", s, re.S).group(1).replace('&#39;', "'").replace('&amp;', '&'))
accent = props.get('accent', {}).get('default', '#1061A6')

# control flow -> <template data-k>
def conv_if(m):
    v = re.search(r'value="([^"]*)"', m.group(0)).group(1)
    return '<template data-k="if" data-value="%s">' % v
def conv_for(m):
    l = re.search(r'list="([^"]*)"', m.group(0)).group(1)
    a = re.search(r'as="([^"]*)"', m.group(0)).group(1)
    return '<template data-k="for" data-list="%s" data-as="%s">' % (l, a)
tpl = re.sub(r'<sc-if\b[^>]*>', conv_if, tpl).replace('</sc-if>', '</template>')
tpl = re.sub(r'<sc-for\b[^>]*>', conv_for, tpl).replace('</sc-for>', '</template>')
# fluid root for phones
tpl = tpl.replace('width: 390px; height: 844px;', 'width: 100%; max-width: 560px; margin: 0 auto; height: 100%;', 1)
# logo -> data uri
logo_uri = 'data:image/png;base64,' + base64.b64encode(open(LOGO, 'rb').read()).decode()
tpl = re.sub(r'/_blob/[0-9a-f]{32}', logo_uri, tpl)

import shutil
for n in ('icon-192.png','icon-512.png'): shutil.copy(os.path.join(D, n), os.path.join(OUT, n))
icon192 = 'data:image/png;base64,' + base64.b64encode(open(os.path.join(OUT, 'icon-192.png'), 'rb').read()).decode()

runtime = open(os.path.join(D, 'runtime.js'), encoding='utf-8').read()
tpl_js = json.dumps(tpl)

html = '''<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#1061A6">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="SIAG">
<title>SIAG – Sistema Integrado de Aferição de Gás</title>
<link rel="manifest" href="manifest.json">
<link rel="icon" href="%(icon)s">
<link rel="apple-touch-icon" href="%(icon)s">
<style>
html,body{height:100%%;margin:0;background:#EEF1F5}
#app{height:100%%}
%(css)s
</style>
</head>
<body>
<div id="app"></div>
<script>
%(runtime)s
</script>
<script>
%(logic)s
mountApp(document.getElementById('app'), %(tpl)s, Component, { accent: %(accent)s });
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  try {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(function (reg) { reg.update(); }).catch(function () {});
    var hadCtrl = !!navigator.serviceWorker.controller, reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (hadCtrl && !reloaded) { reloaded = true; location.reload(); } });
  } catch (e) {}
}
</script>
</body>
</html>
''' % dict(icon=icon192, css=css, runtime=runtime, logic=logic, tpl=tpl_js, accent=json.dumps(accent))
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(html)

manifest = {
  "name": "SIAG – Sistema Integrado de Aferição de Gás",
  "short_name": "SIAG",
  "description": "Previsão de gás pelo PDP do ONS e verificação com o totalizador GRMS.",
  "lang": "pt-BR",
  "start_url": "./",
  "scope": "./",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#EEF1F5",
  "theme_color": "#1061A6",
  "icons": [
    {"src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
    {"src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}
  ]
}
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

import time
sw = ("const CACHE = 'siag-%s';\n" % time.strftime('%Y%m%d%H%M')) + '''const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request, { cache: 'no-store' }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
'''
open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write(sw)
print('ok', os.path.getsize(os.path.join(OUT, 'index.html')))
