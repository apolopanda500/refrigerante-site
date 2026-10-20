# Refrigerantes Convenção — documentação do projeto

> Documento de referência para **humanos e agentes de IA** que vão manter este site.
> Tudo aqui é verdade no estado atual do repositório.

---

## 1. O que é este projeto

Loja online de bebidas (refrigerantes, chopp, águas, energético) para a **Convenção**,
com painel de vendas para o dono, aviso de pedidos no **Telegram**, catálogo sincronizado
com o site oficial e aplicativo de celular.

- **Site do cliente:** https://apolopanda500.github.io/refrigerante-site/
- **Painel do vendedor:** https://apolopanda500.github.io/refrigerante-site/admin.html
- **Repositório:** https://github.com/apolopanda500/refrigerante-site
- **Site oficial (fonte do catálogo):** https://refrigerantesconvencaorio.entregaaki.app.br/Principal/Publico/Produtos

---

## 2. Como o site está montado (arquitetura)

Site estático hospedado no **GitHub Pages**. Não existe servidor de aplicação:
tudo roda no navegador do cliente e os dados ficam em `localStorage`
(com uma parte syncronizada via Firebase).

```
                  navegador do cliente                    navegador do vendedor
  ┌──────────────────────────────────────────┐   ┌──────────────────────────────────┐
  │ index / carrinho / meus-pedidos│   │ admin.html (painel)              │
  │                                          │   │  - tabela de pedidos             │
  │  app.js      catálogo + preços + robbed │   │  - editor de preços              │
  │  loja.js     regiões, frete, horários   │   │  - ferramentas (calculadoras...)  │
  │  script.js   carrinho e pedidos         │   │  - bot do Telegram               │
  │  conta.js    perfil do cliente          │   │  telegram.js  comandos do bot     │
  │  ia.js            assistente + recomendacoes   │
  └───────────┬──────────────────────────────┘              │
              │                                             │
              ▼                                             ▼
      localStorage (por aparelho)          Firebase Realtime Database
      - carrinho, pedidos, perfil,         precos.json   (precos sincronizados)
         pedidos.json  (pedidos de TODO mundo)
        preferencias, tema                  https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com
              │
              ▼
      Telegram Bot  (aviso de pedido novo + comandos do vendedor)
      GitHub Actions (robô diário do catálogo, seg-sex 10:00)
```

### Modelo de dados importante

| Onde | Chave | O que guarda |
|---|---|---|
| `localStorage: refrigeranteCart` | — | itens do carrinho `{name, priceNum, qty}` |
| `localStorage: convencao_pedidos` | `CV20261014-001` | pedidos (status, itens, histórico) |
| `localStorage: convencao_usuario` / `refrigerantePerfil` | — | dados do cliente |
| `localStorage: refrigerantePrefs` | — | tema, fonte, frete grátis, URL do Firebase (cliente) |
| `localStorage: vendedorPrefs` | — | preferências do PAINEL (tema, bot Telegram) — não mistura com o cliente |
| `localStorage: productPriceOverrides` | `k:<código do produto>` | preço editado pelo vendedor |
| Firebase `/precos.json` | `k:<código>` | mesma tabela, para todos os aparelhos |
| Firebase `/pedidos.json` | `CV20261015-001` | pedidos de todos os aparelhos (o painel baixa e junta) |
| Firebase `/capacidade.json` | `dia`/`pedidos`/`limite` | vagas de pedidos do dia (a válvula global; só números, leitura pública) |
| `localStorage: convencaoCapacidade` | — | cópia do total do dia que o cliente leu da nuvem |
| `catalogo.json` (no repositório) | — | catálogo do dia, gerado pelo robô |

**Regra de ouro do preço:** a chave é `k:` + o código do produto no site oficial.
Nunca usar o nome - se o nome mudar, o preço se perde. Nunca deixar a chave vazia
(o código já protege isso: `chavePreco()` cai para `n:categoria|nome`).

**Regra de ouro do dinheiro:** todo valor na tela passa por `formatBRL()` em
`script.js` (carrinho, meus-pedidos, pedido-sucesso, painel e a
mensagem do Telegram). Ela devolve sempre **2 casas, vírgula e ponto de milhar**
(`R$ 4.260,00`). Nunca monte `"R$ " + valor.toFixed(...)` na mão: foi assim que
o total do carrinho aparecia como `R$ 4260,00`.

