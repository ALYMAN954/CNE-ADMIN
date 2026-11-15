/* Tiny dependency-free .xlsx writer (stored zip + inline strings). Used by the CNE Admin hub. */
(function (g) {
  'use strict';
  var te = new TextEncoder();

  var CRC = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); t[n] = c >>> 0; }
    return t;
  })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

  function zip(files) {
    var parts = [], central = [], offset = 0;
    var d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(function (f) {
      var name = te.encode(f.name), data = f.data, crc = crc32(data);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + data.length;
    });
    var csize = 0; central.forEach(function (p) { csize += p.length; });
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, csize, true); end.setUint32(16, offset, true);
    var all = parts.concat(central, [new Uint8Array(end.buffer)]), total = 0;
    all.forEach(function (p) { total += p.length; });
    var out = new Uint8Array(total), pos = 0;
    all.forEach(function (p) { out.set(p, pos); pos += p.length; });
    return out;
  }

  function esc(s) {
    return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function col(n) { var s = ''; n++; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

  function sheetXml(header, rows) {
    var all = [header].concat(rows), widths = [];
    all.forEach(function (r) { r.forEach(function (v, i) { var l = Math.min(60, String(v).length); if (!widths[i] || widths[i] < l) widths[i] = l; }); });
    var x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>';
    header.forEach(function (h, i) { x += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + Math.max(10, Math.min(60, (widths[i] || 10) + 2)) + '" customWidth="1"/>'; });
    x += '</cols><sheetData>';
    all.forEach(function (r, ri) {
      x += '<row r="' + (ri + 1) + '">';
      r.forEach(function (v, ci) {
        var ref = col(ci) + (ri + 1), s = String(v == null ? '' : v).slice(0, 32000);
        if (ri === 0) x += '<c r="' + ref + '" s="1" t="inlineStr"><is><t xml:space="preserve">' + esc(s) + '</t></is></c>';
        else if (/^Distance/.test(String(header[ci])) && /^\d+$/.test(s)) x += '<c r="' + ref + '"><v>' + s + '</v></c>';
        else if (s !== '') x += '<c r="' + ref + '" t="inlineStr"><is><t xml:space="preserve">' + esc(s) + '</t></is></c>';
      });
      x += '</row>';
    });
    return x + '</sheetData></worksheet>';
  }

  function sheetName(name, used) {
    var base = String(name || 'Sheet').replace(/[\[\]:*?\/\\]/g, ' ').replace(/\s+/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 31) || 'Sheet';
    var n = base, i = 2;
    while (used.indexOf(n.toLowerCase()) > -1) { var suf = ' (' + (i++) + ')'; n = base.slice(0, 31 - suf.length) + suf; }
    used.push(n.toLowerCase());
    return n;
  }

  /** sheets: [{ name, header: [...], rows: [[...]] }] -> Uint8Array of an .xlsx file */
  function build(sheets) {
    if (!sheets.length) sheets = [{ name: 'Empty', header: ['No data'], rows: [] }];
    var used = [], files = [];
    var X = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    var ct = X + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
      '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    var wb = X + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
    var rels = X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    sheets.forEach(function (s, i) {
      var n = i + 1;
      ct += '<Override PartName="/xl/worksheets/sheet' + n + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
      wb += '<sheet name="' + esc(sheetName(s.name, used)) + '" sheetId="' + n + '" r:id="rId' + n + '"/>';
      rels += '<Relationship Id="rId' + n + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + n + '.xml"/>';
      files.push({ name: 'xl/worksheets/sheet' + n + '.xml', data: te.encode(sheetXml(s.header, s.rows)) });
    });
    ct += '</Types>'; wb += '</sheets></workbook>';
    rels += '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    var styles = X + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>' +
      '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0E7C86"/><bgColor indexed="64"/></patternFill></fill></fills>' +
      '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
      '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
    files.unshift(
      { name: '[Content_Types].xml', data: te.encode(ct) },
      { name: '_rels/.rels', data: te.encode(X + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>') },
      { name: 'xl/workbook.xml', data: te.encode(wb) },
      { name: 'xl/_rels/workbook.xml.rels', data: te.encode(rels) },
      { name: 'xl/styles.xml', data: te.encode(styles) }
    );
    return zip(files);
  }

  function download(filename, sheets) {
    var blob = new Blob([build(sheets)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  g.CNE_XLSX = { build: build, download: download };
})(typeof window !== 'undefined' ? window : globalThis);
