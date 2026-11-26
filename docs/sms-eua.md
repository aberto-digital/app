# SMS para clientes dos EUA (módulo opcional)

Nos EUA quase ninguém usa WhatsApp: o cliente manda **SMS** (mensagem de texto) para o número da empresa. Este documento deixa pronto o que é preciso para ligar o SMS no AbertoCore **quando um cliente americano fechar e quiser**. Não está implementado ainda: é implementação individual, por cliente.

> Preços e regras pesquisados em 26/11/2026. Mudam com frequência: confira os links da seção 8 antes de passar valor ao cliente.

---

## 1. O que o cliente ganha

- O SMS que o cliente final manda para o número da empresa cai na **caixa de entrada do AbertoCore**, junto com Instagram, Messenger e e-mail.
- A equipe responde por lá, e a **IA pode responder sozinha** (igual ao WhatsApp).
- O site, o Google e o Instagram ganham o botão **Text us** apontando para esse número.
- Na auditoria em inglês, isso resolve o item "Can customers text the business number?".

## 2. Opções de número

| Opção | Como é | Prós | Contras | Quando usar |
|---|---|---|---|---|
| **A. Número que o cliente já usa (hosted SMS)** | O SMS do número atual passa para o provedor; as **ligações continuam** na operadora de hoje | O número que já está no Google e no cartão passa a receber SMS | Depende da operadora liberar; pode levar 1 a 3 semanas; se o número já recebe SMS em outro app, ele para lá | **Recomendado** quando o número é fixo ou VoIP |
| **B. Número local novo** | Compra um número com DDD da cidade (ex.: 407 em Orlando) | Rápido (minutos) e barato | Número novo: precisa trocar no Google, site e cartões | Quando o número atual é celular pessoal ou a opção A não der |
| **C. Número 0800 (toll-free)** | Número 8XX | Verificação própria, sem taxas de cadastro de marca | Não é local; muita gente prefere responder a número da cidade | Negócio que atende vários estados |

**Atenção:** número de **celular pessoal** do dono não pode ser habilitado (o SMS dele continua no próprio celular). Nesse caso, use a opção B.

## 3. Cadastro obrigatório (sem isso as operadoras bloqueiam)

Toda empresa que manda SMS por sistema nos EUA precisa ser registrada:

- **Número local (opções A e B): A2P 10DLC.** Duas partes:
  1. **Marca (Brand):** os dados da empresa do cliente.
  2. **Campanha (Campaign):** para que servem as mensagens (ex.: atendimento ao cliente e agendamento), com exemplos e como a pessoa aceitou receber.
- **Número 0800 (opção C): Toll-Free Verification.** Desde 2026 também exige o número de registro da empresa e URLs de privacidade e termos.

A aprovação costuma levar **de alguns dias a 2 semanas**. Cada reenvio de campanha recusada é cobrado de novo, por isso vale caprichar na primeira vez.

## 4. Checklist do que pedir ao cliente

Mande esta lista em inglês para o cliente (seção 9 tem o texto pronto).

- [ ] Nome legal da empresa (igual ao registro) e nome fantasia (DBA), se houver
- [ ] **EIN** (Tax ID) da empresa. Sem EIN só dá para cadastrar como *Sole Proprietor*, que tem limites (1 número, volume baixo)
- [ ] Endereço comercial completo
- [ ] Site no ar com:
  - [ ] **Privacy Policy** com a cláusula de SMS (modelo na seção 9)
  - [ ] **Terms** com a cláusula de SMS (frequência, STOP, HELP, "message and data rates may apply")
  - [ ] Formulário ou texto mostrando o **opt-in** (como a pessoa aceita receber SMS)
- [ ] E-mail e telefone de contato do responsável
- [ ] Qual número usar (opção A, B ou C) e, na opção A, a conta da operadora atual (para a carta de autorização, que **o cliente assina**)

O site da empresa a gente faz no pacote, então as páginas de privacidade e termos já saem com as cláusulas de SMS.

## 5. Custos (o que a abertodigital paga ao provedor)

### Twilio

