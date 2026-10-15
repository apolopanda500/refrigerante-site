# Árvore do projeto — referência rápida

```
refrigerante-site/
├─ index.html ....................... vitrine do cliente
├─ carrinho.html .................... cesto + limpar carrinho
├─ checkout.html .................... finalizar pedido (região + pagamento)
├─ perfil.html ...................... dados do cliente
├─ meus-pedidos.html ................ histórico do cliente
├─ pedido-sucesso.html .............. confirmação
├─ configuracoes.html ............... preferências (tema, letra, frete, app)
├─ admin.html ....................... painel do vendedor
│
├─ style.css ........................ temas (claro/guara/rosa/vermelho/dark)
├─ theme.js ......................... aplica tema antes de pintar
├─ app.js ........................... catálogo, preços, horários, vitrine
├─ loja.js .......................... regiões, frete, regra de atendimento
├─ script.js ....................... carrinho, pedidos, aviso Telegram
├─ conta.js ......................... perfil (fonte única)
├─ ia.js ........................... assistente de IA (só o botão flutuante para o cliente)
├─ central.js ....................... avisos reais no aparelho (Notification)
├─ telegram.js ...................... comandos do bot do vendedor
├─ app-update.js .................... service worker + "Atualizar agora"
├─ firebase-appcheck.js ............. proteção do banco de preços
├─ sw.js ............................ cache do app instalado
├─ versao.txt ....................... versão atual (dispara atualização)
│
├─ catalogo.json .................... catálogo do dia (gerado pelo robô)
├─ precos-base.json ................. preços do dono (o robô nunca altera)
│
├─ manifest.json .................... app do cliente (PWA)
├─ manifest-vendedor.json ........... app do painel (PWA)
│
├─ apk/
│  ├─ convencao-cliente.apk ......... APK do cliente
│  └─ convencao-vendedor.apk ........ APK do painel
│
├─ img/
│  ├─ p01..p36.jpg .................. fotos antigas (lista fixa)
│  ├─ 608VERDE.jpg / 608AZUL.jpeg .. fotos dos caminhões (verde e azul)
│  ├─ cat/ .......................... fotos do catálogo oficial (id do produto)
│  └─ icon-*.png .................... ícones do app
│
├─ .github/
│  ├─ scripts/
│  │  ├─ sync-catalogo.js .......... robô do catálogo
│  │  ├─ publicar-precos.js ........ publica preços no Firebase
│  │  └─ ultimo-resumo.json ........ resumo da última rodada
│  └─ workflows/
│     ├─ catalogo.yml .............. robô seg-sex 10:00 + aviso Telegram
│     └─ check.yml .................. sintaxe + TODOS os testes a cada push
│
├─ docs/
│  └─ PROJETO.md .................... documentação completa
│
├─ build-apk.ps1 .................... gerador dos APK
├─ serve.ps1 ........................ servidor local para testes
├─ mcp.json ......................... agentes de IA no repositório (MCP)
└─ .cursor/mcp.json ................. mesmo, para o editor Cursor
```

## Ordem de carga dos scripts (importante)

```
index.html:        theme.js → conta.js → loja.js → app.js
                   → firebase-appcheck.js → app-update.js → ia.js
                   → central.js

demais páginas     theme.js → conta.js → firebase-appcheck.js
do cliente:        → app-update.js → ia.js → central.js
                   → loja.js → script.js

admin.html:        theme.js → script.js → telegram.js → app.js
                   → firebase-appcheck.js → app-update.js
                   (sem ia.js: o painel é independente do cliente)
```

Se um script for carregado antes do que depende dele, dá `ReferenceError`.
`script.js` define os pedidos; `loja.js` define região e frete; `app.js`
depende dos dois. `central.js` (avisos) usa `getPedidos()` do `script.js`,
por isso só age depois do DOM pronto.

## Celular em pé (modo vertical)

- O header das páginas do cliente é `position:fixed`
  (`style.css`, regra `@media (max-width:768px) and (orientation:portrait)`).
- O menu que desliza para fora da tela vale **só no painel** (`body.admin`).
  Nas páginas do cliente a lista é uma faixa rolável dentro do header —
  é o que impede o menu de sumir (inclusive em `meus-pedidos.html`).
- Nesse modo as tabelas ganham `height:100%` para as linhas não colapsarem
  quando viram cartões.
- A tabela de informações da home tem botão **Minimizar**
  (`alternarTabelaInfo()` em `app.js`, estado em `localStorage:tabelaInfoMini`).