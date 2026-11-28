/* Perfil simples da cliente, guardado no navegador. Lembra nome, canal escolhido (WhatsApp, Instagram ou e-mail),
   contato e o histórico de horários. Na versão real o "login" é um código enviado pelo canal escolhido. */
(function () {
  var CANAIS = [
    { id: 'whatsapp', pt: 'WhatsApp', en: 'WhatsApp', ph: '(843) 000-0000', tipo: 'tel', rot: { pt: 'Seu número de WhatsApp', en: 'Your WhatsApp number' } },
    { id: 'instagram', pt: 'Instagram', en: 'Instagram', ph: '@seu.usuario', tipo: 'text', rot: { pt: 'Seu usuário do Instagram', en: 'Your Instagram handle' } },
    { id: 'email', pt: 'E-mail', en: 'Email', ph: 'voce@email.com', tipo: 'email', rot: { pt: 'Seu e-mail', en: 'Your email' } }
  ];
  function ler(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function grava(k, p) { try { localStorage.setItem(k, JSON.stringify(p)); } catch (e) {} }
  function sair(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function canal(id) { return CANAIS.filter(function (c) { return c.id === id; })[0] || CANAIS[0]; }
  /* Contato completo: nome, telefone e @instagram sempre são guardados; o canal escolhido é só a preferência de resposta. */
  function arroba(v) { v = String(v || '').trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[\/?].*$/, '').replace(/\s+/g, ''); return v ? (v.charAt(0) === '@' ? v : '@' + v) : ''; }
  function fone(v) { var d = String(v || '').replace(/\D/g, ''); if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1); return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : String(v || '').trim(); }
  function valorDoCanal(c, id) { return id === 'instagram' ? c.instagram : id === 'email' ? c.email : c.telefone; }
  window.Perfil = { CANAIS: CANAIS, ler: ler, grava: grava, sair: sair, canal: canal, arroba: arroba, fone: fone, valorDoCanal: valorDoCanal };
})();