| Item | Valor |
|---|---|
| Número local | a partir de US$ 1,15/mês |
| Número 0800 | a partir de US$ 2,15/mês |
| SMS enviado ou recebido | US$ 0,0083 por segmento (até 160 caracteres) |
| Taxa da operadora (só no enviado) | ~US$ 0,0035 (AT&T) a US$ 0,0045 (T-Mobile) |
| Mensagem que falha | US$ 0,001 |
| Cadastro da marca (10DLC) | US$ 4,50 (Sole Prop / baixo volume) ou US$ 46 (Standard), uma vez |
| Análise da campanha | US$ 15 por envio (cobrado de novo a cada reenvio) |
| Campanha ativa | US$ 2/mês (Sole Prop) ou US$ 10/mês (Standard) |

### Telnyx (alternativa mais barata, mesmas regras)

| Item | Valor |
|---|---|
| Número local | ~US$ 1/mês |
| SMS | US$ 0,004 por segmento + taxa da operadora; recebido sem custo (segundo a própria Telnyx) |
| Taxas 10DLC | repassadas sem margem (mesmos valores das operadoras) |
| Hosted SMS (número que o cliente já tem) | suportado, com checagem de elegibilidade pela API |

**Recomendação:** Telnyx para custo menor; Twilio se precisar de mais documentação e suporte. O código deve ficar com o provedor isolado num arquivo, para trocar depois sem mexer no resto.

### Exemplo de custo mensal (1 cliente, número local, marca Standard)

| | US$/mês |
|---|---|
| Número | ~1,15 |
| Campanha | 10,00 |
| 300 SMS enviados + 300 recebidos (Twilio) | ~6,20 |
| **Total** | **~17** |

Custo inicial: ~US$ 61 (marca US$ 46 + campanha US$ 15).

## 6. Preço sugerido para o cliente (aguardando aprovação do Julio)

Módulo **"SMS inbox (text messaging)"**:

- **Implantação: US$ 390** (cadastro da marca e da campanha, número, páginas de privacidade e termos, botão Text us no site e no Google, ligação no AbertoCore)
- **Mensalidade: US$ 49/mês**, com até 1.000 SMS por mês. Acima disso, cobrança pelo custo.

Margem estimada: ~US$ 30/mês por cliente depois dos custos. Quando aprovado, incluir o módulo na tabela em US$ da auditoria (`PRODUTOS_USD` em `auditoria/index.html`).

## 7. Como implementar no AbertoCore (quando o primeiro cliente fechar)

Mesmo desenho do WhatsApp Cloud API. Estimativa: 1 a 2 dias de código e teste, mais o tempo de aprovação do cadastro.

**Back-end (`infra/pocketbase/pb_hooks/`)**
- `sms.js`: funções do provedor (enviar, validar assinatura do webhook). Só este arquivo conhece Twilio/Telnyx.
- `sms.pb.js`:
  - `POST /api/sms/webhook`: recebe o SMS, acha ou cria o contato pelo telefone (`+1...`), grava a mensagem, dispara a IA (`atende.js`) se estiver ligada. **Validar a assinatura do provedor** em toda chamada.
  - `POST /api/abertocore/sms/enviar`: envia a resposta e devolve o status.
  - Status de entregue e falha pelo webhook de status.
  - **STOP / START / HELP**: o provedor já trata, mas o contato precisa ficar marcado como "não enviar" no CRM.
- Credenciais **só na VPS** (variáveis de ambiente). Nada no repositório (ele é público).
- Um cliente = uma subconta no provedor (Twilio subaccount / Telnyx messaging profile), para separar custos e cadastro.

**Front-end (`index.html`, `core/nuvem.js`)**
- Novo canal `sms` em `viasDe()` / `viaDe()` / `NOME_VIA` ("SMS"), selo do canal na lista e no seletor "Responder por".
- `Nuvem.enviarSms(cid, texto, k)` no mesmo formato de `enviarWhatsApp`.
- Em Configurações → Canais: cartão "SMS (EUA)" mostrando o número e o status do cadastro (só leitura; quem configura é a abertodigital).
- Envio de documentos: SMS não leva PDF, vai **só o link** (igual ao Instagram).
- Contar segmentos (160 caracteres) no campo de mensagem, para não estourar custo.

**Teste antes de entregar**
- Mandar e receber SMS do celular do Julio (número dos EUA).
- Responder com a IA, mandar link de auditoria, testar STOP e START.
- Conferir a lista de entrada, a conversa e o seletor de canal no celular (390×844).

## 8. Fontes

