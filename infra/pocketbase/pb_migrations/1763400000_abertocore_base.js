/// <reference path="../pb_data/types.d.ts" />
// AbertoCore - estrutura base (multiempresa)
// Cada registro pertence a uma "empresa". Um usuário só enxerga os dados da própria empresa.
migrate((app) => {
  // 1) empresas
  const empresas = new Collection({
    type: "base",
    name: "empresas",
    fields: [
      { type: "text", name: "nome", required: true, max: 120 },
      { type: "text", name: "plano", max: 40 },
      { type: "bool", name: "ativa" },
      { type: "autodate", name: "created", onCreate: true },
      { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
    ],
  });
  app.save(empresas);

  // 2) usuários ganham empresa e papel
  const users = app.findCollectionByNameOrId("users");
  users.fields.add(new RelationField({ name: "empresa", collectionId: empresas.id, maxSelect: 1, cascadeDelete: false }));
  users.fields.add(new SelectField({ name: "papel", values: ["dono", "equipe", "admin"], maxSelect: 1 }));
  users.listRule = "id = @request.auth.id";
  users.viewRule = "id = @request.auth.id";
  users.createRule = null; // contas criadas só pelo administrador
  users.updateRule = "id = @request.auth.id && @request.body.empresa:isset = false && @request.body.papel:isset = false";
  users.deleteRule = null;
  app.save(users);

  empresas.listRule = "id = @request.auth.empresa";
  empresas.viewRule = "id = @request.auth.empresa";
  empresas.createRule = null;
  empresas.updateRule = null;
  empresas.deleteRule = null;
  app.save(empresas);

  // 3) coleções de dados, todas presas à empresa
  const daEmpresa = "@request.auth.id != '' && empresa = @request.auth.empresa";
  const criaNaEmpresa = "@request.auth.id != '' && @request.body.empresa = @request.auth.empresa";
  const travaEmpresa = daEmpresa + " && (@request.body.empresa:isset = false || @request.body.empresa = @request.auth.empresa)";

  function colecao(nome, extras) {
    const c = new Collection({
      type: "base",
      name: nome,
      listRule: daEmpresa,
      viewRule: daEmpresa,
      createRule: criaNaEmpresa,
      updateRule: travaEmpresa,
      deleteRule: daEmpresa,
      fields: [
        { type: "relation", name: "empresa", required: true, collectionId: empresas.id, maxSelect: 1, cascadeDelete: true },
        { type: "number", name: "local_id", onlyInt: true },
      ].concat(extras || []).concat([
        { type: "json", name: "dados", maxSize: 2000000 },
        { type: "autodate", name: "created", onCreate: true },
        { type: "autodate", name: "updated", onCreate: true, onUpdate: true },
      ]),
      indexes: [],
    });
    app.save(c);
    c.indexes = ["CREATE INDEX idx_" + nome + "_empresa ON " + nome + " (empresa)"];
    if (nome !== "configuracoes") c.indexes.push("CREATE UNIQUE INDEX idx_" + nome + "_local ON " + nome + " (empresa, local_id)");
    else c.indexes.push("CREATE UNIQUE INDEX idx_configuracoes_unica ON configuracoes (empresa)");
    app.save(c);
    return c;
  }

  colecao("contatos", [
    { type: "text", name: "nome", max: 200 },
    { type: "text", name: "telefone", max: 40 },
    { type: "text", name: "canal", max: 40 },
    { type: "text", name: "etapa", max: 60 },
  ]);
  colecao("eventos", [
    { type: "text", name: "titulo", max: 200 },
    { type: "text", name: "data", max: 20 },
  ]);
  colecao("produtos", [
    { type: "text", name: "nome", max: 200 },
    { type: "text", name: "tipo", max: 40 },
  ]);
  colecao("configuracoes", []);

  // 4) primeira empresa: a própria abertodigital
  const ad = new Record(empresas);
  ad.set("nome", "abertodigital");
  ad.set("plano", "Enterprise");
  ad.set("ativa", true);
  app.save(ad);
}, (app) => {
  ["configuracoes", "produtos", "eventos", "contatos"].forEach((n) => {
    try { app.delete(app.findCollectionByNameOrId(n)); } catch (e) {}
  });
  const users = app.findCollectionByNameOrId("users");
  users.fields.removeByName("empresa");
  users.fields.removeByName("papel");
  app.save(users);
  try { app.delete(app.findCollectionByNameOrId("empresas")); } catch (e) {}
});
