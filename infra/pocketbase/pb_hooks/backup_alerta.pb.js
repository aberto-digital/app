/// <reference path="../pb_data/types.d.ts" />
// AbertoCore: avisa por e-mail quando o backup falha ou quando não sai backup.
// - onBackupCreate: se a criação do backup (manual ou automático) der erro, manda e-mail.
// - cron "verifica-backup" (08:00 UTC = 05:00 Brasília): se o último backup tiver
//   mais de 26 horas, manda e-mail. Pega casos em que o backup nem chegou a rodar.
// O e-mail sai pelas configurações de Mail do painel (Gmail com senha de app).

onBackupCreate((e) => {
  try {
    e.next()
  } catch (err) {
    try {
      const A = require(`${__hooks}/alerta.js`)
      A.envia($app, "Backup FALHOU", "O backup <b>" + (e.name || "automático") + "</b> deu erro:<br><pre>" + String(err) + "</pre>")
    } catch (mailErr) {
      $app.logger().error("aviso de backup não enviado", "erro", String(mailErr))
    }
    throw err
  }
})

cronAdd("verifica-backup", "0 8 * * *", () => {
  const A = require(`${__hooks}/alerta.js`)
  A.verifica($app, 26)
})
