# Validação e testes

Toda alteração passa por aqui antes de ir para o ar.

## Como rodar

```bash
node tests/rodar-todos.js
```

O comando roda **todas** as 35 baterias e só termina com `TUDO 10/10`
se nenhuma falhar. Acompanhe cada arquivo:

| Arquivo | O que confere |
|---|---|
| `01-semana.js` | Dias de pedido e entrega das 4 regiões, sábado só entrega, domingo parado, loja só de segunda a sexta |
| `02-horarios.js` | Loja 9h–15h, pedidos 08:50–15:00, entrega 06:00–18:00, e o texto que o cliente vê |
| `03-precos.js` | Ler preço do jeito que o dono digita, trava do erro de dígito (275 no lugar de 27,50), `R$ 27,50` sempre com 2 casas e **`formatBRL` com ponto de milhar** (fonte única de dinheiro do site) |
| `04-catalogo.js` | 45 produtos, imagens, preços e classes — usando o **código real do robô** |
| `05-home.js` | Mini calendário, tabela geral e tabela de ofertas montam sem erro |
| `06-estrutura.js` | Scripts de cada página, links que existem, segurança, versão dos assets igual em todas |
| `07-duplicados.js` | Nada repetido: ids, botões, links, funções e CSS órfão |
| `08-camadas.js` | `loja.js` funciona sozinho (é a camada base da home) e o frete/total fecha |
| `09-carrinho-render.js` | O carrinho desenha, o preço bate com a home, botões ±, botão Editar e total final |
| `10-carrinho.js` | Um botão só de limpar, funcionando com carrinho cheio e vazio |
| `11-tema-escuro.js` | Todo componente novo tem versão escura |
| `12-ia.js` | Assistente: fatos locais, cadeia da nuvem, recomendações, widget, cache offline, MCP e portão automático |
| `13-validar-css.js` | CSS inteiro: chaves e parênteses fecham, `attr()` com rótulo, **nenhuma classe sem uso**, cobertura do que o código gera e nada de propriedade repetida |
| `14-cores.js` | **Todas as cores**: contraste do texto com o fundo (WCAG 4.5:1), **as mesmas cores no tema escuro** (verde/vermelho/âmbar de sucesso, erro e atenção), cor que some, informação que não depende só da cor, painel e alto contraste |
| `15-imagens.js` | **Todas as imagens**: arquivo existe, `alt` preenchido, `loading`, reserva quando a foto falha, ícone do app e foto pesada |
| `16-letras-numeros.js` | **Letras e números**: nada abaixo de 11px, os 3 tamanhos de letra, `R$ 0,00` com 2 casas, data `dd/mm/aaaa hh:mm:ss`, número em coluna |
| `17-tamanhos.js` | **Tamanhos**: alvo de toque de 44px, viewport certo, nada estourando a tela do celular, tabela em caixa, tick sem altura travada |
| `18-codigo.js` | **Código**: sintaxe, nada de `console.log`/`debugger`/`TODO`, função declarada duas vezes no mesmo escopo, variável morta, `eval`, segredo no arquivo |
| `19-erros.js` | **Erros**: nada engolido em silêncio no que é pedido do cliente, toda promessa com `catch`, aviso na tela, botão que volta a funcionar e **o app não ficar com a tela branca no celular** (prazo do cache e busca nos outros caches) |
| `20-documentos.js` | **Documentos**: os 5 documentos existem, listam todas as baterias, falam da versão atual e nenhum tem caractere corrompido |
| `21-repositorio.js` | **Repositório**: `.gitignore`, nenhum build/`.gradle` versionado, sem arquivo grande demais, sem segredo de verdade no histórico |
| `22-entrega.js` | **Entrega**: commit feito, push na frente, versão do repositório igual à do site no ar |
`24-textos.js` | **Texto do cliente**: palavra na tela sem o acento certo, caractere corrompido, menu e nome das regioes (so o que aparece na tela; codigo com acento seria erro)
| `23-acesso-vendedor.js` | **Acesso do vendedor**: um acesso só de usuário e senha, trava de 5 tentativas, usuário sem differentiate maiúscula (o dono não fica trancado fora) e o painel baixando os pedidos de **todo** aparelho pela nuvem |
| `25-aparencia.js` | **Aparência**: a opção "Animações reduzidas" ("Reduzir animações da interface") existe na tela, salva, aplica o atributo e o CSS corta as animações em todas as páginas do cliente |
| `26-bot.js` | **Bot do Telegram 24/7**: o workflow `.github/workflows/bot.yml` roda a cada 5 min, o robô lê o Telegram (getUpdates), aplica o status nos pedidos do Firebase e responde no chat; o teclado do pedido tem os botões de status e o botão "Abrir painel" |
| `27-entrega-minima.js` | **Valor mínimo para entrega**: a regra sai de `loja.js` (`entregaMinima()`, padrão R$ 100,00), a finalização dentro do carrinho bloqueia abaixo disso (botão desliga) e o cliente vê quanto falta |
| `28-consistencia.js` | **Consistência**: horário com fonte única (loja.js) e nada escrito à mão, sábado e domingo fechados, contato em um só número, título diferente em cada página, as 4 regiões, datas por `dataHoraSegundos` e nenhuma regra de CSS repetida |
| `29-ia-respostas.js` | **IA ajudando em tudo**: 41 perguntas de verdade no sandbox e a resposta tem que cair na intenção certa (horário, mínimo, prazo, sábado, cancelar, perfil, pix, aviso, histórico, recomendação, contato, humano, app), sem inventar telefone e com o horário da fonte |
| `30-fluxo-cliente.js` | **Fluxo do cliente**: monta carrinho, cria pedido (CVAAAAMMDD-000), vendedor muda status, cliente acha pelo telefone, merge de pedidos de vários aparelhos e dia de pedido sempre na véspera da entrega |
| `31-painel-vendedor.js` | **Painel do vendedor**: login sem diferenciar caixa, senha errada e campo vazio recusados, status com rótulo, CSV com 13 colunas, `lerPreco()` convertendo `29,50`/`29.50`/`2950`, preferências em `vendedorPrefs` |
| `32-nuvem.js` | **Nuvem**: pedido vai para `/pedidos/<id>.json` com PUT, sem rede o pedido fica no aparelho, base reserva é tentada, merge sem duplicar e o App Check carregado |
| `33-robo-catalogo.js` | **Robô do catálogo**: lê o site oficial, nunca mexe em preço, aborta se o site quebrar, catalálogo com nome/preço/foto/categoria e agenda às 10h e 14h de SP (seg a sex) |
| `34-acessibilidade.js` | **Acessibilidade**: idioma, título e viewport em toda página, botão/link com nome, `alt` nas imagens, `:focus-visible`, alvo de 44px e nada só de mouse |
| `35-dia-de-trabalho.js` | **Dia de trabalho (simulação)**: 5 clientes de 4 regiõesCriam pedido em 5 aparelhos, o painel junta tudo, o dono confirma/separa/envia/entrega, edita o bairro, cancela, reabre, fecha o dia (faturamento, ticket, itens), busca por nome/telefone/bairro, exporta CSV e o botão do Telegram aplica o mesmo passo |

