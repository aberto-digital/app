/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: arquivos da empresa para enviar nas conversas (biblioteca, PDFs de auditoria e proposta).
// O arquivo fica público só por um link impossível de adivinhar (id + nome com sufixo aleatório),
// porque WhatsApp, Instagram e Messenger baixam o anexo por URL. Listar continua restrito à empresa.
migrate((app) => {
  const empresas = app.findCollectionByNameOrId("empresas")
  const regra = "@request.auth.id != '' && empresa = @request.auth.empresa"
  const c = new Collection({
    type: "base",
    name: "arquivos",
    listRule: regra,
    viewRule: regra,
    createRule: "@request.auth.id != '' && @request.body.empresa = @request.auth.empresa",
    updateRule: regra,
    deleteRule: regra,
    fields: [
      { type: "relation", name: "empresa", required: true, collectionId: empresas.id, maxSelect: 1, cascadeDelete: true },
      { type: "text", name: "nome", max: 200 },
      { type: "select", name: "tipo", values: ["biblioteca", "auditoria", "proposta", "enviado"], maxSelect: 1 },
      { type: "number", name: "contato", onlyInt: true },
      {
        type: "file", name: "arquivo", required: true, maxSelect: 1, maxSize: 20 * 1024 * 1024, protected: false,
        mimeTypes: [
          "application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif",
          "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "text/plain", "text/csv", "video/mp4", "audio/mpeg", "audio/ogg",
        ],
      },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE INDEX idx_arquivos_empresa ON arquivos (empresa, tipo, contato)"],
  })
  app.save(c)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("arquivos"))
})
