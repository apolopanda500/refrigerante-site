# Árvore do projeto — mapa completo

> Mapa para o dia a dia: **onde mexer** em cada assunto.
> Versão atual do site e dos APKs: **20261020f**.
> Se algo não estiver aqui, provavelmente não existe mais.
> Para conferir tudo, rode `node tests/manter-tudo.js` e `node tests/rodar-todos.js`.

```
refrigerante-site/
|
+-- PAGINAS DO CLIENTE (o que o cliente ve)
|   +-- index.html .................. vitrine: busca, calendario, tabela de
|   |                                informacoes (Minimizar), catalogo, ofertas
|   +-- carrinho.html ............... itens + finalizacao na mesma pagina:
|   |                                quantidades, editar item, limpar carrinho,
|   |                                bairro/regiao, endereco, pagamento
|   |                                (Pix/Dinheiro) e o botao Finalizar pedido
|   |                                (nao existe mais checkout.html)
|   +-- perfil.html ................. dados pessoais e contato + foto
|   +-- meus-pedidos.html ........... historico (pedidos, itens, total gasto,
|   |                                avaliacao por estrelas)
|   +-- pedido-sucesso.html ......... confirmacao do pedido
|   +-- configuracoes.html .......... perfil, avisos, letra, leitura, tema,
|                                    dados, versoes (cliente x site) e o
|                                    botao "Baixar aplicativo (APK)"
|
+-- PAINEL DO VENDEDOR (so o dono entra)
|   +-- admin.html .................. pedidos de todo mundo, busca por nome/
|                                    telefone/bairro, ficha com horario exato,
|                                    editor de precos (Minimizar), ferramentas,
|                                    calculadoras, anotacoes, exportar, config
|                                    do painel, bot do Telegram, versoes e
|                                    sincronizacao. Login com "Manter
|                                    conectado" (1, 7 ou 30 dias)
|
+-- CODIGO DO SITE
|   +-- app.js ...................... catalogo, precos em tempo real, horarios,
|   |                                horarios de entrega, tabela geral, ofertas
|   +-- loja.js ..................... regioes, dias de pedido/entrega, frete,
|   |                                horario da loja, caminhoes e a VALVA do dia
|   |                                (limite de 1 pedido por CPF/dia e 80 por dia)
|   +-- script.js ................... carrinho, criacao de pedido, status,
|   |                                historico com data/hora, Telegram, nuvem,
|   |                                gateway (token do dono com prazo de 1 a 30
|   |                                dias), datas
|   +-- conta.js .................... perfil do cliente (fonte unica)
|   +-- theme.js .................... tema/letra/contraste/leitura antes de
|   |                                pintar; painel usa vendedorPrefs
|   +-- central.js .................. avisos reais no aparelho (Notification),
|   |                                toast e vigia de erros da rede
|   +-- ia.js ....................... assistente (so o botao flutuante para o
|   |                                cliente), motor local + nuvem
|   +-- telegram.js ................. comandos do bot (/confirmar, /editar,
|   |                                /reabrir, /buscar, /status, /hoje...)
|   +-- app-update.js ............... service worker, barra "Atualizar agora",
|   |                                botao instalar e VERSAO_APP
|   +-- firebase-appcheck.js ........ protecao do banco de precos
|   +-- sw.js ....................... cache do app instalado (offline)
|   +-- style.css ................... temas (claro, guarana, rosa, vermelho,
|   |                                escuro), tabelas, celular vertical, Minimizar
|   +-- js/validate.js .............. validacao do formulario
|   +-- manifest.json ............... PWA do cliente
|   +-- manifest-vendedor.json ...... PWA do painel
|
+-- DADOS
|   +-- catalogo.json ............... catalogo do dia (gerado pelo robo)
|   +-- precos-base.json ............ precos do dono (o robo NUNCA altera)
|   +-- database.rules.json ......... regras do Firebase (banco fechado)
|   +-- versao.txt .................. versao publicada: 20261020f
|
+-- APK ANDROID
|   +-- apk/
|   |   +-- convencao-cliente.apk ... APK do cliente (versao 20261020f)
|   |   +-- convencao-vendedor.apk .. APK do painel (versao 20261020f)
|   |   +-- convencao.jks ........... chave de assinatura (NAO versionar)
|   |   +-- versao-projeto.txt ...... versao do projeto Android gerado
|   |   +-- versao-apk.txt .......... versao do APK assinado
|   |   +-- android/ ................ projeto Gradle (build.js gera)
|   |       +-- cliente/ ............ app do cliente
|   |       +-- vendedor/ ........... app do painel (Custom Tab no admin.html)
|   +-- build-apk.ps1 ............... JDK 17 + Bubblewrap + APK dos dois
|   +-- rebuild.ps1 ................. regera o projeto Android
|   +-- make_svgs.ps1 ............... icones do app
|
+-- SITE PUBLICADO (copia espelhada usada pelo Cloudflare)
|   +-- site/
|       +-- *.html, *.js, *.css ..... mesmos arquivos da raiz
|       +-- versao.txt .............. 20261020f
|       +-- apk/ .................... APKs e versao-apk.txt para download
|
+-- GATEWAY E DEPLOY
|   +-- worker/
|   |   +-- convencao-gateway.js .... Worker do gateway: pedidos, precos,
|   |   |                            login do dono (12h padrao, ate 30 dias),
|   |   |                            bot, capacidade do dia
|   |   +-- site-estatico.js ........ Worker que serve a pasta site/
|   |   +-- server.js ............... servidor local de teste
|   |   +-- SEGREDOS-LOCAIS.txt ..... segredos de teste (nao publicar)
|   +-- wrangler.toml ............... deploy do gateway
|   +-- wrangler-site.toml .......... deploy do site (pasta site/)
|
+-- ROBOS E AUTOMACAO
|   +-- .github/scripts/
|   |   +-- sync-catalogo.js ........ le o site oficial, baixa fotos e gera
|   |   |                            catalogo.json (seg-sex 10:00)
|   |   +-- publicar-precos.js ...... publica a tabela de precos no Firebase
|   |   +-- bot-telegram.js ......... robo do vendedor 24/7: le o Telegram,
|   |   |                            aplica o status no Firebase e responde
|   |   +-- bot-clientes.js ......... robo do cliente (/meuspedidos, /status)
|   |   +-- ultimo-resumo.json ...... resumo da ultima rodada
|   +-- .github/workflows/
|       +-- catalogo.yml ............ robo diario + aviso no Telegram
|       +-- bot.yml ................. bot do vendedor (a cada 5 min)
|       +-- bot-clientes.yml ........ bot de clientes
|       +-- check.yml ............... sintaxe + TODOS os testes a cada push
|       +-- static.yml .............. publica a raiz no GitHub Pages
|       +-- @main.yml ............... aviso do deploy pelo GitHub Pages
|
+-- TESTES E MANUTENCAO
|   +-- tests/rodar-todos.js ......... roda as 47 baterias (TUDO 10/10)
|   +-- tests/manter-tudo.js ......... alinha versoes, datas, links, docs, robo
|   +-- tests/bump-versao.js ......... sobe a versao em todos os arquivos
|   +-- tests/01..47-*.js ............ as 47 baterias
|   +-- tests/23-acesso-vendedor.js .. login, trava de 5 tentativas e login
|   |                                salvo por 1, 7 ou 30 dias
|   +-- tests/38-banco-fechado.js .... gateway, regras, chave e token com prazo
|   +-- tests/LEIA-ME.md ............. como rodar e o que cada bateria confere
|   +-- tools/testar-gateway.js ...... testa o Worker de verdade (cancela o teste)
|   +-- tools/checar-banco-real.js ... confere se o Firebase esta fechado de verdade
|   +-- tools/teste-offline-sw.js .... abre offline e confere a tela
|   +-- tools/fumaca-gateway.js ...... fumaca rapida do gateway
|   +-- tools/botoes.js .............. confere botoes e toques
|   +-- tools/gerar-icone.js ......... gera os PNG do icone
|   +-- tools/subir-gateway.js ....... publica o gateway
|
+-- DOCUMENTACAO
|   +-- README.md .................... apresentacao rapida
|   +-- BOT_CLIENTES_CONFIGURAR.md ... como ligar o bot de clientes
|   +-- docs/PROJETO.md .............. referencia tecnica (verdade do repo)
|   +-- docs/ARVORE.md ............... este mapa
|   +-- docs/MANUAL-DONO.md .......... guia do dono, sem termos tecnicos
|   +-- docs/AGENTS.md ............... regras de renderizacao para agentes
|   +-- docs/FECHAR-BANCO.md ......... como fechar o Firebase com o gateway
|   +-- docs/REGISTRO.md ............. historico de decisoes e correcoes
|   +-- docs/VALIDACAO.md ............ mapa de validacao por bateria
|   +-- docs/TROCAR-TOKEN-BOT.md ..... troca dos tokens dos robos
|
+-- IMAGENS
|   +-- img/icon-*.png ............... icones do app
|   +-- img/608VERDE.jpg ............. caminhao verde
|   +-- img/608AZUL.jpeg ............. caminhao azul
|   +-- img/p01..p36.jpg ............. fotos antigas (lista fixa)
|   +-- img/cat/ ..................... fotos do catalogo oficial
|
+-- REFERENCIA (nao e do site)
|   +-- produtos_ref.html ............ copia do site oficial (consulta)
|   +-- _oficial/ .................... copia do site oficial
|
+-- CONFIGURACAO
    +-- .gitignore, .nojekyll, LICENSE
    +-- mcp.json, .cursor/mcp.json ... agentes de IA no repositorio
    +-- .wrangler/ ................... cache local do Wrangler (fora do git)
```

