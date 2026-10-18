# VALIDACAO DO SITE (o mapa completo, validado por bateria)

> Este documento e o **mapa da vida do site**: quem faz o que, em que
> ordem, e **qual bateria prova** cada passo. Nenhum passo aqui e
> palavra: tudo foi executado em sandbox (`node tests/rodar-todos.js`).

Data da validacao: **17/10/2026** · Versao validada: **20261018h**
· Baterias: **46**, todas 10/10.

---

## 1. O caminho do cliente, do clique ate a entrega

| # | O que acontece | Quem faz | Bateria que prova |
|---|---|---|---|
| 1 | Abre a home, ve a loja aberta/fechada, o dia de entrega da semana e a faixa de região | `app.js` (`pintarCalendarioSemanal`, `pintarHorario`) | 28, 36 |
| 2 | Procura produto e vê preço do catálogo do dia | `app.js` + `catalogo.json` | 04, 33 |
| 3 | Monta o carrinho (quantidades, editar item, limpar) | `carrinho.html` + `script.js` | 10, 30, 37 |
| 4 | Escolhe **bairro e região** — define frete e dia de entrega | `loja.js` (`calcularFrete`) | 27, 30, 37 |
| 5 | Vê se o pedido passa do **mínimo de R$ 100,00** | `entregaMinima()` + `bloqueioFinalizar()` | 27, 37 |
| 5b | Se ainda tem vaga hoje (2 do cliente, 80 da loja) — senão o botão desliga e ele fala com o dono | `checaLimitePedidos()` | 39 |
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
| **Máximo de pedidos por dia** (2 por cliente, 80 na loja) | `checaLimitePedidos()` em `loja.js` | 39 |

## 4. Entradas hostis já testadas (erros futuros)

- Pedido da nuvem sem nome, sem histórico, com texto no lugar de número, sem id → o robô e o painel seguem funcionando (36, 37).
- `localStorage` do carrinho corrompido (JSON inválido, objeto no lugar de lista) → o site repara e abre limpo (37).
- Nome com HTML, aspas, quebra de linha, emoji ou 200 letras → nada quebra (37).
- Dois clientes no mesmo dia com o mesmo número → não se sobrescrevem mais (35).
- Telefone de outra pessoa no mesmo aparelho → não vê o pedido alheio (30, 37).
- Histórico de pedidos corrompido (JSON inválido) no carrinho → a válvula lê por
  um leitor protegido, **não vira tela branca** e não impede a compra (39).
- Preferência de limite corrompida, lista sem telefone ou pedido sem `criadoEm`
  → a trava volta ao padrão e **ninguém fica trancado fora** (39).

## 5. O que ainda é responsabilidade do dono

1. **Ajustar os 8 preços de chopp** que divergem do site oficial (o robô avisou no Telegram).
2. Rodar `node tests/rodar-todos.js` antes de mexer em qualquer coisa.
3. Trocar o número do WhatsApp em **um lugar só**: `CONTATO_LOJA` em `loja.js`.
4. Trocar horário/região/troco: `loja.js` (`HORA_ABRE_PEDIDOS`, `REGIOES`, `BAIRROS`).

---

## 6. O QUE AINDA NAO ESTA PRONTO (achado na validacao de 17/10/2026)

Tudo acima esta validado por bateria. Mas, para **trabalhar com
pessoas de verdade**, existem dois buracos de seguranca que so o dono
pode fechar:

### 6.1 🔴 O BANCO DO FIREBASE ESTA ABERTO (leitura e escrita)

Testado de verdade em 17/10/2026, sem senha:

```
GET  /pedidos.json     -> HTTP 200  ( anybody le ): nome, CPF, telefone, endereco
PUT  /qualquer-chave   -> HTTP 200  ( anybody escreve )
DELETE /qualquer-chave -> HTTP 200  ( anybody apaga )
```

Ou seja: qualquer pessoa com a URL do projeto consegue **ler os pedidos
de todo mundo (com CPF)** e ainda **mexer** no banco. Para uma loja de
bebidas com clientes reais isso e o item mais urgente.

**Como fechar (Firebase Console > Realtime Database > Regras):**

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "pedidos": { ".read": false, ".write": false },
    "precos":  { ".read": true,  ".write": false },
    "avaliacoes": { ".read": false, ".write": false }
  }
}
```

Mas isso quebra o painel (que hoje lê e escreve direto). O caminho
certo e colocar um **proxy autenticado** (Cloud Function ou Cloudflare
Worker) entre o site e o banco: o site chama o proxy, o proxy confere
a senha do painel e so ele fala com o Firebase.

### 6.2 🔴 O TOKEN DO TELEGRAM ESTA NO CODIGO PUBLICO

O token aparece em `script.js`, `telegram.js` e nos dois workflows.
Ele e o mesmo em todas as paginas da internet. Quem le o codigo
consegue ler a conversa do bot e mandar mensagem no chat do dono.
Se trocar o bot, o token novo tem de ir para **GitHub Secrets** e para
o proxy - nunca para o site.

### 6.3 🟡 MENOR, MAS SABIDO

- A senha do painel esta em texto puro no `script.js` (limitacao
  documentada): o login esconde a tela, nao protege o dado. Com o banco
  fechado isso deixa de importar tanto.
- O limite de pedidos por cliente é contado **no aparelho**: o mesmo
  cliente em dois celulares teria duas contagens. O limite da loja já é
  global (vem do painel). Para o do cliente ser global também, a contagem
  tem de passar pelo gateway (passo 2 de `docs/FECHAR-BANCO.md`).
- O dono ainda precisa **testar no celular de verdade** um pedido
  completo (as baterias rodam a logica em sandbox, nao ha navegador).
- 8 precos de chopp divergem do site oficial: decisao de negocio.

### 6.4 O QUE JA ESTA PRONTO (so para deixar claro)

- 43 baterias, todas 10/10, rodando o codigo de verdade.
- Site no ar na versao vigente (20261018h), com APK do cliente e do
  vendedor **rebuildados e assinados na mesma versao**.
- Robo do catalogo, robo do Telegram 24/7 e bot do painel funcionando.
- Documentacao: `PROJETO`, `ARVORE`, `MANUAL-DONO`, `LEIA-ME`,
  `VALIDACAO` (este) e `REGISTRO` (o que foi feito).
