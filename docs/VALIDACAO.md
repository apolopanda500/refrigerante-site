# VALIDACAO DO SITE (o mapa completo, validado por bateria)

> Este documento e o **mapa da vida do site**: quem faz o que, em que
> ordem, e **qual bateria prova** cada passo. Nenhum passo aqui e
> palavra: tudo foi executado em sandbox (`node tests/rodar-todos.js`).

Data da validacao: **17/10/2026** · Versao validada: **20261017t**
· Baterias: **37**, todas 10/10.

---

## 1. O caminho do cliente, do clique ate a entrega

| # | O que acontece | Quem faz | Bateria que prova |
|---|---|---|---|
| 1 | Abre a home, ve a loja aberta/fechada, o dia de entrega da semana e a faixa de região | `app.js` (`pintarCalendarioSemanal`, `pintarHorario`) | 28, 36 |
| 2 | Procura produto e vê preço do catálogo do dia | `app.js` + `catalogo.json` | 04, 33 |
| 3 | Monta o carrinho (quantidades, editar item, limpar) | `carrinho.html` + `script.js` | 10, 30, 37 |
| 4 | Escolhe **bairro e região** — define frete e dia de entrega | `loja.js` (`calcularFrete`) | 27, 30, 37 |
| 5 | Vê se o pedido passa do **mínimo de R$ 100,00** | `entregaMinima()` + `bloqueioFinalizar()` | 27, 37 |
| 6 | Informa endereço, referência e pagamento (Pix ou Dinheiro + troco) | `carrinho.html` | 27, 30 |
| 7 | **Finaliza na mesma página** (não existe mais `checkout.html`) | `finalizarPedidoCarrinho()` | 30 |
| 8 | Pedido nasce `CVAAAAMMDD-NNN-XXXXX` com histórico datado e vai para a nuvem | `criarPedido()` | 30, 32, 35 |
| 9 | Se a internet falhou, **sobe sozinho** depois | `reenviarPedidosPresos()` | 32 |
| 10 | Acompanha: aguardando → confirmado → separação → saiu → entregue | `meus-pedidos.html` + `central.js` | 29, 30, 36 |
| 11 | Avalia a entrega de 1 a 5 estrelas | `salvarAvaliacao()` | 37 |

## 2. O caminho do dono, do aviso ate o caixa

| # | O que acontece | Onde | Bateria que prova |
|---|---|---|---|
| 1 | Recebe o pedido no Telegram **com botões**, mesmo com o painel fechado | `.github/scripts/bot-telegram.js` (rodando a cada 5 min) | 26, 36 |
| 2 | Abre o painel: vê **todos** os pedidos, de qualquer aparelho | `admin.html` + `sincronizarPedidosNuvem()` | 32, 35 |
| 3 | Busca por nome, telefone ou bairro; abre a ficha com a hora exata | `admin.html` | 35 |
| 4 | **Confirma / separa / envia / entrega / cancela / reabre** (painel ou botão do Telegram) | `atualizarStatus()` / `st|id|status` | 30, 35, 36 |
| 5 | **Edita** um dado do pedido (bairro, endereço, telefone…) sem perder o histórico | `/editar` + painel | 35 |
| 6 | Muda preço de um produto para **todos** os clientes na hora | `/precos.json` no Firebase | 31 |
| 7 | Exporta o dia para Excel (13 colunas) | `exportarPedidos()` | 31, 35 |
| 8 | O catálogo e os preços oficiais são lidos 2x por dia, de segunda a sexta | `catalogo.yml` (10h e 14h) | 33 |

## 3. As regras que nunca mudam (e quem confere)

| Regra | Fonte única | Bateria |
|---|---|---|
| Pedidos das **08:50 às 15:00**, segunda a sexta | `loja.js` (`HORA_ABRE_PEDIDOS`) | 02, 28, 36 |
| Sábado: **só entrega**; domingo: nada | `DIAS_LOJA` + `diaSomenteEntrega()` | 28, 36 |
| Entrega nas ruas das 06:00 às 18:00 | `HORARIOS.entrega` | 02, 28 |
| Pedido é feito **um dia antes** da entrega | `diasPedidoDaRegiao()` | 01, 30 |
| Mínimo de R$ 100,00 · frete grátis acima de R$ 150,00 | `entregaMinima()` / `freteGratisMinimo()` | 27, 29, 37 |
| Dinheiro sempre `R$ 4.260,00` (2 casas, vírgula, ponto de milhar) | `formatBRL()` | 03, 37 |
| Data sempre `dd/mm/aaaa hh:mm:ss` | `dataHoraSegundos()` | 28 |
| **O preço é do dono**: o robô nunca altera | `sync-catalogo.js` + `precos-base.json` | 33 |
| Número do pedido único por aparelho (sufixo) | `gerarId()` | 30, 35 |

## 4. Entradas hostis já testadas (erros futuros)

- Pedido da nuvem sem nome, sem histórico, com texto no lugar de número, sem id → o robô e o painel seguem funcionando (36, 37).
- `localStorage` do carrinho corrompido (JSON inválido, objeto no lugar de lista) → o site repara e abre limpo (37).
- Nome com HTML, aspas, quebra de linha, emoji ou 200 letras → nada quebra (37).
- Dois clientes no mesmo dia com o mesmo número → não se sobrescrevem mais (35).
- Telefone de outra pessoa no mesmo aparelho → não vê o pedido alheio (30, 37).

## 5. O que ainda é responsabilidade do dono

1. **Ajustar os 8 preços de chopp** que divergem do site oficial (o robô avisou no Telegram).
2. Rodar `node tests/rodar-tudos.js` antes de mexer em qualquer coisa (`rodar-todos.js`).
3. Trocar o número do WhatsApp em **um lugar só**: `CONTATO_LOJA` em `loja.js`.
4. Trocar horário/região/troco: `loja.js` (`HORA_ABRE_PEDIDOS`, `REGIOES`, `BAIRROS`).
