# Demo "Link de experiência": site modelo + vitrine do AbertoCore

Data: 26/11/2026 · Status: revisado, aguardando aprovação do Julio

## 1. Por quê

A auditoria em PDF mostra o problema; a demo mostra a solução funcionando. O dono do negócio abre um link, navega num site com **o nome, a logo e as cores dele**, faz um pedido, agendamento ou orçamento como se fosse o cliente dele, e em seguida vê esse pedido **chegando no AbertoCore** como dono. Ele vive o negócio dele funcionando do início ao fim, sem precisar imaginar.

Uso: o Julio manda o link para o lead (junto com a auditoria ou numa conversa) e o dono testa sozinho no celular; ou, em reunião, o Julio usa o mesmo link no iPad simulando o cliente.

## 2. Objetivos, não objetivos e anti-objetivos

**Objetivos**
- 3 modelos de site de 1 página, um por jeito de vender: **Pedido**, **Agendamento** e **Orçamento**.
- 3 vitrines do AbertoCore que recebem o que foi enviado no site.
- Link gerado em 1 clique no contato do lead, com nome, logo e cor do lead. Conteúdo (cardápio, serviços, perguntas) é o **padrão do nicho**.
- Funciona bem no celular (o principal) e no iPad/computador.

**Não objetivos (agora)**
- Itens reais de cada cliente (cardápio, preços dele). Decidido: só nome, logo e cores.
- Pagamento real e envio real de mensagens. Nada do visitante é gravado no servidor (a IA da demo é chamada pelo servidor, mas sem gravar a conversa).
- Usar o AbertoCore de verdade: decidido **vitrine separada**.

**Anti-objetivos (seria fracasso mesmo funcionando)**
- O lead achar que fez um pedido de verdade para a própria empresa, ou um cliente dele cair na demo achando que é o site oficial.
- A demo misturar dados com a conta real do Julio no AbertoCore (no iPad dele, logado).
- A vitrine prometer algo que o AbertoCore não faz hoje sem estar marcado como tal (ex.: pagamento online, IA que responde sozinha no pacote errado).
- Link que só funciona com o Julio presente.

## 3. Restrições

- Repositório público (`aberto-digital/app`): nada de segredo; nenhum dado pessoal do lead no código.
- Front estático no GitHub Pages (app.abertodigital.com). Sem build: HTML, CSS e JS puros, como o resto do app.
- Marca da abertodigital no rodapé da demo ("Demonstração feita pela abertodigital"), cores e fontes do guia de marca na vitrine.
- Não usar logo, cores ou telas de terceiros (iFood, ManyChat etc.).
- A logo do lead vem da foto de perfil já salva no contato (campo `foto` da coleção `contatos`, público, `protected: false`) ou de uma imagem enviada à mão.

## 4. Abordagens consideradas

| Abordagem | Como | Prós | Contras |
|---|---|---|---|
| **A. AbertoCore de verdade em modo experiência** | O link abre o `index.html` real com dados de exemplo e o pedido chegando | O dono vê exatamente o produto; a tela de Pedidos ficaria pronta para clientes reais | Mexe no app principal; mais tempo; risco de quebrar o app |
| **B. Vitrine separada (escolhida pelo Julio)** | Páginas próprias da demo que imitam as telas principais do AbertoCore | Rápida, isolada, sem risco para o app real | Cópia: melhorias no AbertoCore precisam ser refletidas na vitrine |
| C. Conta demo real no servidor | O pedido vai de verdade para uma conta compartilhada | Mostra "ao vivo" | Leads veriam pedidos uns dos outros; dados no servidor; descartada |

**Escolha:** B, vitrine separada. Para reduzir a divergência, a vitrine usa o mesmo CSS base do app (`core/estilo.css`) e copia só a aparência das telas, não a lógica.

## 5. Como funciona (fluxo)

1. No AbertoCore, no contato do lead, botão **"Link de experiência"** (só na conta da agência, como Auditoria). Abre uma janela com:
   - modelo (Pedido / Agendamento / Orçamento) e nicho, pré-escolhidos pelo ramo do lead;
   - nome (do contato/negócio), logo (foto do perfil, ou enviar imagem), cor principal (tirada da logo automaticamente, com seletor para trocar);
   - idioma PT ou EN (EN para leads dos EUA, preços em US$);
   - botões **Abrir**, **Copiar link** e **Pôr na mensagem** (vai para a caixa de mensagem, como o envio de documentos).