---

## 3. Arquivos e o que cada um faz

### Páginas do cliente
| Arquivo | Função |
|---|---|
| `index.html` | vitrine: header, busca, abas de categoria, grade de produtos, widgets, ajuda rápida |
| `carrinho.html` | itens, quantidades, aviso de frete, **botão limpar carrinho**, bairro/região, endereço, pagamento (Pix/Dinheiro) e **finalizar pedido** — a finalização acontece nesta própria página (não existe mais `checkout.html`) |
| `perfil.html` | dados do cliente (nome, CPF, endereço, foto) |
| `meus-pedidos.html` | histórico e status dos pedidos do cliente |
| `pedido-sucesso.html` | confirmação do pedido criado |
| `configuracoes.html` | preferências: tema, tamanho da letra, frete grátis, app, dados |
| `admin.html` | painel do vendedor |

### Código
| Arquivo | Responsabilidade |
|---|---|
| `app.js` | catálogo (PD/CT), render da vitrine, temas, preços em tempo real, horários |
| `loja.js` | regiões, dias de entrega, **cálculo de frete**, regra de atendimento, **válvula do dia (limite de pedidos por dia)** |
| `script.js` | carrinho, criação de pedido, histórico de status, aviso do Telegram, pedidos na nuvem (`enviarPedidoNuvem`/`sincronizarPedidosNuvem`) |
| `conta.js` | perfil do cliente (fonte única de dados) |
| `theme.js` | aplica tema/fonte/contraste/leitura antes da página pintar; no painel usa `vendedorPrefs` |
| `ia.js` | assistente de IA (motor local + nuvem opcional) e recomendações |
| `central.js` | avisos reais no aparelho (`Notification`) quando o status do pedido muda (ligado em Configurações) |
| `telegram.js` | comandos do bot (`/confirmar`, `/entregue`...) e botões da mensagem |
| `app-update.js` | service worker, barra "Atualizar agora", botão instalar app |
| `firebase-appcheck.js` | proteção (App Check) do banco de preços |
| `sw.js` | cache do app instalado (offline) |
| `style.css` | temas (claro, guaraná, rosa, vermelho, escuro) |

### Automação
| Caminho | Função |
|---|---|
| `.github/scripts/sync-catalogo.js` | lê o site oficial, baixa fotos, gera `catalogo.json` |
| `.github/scripts/publicar-precos.js` | publica a tabela de preços do dono no Firebase |
| `.github/scripts/ultimo-resumo.json` | resumo da última rodada (entrou/saiu) |
| `.github/workflows/catalogo.yml` | roda seg-sex 10:00, commita e avisa no Telegram |
| `.github/workflows/check.yml` | confere a sintaxe dos `.js` a cada push |

---

## 4. Regras de negócio (não quebrar!)

- **Pedidos** só abrem das **08:50 às 15:00** (horário de São Paulo, `agoraSP()`).
- **Bairros atendidos:** Japeri, Engenho Pedreira, Paracambi, Seropédica.
  Bairro fora da lista **bloqueia** a finalização: o aviso aparece
  no carrinho e o pedido só sai depois que o cliente corrigir
  o bairro no perfil.
- **Pedido um dia antes da entrega.** O pedido pode ser feito em **qualquer dia que antecede
  uma entrega** — ou seja, no dia anterior de cada dia de entrega da região:
  | Região | Dias de pedido | Dias de entrega |
  |---|---|---|
  | Japeri | Segunda a sexta | Terça a Sábado |
  | Engenho Pedreira | Segunda a sexta | Terça a Sábado |
  | Paracambi | Quarta, quinta e sexta | Quinta, Sexta e Sábado |
  | Seropédica | Quinta e sexta | Sexta e Sábado |
  Fonte: `diasPedidoDaRegiao()` em `loja.js` (calcula: dia anterior de cada dia de entrega).
  Sábado e domingo não abrem pedidos. Quando hoje não é dia de pedidos da região,
  o carrinho **avisa** (não bloqueia).