## Ordem de carga dos scripts (importante)

```
index.html:        theme.js -> conta.js -> loja.js -> app.js
                   -> firebase-appcheck.js -> app-update.js -> ia.js
                   -> central.js

demais paginas     theme.js -> conta.js -> firebase-appcheck.js
do cliente:        -> app-update.js -> ia.js -> central.js
                   -> loja.js -> script.js

admin.html:        theme.js -> script.js -> telegram.js -> app.js
                   -> firebase-appcheck.js -> app-update.js
                   (sem ia.js: o painel e independente do cliente)
```

Se um script for carregado antes do que depende dele, da `ReferenceError`.
**Nunca escreva codigo dentro de `<script src="...">`**: o navegador ignora o
conteudo inline e a funcao "some" sem erro (o teste 06 fiscaliza isso).

## Login do painel (APK do vendedor)

- A tela de login tem **Manter conectado**: `So neste acesso`, `1 dia`,
  `7 dias` (padrao) e `30 dias`.
- O prazo fica em `localStorage:adminLogadoAte`; o token do gateway fica em
  `localStorage:convencaoToken` + `convencaoTokenAte` e tambem na sessao da aba.
- O servidor aceita de 1 a 30 dias; sem escolha, a sessao dura 12 horas.
- **Sair** apaga o login salvo do aparelho.
- Teste que prova: `tests/23-acesso-vendedor.js` (secao 6).

