# AbertoCore

Sistema integrado de atendimento da **abertodigital**. Ele junta mensagens, funil de vendas, agenda, follow-up, assistente de IA, produtos e relatórios num lugar só.

- **No ar:** https://app.abertodigital.com
- **Status:** protótipo navegável (fase 1). Usa dados de exemplo e roda só no navegador, sem servidor.
- **Para que serve:**
  - case e portfólio do pacote **Enterprise**;
  - base reaproveitável para os sistemas personalizados dos clientes.

## Módulos

| Módulo | O que faz hoje (demo) | Na versão real |
| --- | --- | --- |
| Mensagens | Caixa única com WhatsApp, Instagram, Facebook e e-mail. Abas Entrada, Esperando e Finalizados, filtro de origem com seleção múltipla, busca e resposta sugerida pela IA. | Mensagens reais pelas APIs da Meta e por e-mail |
| Contato (painel lateral) | Classifica como Lead ou Cliente e define etapa do funil, valor, próximo retorno e anotações. Também agenda compromissos. | O mesmo, salvo no banco |
| Funil | Quadro com 6 etapas e cards arrastáveis (no celular, toque no card para mover). Mostra o total em R$ por etapa. Ao fechar, o contato vira Cliente. | O mesmo, salvo no banco |
| Agenda e follow-up | Próximos 7 dias e retornos atrasados, de hoje e futuros. Novo compromisso com confirmação automática ao cliente. | Integração com Google Agenda e lembretes reais |
| Dashboard | Conversas abertas, novos leads, conversão, valor em negociação, leads por dia, mensagens por canal, funil e números da IA. | Números calculados do banco |
| Produtos e serviços | Cadastro com implantação, mensalidade e ativo/inativo. | O mesmo, salvo no banco |
| Assistente de IA | Liga e desliga, passa para humano, pré-agenda e tem base de conhecimento, com chat de teste. | Respostas geradas por modelo de IA usando a base de conhecimento |
| Canais | Estado de cada canal conectado e botão para restaurar os dados de exemplo. | Conexão real de cada conta |
| Configurações (celular) | No celular, Produtos, Assistente de IA e Canais ficam agrupados no botão de engrenagem no topo, e a barra de baixo mostra só Mensagens, Funil, Agenda e Painel. | O mesmo |
| Ao vivo | Simula mensagens chegando a cada 25 s e a IA respondendo. | Mensagens chegando de verdade |

## Auditoria de presença digital

Página separada em https://app.abertodigital.com/auditoria/ (também em Configurações, no celular).

- Avalia 24 itens em 4 áreas, com estes pesos na nota geral: Ser encontrado (30), Confiança e reputação (25), Atendimento (25) e Redes sociais (20).
- Gera uma nota de 0 a 100, um gráfico de medidor e barras por área.
- Lista o que a empresa está perdendo, ordenado por impacto.
- Pode comparar com o concorrente principal.
- Sugere um pacote: Start, Presença, Completo ou Enterprise.
- "Imprimir / PDF" gera o relatório em A4, com o nome do arquivo "Auditoria Empresa data".
- As auditorias ficam salvas no navegador (botão Salvar e a lista "Salvas").
- Os critérios, pesos e textos ficam no bloco `AREAS` do `auditoria/index.html`. As regras do pacote sugerido ficam na função `pacote()`.

## Documentos conectados ao contato

A auditoria, o briefing, a proposta e o contrato são páginas próprias que leem e gravam no mesmo contato do CRM (`?c=<id do contato>`). Nada precisa ser digitado duas vezes.

| Página | O que grava no contato | Usa |
| --- | --- | --- |
| `auditoria/` | `c.auditoria`: notas, perdas e recomendação de pacote e módulos. Se não houver contato, cria um (canal Presencial). | Respostas da visita |
| `briefing/` | `c.empresa` (razão social, CNPJ, endereço, responsáveis) e `c.briefing`. Salva sozinho. | Dados do contato |
| `proposta/` | `c.proposta`: pacote, módulos, valores, prazo e pagamento. Pode mover o card para "Proposta enviada". | Auditoria, briefing, preços em Produtos |
| `contrato/` | `c.contrato`, e completa `c.empresa`. Move o card para "Negociação". | Empresa, responsável que assina, proposta |

- No CRM, o painel do contato mostra o bloco "Empresa e documentos", com o status de cada documento e um botão para abrir.
- Cada documento salvo também deixa um registro na conversa do contato.
- Os dados da abertodigital usados no contrato (razão social, CNPJ, endereço) são preenchidos uma vez e valem para todos.
- O código comum está em `core/dados.js`: catálogo de produtos, pacotes e o que cada um inclui, além das funções de leitura e gravação. O estilo comum está em `core/estilo.css`.
- Cada item da auditoria aponta para a solução que o resolve (campo `sol`). A recomendação escolhe o menor pacote que cobre os itens fracos e soma os módulos que faltam.