- **Segunda-feira** não tem entrega: é o dia de pedidos do Japeri e Engenho Pedreira.
- **Frete:** `calcularFrete(subtotal, regiaoId)` em `loja.js` é a fonte única.
  Grátis a partir de `freteGratisMinimo()` (padrão R$ 150, ajustável em Configurações).
  Sem região selecionada, cobra-se a menor região — **nunca** frete grátis por engano.
- **Pagamento:** somente Pix e Dinheiro. Cartão não existe mais.
- **Preço:** o dono manda. O robô **nunca** altera preço; só usa o do site oficial
  para produto **novo** que ainda não tem preço na base — e, se o site oficial
  renomear um produto, o preço do dono é **resgatado pelo código** (ver §5).
- **Catálogo:** o robô lê o site oficial às 10:00 e atualiza produtos e fotos.
- **Limite de pedidos por dia (a válvula):** fonte única em `loja.js`.
  | Trava | Padrão | Quem conta | Onde é consultada |
  |---|---|---|---|
  | Por **cliente/dia** (telefone) | **2** | o próprio aparelho (`convencao_pedidos`) | `bloqueioFinalizar()` (carrinho) + `criarPedido()` (gravação) |
  | Por **loja/dia** (a loja toda) | **80** | o **painel**, publicado em `/capacidade.json` | idem (o cliente lê `/capacidade.json`) |

  - `checaLimitePedidos(tel, lista)` devolve `null` (pode pedir) ou
    `{tipo, feito, teto, texto, aviso}` — `tipo` = `cliente` ou `loja`.
  - O dia é o de **São Paulo** e vira a chave `AAAA-MM-DD`: **vira a meia-noite
    e o limite zera sozinho**, ninguém precisa limpar nada.
  - Pedido **cancelado não come cota** (nem do cliente nem da loja).
  - O limite por cliente é por **telefone, só os dígitos**: `(21) 9-9123-4567`
    e o mesmo cliente que `55219912345678`.
  - **Duas camadas de defesa:** o carrinho desliga o botão *Finalizar* e mostra
    o caminho (WhatsApp do dono, de `contatoLoja()`); e `criarPedido()` confere
    de novo na hora de gravar e devolve `null` — quem chamar `criarPedido()` pelo
    console do navegador **não burla a válvula**.
  - **Falha para o lado seguro:** registro de `/capacidade.json` de outro dia
    (painel fechado) **não bloqueia** — melhor vender a mais do que travar a venda.
  - O dono muda o teto da loja no painel (*Configurações do painel → Limite de
    pedidos por dia*); o painel mostra *“Vagas de hoje: X de Y”* antes de fechar.
  - **Limitação conhecida:** o limite por cliente é contado no **aparelho**. Para
    valer entre aparelhos diferentes, a contagem tem de ir para o gateway
    (`docs/FECHAR-BANCO.md`, passo 2). O global já vale para todos.

---

## 5. O robô do catálogo

```bash
node .github/scripts/sync-catalogo.js
```

- Lê a página do site oficial (precisa de cookie de sessão e decodifica ISO-8859-1).
- Extrai nome, descrição, preço, foto e grupo de cada produto.
- Escolhe a categoria **pelo produto** (ignora o grupo "DESTAQUES" do site oficial).
- Mantém o preço de `precos-base.json`; produto novo usa o preço do site uma vez só.
- **Preço é sempre o do dono — nunca o do site oficial.** O casamento com
  `precos-base.json` é por palavra-chave, então o robô **resgata o preço anterior
  pelo código do produto** (`key`, que não muda quando o nome muda) caso o site
  oficial renomeie o item. Assim o preço do dono não se perde por mudança de nome,
  e só produto **realmente novo** (sem preço seu e sem histórico) entra pelo preço
  do site — uma vez só, e avisado no Telegram (`precosResgatados` no resumo).
- Baixa as fotos novas para `img/cat/<código>.jpg`.
- Grava `catalogo.json` e `ultimo-resumo.json`.

**Agendamento:** segunda a sexta, 10:00 (horário de SP), no GitHub Actions.
Também dá para rodar na mão: aba *Actions* → *Atualizar catalogo* → *Run workflow*.

