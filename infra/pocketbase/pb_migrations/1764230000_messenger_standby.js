/// <reference path="../pb_data/types.d.ts" />
// Messenger: as Páginas já ligadas passam a assinar também "standby"
// (mensagens que a Meta entrega primeiro à Caixa de Entrada dela).
migrate((app) => {
  const base = $os.getenv("ABERTOCORE_GRAPH_BASE") || "https://graph.facebook.com"
  let lista = []
  try { lista = app.findRecordsByFilter("canais", "tipo = 'messenger' && page_id != ''", "", 100, 0) } catch (e) { return }
  for (const c of lista) {
    try {
      const res = $http.send({
        url: base + "/v25.0/" + c.getString("page_id") + "/subscribed_apps?subscribed_fields=messages,message_echoes,messaging_postbacks,standby&access_token=" + encodeURIComponent(c.getString("access_token")),
        method: "POST", timeout: 20,
      })
      app.logger().info("messenger: assinatura atualizada", "pagina", c.getString("page_id"), "status", res.statusCode)
    } catch (e) { app.logger().warn("messenger: assinatura não atualizada", "erro", String(e)) }
  }
}, (app) => {})