## CSS: como confere e como limpa

```bash
node tests/13-validar-css.js              # confere o style.css + cada <style> das páginas
node tests/limpar-css-morto.js            # só o relatório: o que seria apagado
node tests/limpar-css-morto.js --aplicar  # apaga de verdade (com trava de segurança)
```

O limpador só mexe em regra cuja classe **nenhuma** página nem script usa. Se a
regra tem outro seletor vivo, ele apara só o seletor morto
(`.detalhe-valor,.resumo-linha b{}` vira `.resumo-linha b{}`). Ele respeita
`@media`/`@keyframes`, não conta estilo dentro de página como uso de classe
(senão o seletor se esconde) e **só grava o arquivo depois de conferir as
chaves**. Aparece no relatório como "regra removida" ou "seletor aparado".

> O lint também roda dentro de `rodar-todos.js`: 13 baterias no total.


## Ferramentas de auditoria

| Ferramenta | O que faz |
|---|---|
| `node tools/botoes.js [pagina]` | Abre cada página num navegador de verdade e audita **todo botão um por um**: botão que não faz nada (falso), botão que chama função que não existe (morto), sem rótulo, e alvo de toque menor que 44px |
| `node tools/teste-offline-sw.js` | Abre o site, **corta a internet** e recarrega: prova que o app abre offline e não fica com a tela branca |

```bash
node tests/manter-tudo.js                # alinha versões, datas, links, docs e robô
node tests/manter-tudo.js --online       # confere também os links externos
node tests/manter-tudo.js --com-catalogo # roda o robô do catálogo de verdade
node tests/bump-versao.js 20261016d      # sobe a versao dos assets (obrigatorio a cada publicacao)
node tools/gerar-icone.js                # gera os icones do site e dos apps
node apk/android/build.js                # gera o projeto Android (cliente e vendedor)
```

`manter-tudo.js` confere, um por um: versão igual em todas as páginas +
`versao.txt` + `app-update.js`, padrão de data `dd/mm/aaaa hh:mm:ss`, links
internos que apontam para arquivo existente, scripts e estilos carregados,
ausência de código morto dentro de `<script src>`, documentação em dia e o robô
diário (catálogo com menos de 3 dias e agendamento às 10:00 e às 14:00, de
segunda a sexta).

## Arquivos de apoio

| Arquivo | Para que serve |
|---|---|
| `central.js` | Avisos reais no aparelho do cliente (`Notification`) + vigia de erros da rede |
| `img/608VERDE.jpg` / `img/608AZUL.jpeg` | Fotos dos dois caminhões (verde e azul) |
| `apk/versao-projeto.txt` | Versão do projeto Android gerado (`build.js`) |
| `apk/versao-apk.txt` | Versão do APK assinado (`build-apk.ps1`) — mesma do site |