Se o site oficial mudar o HTML, o robô pode parar de achar os produtos.
**Sinais de quebra:** contagem menor que 5 produtos com preço → o script aborta
de propósito para não apagar o catálogo.

---

## 6. Preços em tempo real (Firebase)

- Banco: `https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com`
- Arquivo: `/precos.json` (mapa `chave: "R$ 00,00"`)
- Mesmo banco: `/pedidos.json` guarda os pedidos de **todos** os aparelhos —
  o cliente faz o pedido, `enviarPedidoNuvem()` grava lá e o painel chama
  `sincronizarPedidosNuvem()` (na abertura e a cada minuto) para baixar e
  juntar com os locais. **Privacidade:** o banco está fechado desde
  20/10/2026; só o gateway (uid `gateway-convencao`) lê e grava os pedidos.
  `/precos` e `/capacidade` são públicos de propósito.
- **O gateway é o caminho padrão do site** (`GATEWAY_PADRAO` em `script.js`):
  o cliente não tem campo para colar URL — ele simplesmente usa o gateway,
  e o caminho antigo (direto no Firebase) fica de **reserva** para quando o
  gateway não responde (a venda nunca para). O painel continua com o campo
  *Banco* para trocar a URL.
  **Válvula de escape:** `cfgGatewayOff: true` em `vendedorPrefs` (painel) ou
  `refrigerantePrefs` (cliente) **desliga o gateway** mesmo com a URL
  preenchida. Sem isso, se o Worker caísse não haveria como reverter.