## Estrutura dos arquivos

```
index.html            o app inteiro (HTML, CSS e JavaScript num arquivo só)
manifest.webmanifest  permite instalar no celular como app ("Adicionar à tela inicial")
icone-192.png         ícone do app
icone-512.png
CNAME                 domínio app.abertodigital.com (GitHub Pages)
```

Dentro do `index.html`, o código está dividido em blocos, nesta ordem:

1. **`CONFIG`**: tudo que muda de um cliente para outro, como nome do sistema, empresa, responsável, WhatsApp, e-mail, etapas do funil e suas cores, e as regras de resposta da IA.
2. **`semente()`**: os dados de exemplo (contatos, conversas, compromissos, produtos e configuração da IA).
3. **Utilidades**: ícones, datas, formatação em R$ e avatares.
4. **`respostaIA()`**: escolhe a resposta pela primeira regra do `CONFIG.regrasIA` que bater com a mensagem.
5. **Vistas**: `vMensagens`, `vFunil`, `vAgenda`, `vDash`, `vProdutos`, `vAssistente` e `vCanais`. Cada uma desenha uma tela.
6. **Simulação ao vivo**: a lista `FILA` de mensagens que chegam sozinhas.

Os dados ficam salvos no `localStorage` do navegador, com a chave `<sistema>-demo-v1`. A tela Canais tem o botão "Restaurar dados de exemplo".

## Modelo de dados

```
contato   { id, nome, negocio, canal, tipo (Lead|Cliente), etapa, valor, followup (AAAA-MM-DD),
            status (entrada|esperando|finalizado), tel, origem, nota, naoLidas, msgs[] }
mensagem  { de (cli|eq|ia), txt, ts }
evento    { id, contato, titulo, data, hora, tipo (Reunião|Visita|Ligação) }
produto   { id, nome, tipo, setup, mensal (null = sob consulta), ds, ativo }
ia        { ativo, nome, tom, horario, base, humano, agendar }
```

Esse mesmo modelo vira as tabelas do banco na versão real: `contatos`, `mensagens`, `eventos`, `produtos` e `config_ia`.

## Como criar a versão de um cliente novo

1. Crie um repositório novo a partir deste, por exemplo `aberto-digital/core-nomedocliente`.
2. Edite o `CONFIG`:
   - nome do sistema, empresa e responsável;
   - WhatsApp e e-mail;
   - etapas do funil do negócio dele (uma clínica, por exemplo, usaria Agendou, Compareceu, Fechou pacote);
   - regras da IA com os preços e o jeito de falar dele.
3. Troque os dados da `semente()` por exemplos do ramo do cliente: os produtos dele e 6 a 10 contatos fictícios.
4. Ajuste as cores em `:root` e o ícone, se o sistema for levar a marca do cliente.
5. Troque o domínio no `CNAME`, por exemplo `app.nomedocliente.com.br`, e crie o registro CNAME no DNS dele apontando para `aberto-digital.github.io`.
6. Ative o GitHub Pages (branch `main`, pasta raiz) e marque Enforce HTTPS quando o certificado sair.
7. Teste no celular e no computador. Depois, apresente ao cliente com a simulação ao vivo ligada.

## Roteiro para a versão real (fases 2 a 4)

| Fase | Entrega | Tecnologia prevista |
| --- | --- | --- |
| 2 (pronta) | Login e dados salvos de verdade (contatos, funil, agenda, produtos) | Servidor próprio: PocketBase na VPS Hostinger, backup na Cloudflare R2 |
| 3 (em andamento) | WhatsApp real, chatbot de menu e IA respondendo | WhatsApp Cloud API direto, webhook no PocketBase (`pb_hooks`) |
| 3 | Instagram Direct e Messenger | Graph API da Meta (exige app aprovado pela Meta e conta comercial) |
| 3 | E-mail | Gmail API ou IMAP/SMTP do provedor do domínio |
| 4 | IA de verdade | Modelo de linguagem com a base de conhecimento do cliente, regras de passar para humano e registro de cada resposta |
| 4 | Relatórios reais e Google Agenda | Consultas no banco e API do Google Agenda |

## Hospedagem

- **Repositório:** github.com/aberto-digital/app, publicado pelo GitHub Pages a partir do branch `main`.
- **DNS na Hostinger:** registro `CNAME app → aberto-digital.github.io`, com TTL 300.
- **Para atualizar:** basta enviar (commit) para o `main`. O GitHub Pages publica em cerca de 1 minuto.

## Histórico

