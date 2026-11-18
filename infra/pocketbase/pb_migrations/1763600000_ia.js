/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: assistente de IA interno
// - ia_config: uma por empresa. Provedor, modelo, chave da API (escondida) e o que está ligado.
//   Só o servidor lê; o app conversa por /api/abertocore/ia e nunca recebe a chave de volta.
// - ia_uso: cada chamada à IA, com tokens, para medir o custo por empresa. O app só lê os da própria empresa.
migrate((app) => {
  const empresas = app.findCollectionByNameOrId("empresas")

  const cfg = new Collection({
    type: "base",
    name: "ia_config",
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: "relation", name: "empresa", required: true, collectionId: empresas.id, maxSelect: 1, cascadeDelete: true },
      { type: "select", name: "provedor", values: ["gemini"], maxSelect: 1 },
      { type: "text", name: "modelo", max: 80 },
      { type: "text", name: "api_key", max: 300, hidden: true },
      { type: "text", name: "final_chave", max: 8 },
      { type: "bool", name: "crm_auto" },
      { type: "bool", name: "resumo_dia" },
      { type: "json", name: "resumo", maxSize: 200000 },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
    indexes: ["CREATE UNIQUE INDEX idx_ia_config_empresa ON ia_config (empresa)"],
  })
  app.save(cfg)

  const uso = new Collection({
    type: "base",
    name: "ia_uso",
    listRule: "@request.auth.id != '' && empresa = @request.auth.empresa",
    viewRule: "@request.auth.id != '' && empresa = @request.auth.empresa",
    createRule: null, updateRule: null, deleteRule: null,
    fields: [
      { type: "relation", name: "empresa", required: true, collectionId: empresas.id, maxSelect: 1, cascadeDelete: true },
      { type: "text", name: "tipo", max: 30 },
      { type: "text", name: "modelo", max: 80 },
      { type: "number", name: "tokens_in", onlyInt: true },
      { type: "number", name: "tokens_out", onlyInt: true },
      { type: "bool", name: "ok" },
      { type: "autodate", name: "created", onCreate: true },
    ],
    indexes: ["CREATE INDEX idx_ia_uso_empresa ON ia_uso (empresa, created)"],
  })
  app.save(uso)
}, (app) => {
  app.delete(app.findCollectionByNameOrId("ia_uso"))
  app.delete(app.findCollectionByNameOrId("ia_config"))
})
