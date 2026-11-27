/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: áudio gravado na caixa de mensagem (Ogg/Opus do Chrome e do Firefox, MP4/AAC do Safari).
// Lista completa (a original de 1764240000_arquivos.js + áudio). Em try: se der errado, o servidor sobe
// do mesmo jeito e só o envio de áudio fica recusado.
migrate((app) => {
  try {
    const c = app.findCollectionByNameOrId("arquivos")
    const f = c.fields.getByName("arquivo")
    f.mimeTypes = [
      "application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "text/plain", "text/csv", "video/mp4", "audio/mpeg", "audio/ogg",
      "audio/mp4", "audio/x-m4a", "audio/aac", "audio/webm", "video/webm", "audio/opus", "application/ogg",
    ]
    app.save(c)
  } catch (e) {
    console.log("migração arquivos_audio não aplicada: " + e)
  }
}, (app) => {})