| Data | Mudança |
| --- | --- |
| 17 nov 2026 | WhatsApp Cloud API: webhook com assinatura, envio de texto, status de entrega, tempo real no app; chatbot de menu com botões e lista; tela Atendimento automático (chatbot + IA) |
| 17 nov 2026 | Servidor próprio (fase 2): login, dados no servidor, cadastro de contatos, backup diário com aviso por e-mail |
| 16 nov 2026 | Primeira versão do protótipo: 7 telas, dados de exemplo, simulação ao vivo |
| 17 nov 2026 | Auditoria, briefing, proposta e contrato conectados ao contato do CRM; proposta e contrato gerados com um clique; novos módulos Gestão mensal do Google e Instagram profissional |
| 17 nov 2026 | Página de auditoria com nota, gráficos, perdas, pacote sugerido e impressão em PDF |
| 16 nov 2026 | Celular: funil sem texto de instrução, colunas com altura fixa e só os cards rolando dentro; ícones centralizados na barra de baixo |
| 16 nov 2026 | Celular: barra de baixo só com ícones; topo e busca se escondem ao rolar a lista (abas ficam fixas); filtro de origem com seleção múltipla num botão ao lado das abas |
| 16 nov 2026 | Celular: barra superior clara e fixa (sem o borrão do Safari), sem zoom ao digitar, barra de baixo mais compacta e escondida enquanto digita, avisos no topo |
| 16 nov 2026 | Janelas (modais) centralizadas no computador e como painel de baixo no celular; painel do contato com botões Fechar e Salvar |
| 16 nov 2026 | Celular: barra superior sólida na cor da marca; Produtos, Assistente de IA e Canais agrupados no botão de Configurações (engrenagem) no topo; produtos em cards |
| 16 nov 2026 | Nome AbertoCore, ícone da marca, navegação de app no celular, instalável na tela inicial, bloco `CONFIG` para reaproveitar com clientes |

## Servidor (fase 2, desde 17/11/2026)

- VPS Hostinger KVM 2 (Brasil), Ubuntu 26.04, Docker. Arquivos em `infra/`.
- `https://api.abertodigital.com`: PocketBase (banco, login e API), atrás do Caddy (HTTPS automático).
- Tabelas: `empresas`, `users` (com `empresa` e `papel`), `contatos`, `eventos`, `produtos`, `configuracoes`. Todas presas à empresa: cada usuário só vê e altera os dados da própria empresa (regras testadas).
- O app continua gravando no navegador; `core/nuvem.js` envia cada alteração ao servidor e baixa os dados ao abrir. Sem login, funciona como demonstração (só no navegador).
- Novo cliente: no painel `https://api.abertodigital.com/_/`, criar a empresa em `empresas` e o usuário em `users` ligado a ela.

## WhatsApp Cloud API e chatbot (fase 3, desde 17/11/2026)

- **Coleções (só superusuário):** `meta_app` (app_id, app_secret, verify_token, versao_api) e `canais` (empresa, phone_number_id, waba_id, numero, access_token, ativo). O token nunca vai para o navegador. `contatos.wa_id` guarda o número do WhatsApp do contato.
- **Rotas** (`infra/pocketbase/pb_hooks/whatsapp.pb.js` e `wa.js`):
  - `GET/POST /api/whatsapp/webhook`: verificação da Meta e recebimento, com conferência do `X-Hub-Signature-256`. Cria o contato se o número for novo e grava status (enviada, entregue, lida, falhou).
  - `GET /api/abertocore/whatsapp`: o app pergunta se a empresa tem número conectado.
  - `POST /api/abertocore/whatsapp/enviar`: envia texto pelo número da empresa do usuário logado. Avisa quando passou a janela de 24 horas.
  - Trava em `onRecordUpdateRequest(contatos)`: o app nunca apaga mensagens que só o servidor recebeu (união por `k`/`wa`).
- **Chatbot de menu:** configurado no app (`configuracoes.dados.bot`). Responde com botões (até 3), lista (4 a 9) ou texto numerado; `op_N` identifica a opção tocada. Opções podem passar para a equipe; quando a equipe responde, o robô fica quieto por `pausaHoras`. `0` ou `menu` traz o menu de volta.
- **Tempo real:** `core/nuvem.js` assina `contatos` pelo realtime do PocketBase (SSE) e junta as mensagens sem perder o rascunho digitado.
- **Meta:** portfólio Abertodigital (2323231835078676), app AbertoCore (2125617558075863, Provedor de Tecnologia), usuário do sistema `abertocore-servidor` com token sem validade. O app só recebe eventos reais depois de publicado, o que exige a verificação da empresa aprovada.
- **Testes locais:** `ABERTOCORE_GRAPH_BASE=http://127.0.0.1:9999 ./pocketbase serve` troca a API da Meta por um servidor de teste.