2. O link abre o **site modelo** em `app.abertodigital.com/experiencia/`, com a marca do lead. Uma faixa fina no topo diz "Demonstração · nenhum pedido é real".
3. O visitante navega, conversa com a IA no chat se quiser e envia (pedido, agendamento ou orçamento), passando pelo checkout. Só as mensagens do chat vão ao servidor, para a IA responder; nada é gravado.
4. Tela de transição curta ("Agora veja do lado da sua empresa →") e abre a **vitrine do AbertoCore** com o item recém-chegado em destaque, notificação e som discreto.
5. Na vitrine, o dono navega por 3 ou 4 telas: caixa de entrada (com a mensagem automática de confirmação já enviada ao cliente), o card no funil, a agenda (agendamento) ou a tela do pedido/orçamento, e o resumo do dia. Botão "Voltar ao site e fazer outro" e um CTA final "Quero isso no meu negócio" que abre o WhatsApp da abertodigital com texto pronto.

## 6. Link e personalização

- Formato: `https://app.abertodigital.com/experiencia/?m=pedido&n=pizzaria&nome=Pizzaria%20Bella&logo=<url>&cor=%23C0392B&l=pt`
  - `m`: pedido | agendamento | orcamento
  - `n`: nicho (catálogo de conteúdo padrão; ver 7)
  - `nome`, `logo` (URL https da foto pública do contato), `cor` (hex), `l` (pt|en)
  - `cidade` (da empresa do contato; usada no endereço fictício e nos textos. Sem cidade, o endereço não aparece)
- **Logo (decisão do construtor, v1):** só a foto de perfil já salva no contato ou, sem foto, as iniciais do nome na cor escolhida. Sem envio manual de imagem na v1 (evita gravar no servidor e link gigante).
- Sem servidor: tudo vem do link. Se um parâmetro faltar, usa padrão do nicho (nome "Seu negócio", logo com as iniciais, cor do nicho).
- O que o visitante faz (carrinho, pedido enviado) fica no `sessionStorage` com chave própria (`abertocore-experiencia`), nunca na chave do app (`abertocore-demo-v1`) nem em cookies da sessão do Julio.
- Link encurtado: fora do escopo agora. (Pode virar `abertodigital.com/x/<id>` depois.)

## 7. Conteúdo padrão por nicho

Um arquivo de dados `experiencia/nichos.js` com, por nicho: modelo, textos do site (título, chamada), itens (produtos com foto genérica, nome, preço; ou serviços com duração e preço; ou tipos de orçamento com perguntas), horários, mensagens automáticas e cards de exemplo para a vitrine (3 a 5 contatos fictícios para a caixa não parecer vazia).

Nichos da primeira versão (cobrem ~85% dos 214 leads):

| Modelo | Nichos |
|---|---|
| Pedido | pizzaria, hamburgueria, padaria/doceria, açaí, restaurante/marmita, loja de roupas, pet shop |
| Agendamento | salão/estética, barbearia, pilates/fisioterapia, nutrição/clínica, banho e tosa, estúdio de tatuagem |
| Orçamento | vidraçaria/serralheria, eletricista/chaveiro, reformas/construção, mecânica/lava-rápido, eventos/fotografia |

Fotos genéricas: imagens livres de direitos (ou ilustrações em SVG simples), servidas do próprio repositório, otimizadas (<60 KB cada).

## 8. Os 3 sites modelo (1 página cada, celular primeiro)

- **Pedido:** topo com logo e nome, chamada curta, categorias em abas, itens com "+", carrinho flutuante, checkout em 1 tela (nome, telefone, entrega ou retirada, endereço, forma de pagamento como escolha simples: "Pix na entrega / cartão na entrega"), botão "Fazer pedido".
- **Agendamento:** serviços com duração e preço, escolha de profissional (opcional por nicho), calendário dos próximos 7 dias com horários livres, nome e telefone, "Confirmar agendamento".
- **Orçamento:** tipo de serviço, perguntas do nicho (medidas, urgência, bairro), anexar fotos (só pré-visualiza, não envia), nome e telefone, "Pedir orçamento".
- Comum: botão de WhatsApp/contato, avaliações de exemplo marcadas "exemplo", endereço fictício genérico da cidade do lead quando houver, rodapé "Demonstração feita pela abertodigital".

## 9. As 3 vitrines do AbertoCore

Layout que imita o app (barra lateral no computador, barra inferior no celular), com a marca do lead no topo, como fica na conta do cliente.