## Erros que os testes já pegaram

Estos problemas existiram e foram resolvidos porque os testes acusaram:

| O que era | Como foi achado |
|---|---|
| Preço ×10 na nuvem | `03-precos` + comparação com o catálogo |
| `horaTexto` sem 2 parâmetros gerava "NaN:00" na tabela | `05-home` (undefined/NaN) |
| `entrega.apre` (sem a letra "e") | `05-home` |
| `arredonda` só existia no script.js e a home não o tem | `08-camadas` |
| Versões dos assets diferentes entre páginas | `06-estrutura` |
| Token do Telegram e painel dentro do cache do cliente | `06-estrutura` |
| Duas ofertas fazendo a mesma coisa | `07-duplicados` |
| Carrinho com preço velho e sem botão Editar | `09-carrinho-render` |
| Aba `.ti` da home com `transition` fora do bloco e uma chave sobrando (quebrava o resto do `<style>`) | `13-validar-css` |
| 165 regras de CSS morto (grade de produtos, rodapé antigo, banners, `.cam*`, `.bnr*`, `.reg-opcao`…) pesando 11 KB | `13-validar-css` + `limpar-css-morto` |
| Botão do WhatsApp branco no verde (2:1 de contraste) e idem nos temas guara/rosa/vermelho | `14-cores` |
| Foto dos produtos no carrinho sem `alt` | `15-imagens` |
| Selo "HOJE" e rótulo do calendário com 10 px (abaixo do mínimo) | `16-letras-numeros` |
| `admin.html` com a meta viewport escrita como texto (`<meta name="viewport"[^>]*>`) — o painel abria todo estreito no celular | `17-tamanhos` |
| Senha do painel e 5 variáveis mortas esquecidas no arquivo público | `18-codigo` |
| Falha ao gravar o pedido na nuvem era engolida em silêncio: o painel podia não ver o pedido | `19-erros` |
| Documento citing versão antiga e sem as baterias novas | `20-documentos` |
| `.gitignore` sem `node_modules` nem `.DS_Store` | `21-repositorio` |
| Total do carrinho aparecia "R$ 4260,00" (sem ponto de milhar) — `formatBRL` era a fonte de dinheiro do site inteiro e **não tinha teste nenhum** | `03-precos` |
| Verde/vermelho/âmbar de "deu certo", "deu ruim" e "atenção" fixos no código: no tema escuro ficavam em ~3:1 e a frase sumia | `14-cores` |
| `02-horarios` falhava conforme o horário do relógio (o teste conferia 15:00 usando a hora real, não a hora do caso) | `02-horarios` |
| Amostra do tema "Escuro" esticada por hundreds de pixels no seletor de cores | `13-validar-css` + conferência visual |
| **Celular com tela branca depois de publicar**: no 4G a rede passava dos 3 s, o app caía no cache recém-apagado e o CSS/JS voltava vazio (504) | `19-erros` |

## Cache: por que a página mostrava versão velha — e por que o celular ficava branco

O `sw.js` guardava tudo num cache de nome fixo e ainda servia a cópia
antiga primeiro (stale-while-revalidate). Ao publicar, o celular continuava
vendo a versão antiga; só voltando e abrindo de novo aparecia a nova — foi
o que o dono viu na página Histórico depois do Ctrl+F5.

O outro lado do mesmo problema: ao publicar, o service worker novo assume o
controle na hora (`skipWaiting`) e o `activate` apaga o cache antigo. No 4G a
rede passa de 3 s, a busca caía no cache, e o arquivo vinha **vazio (504)** —
o `style.css` e o `script.js` não chegavam e a tela ficava branca. Era o que
fazia o app no celular "não carregar a página".

Agora:

- o nome do cache leva a versão do site (`bump-versao.js` troca junto), então
  publicar cria um cache novo e o antigo é apagado inteiro;
- a rede vem primeiro para página e arquivo; o cache só entra se a internet
  não responder em **8 s** (3 s era pouco para o 4G — o app caía no cache velho);
- antes de responder vazio, o app **procura o arquivo nos outros caches**: uma
  versão antiga do CSS ainda pinta a tela, uma resposta vazia não;
- recarga forçada (Ctrl+F5 / Shift+Recarregar) nunca responde do cache.

A bateria `19-erros` (bloco 10) fiscaliza as duas últimas regras.

## Antes de publicar

1. `node tests/manter-tudo.js` → tem que dizer **Tudo alinhado**
2. `node tests/rodar-todos.js` → tem que dizer **TUDO 10/10**
3. `node tests/bump-versao.js <versao>` → senão o celular fica com cache velho
   (troca também o `sw.js` e o nome do cache)
4. `node --check` em todos os `.js`
5. Conferir no emulador: `adb install -r apk\convencao-cliente.apk`
6. `git add -A && git commit -m "..." && git push origin main`
   (o GitHub Pages publica em 1–2 minutos)
7. `node tests/22-entrega.js --online` → tem que dizer **ENTREGA 10/10**
   (confere se o site no ar já está na versão do repositório)