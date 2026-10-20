# VALIDACAO DO SITE (o mapa completo, validado por bateria)

> Este documento e o **mapa da vida do site**: quem faz o que, em que
> ordem, e **qual bateria prova** cada passo. Nenhum passo aqui e
> palavra: tudo foi executado em sandbox (`node tests/rodar-todos.js`).

Data da validacao: **20/10/2026** · Versao validada: **20261020f**
· Baterias: **47**, todas 10/10.

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

## 6. O BANCO DO FIREBASE ESTA FECHADO (reconferido em 20/10/2026)

As regras de `database.rules.json` foram publicadas no projeto
`planning-with-ai-9b2c9` e conferidas com `node tools/checar-banco-real.js`
sem senha:

```
GET /pedidos.json    -> HTTP 401  (ninguem de fora le nome, CPF, telefone, endereco)
GET /avaliacoes.json -> HTTP 401
GET /config.json     -> HTTP 401
GET /controle.json   -> HTTP 401
GET /bot.json        -> HTTP 401
GET /precos.json     -> HTTP 200  (publico de proposito: preco da bebida)
GET /capacidade.json -> HTTP 200  (publico de proposito: so numeros do dia)
```

**O gateway continua lendo e gravando** porque se identifica no Firebase
como o usuario `gateway-convencao` (token assinado pela conta de servico).
As regras liberam **somente esse uid**; nao ha leitura/escrita publica em
`/pedidos`, `/avaliacoes`, `/config`, `/controle` nem `/bot`.

Regras publicadas (resumo; o arquivo completo esta em `database.rules.json`):

```json
{
  "rules": {
    "precos":     { ".read": true, ".write": "auth.uid === 'gateway-convencao'" },
    "capacidade": { ".read": true, ".write": "auth.uid === 'gateway-convencao'" },
    "pedidos":    { ".read": "auth.uid === 'gateway-convencao'", ".write": "auth.uid === 'gateway-convencao'" },
    "avaliacoes": { ".read": "auth.uid === 'gateway-convencao'", ".write": "auth.uid === 'gateway-convencao'" },
    "config":     { ".read": "auth.uid === 'gateway-convencao'", ".write": "auth.uid === 'gateway-convencao'" },
    "controle":   { ".read": "auth.uid === 'gateway-convencao'", ".write": "auth.uid === 'gateway-convencao'" },
    "bot":        { ".read": "auth.uid === 'gateway-convencao'", ".write": "auth.uid === 'gateway-convencao'" }
  }
}
```

**Correcao aplicada no gateway:** o token personalizado precisava do campo
`sub` (alem de `iss`, `aud`, `uid`, `iat` e `exp`) e o Worker precisava do
segredo `FB_API_KEY`. Sem isso o Firebase respondia `INVALID_CUSTOM_TOKEN`
e o `/api/saude` caia para o caminho publico (401). Depois da correcao,
`/api/saude` responde `{"ok":true,"banco":true,"servo":true,"caminho":"identidade"}`.

Depois de qualquer mudanca nas regras, rode:

```powershell
node tools/checar-banco-real.js   # pedidos/avaliacoes/config/controle/bot = 401
node tools/testar-gateway.js      # cria, le e cancela um pedido de teste real
```

### 6.2 🟢 RESOLVIDO — O TOKEN DO TELEGRAM SAIU DO CODIGO

O token que estava em `script.js`, `telegram.js` e nos workflows foi
confirmado como **revogado** (a API do Telegram responde 401) e o alerta
do GitHub foi fechado como *revoked*. O robô lê `TG_TOKEN` de
**GitHub Secrets**; nenhum token novo pode voltar para o site.

A chave web do Firebase (`apiKey`) também foi tratada: ela é pública por
projeto, está restrita por API e o alerta foi fechado como *false
positive*. Nenhuma chave privada da conta de serviço está no repositório.

### 6.3 🟡 MENOR, MAS SABIDO

- A senha do painel esta em texto puro no `script.js` (limitacao
  documentada): o login esconde a tela, nao protege o dado. Com o banco
  fechado isso deixa de importar tanto.
- O limite de pedidos por cliente é contado **no aparelho**: o mesmo
  cliente em dois celulares teria duas contagens. O limite da loja já é
  global (vem do painel). Para o do cliente ser global também, a contagem
  tem de passar pelo gateway (passo 2 de `docs/FECHAR-BANCO.md`).
- O dono ainda precisa **testar no celular de verdade** um pedido
  completo, com o APK instalado (as baterias 40/41 usam navegador no PC).
- 8 precos de chopp divergem do site oficial: decisao de negocio.

### 6.4 SIMULACAO REAL NO AR (20/10/2026)

As duas telas que o público usa foram abertas em navegador de verdade
contra o site publicado, **três rodadas seguidas** cada uma:

| Tela | Bateria | Rodadas | Resultado |
|---|---|---|---|
| Cliente (home, catálogo, carrinho, botões) | `tests/40-botoes-vivos.js` | 3 | 10/10 nas 3 |
| Vendedor (login, pedidos, status, testar banco) | `tests/41-painel-de-verdade.js` | 3 | 10/10 nas 3 |

Também rodaram `tests/30-fluxo-cliente.js` e `tests/31-painel-vendedor.js`
(10/10) e a suíte completa **duas vezes** (47/47). Entrega online 10/10 na
versão **20261020f**, com os dois APKs baixando 200 e assinados na mesma
versão.

### 6.5 O QUE JA ESTA PRONTO (so para deixar claro)

- 47 baterias, todas 10/10, rodando o codigo de verdade.
- Login do painel/APK com "Manter conectado" (1, 7 ou 30 dias), token salvo no
  aparelho e expirado apagado sozinho; teste 23.
- Site no ar na versao vigente (20261020f), com APK do cliente e do
  vendedor **rebuildados e assinados na mesma versao**.
- Robo do catalogo, robo do Telegram 24/7 e bot do painel funcionando.
- GitHub Actions sem avisos: as 7 rotinas passaram com as actions atuais.
- Alertas de segredo do GitHub: **0 abertos** (1 revogado, 1 falso positivo).
- Documentacao: `PROJETO`, `ARVORE`, `MANUAL-DONO`, `LEIA-ME`,
  `VALIDACAO` (este) e `REGISTRO` (o que foi feito).
