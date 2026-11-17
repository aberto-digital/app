// Funções compartilhadas pelos hooks de aviso (carregadas com require).
const DESTINO = "suporte.abertodigital@gmail.com"

function envia(app, assunto, html) {
  const meta = app.settings().meta
  const msg = new MailerMessage({
    from: { address: meta.senderAddress, name: meta.senderName || "AbertoCore" },
    to: [{ address: DESTINO }],
    subject: "[AbertoCore] " + assunto,
    html: html + "<p style='color:#777;font-size:12px'>Servidor api.abertodigital.com · " + new Date().toISOString() + "</p>",
  })
  app.newMailClient().send(msg)
}

// Último backup (em horas). Retorna null se não houver nenhum.
function horasDesdeUltimo(app) {
  const fs = app.newBackupsFilesystem()
  try {
    const itens = fs.list("")
    let ultimo = 0
    for (let i = 0; i < itens.length; i++) {
      const t = new Date(itens[i].modTime.toString()).getTime()
      if (t > ultimo) ultimo = t
    }
    return ultimo ? (Date.now() - ultimo) / 3600000 : null
  } finally {
    fs.close()
  }
}

function verifica(app, limiteHoras) {
  let h
  try {
    h = horasDesdeUltimo(app)
  } catch (err) {
    envia(app, "Não consegui conferir os backups", "Erro ao listar os backups (Cloudflare R2):<br><pre>" + String(err) + "</pre>")
    return "erro"
  }
  if (h === null || h > limiteHoras) {
    envia(app, "Backup atrasado", h === null
      ? "Não existe nenhum backup guardado."
      : "O último backup tem <b>" + Math.round(h) + " horas</b>. O esperado é um por dia, às 3h (Brasília).")
    return "atrasado"
  }
  return "ok " + h.toFixed(1) + "h"
}

module.exports = { envia, verifica, horasDesdeUltimo }
