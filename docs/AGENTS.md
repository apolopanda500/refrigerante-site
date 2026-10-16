/* SE LAZO -- AGENTS ------
  AGENTS.md — comportamento de renderização
  - padrão WIDTH  | * o FIXED é empregado quando a sylesheet condicional
  - aplica a regra de deixa o header fixo e as tabelas com
    height:100% no modo mobile vertical, evitando colapsos
  - o catálogo e o botão de minimizar são trazidos pela função
    pintarTabelaGeral() + aplicarEstadoTabelaInfo(), que fuja de
    duas chamadas consecutivas.
  QUANDO MODIFICAR
  - nao renderizem o mesmo bloco duas vezes (pintarTabelaGeral tem guarda).
  - a tabela de informações da home já nasce recolhida no celular em pé;
    o estado fica em localStorage:tabelaInfoMini.
  - o menu que desliza para fora da tela vale só no painel (body.admin).
    Nas páginas do cliente a lista é faixa rolável dentro do header.
  - datas sempre por dataHoraSegundos/dataCurta (script.js): dd/mm/aaaa hh:mm:ss
  - dinheiro sempre por formatBRL (script.js): 2 casas, virgula e ponto de
    milhar (R$ 4.260,00). nunca monte "R$ " + valor.toFixed na mao.
  - cor de texto de sucesso/erro/atencao sempre por var(--texto-ok),
    var(--texto-erro) e var(--texto-aviso): no tema escuro a cor fixa
    ficava em ~3:1 e a frase sumia.
  - avisos reais do cliente ficam em central.js (Notification + toast);
    o caminhão azul é img/608AZUL.jpeg (a foto vem de CAMINHOES em loja.js)
  ANTES DE PUBLICAR
  - node tests/manter-tudo.js  (versões, datas, links, docs, robô)
  - node tests/rodar-todos.js  (tem que dar TUDO 10/10)
*/
