# Árvore do projeto — mapa completo

> Mapa para o dia a dia: **onde mexer** em cada assunto.
> Se algo não estiver aqui, provavelmente não existe mais.
> Para conferir, rode `node tests/manter-tudo.js`.

```
refrigerante-site/
│
├─ PAGINAS DO CLIENTE (o que o cliente vê)
│  ├─ index.html .................... vitrine: busca, calendário, tabela de
│  │                                informações (Minimizar), catálogo, ofertas
│  ├─ carrinho.html ................. itens, +/− grandes, frete, limpar carrinho
│  ├─ checkout.html ................. resumo, região, pagamento (Pix/Dinheiro)
│  ├─ perfil.html ................... SÓ dados pessoais e contato + foto
│  ├─ meus-pedidos.html ............. HISTÓRICO (pedidos, itens, total gasto,
│  │                                avaliação por estrelas) — é a página do menu
│  ├─ pedido-sucesso.html ........... confirmação do pedido
│  └─ configuracoes.html ............ perfil, avisos, letra, leitura, tema,
│                                   dados, versões (cliente x site)
│
├─ PAINEL DO VENDEDOR (só o dono entra)
│  └─ admin.html .................... pedidos de TODO mundo, busca por nome/
│                                   telefone/bairro, ficha com horário exato,
│                                   editor de preços (Minimizar), ferramentas,
│                                   calc. de troco, contagem de mercadorias,
│                                   anotações, exportar, config do painel,
│                                   bot do Telegram, versões e sincronização
│
├─ CODIGO DO SITE
│  ├─ app.js ........................ catálogo, preços em tempo real, horários,
│  │                                horários de entrega, tabela geral, ofertas
│  ├─ loja.js ........................ regiões, dias de pedido/entrega, frete,
│  │                                horário da loja (08:50–15:00), caminhos
│  ├─ script.js ..................... carrinho, criação de pedido, status,
│  │                                histórico com data/hora, Telegram (aviso),
│  │                                nuvem (pedidos/avaliações), datas
│  ├─ conta.js ...................... perfil do cliente (fonte única)
│  ├─ theme.js ...................... tema/letra/contraste/leitura antes de
│  │                                pintar; painel usa vendedorPrefs
│  ├─ central.js .................... avisos reais no aparelho (Notification),
│  │                                toast, vigia de erros da rede
│  ├─ ia.js .......................... assistente (só o botão flutuante para
│  │                                o cliente), motor local + nuvem
│  ├─ telegram.js ................... comandos do bot (/confirmar, /editar,
│  │                                /reabrir, /buscar, /status, /hoje...)
│  ├─ app-update.js ................. service worker, barra "Atualizar agora",
│  │                                botão instalar, VERSAO_APP
│  ├─ firebase-appcheck.js .......... proteção do banco de preços
│  ├─ sw.js ......................... cache do app instalado (offline)
│  └─ style.css ..................... temas (claro, guaraná, rosa, vermelho,
│                                   escuro), tabelas, celular vertical,Minimizar
│
├─ DADOS
│  ├─ catalogo.json ................. catálogo do dia (gerado pelo robô)
│  ├─ precos-base.json .............. preços do dono (o robô NUNCA altera)
│  └─ versao.txt .................... versão publicada (ex.: 20261016d)
│
├─ APP DE CELULAR
│  ├─ manifest.json ................. PWA do cliente
│  ├─ manifest-vendedor.json ........ PWA do painel
│  ├─ apk/
│  │  ├─ convencao-cliente.apk ...... APK do cliente
│  │  ├─ convencao-vendedor.apk ..... APK do painel
│  │  ├─ convencao.jks .............. chave de assinatura (NÃO versionar)
│  │  ├─ versao-projeto.txt ......... versão do projeto Android gerado
│  │  ├─ versao-apk.txt ............. versão do APK assinado (build-apk.ps1)
│  │  └─ android/ ................... projeto Gradle (build.js gera)
│  ├─ build-apk.ps1 .................. JDK 17 + Bubblewrap + APK dos dois
│  └─ build-apk.ps1 usa versao.txt .. APK sai na MESMA versão do site
│
├─ FERRAMENTAS
│  ├─ rebuild.ps1 ................... regerar o projeto Android
│  ├─ make_svgs.ps1 ................. ícones do app
│  ├─ tools/gerar-icone.js .......... gera os PNG do ícone
│  └─ mcp.json, .cursor/mcp.json .... agentes de IA no repositório
│
├─ ROBÔS E AUTOMAÇÃO
│  ├─ .github/scripts/
│  │  ├─ sync-catalogo.js ........... lê o site oficial, baixa fotos,
│  │  │                              gera catalogo.json (seg-sex 10:00)
│  │  ├─ publicar-precos.js ......... publica a tabela de preços no Firebase
│  │  ├─ bot-telegram.js ............ robô do bot 24/7: lê o Telegram,
│  │  │                              aplica o status no Firebase e responde
│  │  └─ ultimo-resumo.json ......... resumo da última rodada
│  └─ .github/workflows/
│     ├─ catalogo.yml ............... robô diário + aviso no Telegram
│     ├─ bot.yml .................... bot do Telegram 24/7 (a cada 5 min)
│     └─ check.yml .................. sintaxe + TODOS os testes a cada push
│
├─ TESTES E MANUTENÇÃO
│  ├─ tests/rodar-todos.js .......... roda as 27 baterias (TUDO 10/10)
│  ├─ tests/manter-tudo.js .......... alinha versões, datas, links, docs, robô
│  ├─ tests/bump-versao.js .......... sobe a versão em todos os arquivos
│  ├─ tests/13-validar-css.js ....... confere o CSS todo (sintaxe, classe sem uso, cobertura, duplicata)
│  ├─ tests/14-cores.js ........... contraste WCAG, cor que some, alto contraste
│  ├─ tests/15-imagens.js ......... arquivo, alt, loading, reserva, icone
│  ├─ tests/16-letras-numeros.js .. tamanho de letra, moeda, data, numero em coluna
│  ├─ tests/17-tamanhos.js ........ alvo de toque, viewport, nada estourando
│  ├─ tests/18-codigo.js .......... sintaxe, rascunho, escopo, codigo morto, segredo
│  ├─ tests/19-erros.js ........... catch calado, promessa sem catch, aviso ao cliente
│  ├─ tests/20-documentos.js ...... documentos em dia com o codigo
│  ├─ tests/21-repositorio.js ..... gitignore, build fora do git, arquivo grande
│  ├─ tests/22-entrega.js ......... commit, push e deploy na mesma versao
│  ├─ tests/limpar-css-morto.js ..... apaga CSS morto (relatório; --aplicar limpa)
│  ├─ tests/01..27-*.js ............. as 27 baterias
│  └─ tests/LEIA-ME.md .............. como rodar e o que cada bateria confere
│
├─ DOCUMENTAÇÃO
│  ├─ docs/PROJETO.md ............... referência técnica (verdade do repo)
│  ├─ docs/ARVORE.md ................ este mapa
│  ├─ docs/MANUAL-DONO.md ........... guia do dono, sem termos técnicos
│  ├─ docs/AGENTS.md ................ regras de renderização para agentes
│  └─ README.md ..................... apresentação rápida
│
├─ IMAGENS
│  ├─ img/icon-*.png ................ ícones do app
│  ├─ img/608VERDE.jpg .............. caminhão verde
│  ├─ img/608AZUL.jpeg ............. caminhão azul
│  ├─ img/p01..p36.jpg .............. fotos antigas (lista fixa)
│  └─ img/cat/ ...................... fotos do catálogo oficial
│
└─ REFERÊNCIA (não é do site)
   ├─ produtos_ref.html ............. cópia do site oficial (só consulta)
   └─ _oficial/ ...................... cópia do site oficial
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
**Nunca escreva código dentro de `<script src="...">`**: o navegador ignora o
conteúdo inline e a função "some" sem erro (o teste 06 fiscaliza isso).

## Padrão de data e hora

Tudo que mostra data passa por `dataHoraSegundos()` / `dataCurta()` em
`script.js`, no formato **`dd/mm/aaaa hh:mm:ss`** (ex.: `15/10/2026 14:12:37`).

## Antes de publicar (checklist)

```powershell
node tests/manter-tudo.js      # versões, datas, links, docs, robô
node tests/rodar-todos.js      # 27 baterias — tem que dar TUDO 10/10
node tests/limpar-css-morto.js # CSS morto: relatório (--aplicar limpa)
node tests/22-entrega.js --online  # commit, push e deploy na mesma versão
node tests/bump-versao.js 20261016c
node apk/android/build.js      # projeto Android na MESMA versão do site
gradle -p apk/android :cliente:assembleRelease :vendedor:assembleRelease
git add -A
git commit -m "descrição curta em português"
git push origin main
```

## Celular em pé (modo vertical)

- Header `position:fixed` em todas as páginas do cliente.
- O menu que desliza para fora da tela vale **só no painel** (`body.admin`).
  Nas páginas do cliente a lista é uma faixa rolável dentro do header.
- Nesse modo as tabelas ganham `height:100%` para as linhas não colapsarem.
- A tabela de informações da home tem botão **Minimizar**
  (`alternarTabelaInfo()` em `app.js`, estado em `localStorage:tabelaInfoMini`).
