# AbertoCore

Sistema integrado de atendimento da **Aberto Digital**. Ele junta mensagens, funil de vendas, agenda, follow-up, assistente de IA, produtos e relatórios num lugar só.

- **No ar:** https://app.abertodigital.com
- **Status:** protótipo navegável (fase 1). Usa dados de exemplo e roda só no navegador, sem servidor.
- **Para que serve:**
  - case e portfólio do pacote **Enterprise**;
  - base reaproveitável para os sistemas personalizados dos clientes.

## Módulos

| Módulo | O que faz hoje (demo) | Na versão real |
| --- | --- | --- |
| Mensagens | Caixa única com WhatsApp, Instagram, Facebook e e-mail. Abas Entrada, Esperando e Finalizados, filtro por canal, busca e resposta sugerida pela IA. | Mensagens reais pelas APIs da Meta e por e-mail |
| Contato (painel lateral) | Classifica como Lead ou Cliente e define etapa do funil, valor, próximo retorno e anotações. Também agenda compromissos. | O mesmo, salvo no banco |
| Funil | Quadro com 6 etapas e cards arrastáveis (no celular, toque no card para mover). Mostra o total em R$ por etapa. Ao fechar, o contato vira Cliente. | O mesmo, salvo no banco |
| Agenda e follow-up | Próximos 7 dias e retornos atrasados, de hoje e futuros. Novo compromisso com confirmação automática ao cliente. | Integração com Google Agenda e lembretes reais |
| Dashboard | Conversas abertas, novos leads, conversão, valor em negociação, leads por dia, mensagens por canal, funil e números da IA. | Números calculados do banco |
| Produtos e serviços | Cadastro com implantação, mensalidade e ativo/inativo. | O mesmo, salvo no banco |
| Assistente de IA | Liga e desliga, passa para humano, pré-agenda e tem base de conhecimento, com chat de teste. | Respostas geradas por modelo de IA usando a base de conhecimento |
| Canais | Estado de cada canal conectado e botão para restaurar os dados de exemplo. | Conexão real de cada conta |
| Configurações (celular) | No celular, Produtos, Assistente de IA e Canais ficam agrupados no botão de engrenagem no topo, e a barra de baixo mostra só Mensagens, Funil, Agenda e Painel. | O mesmo |
| Ao vivo | Simula mensagens chegando a cada 25 s e a IA respondendo. | Mensagens chegando de verdade |

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
| 2 | Login e dados salvos de verdade (contatos, funil, agenda, produtos) | Supabase (banco Postgres e autenticação) |
| 3 | WhatsApp real com IA respondendo | WhatsApp Cloud API (Meta) ou plataforma parceira, recebendo por webhook numa Edge Function do Supabase |
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
| 16 nov 2026 | Primeira versão do protótipo: 7 telas, dados de exemplo, simulação ao vivo |
| 16 nov 2026 | Celular: barra superior clara e fixa (sem o borrão do Safari), sem zoom ao digitar, barra de baixo mais compacta e escondida enquanto digita, avisos no topo |
| 16 nov 2026 | Janelas (modais) centralizadas no computador e como painel de baixo no celular; painel do contato com botões Fechar e Salvar |
| 16 nov 2026 | Celular: barra superior sólida na cor da marca; Produtos, Assistente de IA e Canais agrupados no botão de Configurações (engrenagem) no topo; produtos em cards |
| 16 nov 2026 | Nome AbertoCore, ícone da marca, navegação de app no celular, instalável na tela inicial, bloco `CONFIG` para reaproveitar com clientes |