- **Pedido:** notificação "Novo pedido #102"; tela Pedidos com colunas Novo → Em preparo → Saiu para entrega → Concluído (o dono pode mover o card); a conversa com a confirmação automática enviada ao cliente; resumo do dia (pedidos, faturamento).
- **Agendamento:** notificação; Agenda da semana com o horário marcado em destaque; conversa com confirmação e lembrete automático programado; funil (Novo → Agendado → Pós-atendimento).
- **Orçamento:** notificação; card em "Novo orçamento" no funil com as respostas e fotos; conversa com a confirmação automática; botão "Gerar proposta" que mostra uma proposta de exemplo.
- Em todas: a IA aparece só no que o pacote oferece hoje (resumo e organização; atendimento automático marcado como "Pacote Completo").
- **O que o AbertoCore ainda não tem (decisão do Julio, 26/11): mostrar como sob medida.** A tela de Pedidos com etapas, o resumo de faturamento do dia e o "Gerar proposta" nas contas de clientes aparecem completos na vitrine, cada um com o selo **"Sob medida"** (em inglês, "Custom build"). Consequência combinada: se um cliente fechar contando com uma dessas telas, ela precisa ser construída no AbertoCore antes da entrega. Tudo que já existe no app aparece sem selo.
- **Pacote mostrado (decisão do construtor):** a vitrine mostra o pacote **Completo** (a experiência inteira). O que só existe no Completo leva um selo discreto "Pacote Completo"; o resto vale também para o Presença.

## 9a. Atendimento com IA de verdade e checkout (pedido do Julio, 26/11)

A experiência tem que mostrar tudo funcionando 100%, inclusive a conversa com a IA.

- **Chat no site modelo:** botão de conversa (como o "Chat do site" do AbertoCore). O visitante escreve e a **IA responde de verdade**, como atendente do negócio do lead: tira dúvidas do cardápio/serviços, horários, entrega, e leva para o pedido, o agendamento ou o orçamento. A conversa aparece igual na vitrine, na caixa de entrada do dono, marcada como atendida pela IA (selo "Pacote Completo").
- **Como a IA roda:** rota pública nova no servidor, `POST /api/experiencia/ia`, que chama o Gemini com a chave da abertodigital (fica só na VPS). Não grava nada.
  - Entrada: nicho, nome, cidade, idioma, lista de itens do nicho (no máximo 40 itens, textos curtos) e as últimas 12 mensagens (até 500 caracteres cada).
  - Instrução fixa no servidor: atendente desse negócio, responde curto, usa só os itens e preços recebidos, não inventa, e lembra que é uma demonstração se perguntarem por entrega ou pagamento real.
  - Proteções: até 30 mensagens por hora por IP e 20 por conversa, resposta de no máximo 300 tokens, modelo flash-lite. Se passar do limite ou a IA falhar, o chat responde com uma mensagem pronta do nicho e convida a seguir pelo site.
  - Custo estimado: frações de centavo por conversa; entra no relatório de custos da IA como "experiência".
- **Checkout completo, sem dado de cartão:** depois do carrinho, tela de pagamento com as opções **Pix** (QR code e "copia e cola" de exemplo, botão "Já paguei") e **Cartão** (campos visíveis mas desativados, com aviso "na demonstração não pedimos dados do cartão", botão "Pagar"), além de **Pagar na entrega**. Qualquer opção finaliza o pedido como pago ou a pagar, e isso aparece na vitrine. Pagamento online real é marcado "Sob medida".
- Agendamento e Orçamento ganham o mesmo chat com IA; o agendamento pode ter "sinal via Pix" de exemplo no fim.

## 10. Partes no código

- `experiencia/index.html` (site modelo, escolhe o modelo por `m`), `experiencia/painel.html` (vitrine), `experiencia/nichos.js` (conteúdo), `experiencia/experiencia.css`, `experiencia/img/`.
- `index.html` do app: botão "Link de experiência" no contato (conta da agência), janela de geração do link, extração da cor da logo (canvas; se a imagem não permitir leitura, usa a cor padrão do nicho).
- `noindex` nas páginas da demo; `robots.txt` bloqueando `/experiencia/`.
- Servidor: `infra/pocketbase/pb_hooks/experiencia.pb.js` (rota pública da IA com limite por IP), reaproveitando `ia.js` para chamar o Gemini e registrar o custo.

## 11. Ordem de entrega

1. Pedido (site + checkout + chat com IA + vitrine) com 2 nichos (pizzaria, hamburgueria), testado no celular.
2. Botão "Link de experiência" no AbertoCore.
3. Agendamento e Orçamento.
4. Demais nichos e versão em inglês.

## 12. Deixado para o construtor

- Detalhes visuais dentro do guia de marca e do estilo do app.
- Quais fotos/ilustrações usar por nicho (livres de direitos).
- Textos exatos do conteúdo padrão (curtos, tom da marca, sem promessa de resultado).
