# Demo "Link de experiência" — fase 1 (Pedido) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link de experiência do modelo Pedido (pizzaria e hamburgueria): site modelo com chat de IA real e checkout, vitrine do AbertoCore recebendo o pedido, e botão no contato que gera o link.

**Architecture:** Páginas estáticas em `experiencia/` (GitHub Pages), estado do visitante em `sessionStorage` chave `abertocore-experiencia`. IA via rota pública `POST /api/experiencia/ia` na PocketBase, usando a config de IA da empresa `abertodigital` e o limitador `site.js#limita`. Vitrine separada imitando o app com `core/estilo.css`.

**Tech Stack:** HTML/CSS/JS puros (sem build), PocketBase 0.40.6 JSVM, Gemini (flash-lite), teste com Node (stubs) e Chrome headless.

**Spec:** `docs/superpowers/specs/2026-11-26-demo-experiencia-design.md`

## Global Constraints
- Repo público: nenhum segredo no código; chave do Gemini só via `IA.cfgDaEmpresa` no servidor.
- Link: `?m=pedido&n=<nicho>&nome=&logo=<https>&cor=<hex>&cidade=&l=pt|en`; parâmetro ausente usa padrão do nicho.
- Faixa fixa no topo: "Demonstração · nenhum pedido é real". Rodapé: "Demonstração feita pela abertodigital".
- Selos: "Pacote Completo" (atendimento por IA) e "Sob medida" (tela de Pedidos, faturamento do dia, pagamento online).
- IA: até 30 msgs/h por IP, 20 por conversa, entrada 12 mensagens × 500 caracteres, até 40 itens, saída ≤ 300 tokens; falha ou limite → resposta pronta do nicho.
- Celular primeiro (390×844); `noindex` e `robots.txt` bloqueando `/experiencia/`.

## Review Focus
1. Link sem `logo`/`cor`/`nome` → iniciais, cor do nicho, "Seu negócio" (teste no Task 2).
2. `logo` que não é https ou falha ao carregar → iniciais (Task 2).
3. Cor muito clara (ex. #FFFFFF) → texto continua legível (contraste calculado, Task 2).
4. Rota da IA com mensagem enorme, 41 itens ou nicho inexistente → corta/ignora sem erro 500 (Task 1).
5. Recarregar a vitrine ou abrir direto sem pedido → mostra estado de exemplo, não quebra (Task 4).

---

### Task 1: Rota da IA da demo
**Files:** Create `infra/pocketbase/pb_hooks/experiencia.js`, `infra/pocketbase/pb_hooks/experiencia.pb.js`; Test: `scratch` Node harness `tests/experiencia-ia.test.js` (stubs de `$http`, `$os`, `app.store()` como em `teste_audio.js`).
**Interfaces — Produces:** `POST /api/experiencia/ia` body `{n, nome, cidade, l, itens:[{nome,preco,cat}], msgs:[{de:'cli'|'ia', txt}]}` → `{texto, limite:boolean}`. `experiencia.js` exporta `monta(body) -> {sistema, texto}` e `respostaPronta(n, l) -> string`.
- [ ] Teste: `monta` corta msgs para 12×500 e itens para 40; sistema contém nome do negócio, "demonstração" e "não invente".
- [ ] Teste: 31ª chamada do mesmo IP na hora → `{limite:true, texto: respostaPronta(...)}` sem chamar Gemini; falha do Gemini → idem.
- [ ] Implementar com `S.limita(app,"exp|"+ip,30,3600000)`, empresa agência = registro `empresas` com nome `abertodigital`, `IA.chama(app,cfg,"experiencia",sistema,texto,false,300)`.
- [ ] `node --check` + teste passam; commit; push dispara deploy; `curl -X POST .../api/experiencia/ia` responde 200.

### Task 2: Base do site modelo e personalização
**Files:** Create `experiencia/index.html`, `experiencia/experiencia.css`, `experiencia/marca.js`, `experiencia/nichos.js`; Modify `robots.txt` (raiz do app, criar se não existir).
**Interfaces — Produces:** `Marca.ler(location.search) -> {m,n,nome,logo,cor,cidade,l}`; `Marca.aplica(cfg)` (CSS vars `--cor`, `--cor-texto`); `NICHOS[n] = {modelo, titulo, chamada, cor, categorias:[{nome,itens:[{id,nome,ds,preco,img}]}], respostas:{saudacao, pronta}, exemplos:[...]}` para `pizzaria` e `hamburgueria`.
- [ ] Teste (Chrome headless): sem parâmetros → "Seu negócio", iniciais, cor do nicho; `cor=#FFFFFF` → `--cor-texto` escuro; `logo=http://x` → iniciais.
- [ ] Implementar; commit.

### Task 3: Pedido — cardápio, carrinho, checkout e chat
**Files:** Create `experiencia/pedido.js`, `experiencia/chat.js`.
**Interfaces — Consumes:** Task 1 rota, Task 2 `Marca`/`NICHOS`. **Produces:** `sessionStorage['abertocore-experiencia'] = {cfg, pedido:{num:102, itens, total, entrega, pagamento:'pix'|'cartao'|'entrega', pago:boolean, ts}, chat:[{de,txt,ts}]}`; ao finalizar, redireciona para `painel.html` + mesmo query string.
- [ ] Teste headless: adicionar 2 itens, checkout Pix "Já paguei" → estado salvo com `pago:true` e total certo; cartão com campos `disabled` e aviso.
- [ ] Teste: chat envia e mostra resposta (rota stub via `window.EXP_API`).
- [ ] Implementar; commit.

### Task 4: Vitrine do AbertoCore (pedido)
**Files:** Create `experiencia/painel.html`, `experiencia/painel.js`.
**Interfaces — Consumes:** estado da Task 3. Telas: notificação "Novo pedido #102", caixa de entrada (conversa do chat + confirmação automática), Pedidos em colunas Novo → Em preparo → Saiu para entrega → Concluído (mover card; selo "Sob medida"), resumo do dia (selo "Sob medida"), CTA "Quero isso no meu negócio" → `wa.me/5511991233627?text=...`.
- [ ] Teste headless: com estado → card #102 em "Novo"; sem estado → exemplos do nicho; viewport 390×844 sem rolagem horizontal.
- [ ] Implementar; commit.

### Task 5: Botão "Link de experiência" no AbertoCore
**Files:** Modify `index.html` (bloco de documentos do contato, só `ehAgencia()`).
**Interfaces — Consumes:** `Nuvem.urlFoto`, `poeNaCaixa(cid, texto)`. Gera link com nicho pelo `ramo`, cor extraída da foto via canvas (fallback cor do nicho), botões Abrir / Copiar / Pôr na mensagem.
- [ ] Teste local (Nuvem stub): link contém `m=pedido&n=pizzaria` para ramo "Pizzaria com delivery".
- [ ] Implementar; commit; push; conferir no ar no celular e no iPad.
