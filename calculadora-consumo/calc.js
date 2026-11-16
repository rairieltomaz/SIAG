/* Calculadora de consumo diário de gás
 * Lê a exportação CSV do historiador (contador acumulado mensal em Km³ por tramo + PCI/PCS)
 * e consolida em consumo por hora e por dia (m³), com a mesma lógica da planilha "Gás".
 * Tudo roda no navegador; nenhum dado sai do computador. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GasCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var H = 3600000, DAY = 86400000;
  var DEFAULTS = { tagA: 'CF902', tagB: 'CF904; CF903', tagPCI: 'EN02', tagPCS: 'EN01',
                   fuso: 1, conv: 1000, pcsRef: 9400, estimar: false, mes: 'auto' };

  var RE_OK = /^\d\d\/\d\d\/\d{4} \d\d:\d\d/;
  var RE_NUM = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
  function pTime(s) {            // "MM/DD/AAAA HH:MM:SS" (19 caracteres) -> ms (relógio local tratado como UTC)
    s = s.trim().slice(0, 19);
    var y = +s.slice(6, 10), mo = +s.slice(0, 2), d = +s.slice(3, 5), h = +s.slice(11, 13), mi = +s.slice(14, 16), se = +s.slice(17, 19);
    var t = Date.UTC(y, mo - 1, d, h, mi, se);
    return isNaN(t) ? null : t;
  }
  function num(v) { v = (v == null ? '' : String(v)).trim(); return RE_NUM.test(v) ? parseFloat(v) : null; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dstr(ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  function tstr(ms) { var d = new Date(ms); return pad(d.getUTCDate()) + '/' + pad(d.getUTCMonth() + 1) + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()); }

  /* ---------- 1. Leitura do CSV: linhas [t, acumulado, PCI, PCS] ---------- */
  function parseText(text, tagV, cfg) {
    var lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/);
    var t = lines.map(function (x) { return x.replace(/"/g, ''); });
    var ok = t.map(function (x) { return RE_OK.test(x) && x[2] === '/' && x[5] === '/' && x[10] === ' ' && x[13] === ':'; });
    var pd = ok.indexOf(true);
    var out = { rows: [], tagFound: false, descartadas: 0, linhas: lines.length };
    if (pd < 0) return out;
    var head = t.slice(0, pd), hd = '';
    for (var i = 0; i < head.length; i++) if (head[i].indexOf('Date Time') === 0) { hd = head[i]; break; }
    var cols = hd.split(','), tagL = [], tagN = [];
    head.forEach(function (x) {
      var n = parseInt(x.split(',')[0], 10);
      if (n > 0 && n < 100 && x.indexOf('@') >= 0) { tagL.push(x); tagN.push(n); }
    });
    function achar(lista) {
      var tgs = String(lista || '').split(';').map(function (z) { return z.trim(); });
      for (var q = 0; q < tgs.length; q++) {
        var tg = tgs[q]; if (!tg) continue;
        for (var c = 0; c < cols.length; c++) if (cols[c].indexOf(tg) >= 0) return c + 1;
        for (var l = 0; l < tagL.length; l++) if (tagL[l].indexOf(tg) >= 0) return tagN[l] + 1;
      }
      return null;
    }
    var kV = achar(tagV), kI = achar(cfg.tagPCI), kS = achar(cfg.tagPCS);
    out.tagFound = kV != null;
    function lerT(prefix) {
      for (var i = 0; i < head.length; i++) if (head[i].indexOf(prefix) === 0) {
        var p = head[i].split(': '); if (p.length > 1) return pTime(p.slice(1).join(': '));
      }
      return null;
    }
    var tIni = lerT('Start Time'), tFim = lerT('End Time'), seen = Object.create(null), rows = [];
    var shift = (cfg.fuso || 0) * H;
    for (var r = 0; r < t.length; r++) {
      if (!ok[r]) continue;
      var d = pTime(t[r]); if (d == null) continue;
      if (tIni != null && d < tIni - 1000) continue;
      if (tFim != null && d > tFim + 1000) continue;
      var f = t[r].split(',');
      var g = function (k) { return k && k - 1 < f.length ? num(f[k - 1]) : null; };
      var row = [d + shift, g(kV), g(kI), g(kS)];
      if (row[1] == null && row[2] == null && row[3] == null) { out.descartadas++; continue; }
      var key = row.join('|'); if (seen[key]) continue; seen[key] = 1; rows.push(row);
    }
    rows.sort(function (a, b) { return a[0] - b[0]; });
    out.rows = rows; return out;
  }

  /* ---------- 2. Consumo por leitura (diferença do contador) ---------- */
  function consumo(rows, estimar) {
    var v = rows.filter(function (r) { return r[1] != null && r[1] > 0; });
    var res = { cons: [], nZer: 0, ehDia: false, estTotal: 0, v: v };
    var n = v.length; if (!n) return res;
    var tm = v.map(function (r) { return r[0]; }), a = v.map(function (r) { return r[1]; });
    var p = [a[0]].concat(a.slice(0, n - 1)), nZer = 0, i;
    for (i = 0; i < n; i++) if (a[i] < p[i] / 2) nZer++;
    var ehDia = nZer > 0 && ((tm[n - 1] - tm[0]) / Math.max(nZer, 1) <= 1.5 * DAY);
    var contaPri = new Date(tm[0]).getUTCDate() === 1 || ehDia;
    var pAj = [contaPri ? 0 : a[0]].concat(p.slice(1));
    var inc = a.map(function (x, k) { var y = pAj[k]; return x >= y ? x - y : (x < y / 2 ? x : 0); });
    var est = new Array(n).fill(0), te = new Array(n).fill(null);
    if (n > 1 && estimar) {
      var uv = 0, ut = 0;
      for (i = 0; i < n; i++) {
        var uvAnt = uv, utAnt = ut;                      // último incremento positivo antes desta leitura
        if (a[i] < p[i] / 2 && (tm[i] - utAnt) <= 2 * H && uvAnt > a[i]) {
          est[i] = uvAnt - a[i]; te[i] = Math.floor(tm[i] / DAY) * DAY - 1000;
        }
        if (inc[i] > 0) { uv = inc[i]; ut = tm[i]; }
      }
    }
    res.cons = tm.map(function (x, k) { return [x, inc[k], est[k], te[k]]; });
    var maxv = Math.max.apply(null, a), grandes = 0;
    for (i = 0; i < n; i++) if (a[i] < p[i] / 2 && p[i] > 0.5 * maxv) grandes++;
    res.nZer = nZer; res.ehDia = ehDia; res.grandes = grandes;
    res.estTotal = est.reduce(function (s, x) { return s + x; }, 0);
    return res;
  }

  /* ---------- 3. Hora a hora e dia a dia ---------- */
  function monthBounds(mes, tMin) {
    var y, m;
    if (mes && mes !== 'auto') { y = +mes.slice(0, 4); m = +mes.slice(5, 7); }
    else { var d = new Date(tMin); y = d.getUTCFullYear(); m = d.getUTCMonth() + 1; }
    return { y: y, m: m, ini: Date.UTC(y, m - 1, 1), fim: Date.UTC(y, m, 1), key: y + '-' + pad(m) };
  }
  function medianGapMin(v) {
    var g = []; for (var i = 1; i < v.length; i++) g.push(v[i][0] - v[i - 1][0]);
    if (!g.length) return null; g.sort(function (a, b) { return a - b; });
    return g[Math.floor(g.length / 2)] / 60000;
  }

  function compute(inputs, userCfg) {
    var cfg = Object.assign({}, DEFAULTS, userCfg || {});
    // inputs: [{nome, texto}] — um ou mais arquivos; cada tramo usa os arquivos onde a tag aparece
    var rowsA = [], rowsB = [], info = { arquivos: [], descartadas: 0 };
    inputs.forEach(function (f) {
      var a = parseText(f.texto, cfg.tagA, cfg), b = parseText(f.texto, cfg.tagB, cfg);
      info.arquivos.push({ nome: f.nome, linhas: a.linhas, tramoA: a.tagFound ? a.rows.length : 0, tramoB: b.tagFound ? b.rows.length : 0 });
      info.descartadas += Math.max(a.descartadas, b.descartadas);
      if (a.tagFound) rowsA = rowsA.concat(a.rows);
      if (b.tagFound) rowsB = rowsB.concat(b.rows);
    });
    function dedupe(rows) {
      var seen = Object.create(null), o = [];
      rows.sort(function (x, y) { return x[0] - y[0]; });
      rows.forEach(function (r) { var k = r.join('|'); if (!seen[k]) { seen[k] = 1; o.push(r); } });
      return o;
    }
    rowsA = dedupe(rowsA); rowsB = dedupe(rowsB);
    var cA = consumo(rowsA, cfg.estimar), cB = consumo(rowsB, cfg.estimar);
    var tms = cA.cons.map(function (c) { return c[0]; }).concat(cB.cons.map(function (c) { return c[0]; }));
    if (!tms.length) return { erro: 'Não encontrei leituras válidas do acumulado. Confira as tags de vazão e o arquivo.', info: info };
    var tMax = tms.reduce(function (m, x) { return x > m ? x : m; }, tms[0]);
    var tMin = tms.reduce(function (m, x) { return x < m ? x : m; }, tms[0]);

    // meses presentes (para o seletor)
    var meses = [], d0 = new Date(tMin), y = d0.getUTCFullYear(), m = d0.getUTCMonth() + 1;
    while (Date.UTC(y, m - 1, 1) <= tMax) { meses.push(y + '-' + pad(m)); m++; if (m > 12) { m = 1; y++; } }
    var mb = monthBounds(cfg.mes, tMin);

    var iniH = Math.floor(Math.max(Math.floor(tMin / DAY) * DAY, mb.ini) / H);
    var fimH = Math.min(Math.floor(tMax / H + 1e-6), mb.fim / H - 1);
    if (fimH < iniH) return { erro: 'Não há leituras dentro do mês selecionado.', info: info, meses: meses, mes: mb.key };
    var n = fimH - iniH + 1, base = iniH * H;
    function bucketAcc(cons) {
      var acc = new Array(n).fill(0);
      cons.forEach(function (c) {
        [[c[0], c[1]], [c[3], c[2]]].forEach(function (p) {
          if (p[0] == null || !p[1]) return;
          var k = Math.ceil((p[0] - base) / H) - 1;      // hora (h, h+1h]
          if (k >= 0 && k < n) acc[k] += p[1];
        });
      });
      return acc.map(function (x) { return Math.round(x * cfg.conv * 1000) / 1000; });
    }
    var ja = bucketAcc(cA.cons), jb = bucketAcc(cB.cons);
    function avgPc(rows, idx) {                           // média das leituras da hora [h, h+1h)
      var s = new Array(n).fill(0), c = new Array(n).fill(0);
      rows.forEach(function (r) {
        var v = r[idx]; if (v == null) return;
        var k = Math.floor((r[0] - base) / H);
        if (k >= 0 && k < n) { s[k] += v; c[k]++; }
      });
      return s.map(function (x, k) { return c[k] ? x / c[k] : null; });
    }
    function hourPc(idx) {
      var pa = avgPc(rowsA, idx), pb = avgPc(rowsB, idx);
      return pa.map(function (x, k) {
        var y = pb[k], na = x != null, nb = y != null, wa = ja[k] * na, wb = jb[k] * nb, xa = na ? x : 0, xb = nb ? y : 0;
        if (wa + wb > 0) return (xa * wa + xb * wb) / (wa + wb);
        return (na + nb) > 0 ? (xa + xb) / (na + nb) : null;
      });
    }
    var Ei = hourPc(2), Es = hourPc(3);
    var Dh = ja.map(function (x, k) { return x + jb[k]; });

    // tolerância para considerar o dia completo: 2 h ou 2 intervalos de leitura
    var gap = Math.max(2 * H, 2 * 60000 * Math.max(medianGapMin(cA.v) || 0, medianGapMin(cB.v) || 0));
    var days = {}, order = [];
    for (var k = 0; k < n; k++) {
      var key = Math.floor((base + k * H) / DAY);
      if (!days[key]) { days[key] = []; order.push(key); }
      days[key].push(k);
    }
    function wavg(E, ks) {
      var P = 0, Q = 0, s = 0, c = 0;
      ks.forEach(function (k) { if (E[k] != null) { P += Dh[k]; Q += E[k] * Dh[k]; s += E[k]; c++; } });
      return P !== 0 ? Q / P : (c ? s / c : null);
    }
    var out = [], tot = 0, totRef = 0, totH = 0, sumPci = 0, sumPcs = 0, wPci = 0, wPcs = 0;
    order.forEach(function (key) {
      var ks = days[key], C = ks.reduce(function (s, k) { return s + Dh[k]; }, 0);
      var pci = wavg(Ei, ks), pcs = wavg(Es, ks), ref = pcs != null ? C * pcs / cfg.pcsRef : null;
      var hrs = ks.filter(function (k) { return Dh[k] > 0; }).length;
      var d0t = key * DAY, d1t = d0t + DAY;
      var completo = ks.length === 24 && tms.length > 0 && (d0t >= tMin - gap) ? (tMin <= d0t + gap && tMax >= d1t - gap) : false;
      out.push({ data: dstr(d0t), m3: C, pci: pci, pcs: pcs, ref: ref, horas: hrs, completo: completo });
      tot += C; if (ref != null) totRef += ref; totH += hrs;
      ks.forEach(function (k) { if (Ei[k] != null) { wPci += Dh[k]; sumPci += Ei[k] * Dh[k]; } if (Es[k] != null) { wPcs += Dh[k]; sumPcs += Es[k] * Dh[k]; } });
    });
    // conferência com o contador mensal (só vale para contador que não zera todo dia)
    var conf = null;
    if (cA.grandes <= 1 && cB.grandes <= 1) {
      var mxv = function (c) {
        var m = 0; c.v.forEach(function (r) { if (r[0] >= mb.ini && r[0] < mb.fim && r[1] > m) m = r[1]; }); return m;
      };
      conf = { contador: (mxv(cA) + mxv(cB)) * cfg.conv, soma: tot };
    }
    return {
      mes: mb.key, meses: meses, dias: out,
      total: { m3: tot, ref: totRef, horas: totH, pci: wPci ? sumPci / wPci : null, pcs: wPcs ? sumPcs / wPcs : null },
      conferencia: conf,
      qual: {
        leituras: [rowsA.length, rowsB.length], primeira: tMin, ultima: tMax,
        passoMin: [medianGapMin(cA.v), medianGapMin(cB.v)],
        zeramentos: [cA.grandes, cB.grandes], estimativa: (cA.estTotal + cB.estTotal) * cfg.conv,
        descartadas: info.descartadas, arquivos: info.arquivos, contadorDiario: !(cA.grandes <= 1 && cB.grandes <= 1)
      },
      horas: { inicio: base, m3: Dh, A: ja, B: jb }
    };
  }
  return { compute: compute, DEFAULTS: DEFAULTS, tstr: tstr, dstr: dstr };
});
