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
  │ index / carrinho / checkout / meus-pedidos│   │ admin.html (painel)              │
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
| `catalogo.json` (no repositório) | — | catálogo do dia, gerado pelo robô |

**Regra de ouro do preço:** a chave é `k:` + o código do produto no site oficial.
Nunca usar o nome — se o nome mudar, o preço se perde. Nunca deixar a chave vazia
(o código já protege isso: `chavePreco()` cai para `n:categoria|nome`).

---

## 3. Arquivos e o que cada um faz

### Páginas do cliente
| Arquivo | Função |
|---|---|
| `index.html` | vitrine: header, busca, abas de categoria, grade de produtos, widgets, ajuda rápida |
| `carrinho.html` | itens, quantidades, aviso de frete, **botão limpar carrinho** |
| `checkout.html` | resumo, região de entrega, pagamento (Pix/Dinheiro), finalizar pedido |
| `perfil.html` | dados do cliente (nome, CPF, endereço, foto) |
| `meus-pedidos.html` | histórico e status dos pedidos do cliente |
| `pedido-sucesso.html` | confirmação do pedido criado |
| `configuracoes.html` | preferências: tema, tamanho da letra, frete grátis, app, dados |
| `admin.html` | painel do vendedor |

### Código
| Arquivo | Responsabilidade |
|---|---|
| `app.js` | catálogo (PD/CT), render da vitrine, temas, preços em tempo real, horários |
| `loja.js` | regiões, dias de entrega, **cálculo de frete**, regra de atendimento |
| `script.js` | carrinho, criação de pedido, histórico de status, aviso do Telegram, pedidos na nuvem (`enviarPedidoNuvem`/`sincronizarPedidosNuvem`) |
| `conta.js` | perfil do cliente (fonte única de dados) |
| `theme.js` | aplica tema/fonte/contraste/leitura antes da página pintar; no painel usa `vendedorPrefs` |
| `ia.js` | assistente de IA (motor local + nuvem opcional) e recomendações |
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
  Bairro fora da lista **bloqueia** a finalização no checkout: o aviso aparece
  no carrinho e no checkout e o pedido só sai depois que o cliente corrigir
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
  o checkout **avisa** (não bloqueia).
- **Segunda-feira** não tem entrega: é o dia de pedidos do Japeri e Engenho Pedreira.
- **Frete:** `calcularFrete(subtotal, regiaoId)` em `loja.js` é a fonte única.
  Grátis a partir de `freteGratisMinimo()` (padrão R$ 150, ajustável em Configurações).
  Sem região selecionada, cobra-se a menor região — **nunca** frete grátis por engano.
- **Pagamento:** somente Pix e Dinheiro. Cartão não existe mais.
- **Preço:** o dono manda. O robô **nunca** altera preço; só usa o do site oficial
  para produto **novo** que ainda não tem preço na base.
- **Catálogo:** o robô lê o site oficial às 10:00 e atualiza produtos e fotos.

---

## 5. O robô do catálogo

```bash
node .github/scripts/sync-catalogo.js
```

- Lê a página do site oficial (precisa de cookie de sessão e decodifica ISO-8859-1).
- Extrai nome, descrição, preço, foto e grupo de cada produto.
- Escolhe a categoria **pelo produto** (ignora o grupo "DESTAQUES" do site oficial).
- Mantém o preço de `precos-base.json`; produto novo usa o preço do site uma vez só.
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
  juntar com os locais. **Privacidade:** o banco está aberto (modo teste) —
  reforce as regras do Firebase em produção.
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

**Requisitos:** o painel (`admin.html`) fica aberto — ele lê o Telegram a cada 20s
e aplica as mudanças. Sem painel aberto, os comandos ficam na fila.

---

## 8. App de celular

- **PWA:** `manifest.json` + `sw.js` + `app-update.js`. Instalar pelo navegador.
- **APK:** `apk/convencao-cliente.apk` e `apk/convencao-vendedor.apk`
  (TWA, 0,9 MB cada). Gerados com JDK 17 + Android SDK 34 + Gradle
  (ver `build-apk.ps1` e `.github/scripts`/fluxo documentado no histórico de commits).
- **Chave de assinatura:** guardada fora do repositório (`apk/*.jks` ignorado pelo git).
  **Guarde esse arquivo com cuidado**: sem ele não dá para publicar atualização
  do mesmo aplicativo.

---

## 9. Publicar mudanças

```bash
node --check *.js                      # sintaxe
# (o workflow check.yml faz isso sozinho no push)
git add -A
git commit -m "descrição curta em português"
git push origin main
```

Depois do push o GitHub Pages publica em 1–2 minutos.
Para limpar cache antigo dos clientes, suba a versão em todos os HTML e no `versao.txt`.

---

## 10. Como testar antes de publicar

- `node .github/scripts/sync-catalogo.js` (confere o robô)
- Abrir o site e testar: carrinho → checkout → finalizar → painel muda o status.
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
- **Checkout** = balcão: você escolhe a região (muda o frete e o dia de entrega)
  e como quer pagar.
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
- IA: assistente no site (chat) com motor local garantido + nuvem opcional, recomendações e portão automático de testes a cada push.
- Painel: preferências próprias (`vendedorPrefs`), 5 temas, conexão do bot editável e sincronização de pedidos a cada minuto.
- Leitura das tabelas: horizontal (padrão) ou vertical (cartões), em Configurações do cliente.
- Bairro fora da área de entrega: pedido **bloqueado** na finalização.
- Bot: aviso de novo pedido + comandos (`/confirmar`, `/separacao`, `/enviado`, `/entregue`, `/cancelar`, `/ultimos`, `/status`, `/hoje`, `/ajuda`) + botões.
- App: PWA instalado + APK (cliente e vendedor) disponíveis para download.
- Temas: claro, guaraná, rosa, vermelho e escuro.
- Pagamento: Pix e Dinheiro.
---

## 13. Inteligencia artificial, MCP e qualidade automatica

### Assistente do site (ia.js)
- Chat flutuante em todas as paginas do cliente (menos no painel do vendedor,
  que e independente). Botao "IA" no canto inferior direito.
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
- Widget, historico de 20 mensagens, atalhos rapidos, cache de respostas.

### Motores automaticos (o site trabalhar de verdade)
- Robo do catalogo: seg-sex 10:00 (catalogo.yml), atualiza produtos e
  fotos do site oficial; precos nunca mudam.
- Precos: Firebase /precos.json, publicados pelo painel.
- Pedidos: Firebase /pedidos.json, sincronizados na abertura do painel
  e a cada minuto.

### Qualidade automatica (rodar certo sempre vai rodar certo)
- Testes: node tests/rodar-todos.js - 12 baterias, TUDO 10/10.
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