/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: conversa "Assistente AbertoCore" (uma por empresa, compartilhada pela equipe).
// Guarda perguntas, respostas, resumos do dia e avisos. Só o servidor grava; a equipe lê (e recebe em tempo real).
migrate((app) => {
  const empresas = app.findCollectionByNameOrId("empresas")
  const c = new Collection({
    type: "base",
    name: "ia_chat",
    listRule: "@request.auth.id != '' && empresa = @request.auth.empresa",
    viewRule: "@request.auth.id != '' && empresa = @request.auth.empresa",
    createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: "relation", name: "empresa", required: true, collectionId: empresas.id, maxSelect: 1, cascadeDelete: true },
      { type: "select", name: "de", values: ["eu", "ia"], maxSelect: 1 },
      { type: "text", name: "autor", max: 120 },
      { type: "select", name: "tipo", values: ["pergunta", "resposta", "resumo", "aviso", "erro"], maxSelect: 1 },
      { type: "text", name: "txt", max: 20000 },
      { type: "number", name: "contato", onlyInt: true },
      { type: "number", name: "ts", onlyInt: true },
      { type: "autodate", name: "created", onCreate: true },
    ],
    indexes: ["CREATE INDEX idx_ia_chat_empresa ON ia_chat (empresa, ts)"],
  })
  app.save(c)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("ia_chat"))
})