/* ---------- REGRAS QUE VALEM NO SERVIDOR (nao da para contornar) ----------
   - **Pedido minimo**: R$ 100,00 de produtos (o frete nao conta). Quem nao
     alcancar ve quanto falta, antes de enviar e de novo no servidor.
     O dono muda gravando `/config/pedidoMinimo` no banco.
   - **1 pedido por dia por cliente**: o dia e o de Sao Paulo; virando a
     meia-noite o cliente volta a poder pedir (nao sao 24 horas corridas).
   - **Identidade pelo CPF**: conferido pelos dois digitos verificadores,
     e o celular tem que ser de 11 digitos (DDD + 9 + 8). Sem os dois, o
     pedido nao nasce - e o contador fica no servidor, guardado pela
     impressao do CPF, nunca pelo CPF em texto puro.
   Tudo isso e conferido no gateway. O aparelho tambem avisa antes, para o
   cliente nao descobrir so no final; mas quem manda mesmo e o servidor.
- O site tenta achar o banco sozinho (`PRECOS_ENDERECOS` em `app.js`).
- Para publicar: painel do vendedor → editar preço → **Salvar e aplicar**.
- Para conferir: painel → "Banco ligado! N preço(s) publicado(s)".

**Cuidado com o formato:** o leitor do painel aceita `29,50`, `29.50`, `29.5`,
`2950`, `1.234,56` e `1,234.56`. Antes ele multiplicava por 10 quando o preço
era digitado com ponto — isso já foi corrigido (`lerPreco()` em `admin.html`).

---

## 7. Bot do Telegram

**Aviso de pedido novo:** `notificarTelegramPedido()` em `script.js`
(mensagem com botões: Confirmar / Separação / Enviado / Entregue / Cancelar).

**Comandos** (digitados no chat do bot, pelo dono):
`/confirmar`, `/separacao`, `/enviado`, `/entregue`, `/cancelar`, `/ultimos`,
`/status`, `/hoje`, `/ajuda`.
Aceitam o número completo (`CV20261014-001`) ou só o fim (`001`).

**Independência do painel:** as preferências do bot (token, chat, liga/desliga)
e o tema do painel ficam em `vendedorPrefs` — mudar no painel não mexe no site
do cliente. O registro do menu no Telegram acontece **uma única vez** (botão
"Ativar comandos" para tentar de novo) e um webhook antigo é removido
automaticamente (evita o erro 409 do `getUpdates`).

**Independência do painel:** o painel do vendedor grava **sempre** em
`localStorage:vendedorPrefs` (tema, letra, leitura das tabelas, tempo de
sincronização, token/chat do bot, URL do banco de preços, blocos recolhidos).
O site do cliente grava em `refrigerantePrefs`. `theme.js` **não** copia mais a
preferência do cliente para o painel: na primeira visita o painel nasce escuro e
só aproveita do cliente o que não é visual (conexão do bot e URL do banco).
Trocar o tema de um lado **nunca** mexe no outro; pedidos e preços continuam
vindo pela nuvem para os dois.

**Minimizar no painel:** os blocos longos (editar preços, ferramentas,
configurações, bot, preços na nuvem) têm botão **Minimizar**; o editor de preços
vem recolhido por padrão. Estado em `vendedorPrefs.miniCards`. Nunca escreva
código dentro de `<script src="...">`: o navegador ignora o conteúdo inline e o
botão parece morto (o teste 06 fiscaliza isso).

**Separação loja × painel (não misturar):**
- `html[data-leitura="vertical"]` e o `@media (max-width:768px)` de tabela do
  `style.css` só valem com `body:not(.admin)`. O painel tem a própria leitura
  (cartão aos 720px, rolagem no PC) e **não** oferece o modo vertical.
- O painel não recebe `data-leitura` (`theme.js` ignora no `admin.html`).
- A faixa flutuante de ofertas (`avisoOferta`) não aparece no painel.

**Hora detalhada:** `dataHoraSegundos()` (com segundos), `tempoDesde()` ("há 2 h")
e `tick()` Mostram no painel, no cartão do cliente e na mensagem do Telegram
exatamente quando o pedido chegou e cada mudança de status.

**Requisitos:** o painel (`admin.html`) fica aberto — ele lê o Telegram a cada 20s
e aplica as mudanças. Sem painel aberto, os comandos ficam na fila.

---

## 8. App de celular

- **PWA:** `manifest.json` + `sw.js` + `app-update.js`. Instalar pelo navegador.
- **APK:** `apk/convencao-cliente.apk` e `apk/convencao-vendedor.apk`
  (TWA, 0,9 MB cada). Gerados com JDK 17 + Android SDK 34 + Gradle
  (ver `build-apk.ps1` e `.github/scripts`/fluxo documentado no histórico de commits).
- **Versão dos APK = versão do site:** tanto `apk/android/build.js` quanto
  `build-apk.ps1` leem `versao.txt`. O `versionName` é a mesma versão publicada
  (ex.: `20261020f`) e o `versionCode` é a data `YYYYMMDD` (vendedor recebe +100).
  Depois de gerar, o script grava `apk/versao-apk.txt` e o painel mostra
  "APKs na versão" ao lado da versão publicada.
  **Build sem interação (usado nesta máquina):**
  ```powershell
  node apk/android/build.js
  gradle -p apk/android :cliente:assembleRelease :vendedor:assembleRelease
  # saem em apk/android/<cliente|vendedor>/build/outputs/apk/release/
  ```
  (o Bubblewrap do `build-apk.ps1` é interativo: ele pergunta domínio, caminho e
  senha do keystore, então precisa ser rodado na mão, num terminal.)
- **Chave de assinatura:** guardada fora do repositório (`apk/*.jks` ignorado pelo git).
  **Guarde esse arquivo com cuidado**: sem ele não dá para publicar atualização
  do mesmo aplicativo.

---

## 9. Publicar mudanças

```bash
node tests/manter-tudo.js            # versoes, datas, links, docs, robo
node --check *.js                    # sintaxe
node tests/rodar-todos.js            # 47 baterias (tem que dar TUDO 10/10)
node tests/13-validar-css.js         # CSS inteiro: sintaxe, classe sem uso, cobertura
node tests/limpar-css-morto.js       # CSS morto: so o relatorio (--aplicar limpa)
git add -A
git commit -m "descrição curta em português"
git push origin main
```

Depois do push o GitHub Pages publica em 1-2 minutos.
Para limpar cache antigo dos clientes, suba a versão em todos os HTML e no versao.txt
(tests/bump-versao.js faz isso de uma vez, inclusive o app-update.js).

### Manutenção contínua (sem mexer no código)


node tests/manter-tudo.js confere, um por um: versão igual em todas as páginas
+ versao.txt + app-update.js; padrão de data dd/mm/aaaa hh:mm:ss; links
internos apontando para arquivo que existe; scripts e estilos carregados;
ausência de código morto dentro de <script src>; documentação (docs/ +
tests/LEIA-ME.md) em dia; e o **robô diário** (catálogo com menos de 3 dias e
agendamento às 10:00, de segunda a sexta). Com --online confere também os
links externos; com --com-catalogo roda o robô de verdade.

### Padrão de data e hora

Tudo que mostra data passa por dataHoraSegundos()/dataCurta() em script.js,
no formato **dd/mm/aaaa hh:mm:ss** (ex.: 15/10/2026 14:12:37). O painel
mostra a hora exata de cada passo do pedido e há quanto tempo ele está parado.

### Acesso ao painel

admin.html **não tem login automático**: abre a tela de usuário e senha
(`VENDEDOR_USUARIO`/`VENDEDOR_SENHA` em `script.js`) e trava depois de 5
tentativas erradas. É **um acesso só**, e é ele que baixa os pedidos de todos os
aparelhos (via `sincronizarPedidosNuvem`, na abertura e a cada minuto).

No login, o dono escolhe **Manter conectado** (1, 7 ou 30 dias). O prazo fica no `localStorage` do aparelho e o token do gateway tambem; sem escolha, a sessao dura 12 horas. **Sair** apaga o login salvo (teste 23, secao 6).

Duas regras ao mexer nisso:

- **O usuário não diferencia maiúscula de minúscula** (`credenciaisConfere()` /
  `normalizarUsuario()`). Senão digitar `Apolopanda500` ou `apolopanda500` trava
  o dono fora depois de 5 tentativas — e o painel inteiro fica inacessível.
- O banco está em modo teste, então os pedidos e as avaliações são públicos. **O
  gateway já está publicado** (`worker/convencao-gateway.js`, Cloudflare Worker)
  e o site tem os **dois modos**: campo *Banco* vazio = caminho antigo; com a
  URL do gateway = cliente cria pedido em `/api/pedido` e ganha uma chave, dono
  entra em `/api/entrar` e leva token de 12 h (ou de 1 a 30 dias com o "Manter conectado"). Fechar as regras só é seguro
  depois de apontar o painel para o gateway (`docs/FECHAR-BANCO.md`).
---

## 10. Como testar antes de publicar

- `node .github/scripts/sync-catalogo.js` (confere o robô)
- Abrir o site e testar: carrinho → finalizar → painel muda o status.
- Painel: busca, tabela, ficha do pedido, calculadoras, exportar CSV.
- Tema: trocar para cada um dos 5 temas e conferir legibilidade.
- No celular: installed app, barra "Atualizar agora", tamanho da letra.

---

## 11. Decoração para quem não é da área

O site é como uma **loja de verdade em miniatura**:

- **Catálogo** = prateleiras com as bebidas; muda sozinho todo dia porque o
  robô copia o que está no site oficial.
- **Carrinho** = cesto; você escolhe a quantidade e vê quanto falta para o
  frete sair de graça.
- **Carrinho** = balcão: os itens, a região (que muda o frete e o dia de
  entrega) e o pagamento ficam na mesma página do cesto.
- **Painel do vendedor** = parte de trás da loja: tudo que entrou, com busca,
  botões de status e calculadoras.
- **Telegram** = telefone interno: o pedido chega lá e você responde com
  `/confirmar` ou tocando no botão da mensagem.

Tudo o que o cliente vê é salvo **no aparelho dele** (é por isso que às vezes
pede para limpar o histórico). Os preços é a única coisa compartilhada, pelo Firebase.

---

## 12. Estado atual (resumo)

- Catálogo: 45 produtos, 7 categorias, atualizado diariamente pelo robô.
- Preços: sincronizados em tempo real pelo Firebase (tabela do dono).
- Pedidos: sincronizados na nuvem (`/pedidos.json`) — o painel vê os pedidos feitos em qualquer aparelho ou conta.
- IA: assistente no site (só o botão flutuante para o cliente) com motor local garantido + nuvem opcional e portão automático de testes a cada push.
- Painel: preferências próprias (`vendedorPrefs`), 5 temas, conexão do bot editável e sincronização de pedidos a cada minuto.
- Celular em pé: header **fixo** no topo em todas as páginas, menu sempre visível (faixa rolável) e tabelas com `height:100%` para não colapsar.
- Tabela de informações da home (pedidos e entregas, horários, pagamento/frete/contato, frota, garantia) tem botão **Minimizar** — no celular ela já vem recolhida (lembra em `localStorage:tabelaInfoMini`).
- Perfil: **só dados pessoais e contato**. Os números (pedidos realizados,
  itens comprados, total gasto) e a lista com status e horário de cada passo
  ficam na página **Histórico** (`meus-pedidos.html`), que é o único destino
  do menu — as 7 páginas do cliente usam o mesmo menu: Produtos, Histórico,
  Configurações, Perfil.
- Frota: fotos dos dois caminhões (`img/608VERDE.jpg` e `img/608AZUL.jpeg`).
- Avaliação: o cliente dá nota de 1 a 5 + comentário no pedido entregue (Meus Pedidos);
  `salvarAvaliacao()` em `script.js` grava no aparelho e envia para `/avaliacoes` no Firebase.
- **Leitura vertical (cartão):** cada linha vira um cartão de no máximo 760px —
  o assunto vira o título (sem repetir o nome da coluna), os rótulos ficam em
  cima do valor e nada se estica na tela larga. Vale nas tabelas da loja; o
  painel tem as próprias regras (`body.admin[data-leitura=vertical]`), com os
  botões de status grandes e utilizáveis.
- **Ticks recolhíveis:** o acompanhamento do pedido começa fechado, mostrando só
  "Parado em X há 2 h"; `toggleTicks()` abre e fecha.
- **Aviso do cliente:** um interruptor só (`cfgNotifPedido`) em
  `ligarAviso()`; pedir permissão, iniciar/parar a vigia e mostrar o estado são
  automáticos. `notifTestar()` manda um aviso na hora para comprovar.
- **Tela compacta** liga e desliga de verdade (`data-layout="compacto"`).
- **Atenção no painel:** `chegarNovosPedidos()` compara a lista antes/depois da
  sincronização e mostra uma faixa verde com os pedidos que chegaram de outro
  aparelho, com vibração quando possível.
- Painel do vendedor: botões **Minimizar** nos blocos longos (editor de preços já vem
  recolhido), tamanho da letra, leitura das tabelas e tempo de sincronização (1/2/5 min)
  — tudo gravado em `vendedorPrefs`, **sem** afetar o site do cliente.
- Leitura das tabelas: horizontal (padrão) ou vertical (cartões), em Configurações do cliente.
- Bairro fora da área de entrega: pedido **bloqueado** na finalização.
- Bot: aviso de novo pedido + comandos (`/confirmar`, `/separacao`, `/enviado`, `/entregue`, `/cancelar`, `/ultimos`, `/status`, `/hoje`, `/ajuda`) + botões.
- Bot 24/7: o robo `.github/scripts/bot-telegram.js` (workflow `.github/workflows/bot.yml`, a cada 5 min) processa os botoes e comandos no servidor, entao o bot funciona **mesmo com o painel fechado**; o status vai para o Firebase (`/pedidos`) e a mensagem e atualizada no chat. O painel e o robo compartilham o **mesmo offset** (`/bot/offset.json` no Firebase), entao o mesmo toque nunca e processado duas vezes.
- Valor minimo para entrega: **R$ 100,00** (fonte unica em `loja.js`, `entregaMinima()`). Abaixo disso a pagina nao finaliza e mostra quanto falta.
- App: PWA instalado + APK (cliente e vendedor) disponíveis para download.
- Temas: claro, guaraná, rosa, vermelho e escuro.
- Pagamento: Pix e Dinheiro.

### Cores de texto que mudam com o tema

`--texto-ok`, `--texto-erro` e `--texto-aviso` (com os pares `--texto-*-fundo`)
são as cores de **texto** de sucesso, erro e atenção. Têm duas versões: a escura
no tema claro e a clara no tema escuro. **Nunca grave `#2e7d32`, `#c62828` ou
`#8a6100` como cor de texto** — no fundo escuro elas ficavam em ~3:1 e a frase
sumia. A bateria `14-cores` confere o contraste das duas versões.
---

## 13. Inteligencia artificial, MCP e qualidade automatica

### Assistente do site (ia.js)
- Chat flutuante em todas as paginas do cliente (menos no painel do vendedor,
  que e independente). Botao "IA" no canto inferior direito.
- **O cliente ve SO o botao flutuante**: a secao "Escolhas para voce (IA)" e o
  bloco de configuracao da IA (provedor, URL, chave, modelo) ficam guardados
  para o dono — `iaRecomendacoesAtivas()` so liga as recomendacoes com
  `cfgIARecs` ligado, e o bloco de Configuracoes esta com `hidden`.
- Motor local (padrao): 12 intents (preco, horario, frete, dias de entrega,
  bairros, pagamento, status do pedido, contato, app, saudacao, compra,
  fallback), usando o catalogo do dia, regioes, horarios e pedidos do aparelho.
  Fato (rapido) responde sempre local: nunca erra e funciona offline.
- Nuvem opcional (Configuracoes > Inteligencia Artificial):
  - Local: so motor local.
  - Gratis (nuvem): IA real via js.puter.com, sem chave.
  - Personalizada: endpoint compativel com OpenAI (URL + chave + modelo,
    guardados so neste aparelho).
  Cadeia: fato responde local; conversa vai para a nuvem (8s); falha volta ao local.
- Recomendacoes: "Escolhas para voce" na home - historico de compras do
  aparelho ("quem levou X levou Y") ou variedade por categoria. Repinta
  quando o catalogo novo chega (iaRepintarRecomendados em app.js).
  **Desligadas por padrao para o cliente** (so o painel liga com `cfgIARecs`).
- Widget, historico de 20 mensagens, atalhos rapidos, cache de respostas.

### Motores automaticos (o site trabalhar de verdade)
- Robo do catalogo: seg-sex 10:00 (catalogo.yml), atualiza produtos e
  fotos do site oficial; precos nunca mudam.
- Precos: Firebase /precos.json, publicados pelo painel.
- Pedidos: Firebase /pedidos.json, sincronizados na abertura do painel
  e a cada minuto.

- **Horário e contato com fonte única:** `estadoLoja()`/`estadoEntrega()`/`janelaPedidosTexto()`
  em `loja.js` alimentam a tabela da semana, o quadro de horários, o aviso do topo,
  o carrinho e a IA; `CONTATO_LOJA` (WhatsApp/e-mail) é lido por todos. A bateria 28
  quebra se alguém voltar a escrever horário ou telefone à mão.
- **Sábado e domingo:** a loja não trabalha (`DIAS_LOJA` = seg a sex). No sábado sai
  só entrega; domingo não tem loja nem freteiro.

### Qualidade automatica (rodar certo sempre vai rodar certo)
- Testes: node tests/rodar-todos.js - 47 baterias, TUDO 10/10. A 13a e o lint
  do CSS; da 14a a 24a vem cor, imagem, letra/numero, tamanho, codigo, erro,
  documento, repositorio e entrega (esta ultima com --online confere o site no ar);
  a 25a confere a opcao "Aparência" (Animações reduzidas), a 26a o bot do
  Telegram 24/7 (workflow + robo + teclado do pedido), a 27a o valor minimo
  para entrega (padrao R$ 100,00), a 38a o banco fechado e a 39a a valvula do
  dia (limite de pedidos por dia).
- Portao automatico: .github/workflows/check.yml roda sintaxe de todo
  JS (site, testes, robos) + a suite completa em TODO push e todo dia as 6h.
- Versao: node tests/bump-versao.js <versao> antes de publicar.

### MCP - agentes de IA no repositorio
- mcp.json (raiz) e .cursor/mcp.json (Cursor): servidores filesystem
  e github. Para usar: aponte seu agente (Cursor/VS Code/Claude) para o
  arquivo e peca tarefas descrevendo o resultado em portugues.
- Regras do agente: ler docs/PROJETO.md antes, mudar so o necessario,
  manter padroes (k: nos precos, Pix/Dinheiro, dias de entrega),
  rodar node tests/rodar-todos.js e node --check, commitar em portugues.