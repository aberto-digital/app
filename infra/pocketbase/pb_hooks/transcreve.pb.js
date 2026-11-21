/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: transcrever áudio recebido (WhatsApp, Instagram, Messenger) com o Gemini da empresa.
//   POST /api/abertocore/transcrever { contato: local_id, msg: id da mensagem na Meta }
//   Grava o texto em msg.transcricao e devolve { texto }.
routerAdd("POST", "/api/abertocore/transcrever", (e) => {
  const IA = require(`${__hooks}/ia.js`)
  const W = require(`${__hooks}/wa.js`)
  const auth = e.auth, empresaId = auth.getString("empresa")
  const b = e.requestInfo().body || {}
  let rec
  try { rec = e.app.findFirstRecordByFilter("contatos", "empresa = {:e} && local_id = {:l}", { e: empresaId, l: parseInt(b.contato, 10) || 0 }) }
  catch (x) { throw new NotFoundError("Contato não encontrado.") }
  const d = W.lerDados(rec)
  const m = (d.msgs || []).filter((x) => x.wa && x.wa === String(b.msg || ""))[0]
  if (!m || !m.audio) throw new BadRequestError("Esta mensagem não tem áudio para transcrever.")
  if (m.transcricao) return e.json(200, { texto: m.transcricao })
  const cfg = IA.cfgDaEmpresa(e.app, empresaId)
  if (!cfg || !cfg.getString("api_key")) throw new BadRequestError("Conecte a IA em Atendimento automático para transcrever áudios.")

  // 1) baixa o áudio
  const graph = $os.getenv("ABERTOCORE_GRAPH_BASE") || "https://graph.facebook.com"
  let url = m.audio.url || "", headers = {}, mime = m.audio.mime || "audio/mp4"
  if (m.audio.id) {
    const canal = (function () { try { return e.app.findFirstRecordByFilter("canais", "empresa = {:e} && tipo = 'whatsapp' && ativo = true", { e: empresaId }) } catch (x) { return null } })()
    if (!canal) throw new BadRequestError("O WhatsApp não está conectado.")
    let ver = "v25.0"; try { ver = e.app.findFirstRecordByFilter("meta_app", "id != ''").getString("versao_api") || ver } catch (x) {}
    headers = { "Authorization": "Bearer " + canal.getString("access_token") }
    const info = $http.send({ url: graph + "/" + ver + "/" + m.audio.id, method: "GET", headers: headers, timeout: 20 })
    if (info.statusCode >= 300 || !info.json || !info.json.url) throw new BadRequestError("O WhatsApp não liberou o áudio (ele fica disponível por cerca de 30 dias).")
    url = info.json.url; mime = info.json.mime_type || mime
  }
  if (!/^https:\/\//.test(url)) throw new BadRequestError("Áudio indisponível.")
  const arq = $http.send({ url: url, method: "GET", headers: headers, timeout: 60 })
  if (arq.statusCode >= 300) throw new BadRequestError("Não consegui baixar o áudio (ele pode ter expirado).")
  const bytes = arq.body || []
  const n = bytes.length || 0
  if (!n) throw new BadRequestError("O áudio veio vazio.")
  if (n > 15 * 1024 * 1024) throw new BadRequestError("Áudio grande demais para transcrever (máximo 15 MB).")
  const ct = String((arq.headers && (arq.headers["Content-Type"] || arq.headers["content-type"])) || "")
  if (/^audio\//.test(ct)) mime = ct.split(";")[0]
  // bytes -> base64
  const T = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  const out = []
  for (let i = 0; i < n; i += 3) {
    const a = bytes[i] & 255, b1 = i + 1 < n ? bytes[i + 1] & 255 : 0, c = i + 2 < n ? bytes[i + 2] & 255 : 0
    out.push(T[a >> 2] + T[((a & 3) << 4) | (b1 >> 4)] + (i + 1 < n ? T[((b1 & 15) << 2) | (c >> 6)] : "=") + (i + 2 < n ? T[c & 63] : "="))
  }
  const b64 = out.join("")

  // 2) transcreve com o Gemini
  const base = $os.getenv("ABERTOCORE_GEMINI_BASE") || "https://generativelanguage.googleapis.com"
  const modelos = [cfg.getString("modelo") || IA.MODELO_PADRAO, "gemini-flash-latest"]
  let texto = "", erro = "", tin = 0, tout = 0, usado = modelos[0]
  for (let i = 0; i < modelos.length && !texto; i++) {
    usado = modelos[i]
    const res = $http.send({
      url: base + "/v1beta/models/" + encodeURIComponent(usado) + ":generateContent",
      method: "POST",
      headers: { "x-goog-api-key": cfg.getString("api_key"), "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [
          { inline_data: { mime_type: mime, data: b64 } },
          { text: "Transcreva este áudio exatamente como foi falado, no idioma original, com pontuação. Devolva só o texto da fala, sem comentários. Se não houver fala, devolva [sem fala]." },
        ] }],
        generationConfig: { temperature: 0, maxOutputTokens: 2048 },
      }),
      timeout: 90,
    })
    const j = res.json || {}
    if (res.statusCode >= 300) { erro = (j.error && j.error.message) || ("HTTP " + res.statusCode); IA.registraUso && IA.registraUso(e.app, empresaId, "transcricao", usado, 0, 0, false); continue }
    const cand = (j.candidates || [])[0] || {}
    texto = ((cand.content && cand.content.parts) || []).filter((p) => !p.thought && p.text).map((p) => p.text).join("").trim()
    const u = j.usageMetadata || {}; tin = u.promptTokenCount || 0; tout = (u.candidatesTokenCount || 0) + (u.thoughtsTokenCount || 0)
  }
  if (!texto) throw new BadRequestError(/429|quota|limit/i.test(erro) ? "Limite de uso do Gemini atingido. Tente de novo daqui a pouco." : "Não consegui transcrever: " + (erro || "sem resposta da IA") + ".")
  if (IA.registraUso) IA.registraUso(e.app, empresaId, "transcricao", usado, tin, tout, true)

  // 3) grava na mensagem
  const atual = e.app.findRecordById("contatos", rec.id), dd = W.lerDados(atual)
  ;(dd.msgs || []).forEach((x) => { if (x.wa === m.wa) x.transcricao = texto })
  atual.set("dados", dd)
  e.app.save(atual)
  return e.json(200, { texto: texto })
}, $apis.requireAuth("users"))
