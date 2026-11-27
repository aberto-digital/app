/* AbertoCore · Link de experiência: conteúdo padrão de cada nicho.
   Cada nicho tem o modelo (pedido | agendamento | orcamento), a cor padrão, os textos do site
   em pt e en, o cardápio/catálogo e os contatos de exemplo que aparecem na vitrine.
   Itens: preco em R$ e precoUsd em US$; img é um emoji usado como ilustração. */
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
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = NICHOS;
  else raiz.NICHOS = NICHOS;
})(typeof window !== 'undefined' ? window : this);