## Padrao de data e hora

Tudo que mostra data passa por `dataHoraSegundos()` / `dataCurta()` em
`script.js`, no formato **`dd/mm/aaaa hh:mm:ss`** (ex.: `15/10/2026 14:12:37`).

## Antes de publicar (checklist)

```powershell
node tests/manter-tudo.js      # versoes, datas, links, docs, robo
node tests/rodar-todos.js      # 47 baterias - tem que dar TUDO 10/10
node tests/limpar-css-morto.js # CSS morto: relatorio (--aplicar limpa)
node tests/bump-versao.js 20261020f
node apk/android/build.js      # projeto Android na MESMA versao do site
gradle -p apk/android :cliente:assembleRelease :vendedor:assembleRelease
git add -A
git commit -m "descricao curta em portugues"
git pull --rebase origin main
git push origin main
npx wrangler deploy -c wrangler.toml       # gateway
npx wrangler deploy -c wrangler-site.toml  # site
node tests/22-entrega.js --online
```

## Enderecos publicados

- Loja e painel (Cloudflare): `https://convencao-site.rickjax123.workers.dev/`
- Gateway: `https://convencao-gateway.rickjax123.workers.dev/`
- GitHub Pages (APK e copia da raiz): `https://apolopanda500.github.io/refrigerante-site/`

## Celular em pe (modo vertical)

- Header `position:fixed` em todas as paginas do cliente.
- O menu que desliza para fora da tela vale **so no painel** (`body.admin`).
  Nas paginas do cliente a lista e uma faixa rolavel dentro do header.
- Nesse modo as tabelas ganham `height:100%` para as linhas nao colapsarem.
- A tabela de informacoes da home tem botao **Minimizar**
  (`alternarTabelaInfo()` em `app.js`, estado em `localStorage:tabelaInfoMini`).
