/* AbertoCore · Link de experiência: conteúdo padrão de cada nicho.
   Cada nicho tem o modelo (pedido | agendamento | orcamento), a cor padrão, os textos do site
   em pt e en, o cardápio/catálogo e os contatos de exemplo que aparecem na vitrine.
   Pedido: itens com preco (R$) e precoUsd (US$). Agendamento: itens com dur (min) e preço.
   Orçamento: itens com faixa de/ate e perguntas. img é um emoji usado como ilustração. */
(function (raiz) {
  var NICHOS = {
    pizzaria: {
      modelo: 'pedido', cor: '#C0392B', taxa: 6, taxaUsd: 3.99,
      textos: {
        pt: { titulo: 'Pizza quentinha na sua casa', chamada: 'Massa de fermentação lenta, forno a lenha e entrega rápida.', tipo: 'Pizzaria', prazo: '40 a 50 min' },
        en: { titulo: 'Hot pizza at your door', chamada: 'Slow-fermented dough, wood-fired oven and fast delivery.', tipo: 'Pizzeria', prazo: '40 to 50 min' },
      },
      categorias: [
        { nome: { pt: 'Pizzas', en: 'Pizzas' }, itens: [
          { id: 'mussarela', img: '🍕', nome: { pt: 'Mussarela', en: 'Mozzarella' }, ds: { pt: 'Mussarela, tomate e orégano', en: 'Mozzarella, tomato and oregano' }, preco: 44.9, precoUsd: 16.9 },
          { id: 'calabresa', img: '🍕', nome: { pt: 'Calabresa', en: 'Pepperoni' }, ds: { pt: 'Calabresa fatiada e cebola', en: 'Pepperoni and onion' }, preco: 49.9, precoUsd: 18.9 },
          { id: 'margherita', img: '🍅', nome: { pt: 'Margherita', en: 'Margherita' }, ds: { pt: 'Mussarela de búfala, tomate e manjericão', en: 'Buffalo mozzarella, tomato and basil' }, preco: 54.9, precoUsd: 19.9 },
          { id: 'portuguesa', img: '🥚', nome: { pt: 'Portuguesa', en: 'Ham & egg' }, ds: { pt: 'Presunto, ovo, cebola e azeitona', en: 'Ham, egg, onion and olives' }, preco: 52.9, precoUsd: 19.5 },
          { id: 'frango', img: '🍗', nome: { pt: 'Frango com catupiry', en: 'Chicken & cream cheese' }, ds: { pt: 'Frango desfiado e catupiry', en: 'Shredded chicken and cream cheese' }, preco: 54.9, precoUsd: 19.9 },
        ] },
        { nome: { pt: 'Doces', en: 'Desserts' }, itens: [
          { id: 'chocolate', img: '🍫', nome: { pt: 'Pizza de chocolate', en: 'Chocolate pizza' }, ds: { pt: 'Chocolate ao leite e granulado', en: 'Milk chocolate and sprinkles' }, preco: 42.9, precoUsd: 15.9 },
        ] },
        { nome: { pt: 'Bebidas', en: 'Drinks' }, itens: [
          { id: 'refri', img: '🥤', nome: { pt: 'Refrigerante 2 L', en: 'Soda 2 L' }, ds: { pt: 'Coca-Cola ou Guaraná', en: 'Coke or ginger ale' }, preco: 14, precoUsd: 3.5 },
          { id: 'suco', img: '🧃', nome: { pt: 'Suco natural 500 ml', en: 'Fresh juice 16 oz' }, ds: { pt: 'Laranja ou limão', en: 'Orange or lemonade' }, preco: 10, precoUsd: 4.5 },
        ] },
      ],
      exemplos: [
        { nome: 'Carla Souza', canal: 'WhatsApp', txt: { pt: 'Vocês entregam no centro?', en: 'Do you deliver downtown?' } },
        { nome: 'Rafael Lima', canal: 'Instagram', txt: { pt: 'Qual o valor da calabresa?', en: 'How much is the pepperoni?' } },
        { nome: 'Ana Paula', canal: 'Site', txt: { pt: 'Pedido #101 entregue, obrigada!', en: 'Order #101 delivered, thanks!' } },
      ],
    },
    hamburgueria: {
      modelo: 'pedido', cor: '#E67E22', taxa: 5, taxaUsd: 2.99,
      textos: {
        pt: { titulo: 'Smash burger do jeito certo', chamada: 'Pão brioche, blend da casa e batata crocante.', tipo: 'Hamburgueria', prazo: '30 a 40 min' },
        en: { titulo: 'Smash burgers done right', chamada: 'Brioche bun, house blend and crispy fries.', tipo: 'Burger joint', prazo: '30 to 40 min' },
      },
      categorias: [
        { nome: { pt: 'Lanches', en: 'Burgers' }, itens: [
          { id: 'classico', img: '🍔', nome: { pt: 'Smash clássico', en: 'Classic smash' }, ds: { pt: 'Blend 90 g, queijo e molho da casa', en: '3 oz patty, cheese and house sauce' }, preco: 29.9, precoUsd: 9.9 },
          { id: 'duplo', img: '🍔', nome: { pt: 'Smash duplo', en: 'Double smash' }, ds: { pt: '2 blends, cheddar e cebola caramelizada', en: '2 patties, cheddar and caramelized onion' }, preco: 36.9, precoUsd: 12.9 },
          { id: 'bacon', img: '🥓', nome: { pt: 'Bacon burger', en: 'Bacon burger' }, ds: { pt: 'Blend, bacon crocante e barbecue', en: 'Patty, crispy bacon and BBQ' }, preco: 38.9, precoUsd: 13.5 },
          { id: 'frango', img: '🍗', nome: { pt: 'Chicken crispy', en: 'Crispy chicken' }, ds: { pt: 'Frango empanado e maionese verde', en: 'Fried chicken and herb mayo' }, preco: 32.9, precoUsd: 11.5 },
        ] },
        { nome: { pt: 'Acompanhamentos', en: 'Sides' }, itens: [
          { id: 'batata', img: '🍟', nome: { pt: 'Batata frita', en: 'Fries' }, ds: { pt: 'Porção individual', en: 'Regular portion' }, preco: 14.9, precoUsd: 4.5 },
          { id: 'onion', img: '🧅', nome: { pt: 'Onion rings', en: 'Onion rings' }, ds: { pt: '8 unidades', en: '8 pieces' }, preco: 18.9, precoUsd: 5.5 },
        ] },
        { nome: { pt: 'Bebidas', en: 'Drinks' }, itens: [
          { id: 'refri', img: '🥤', nome: { pt: 'Refrigerante lata', en: 'Canned soda' }, ds: { pt: '350 ml', en: '12 oz' }, preco: 7, precoUsd: 2.5 },
          { id: 'milkshake', img: '🥛', nome: { pt: 'Milkshake', en: 'Milkshake' }, ds: { pt: 'Chocolate ou morango', en: 'Chocolate or strawberry' }, preco: 19.9, precoUsd: 6.5 },
        ] },
      ],
      exemplos: [
        { nome: 'Bruno Costa', canal: 'WhatsApp', txt: { pt: 'Tem opção sem glúten?', en: 'Any gluten-free option?' } },
        { nome: 'Juliana M.', canal: 'Instagram', txt: { pt: 'Vocês abrem domingo?', en: 'Are you open on Sunday?' } },
        { nome: 'Pedro Alves', canal: 'Site', txt: { pt: 'Pedido #101 chegou, muito bom!', en: 'Order #101 arrived, so good!' } },
      ],
    },
    // ---------------- Agendamento ----------------
    // abre/fecha: horário de atendimento (horas cheias); fechado: dias da semana sem atendimento (0 = domingo);
    // sinal: valor de exemplo pago via Pix para garantir o horário (R$ / US$). dur em minutos.
    estetica: {
      modelo: 'agendamento', cor: '#B5487A', abre: 9, fecha: 19, fechado: [0], sinal: 20, sinalUsd: 10,
      textos: {
        pt: { titulo: 'Agende seu horário em 1 minuto', chamada: 'Sobrancelhas, cílios, unhas e pele com hora marcada e lembrete no WhatsApp.', tipo: 'Estética e beleza', info: 'Segunda a sábado · 9h às 19h' },
        en: { titulo: 'Book your appointment in 1 minute', chamada: 'Brows, lashes, nails and skin care with a set time and a text reminder.', tipo: 'Beauty studio', info: 'Monday to Saturday · 9 am to 7 pm' },
      },
      profissionais: [{ id: 'camila', nome: 'Camila' }, { id: 'bianca', nome: 'Bianca' }],
      categorias: [
        { nome: { pt: 'Sobrancelhas e cílios', en: 'Brows & lashes' }, itens: [
          { id: 'sobrancelha', img: '✨', nome: { pt: 'Design de sobrancelhas', en: 'Brow shaping' }, ds: { pt: 'Com pinça e linha', en: 'Tweezers and threading' }, dur: 45, preco: 60, precoUsd: 35 },
          { id: 'henna', img: '🎨', nome: { pt: 'Sobrancelha com henna', en: 'Brow henna tint' }, ds: { pt: 'Design + henna', en: 'Shaping + henna tint' }, dur: 60, preco: 80, precoUsd: 45 },
          { id: 'lash', img: '👁️', nome: { pt: 'Lash lifting', en: 'Lash lift' }, ds: { pt: 'Curvatura natural por até 6 semanas', en: 'Natural curl for up to 6 weeks' }, dur: 60, preco: 120, precoUsd: 75 },
          { id: 'cilios', img: '🦋', nome: { pt: 'Extensão de cílios fio a fio', en: 'Classic lash extensions' }, ds: { pt: 'Aplicação completa', en: 'Full set' }, dur: 120, preco: 180, precoUsd: 120 },
        ] },
        { nome: { pt: 'Unhas', en: 'Nails' }, itens: [
          { id: 'manicure', img: '💅', nome: { pt: 'Manicure', en: 'Manicure' }, ds: { pt: 'Cutilagem e esmaltação', en: 'Cuticle care and polish' }, dur: 45, preco: 35, precoUsd: 25 },
          { id: 'pemao', img: '💅', nome: { pt: 'Pé e mão', en: 'Mani + pedi' }, ds: { pt: 'Manicure e pedicure', en: 'Manicure and pedicure' }, dur: 90, preco: 60, precoUsd: 45 },
        ] },
        { nome: { pt: 'Pele', en: 'Skin' }, itens: [
          { id: 'limpeza', img: '🧖', nome: { pt: 'Limpeza de pele', en: 'Facial cleansing' }, ds: { pt: 'Extração, máscara e hidratação', en: 'Extraction, mask and hydration' }, dur: 90, preco: 150, precoUsd: 95 },
        ] },
      ],
      exemplos: [
        { nome: 'Fernanda R.', canal: 'WhatsApp', txt: { pt: 'Tem horário sábado de manhã?', en: 'Any time Saturday morning?' } },
        { nome: 'Patrícia L.', canal: 'Instagram', txt: { pt: 'Quanto fica o lash lifting?', en: 'How much is the lash lift?' } },
        { nome: 'Juliana S.', canal: 'Site', txt: { pt: 'Amei o resultado, obrigada!', en: 'Loved it, thank you!' } },
      ],
    },
    barbearia: {
      modelo: 'agendamento', cor: '#1F2A36', abre: 9, fecha: 20, fechado: [0], sinal: 15, sinalUsd: 10,
      textos: {
        pt: { titulo: 'Seu corte sem fila de espera', chamada: 'Escolha o barbeiro, o dia e o horário. A gente te lembra antes.', tipo: 'Barbearia', info: 'Segunda a sábado · 9h às 20h' },
        en: { titulo: 'Your cut, no waiting line', chamada: 'Pick your barber, the day and the time. We remind you before.', tipo: 'Barbershop', info: 'Monday to Saturday · 9 am to 8 pm' },
      },
      profissionais: [{ id: 'rafa', nome: 'Rafa' }, { id: 'diego', nome: 'Diego' }],
      categorias: [
        { nome: { pt: 'Cabelo e barba', en: 'Hair & beard' }, itens: [
          { id: 'corte', img: '💈', nome: { pt: 'Corte', en: 'Haircut' }, ds: { pt: 'Máquina e tesoura, com lavagem', en: 'Clippers and scissors, with wash' }, dur: 40, preco: 45, precoUsd: 30 },
          { id: 'barba', img: '🧔', nome: { pt: 'Barba', en: 'Beard trim' }, ds: { pt: 'Navalha e toalha quente', en: 'Straight razor and hot towel' }, dur: 30, preco: 35, precoUsd: 20 },
          { id: 'combo', img: '✂️', nome: { pt: 'Corte + barba', en: 'Cut + beard' }, ds: { pt: 'O combo completo', en: 'The full combo' }, dur: 70, preco: 70, precoUsd: 45 },
          { id: 'pezinho', img: '🪒', nome: { pt: 'Pezinho', en: 'Line-up' }, ds: { pt: 'Acabamento entre cortes', en: 'Touch-up between cuts' }, dur: 15, preco: 15, precoUsd: 10 },
          { id: 'sobrancelha', img: '👁️', nome: { pt: 'Sobrancelha', en: 'Eyebrows' }, ds: { pt: 'Na navalha', en: 'Razor cleanup' }, dur: 15, preco: 15, precoUsd: 10 },
        ] },
      ],
      exemplos: [
        { nome: 'Lucas M.', canal: 'WhatsApp', txt: { pt: 'Tem horário hoje à noite?', en: 'Any slot tonight?' } },
        { nome: 'Gabriel T.', canal: 'Instagram', txt: { pt: 'O Rafa atende sábado?', en: 'Does Rafa work Saturday?' } },
        { nome: 'André P.', canal: 'Site', txt: { pt: 'Valeu, ficou top!', en: 'Thanks, looks great!' } },
      ],
    },
    pilates: {
      modelo: 'agendamento', cor: '#2E8B7A', abre: 7, fecha: 20, fechado: [0], sinal: 30, sinalUsd: 20,
      textos: {
        pt: { titulo: 'Agende sua aula ou sessão', chamada: 'Pilates e fisioterapia com turmas pequenas e horário marcado.', tipo: 'Pilates e fisioterapia', info: 'Segunda a sábado · 7h às 20h' },
        en: { titulo: 'Book your class or session', chamada: 'Pilates and physical therapy in small groups, by appointment.', tipo: 'Pilates & physical therapy', info: 'Monday to Saturday · 7 am to 8 pm' },
      },
      profissionais: [{ id: 'ana', nome: 'Dra. Ana' }, { id: 'lucas', nome: 'Prof. Lucas' }],
      categorias: [
        { nome: { pt: 'Pilates', en: 'Pilates' }, itens: [
          { id: 'experimental', img: '🎁', nome: { pt: 'Aula experimental', en: 'Trial class' }, ds: { pt: 'Conheça o estúdio, sem custo', en: 'Get to know the studio, free' }, dur: 50, preco: 0, precoUsd: 0 },
          { id: 'aula', img: '🧘', nome: { pt: 'Aula de pilates', en: 'Pilates class' }, ds: { pt: 'Aula avulsa em aparelhos', en: 'Single equipment class' }, dur: 50, preco: 80, precoUsd: 45 },
        ] },
        { nome: { pt: 'Fisioterapia', en: 'Physical therapy' }, itens: [
          { id: 'avaliacao', img: '📋', nome: { pt: 'Avaliação postural', en: 'Posture assessment' }, ds: { pt: 'Avaliação completa e plano de tratamento', en: 'Full assessment and treatment plan' }, dur: 60, preco: 120, precoUsd: 90 },
          { id: 'fisio', img: '🩺', nome: { pt: 'Sessão de fisioterapia', en: 'PT session' }, ds: { pt: 'Atendimento individual', en: 'One-on-one session' }, dur: 50, preco: 130, precoUsd: 95 },
        ] },
      ],
      exemplos: [
        { nome: 'Renata C.', canal: 'WhatsApp', txt: { pt: 'Vocês aceitam convênio?', en: 'Do you take insurance?' } },
        { nome: 'Marcos V.', canal: 'Instagram', txt: { pt: 'Tem aula às 7h?', en: 'Any class at 7 am?' } },
        { nome: 'Sônia A.', canal: 'Site', txt: { pt: 'Minha dor nas costas melhorou muito!', en: 'My back pain is so much better!' } },
      ],
    },

    // ---------------- Orçamento ----------------
    // de/ate: faixa de referência em R$ (deUsd/ateUsd em US$). O valor final só sai depois de avaliar.
    // perguntas: com op = escolha por botões; sem op = texto curto (ph = exemplo).
    mecanica: {
      modelo: 'orcamento', cor: '#1565C0',
      textos: {
        pt: { titulo: 'Orçamento do seu carro sem sair de casa', chamada: 'Conte o que está acontecendo, mande uma foto e receba o valor no mesmo dia.', tipo: 'Mecânica e centro automotivo', info: 'Segunda a sexta · 8h às 18h · Sábado 8h às 12h' },
        en: { titulo: 'Get a quote for your car from home', chamada: 'Tell us what is going on, send a photo and get a price the same day.', tipo: 'Auto repair shop', info: 'Monday to Friday · 8 am to 6 pm · Saturday 8 am to noon' },
      },
      perguntas: [
        { id: 'carro', rot: { pt: 'Carro e ano', en: 'Car and year' }, ph: { pt: 'Ex.: Onix 2019', en: 'E.g. Corolla 2019' } },
        { id: 'sintoma', rot: { pt: 'O que está acontecendo?', en: 'What is going on?' }, ph: { pt: 'Ex.: barulho ao frear', en: 'E.g. noise when braking' } },
        { id: 'urgencia', rot: { pt: 'Para quando?', en: 'How soon?' }, op: { pt: ['Hoje', 'Esta semana', 'Sem pressa'], en: ['Today', 'This week', 'No rush'] } },
      ],
      categorias: [
        { nome: { pt: 'Serviços', en: 'Services' }, itens: [
          { id: 'revisao', img: '🔧', nome: { pt: 'Revisão completa', en: 'Full service' }, ds: { pt: 'Óleo, filtros e checagem geral', en: 'Oil, filters and full inspection' }, de: 350, ate: 900, deUsd: 150, ateUsd: 400 },
          { id: 'freios', img: '🛑', nome: { pt: 'Freios', en: 'Brakes' }, ds: { pt: 'Pastilhas, discos e fluido', en: 'Pads, rotors and fluid' }, de: 250, ate: 700, deUsd: 150, ateUsd: 450 },
          { id: 'suspensao', img: '🚙', nome: { pt: 'Suspensão', en: 'Suspension' }, ds: { pt: 'Amortecedores e barulhos', en: 'Shocks and noises' }, de: 400, ate: 1200, deUsd: 300, ateUsd: 900 },
          { id: 'oleo', img: '🛢️', nome: { pt: 'Troca de óleo', en: 'Oil change' }, ds: { pt: 'Óleo e filtro', en: 'Oil and filter' }, de: 150, ate: 300, deUsd: 50, ateUsd: 120 },
          { id: 'ar', img: '❄️', nome: { pt: 'Ar-condicionado', en: 'A/C' }, ds: { pt: 'Carga de gás e higienização', en: 'Recharge and cleaning' }, de: 200, ate: 600, deUsd: 120, ateUsd: 350 },
          { id: 'diagnostico', img: '💡', nome: { pt: 'Diagnóstico (luz no painel)', en: 'Diagnostics (warning light)' }, ds: { pt: 'Scanner e avaliação', en: 'Scan and inspection' }, de: 120, ate: 400, deUsd: 80, ateUsd: 200 },
        ] },
      ],
      exemplos: [
        { nome: 'Roberto F.', canal: 'WhatsApp', txt: { pt: 'Vocês buscam o carro?', en: 'Do you pick up the car?' } },
        { nome: 'Cláudia M.', canal: 'Instagram', txt: { pt: 'Quanto fica a revisão do HB20?', en: 'How much for a full service?' } },
        { nome: 'Sérgio N.', canal: 'Site', txt: { pt: 'Aprovado, pode fazer.', en: 'Approved, go ahead.' } },
      ],
    },
    vidracaria: {
      modelo: 'orcamento', cor: '#00838F',
      textos: {
        pt: { titulo: 'Vidro e serralheria sob medida', chamada: 'Mande as medidas e uma foto do local. O orçamento chega no seu WhatsApp.', tipo: 'Vidraçaria e serralheria', info: 'Segunda a sexta · 8h às 18h · Sábado 8h às 12h' },
        en: { titulo: 'Custom glass and metal work', chamada: 'Send the measurements and a photo of the spot. Your quote comes by text.', tipo: 'Glass & metal shop', info: 'Monday to Friday · 8 am to 6 pm · Saturday 8 am to noon' },
      },
      perguntas: [
        { id: 'medidas', rot: { pt: 'Medidas aproximadas', en: 'Approximate size' }, ph: { pt: 'Ex.: 1,20 x 1,90 m', en: 'E.g. 4 x 6 ft' } },
        { id: 'bairro', rot: { pt: 'Bairro', en: 'Neighborhood' }, ph: { pt: 'Ex.: Centro', en: 'E.g. Downtown' } },
        { id: 'urgencia', rot: { pt: 'Para quando?', en: 'How soon?' }, op: { pt: ['Urgente', 'Esta semana', 'Sem pressa'], en: ['Urgent', 'This week', 'No rush'] } },
      ],
      categorias: [
        { nome: { pt: 'Serviços', en: 'Services' }, itens: [
          { id: 'box', img: '🚿', nome: { pt: 'Box para banheiro', en: 'Shower enclosure' }, ds: { pt: 'Vidro temperado 8 mm', en: 'Tempered glass' }, de: 900, ate: 1800, deUsd: 800, ateUsd: 1800 },
          { id: 'janela', img: '🪟', nome: { pt: 'Janela ou porta de vidro', en: 'Glass window or door' }, ds: { pt: 'Com instalação', en: 'Installed' }, de: 700, ate: 2500, deUsd: 600, ateUsd: 2500 },
          { id: 'espelho', img: '🪞', nome: { pt: 'Espelho sob medida', en: 'Custom mirror' }, ds: { pt: 'Lapidado, com fixação', en: 'Polished edges, mounted' }, de: 250, ate: 900, deUsd: 200, ateUsd: 700 },
          { id: 'portao', img: '🚪', nome: { pt: 'Portão ou grade', en: 'Gate or railing' }, ds: { pt: 'Serralheria sob medida', en: 'Custom metal work' }, de: 1200, ate: 4500, deUsd: 1200, ateUsd: 4500 },
          { id: 'cobertura', img: '🏠', nome: { pt: 'Cobertura de vidro', en: 'Glass canopy' }, ds: { pt: 'Varanda, garagem ou área', en: 'Patio, carport or deck' }, de: 2500, ate: 8000, deUsd: 2500, ateUsd: 8000 },
          { id: 'manutencao', img: '🛠️', nome: { pt: 'Manutenção e troca de vidro', en: 'Repair or glass replacement' }, ds: { pt: 'Roldanas, borrachas, vidro quebrado', en: 'Rollers, seals, broken glass' }, de: 150, ate: 500, deUsd: 150, ateUsd: 450 },
        ] },
      ],
      exemplos: [
        { nome: 'Helena B.', canal: 'WhatsApp', txt: { pt: 'Fazem espelho redondo?', en: 'Do you make round mirrors?' } },
        { nome: 'Wagner S.', canal: 'Instagram', txt: { pt: 'Quanto tempo para instalar o box?', en: 'How long to install a shower door?' } },
        { nome: 'Luciana P.', canal: 'Site', txt: { pt: 'Ficou perfeito, obrigada!', en: 'It looks perfect, thanks!' } },
      ],
    },
    reformas: {
      modelo: 'orcamento', cor: '#8D5B3A',
      textos: {
        pt: { titulo: 'Reformas e reparos com orçamento rápido', chamada: 'Pintura, elétrica, hidráulica e acabamento. Mande fotos e receba o valor.', tipo: 'Reformas e manutenção', info: 'Segunda a sábado · 8h às 18h' },
        en: { titulo: 'Home repairs with a fast quote', chamada: 'Painting, electrical, plumbing and finishing. Send photos and get a price.', tipo: 'Home improvement', info: 'Monday to Saturday · 8 am to 6 pm' },
      },
      perguntas: [
        { id: 'tamanho', rot: { pt: 'Tamanho do serviço', en: 'Job size' }, op: { pt: ['1 cômodo', '2 a 3 cômodos', 'Casa toda'], en: ['1 room', '2 to 3 rooms', 'Whole house'] } },
        { id: 'bairro', rot: { pt: 'Bairro', en: 'Neighborhood' }, ph: { pt: 'Ex.: Jardim Real', en: 'E.g. Lake Nona' } },
        { id: 'quando', rot: { pt: 'Quando quer começar?', en: 'When do you want to start?' }, op: { pt: ['Já', 'Este mês', 'Estou planejando'], en: ['Right away', 'This month', 'Just planning'] } },
      ],
      categorias: [
        { nome: { pt: 'Serviços', en: 'Services' }, itens: [
          { id: 'pintura', img: '🖌️', nome: { pt: 'Pintura', en: 'Painting' }, ds: { pt: 'Interna ou externa, com massa', en: 'Interior or exterior, with patching' }, de: 800, ate: 3500, deUsd: 600, ateUsd: 3500 },
          { id: 'eletrica', img: '⚡', nome: { pt: 'Elétrica', en: 'Electrical' }, ds: { pt: 'Tomadas, quadro, chuveiro, iluminação', en: 'Outlets, panel, lighting' }, de: 150, ate: 1200, deUsd: 150, ateUsd: 1200 },
          { id: 'hidraulica', img: '🚰', nome: { pt: 'Hidráulica', en: 'Plumbing' }, ds: { pt: 'Vazamentos, torneiras, encanamento', en: 'Leaks, faucets, pipes' }, de: 150, ate: 1000, deUsd: 150, ateUsd: 1000 },
          { id: 'piso', img: '🧱', nome: { pt: 'Piso e revestimento', en: 'Flooring & tile' }, ds: { pt: 'Assentamento e rejunte', en: 'Install and grout' }, de: 1500, ate: 6000, deUsd: 1500, ateUsd: 6000 },
          { id: 'banheiro', img: '🛁', nome: { pt: 'Reforma de banheiro', en: 'Bathroom remodel' }, ds: { pt: 'Completa, do piso ao teto', en: 'Full, floor to ceiling' }, de: 4000, ate: 15000, deUsd: 5000, ateUsd: 15000 },
          { id: 'reparos', img: '🔨', nome: { pt: 'Pequenos reparos', en: 'Small repairs' }, ds: { pt: 'Marido de aluguel', en: 'Handyman visit' }, de: 120, ate: 400, deUsd: 100, ateUsd: 350 },
        ] },
      ],
      exemplos: [
        { nome: 'Marta G.', canal: 'WhatsApp', txt: { pt: 'Vocês fazem visita para medir?', en: 'Can you come to measure?' } },
        { nome: 'Paulo R.', canal: 'Instagram', txt: { pt: 'Quanto fica pintar um quarto?', en: 'How much to paint a bedroom?' } },
        { nome: 'Denise O.', canal: 'Site', txt: { pt: 'Serviço impecável, recomendo!', en: 'Spotless work, recommended!' } },
      ],
    },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = NICHOS;
  else raiz.NICHOS = NICHOS;
})(typeof window !== 'undefined' ? window : this);
