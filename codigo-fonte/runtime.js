/* Mini runtime: renders the app template (holes, if/for blocks) and patches the DOM. */
(function () {
  var SVGNS = 'http://www.w3.org/2000/svg';
  var HOLE_FULL = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  var HOLE_ANY = /\{\{\s*([^}]+?)\s*\}\}/g;

  function resolve(path, scope) {
    path = path.trim();
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return parseFloat(path);
    if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.');
    var v = scope[parts[0]];
    for (var i = 1; i < parts.length; i++) { if (v == null) return undefined; v = v[parts[i]]; }
    return v;
  }
  function interp(str, scope) {
    var m = HOLE_FULL.exec(str);
    if (m) return resolve(m[1], scope);
    if (str.indexOf('{{') < 0) return str;
    return str.replace(HOLE_ANY, function (_, p) { var v = resolve(p, scope); return v == null ? '' : String(v); });
  }

  function build(node, scope, out) {
    if (node.nodeType === 3) {
      var t = node.nodeValue;
      if (t.indexOf('{{') >= 0) { var v = interp(t, scope); t = v == null ? '' : String(v); }
      out.push({ tag: '#', v: t });
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.localName;
    if (tag === 'template' && node.getAttribute('data-k')) {
      var kind = node.getAttribute('data-k');
      var kids = node.content.childNodes, i, j;
      if (kind === 'if') {
        if (interp(node.getAttribute('data-value'), scope)) for (i = 0; i < kids.length; i++) build(kids[i], scope, out);
      } else {
        var list = interp(node.getAttribute('data-list'), scope) || [];
        var as = node.getAttribute('data-as') || 'item';
        for (j = 0; j < list.length; j++) {
          var s2 = Object.create(scope); s2[as] = list[j]; s2.$index = j;
          for (i = 0; i < kids.length; i++) build(kids[i], s2, out);
        }
      }
      return;
    }
    var props = {};
    for (var a = 0; a < node.attributes.length; a++) {
      var at = node.attributes[a];
      props[at.name] = interp(at.value, scope);
    }
    var ch = [];
    var src = tag === 'template' ? node.content.childNodes : node.childNodes;
    for (var c = 0; c < src.length; c++) build(src[c], scope, ch);
    out.push({ tag: tag, props: props, kids: ch, svg: node.namespaceURI === SVGNS });
  }

  function evName(el, k) {
    var e = k.slice(2);
    if (e === 'change' && (el.localName === 'input' || el.localName === 'textarea')) return 'input';
    return e;
  }
  var BOOL = { readonly: 'readOnly', disabled: 'disabled', checked: 'checked' };
  function setProps(el, oldP, newP) {
    var k;
    el._h = el._h || {};
    for (k in oldP) if (!(k in newP)) {
      if (k.slice(0, 2) === 'on') { var en = evName(el, k); el._h[en] = null; }
      else el.removeAttribute(k);
    }
    for (k in newP) {
      var v = newP[k];
      if (k === 'value') continue;
      if (k.slice(0, 2) === 'on') {
        var ev = evName(el, k);
        if (!el._h.hasOwnProperty(ev)) {
          (function (evn) { el.addEventListener(evn, function (e) { var f = el._h[evn]; if (typeof f === 'function') f(e); }); })(ev);
        }
        el._h[ev] = v;
        continue;
      }
      if (BOOL[k]) {
        if (v === true || v === 'true' || v === '') { el.setAttribute(k, ''); el[BOOL[k]] = true; }
        else { el.removeAttribute(k); el[BOOL[k]] = false; }
        continue;
      }
      if (v == null || v === false) { el.removeAttribute(k); continue; }
      if (oldP[k] !== v || el.getAttribute(k) !== String(v)) el.setAttribute(k, String(v));
    }
  }
  function setValue(el, p) {
    if ('value' in p) {
      var v = p.value == null ? '' : String(p.value);
      if (el.value !== v) el.value = v;
    }
  }
  function create(v) {
    if (v.tag === '#') { var t = document.createTextNode(v.v); t._v = v; return t; }
    var el = v.svg ? document.createElementNS(SVGNS, v.tag) : document.createElement(v.tag);
    setProps(el, {}, v.props);
    for (var i = 0; i < v.kids.length; i++) el.appendChild(create(v.kids[i]));
    setValue(el, v.props);
    el._v = v;
    return el;
  }
  function patchKids(parent, kids) {
    var nodes = parent.childNodes;
    for (var i = 0; i < kids.length; i++) {
      var nv = kids[i], cur = nodes[i];
      if (!cur) { parent.appendChild(create(nv)); continue; }
      var ov = cur._v;
      if (!ov || ov.tag !== nv.tag || (nv.tag !== '#' && ov.svg !== nv.svg)) { parent.replaceChild(create(nv), cur); continue; }
      if (nv.tag === '#') { if (cur.nodeValue !== nv.v) cur.nodeValue = nv.v; cur._v = nv; continue; }
      setProps(cur, ov.props, nv.props);
      patchKids(cur, nv.kids);
      setValue(cur, nv.props);
      cur._v = nv;
    }
    while (nodes.length > kids.length) parent.removeChild(nodes[nodes.length - 1]);
  }

  window.DCLogic = function DCLogic() {};
  window.DCLogic.prototype.setState = function (p) {
    var prev = this.state || {};
    var patch = typeof p === 'function' ? p(prev, this.props) : p;
    this.state = Object.assign({}, prev, patch);
    this.__schedule && this.__schedule();
  };
  window.DCLogic.prototype.forceUpdate = function () { this.__schedule && this.__schedule(); };

  window.mountApp = function (rootEl, tplHtml, Comp, props) {
    var tplHost = document.createElement('template');
    tplHost.innerHTML = tplHtml;
    var tpl = tplHost.content;
    var inst = new Comp();
    inst.props = props || {};
    var pending = false, mounted = false;
    function render() {
      pending = false;
      var vals = inst.renderVals();
      var out = [];
      for (var i = 0; i < tpl.childNodes.length; i++) build(tpl.childNodes[i], vals, out);
      patchKids(rootEl, out);
      if (mounted && inst.componentDidUpdate) inst.componentDidUpdate();
    }
    inst.__schedule = function () { if (!pending) { pending = true; Promise.resolve().then(render); } };
    render();
    mounted = true;
    if (inst.componentDidMount) inst.componentDidMount();
    window.addEventListener('pagehide', function () { if (inst.componentWillUnmount) inst.componentWillUnmount(); });
    return inst;
  };
})();
