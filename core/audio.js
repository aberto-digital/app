/* =====================================================================
   AbertoCore: gravação de áudio na caixa de mensagem.
   O WhatsApp só aceita áudio em Ogg/Opus, MP3, AAC/MP4 ou AMR.
   - Safari grava em MP4/AAC: vai como está (.m4a).
   - Firefox grava em Ogg/Opus: vai como está (.ogg).
   - Chrome e Edge gravam em WebM/Opus: aqui o som é só reembalado em Ogg
     (o Opus é o mesmo, sem perder qualidade e sem converter nada).
   Uso: Audio.grava() -> {para(): Promise<{blob, nome, ms}>, cancela()}
   ===================================================================== */
(function(){
  'use strict';

  /* ---------- WebM (EBML) -> pacotes Opus ---------- */
  var MESTRES = {0x18538067:1, 0x1F43B675:1, 0x1654AE6B:1, 0xAE:1, 0xA0:1, 0xE1:1}; // Segment, Cluster, Tracks, TrackEntry, BlockGroup, Audio
  function vint(b, i, tiraMarca){
    var x = b[i], n = 1, m = 0x80;
    while (n <= 8 && !(x & m)){ n++; m >>= 1; }
    if (n > 8) throw new Error('WebM inválido');
    var v = tiraMarca ? (x & (m - 1)) : x, tudo1 = (x & (m - 1)) === m - 1;
    for (var k = 1; k < n; k++){ v = v * 256 + b[i + k]; if (b[i + k] !== 0xFF) tudo1 = false; }
    return {v:v, n:n, desconhecido:tiraMarca && tudo1};
  }
  function lerWebm(buf){
    var b = new Uint8Array(buf), i = 0, pacotes = [], cab = null, canais = 1;
    while (i < b.length - 2){
      var id = vint(b, i, false); i += id.n;
      var tm = vint(b, i, true); i += tm.n;
      if (MESTRES[id.v]) continue;                    // entra no elemento (tamanho pode ser "desconhecido")
      var fim = tm.desconhecido ? b.length : Math.min(b.length, i + tm.v);
      if (id.v === 0x63A2) cab = b.slice(i, fim);     // CodecPrivate = OpusHead
      else if (id.v === 0x9F) canais = b[i] || 1;     // Channels
      else if (id.v === 0xA3 || id.v === 0xA1){       // SimpleBlock / Block
        var tr = vint(b, i, true), p = i + tr.n + 3, flags = b[i + tr.n + 2];
        if (flags & 0x06) throw new Error('WebM com lacing');
        if (fim > p) pacotes.push(b.slice(p, fim));
      }
      i = fim;
    }
    return {pacotes:pacotes, cab:cab, canais:canais};
  }

  /* ---------- pacotes Opus -> Ogg ---------- */
  var CRC = (function(){
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++){ var r = n << 24; for (var k = 0; k < 8; k++) r = (r & 0x80000000) ? ((r << 1) ^ 0x04C11DB7) : (r << 1); t[n] = r >>> 0; }
    return t;
  })();
  function crc(b){ var c = 0; for (var i = 0; i < b.length; i++) c = ((c << 8) ^ CRC[((c >>> 24) ^ b[i]) & 0xFF]) >>> 0; return c; }
  function amostras(p){ // amostras a 48 kHz de um pacote Opus (pelo byte TOC)
    if (!p.length) return 0;
    var toc = p[0], cfg = toc >> 3, ms;
    if (cfg < 12) ms = [10, 20, 40, 60][cfg & 3];
    else if (cfg < 16) ms = [10, 20][cfg & 1];
    else ms = [2.5, 5, 10, 20][cfg & 3];
    var c = toc & 3, quadros = c === 0 ? 1 : c < 3 ? 2 : (p[1] & 0x3F);
    return Math.round(quadros * ms * 48);
  }
  function pagina(pacotes, granulo, serie, seq, tipo){
    var lac = [], corpo = 0;
    pacotes.forEach(function(p){ var n = p.length; while (n >= 255){ lac.push(255); n -= 255; } lac.push(n); corpo += p.length; });
    var h = new Uint8Array(27 + lac.length + corpo), dv = new DataView(h.buffer);
    h.set([0x4F, 0x67, 0x67, 0x53], 0); h[4] = 0; h[5] = tipo;
    dv.setUint32(6, granulo % 4294967296, true); dv.setUint32(10, Math.floor(granulo / 4294967296), true);
    dv.setUint32(14, serie, true); dv.setUint32(18, seq, true); h[26] = lac.length;
    h.set(lac, 27);
    var o = 27 + lac.length; pacotes.forEach(function(p){ h.set(p, o); o += p.length; });
    dv.setUint32(22, crc(h), true);
    return h;
  }
  function opusHead(canais){
    var h = new Uint8Array(19), dv = new DataView(h.buffer);
    h.set([79, 112, 117, 115, 72, 101, 97, 100], 0); h[8] = 1; h[9] = canais;
    dv.setUint16(10, 312, true); dv.setUint32(12, 48000, true);
    return h;
  }
  function opusTags(){
    var vend = new TextEncoder().encode('AbertoCore'), h = new Uint8Array(8 + 4 + vend.length + 4), dv = new DataView(h.buffer);
    h.set([79, 112, 117, 115, 84, 97, 103, 115], 0); dv.setUint32(8, vend.length, true); h.set(vend, 12); dv.setUint32(12 + vend.length, 0, true);
    return h;
  }
  function webmParaOgg(buf){
    var w = lerWebm(buf);
    if (!w.pacotes.length) throw new Error('Gravação vazia');
    var cab = w.cab && w.cab.length >= 19 && String.fromCharCode.apply(null, w.cab.slice(0, 8)) === 'OpusHead' ? w.cab : opusHead(w.canais);
    var serie = (Math.random() * 4294967295) >>> 0, seq = 0, partes = [];
    partes.push(pagina([cab], 0, serie, seq++, 2));
    partes.push(pagina([opusTags()], 0, serie, seq++, 0));
    var g = 0, lote = [], seg = 0;
    w.pacotes.forEach(function(p, k){
      var s = Math.floor(p.length / 255) + 1;
      if (lote.length && (seg + s > 255 || lote.length >= 50)){ partes.push(pagina(lote, g, serie, seq++, 0)); lote = []; seg = 0; }
      lote.push(p); seg += s; g += amostras(p);
    });
    partes.push(pagina(lote, g, serie, seq++, 4));
    return new Blob(partes, {type:'audio/ogg'});
  }

  /* ---------- gravação ---------- */
  function formato(){
    if (!window.MediaRecorder) return null;
    var t = ['audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
    for (var i = 0; i < t.length; i++) if (MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t[i])) return t[i];
    return '';
  }
  function suporta(){ return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder); }
  function grava(){
    var tipo = formato();
    return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true, noiseSuppression:true}}).then(function(stream){
      var rec = new MediaRecorder(stream, tipo ? {mimeType:tipo, audioBitsPerSecond:32000} : undefined), pedacos = [], ini = Date.now();
      rec.ondataavailable = function(e){ if (e.data && e.data.size) pedacos.push(e.data); };
      rec.start(250);
      function solta(){ stream.getTracks().forEach(function(t){ t.stop(); }); }
      return {
        inicio: ini,
        para: function(){
          return new Promise(function(ok, falha){
            rec.onstop = function(){
              solta();
              var ms = Date.now() - ini, mime = (rec.mimeType || tipo || '').toLowerCase(), bruto = new Blob(pedacos, {type:mime});
              if (/mp4|aac/.test(mime)) return ok({blob:new Blob([bruto], {type:'audio/mp4'}), nome:'audio.m4a', ms:ms});
              if (/ogg/.test(mime)) return ok({blob:new Blob([bruto], {type:'audio/ogg'}), nome:'audio.ogg', ms:ms});
              bruto.arrayBuffer().then(function(buf){
                try { ok({blob:webmParaOgg(buf), nome:'audio.ogg', ms:ms}); }
                catch (e){ falha(new Error('Não consegui preparar o áudio (' + e.message + ').')); }
              });
            };
            try { rec.stop(); } catch (e){ solta(); falha(e); }
          });
        },
        cancela: function(){ rec.onstop = solta; try { rec.stop(); } catch (e){ solta(); } }
      };
    });
  }

  window.AudioCore = {suporta:suporta, grava:grava, webmParaOgg:webmParaOgg, amostras:amostras};
})();