- [Twilio: preços de SMS nos EUA](https://www.twilio.com/en-us/sms/pricing/us)
- [Twilio: preços de números](https://twilio.com/en-us/phone-numbers)
- [Twilio: taxas do A2P 10DLC](https://support.twilio.com/hc/en-us/articles/1260803965530)
- [Twilio: taxas da T-Mobile em 2026](https://support.twilio.com/hc/en-us/articles/44609260499995-T-Mobile-Messaging-Carrier-Fee-Changes-January-2026)
- [Twilio: requisitos da verificação toll-free](https://support.twilio.com/hc/en-us/articles/13264118705051-Required-Information-for-Toll-Free-Verification)
- [Twilio: número de registro da empresa no toll-free (2026)](https://www.twilio.com/en-us/changelog/business-registration-numbers-required-for-toll-free-messaging-p)
- [Twilio: motivos de recusa de campanha 10DLC](https://support.twilio.com/hc/en-us/articles/15778026827291)
- [Twilio: SMS em número existente (hosted numbers)](https://www.twilio.com/docs/phone-numbers/hosted-numbers/quickstart)
- [Telnyx: preços de SMS nos EUA](https://telnyx.com/pricing/messaging/us)
- [Telnyx: taxas do 10DLC](https://support.telnyx.com/en/articles/5634625-10dlc-fees-and-charges)
- [Telnyx: hosted SMS](https://developers.telnyx.com/docs/messaging/messages/hosted-sms)
- [Bandwidth: cobrança por reenvio de campanha](https://www.bandwidth.com/support/en/articles/12823077)

## 9. Textos prontos (em inglês)

### 9.1 Mensagem para pedir os dados ao cliente

> Hi [Name]! To turn on texting for [Business], the carriers require us to register your business first. Could you send me:
> 1. Your legal business name (and DBA, if any)
> 2. Your EIN (Tax ID)
> 3. Your business address
> 4. A contact name, email and phone
> 5. Which number you want customers to text (your current business number, or a new local one)
>
> Approval usually takes a few days. We handle the rest, including the privacy and terms pages on your website.

### 9.2 Cláusula de SMS para a Privacy Policy

> **Text messaging.** If you text us or opt in to receive text messages, we use your phone number only to reply to you and to send messages related to your request, appointments and our services. We do not sell or share your phone number or opt-in information with third parties for marketing purposes. Message frequency varies. Message and data rates may apply. Reply STOP to opt out at any time, or HELP for help.

### 9.3 Cláusula de SMS para os Terms

> **SMS terms.** By texting [Business] or providing your number and agreeing to receive texts, you consent to receive conversational and appointment-related text messages from [Business] at that number. Message frequency varies. Message and data rates may apply. Reply STOP to cancel and HELP for help. Carriers are not liable for delayed or undelivered messages. Questions: [email] or [phone].

### 9.4 Texto de opt-in (perto do botão e no formulário do site)

> ☐ I agree to receive text messages from [Business] about my request and appointments. Message frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help. See our [Privacy Policy] and [Terms].

A caixa de seleção **não pode vir marcada** e não pode ser obrigatória para enviar o formulário.

### 9.5 Descrição da campanha (para o cadastro 10DLC)

> **Use case:** Customer Care (or Mixed: Customer Care + Account Notification).
>
> **Description:** [Business] is a [trade] in [City, State]. Customers text our business number to ask questions, get quotes and book appointments. We reply to their messages and send appointment confirmations and reminders. We do not send marketing blasts.
>
> **How customers opt in:** Customers start the conversation by texting our number, which is listed on our Google Business Profile, website and Instagram, or by checking an unchecked SMS consent box on the contact form at [URL]. Opt-in language: "I agree to receive text messages from [Business]... Reply STOP to opt out, HELP for help."

### 9.6 Mensagens de exemplo (o cadastro pede 2 a 5)

> 1. Hi Sarah, thanks for reaching out to [Business]! Yes, we have openings this Thursday at 10am or 2pm. Which works best? Reply STOP to opt out.
> 2. Hi Mike, your appointment at [Business] is confirmed for Fri, Dec 5 at 3pm at [address]. Reply C to confirm or R to reschedule.
> 3. Hi Ana, here is the quote you asked for: [link]. Let us know if you have any questions. Reply STOP to opt out.

### 9.7 Respostas automáticas obrigatórias

- **Opt-in (primeira mensagem):** `[Business]: Thanks for texting us! Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to opt out.`
- **HELP:** `[Business]: For help, call [phone] or email [email]. Msg & data rates may apply. Reply STOP to opt out.`
- **STOP:** `[Business]: You're unsubscribed and won't receive more messages. Reply START to resubscribe.`
