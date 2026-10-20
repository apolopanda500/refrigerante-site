# REGISTRO DO TRABALHO (conversa e decisões)

> Resumo fiel do que foi pedido, do que foi feito e do que ficou
> decidido. Serve para quem (humano ou agente) continuar sem ler a
> conversa inteira. Datas em `dd/mm/aaaa`.

---

## 0. Publicação 20261020e (20/10/2026)

- **Login do APK do vendedor não ficava salvo.** O login era guardado só em
  `sessionStorage`, que o Android descarta ao fechar a Custom Tab. Agora a tela
  de login tem **Manter conectado** (1, 7 ou 30 dias) e o token fica no
  `localStorage` com prazo; o gateway assina tokens de até 30 dias. **Sair**
  apaga o login do aparelho. Coberto pelo teste 23 (seção 6) e pelo teste 38.
- **Versão publicada:** 20261020e no site, nos dois APKs e no gateway.
- **Validação:** 47/47 baterias, simulação 10/10 na raiz e em `site/`, entrega
  online 10/10.

---

## 1. O que foi pedido (na ordem)

1. Ler a pasta `docs/` e entender o projeto.
2. "Página histórico só carrega isso" (zeros e lista vazia) — investigar.
3. Botão **Finalizar pedido** mandava para outra página: remover e deixar
   carrinho + finalização na mesma página; apagar `checkout.html`.
4. Validar tudo, testar tudo, manter remoto e online sincronizados,
   commitar,_push e deploy.
5. Ver imagens em `C:\Users\Micro\Pictures\Screenshots` e corrigir telas.
6. Verificar se as Classes mortas foram removidas de verdade ou se o
   "10/10" era emprestado.
7. Corrigir tabelas/dias/loja da home: "muitos juntos", dias e loja
   dessincronizados, status de loja e freteiro.
8. Validar IA, criar o máximo de baterias válidas, automação no site do
   cliente e do vendedor.
9. Simular trabalhos reais: vários clientes, pedidos, painel do vendedor
   confirmando/editando, ciclo completo.
10. Conferir caminho do pedido, fluxo do bot do Telegram, dias e horas
    diferentes, entradas que quebram.
11. Robô do catálogo: mudar para automático? Só se for melhor.
12. Fazer os documentos finais e salvar a conversa.

## 2. Bugs encontrados e corrigidos (nesta sessão)

| # | Bug | Como foi achado | Correção |
|---|---|---|---|
| 1 | Página Histórico vazia: `onclick="toggleTicks('' + p.id + '')"` derrubava **o script inline inteiro** | inspeção + porta novo `tests/18` seção 1b | aspas escapadas; gate compila os 34 scripts inline |
| 2 | Linha do item colada e preço **R$ 0,00** (faltava `i.price` em pedidos antigos) | captura de tela do dono | flexbox + `totalDoItem()` com fallback |
| 3 | Ícones do acompanhamento sumiam (viravam `fa-circle`) | captura de tela | cada etapa mostra o próprio ícone; os dois blocos no mesmo eixo |
| 4 | Cancelado mostrava "Entregue" como pendente | captura de tela | aviso de cancelado no lugar da linha de etapas |
| 5 | `lerPreco("2950")` devolvia **2950** (R$ 2.950,00 em vez de R$ 29,50) | bateria 31 | dígitos pares viram centavos |
| 6 | Três janelas de horário diferentes (09:00 / 08:50 / `HORARIOS.loja`) | bateria 28 | `estadoLoja()`/`estadoEntrega()` como fonte única |
| 7 | "falar com humano" **morto** (capturado pela regra de contato) | bateria 29 | movido para antes; bloco antigo removido |
| 8 | "frete grátis" nunca chegava na resposta do frete grátis | bateria 29 | intenção específica antes da genérica |
| 9 | "apagar" casava com "pagar" (IA dizia pagamento) | bateria 29 | `\bpagar\b` |
| 10 | Telefone escrito 9 vezes na IA | auditoria | `CONTATO_LOJA` em `loja.js` |
| 11 | 171 regras CSS repetidas dentro das páginas | auditoria de duplicação | removidas; zero agora |
| 12 | **Dois clientes no mesmo dia geravam o mesmo número de pedido** (um sobrescrevia o outro no banco) | bateria 35 | sufixo de 5 dígitos em `gerarId()` |
| 13 | Botões de tamanho de letra sem nome para leitor de tela | bateria 34 | `aria-label` |
| 14 | Datas do painel em `toLocaleString` | bateria 28 | `dataHoraSegundos()` |
| 15 | Pedido preso sem rede ficava sem envio | auditoria | `reenviarPedidosPresos()` automático |

Erros meus no caminho (assumidos e corrigidos): quebrei o `style.css`
uma vez (chave desbalanceada), criei regras CSS órfãs
(`b{color:...}`), deixei 4 baterias com "10/10 falso" (variável fora do
sandbox, callback fora do escopo) e apaguei a tabela de preços que o
`checkout.html` usava. Todos detectados pelos próprios testes.

## 2b. A válvula do dia (17/10/2026, versão 20261017v)

Pedido do dono: **limite de pedidos por dia, para o site nunca travar**.

| # | O que | Decisão |
|---|---|---|
| 1 | Limite por cliente/dia | **2** pedidos por telefone (`LIMITE_PEDIDOS_CLIENTE_DIA`) |
| 2 | Limite da loja/dia | **80** (`LIMITE_PEDIDOS_LOJA_DIA`), mudável no painel |
| 3 | Ao estourar | **bloqueia e oferece falar com o dono** (WhatsApp de `contatoLoja()`) |

Como ficou (tudo com fonte única em `loja.js`, `checaLimitePedidos()`):

- **O dia zera sozinho:** chave `AAAA-MM-DD` do horário de São Paulo.
  Virou a meia-noite e a cota recomeça — ninguém precisa liberar nada.
- **Cancelado não come cota** (nem do cliente nem da loja).
- Telefone por **só dígitos**: a máscara não conta como outra pessoa.
- **Duas camadas:** o carrinho desliga o botão, e `criarPedido()` confere
  de novo na hora de gravar e devolve `null` — chamar `criarPedido()` pelo
  console do navegador **não burla**. Se recusar, o cliente não cai numa
  tela de sucesso falsa e **não perde o carrinho**.
- **O global vale para todo mundo:** só o painel vê pedidos de todos os
  aparelhos, então só ele publica as vagas do dia em `/capacidade.json`
  (chave pública, **só números** — nome/CPF/telefone/endereço não vão ali;
  a bateria 38 fiscaliza isso). O cliente lê e trava.
- **Falha para o lado seguro:** registro de outro dia (painel fechado)
  **não bloqueia** — melhor vender a mais do que travar venda.

### Bugs/defeitos que apareceram no caminho

| # | Defeito | Como foi achado | Correção |
|---|---|---|---|
| 16 | `getPedidos()` não protege JSON corrompido: chamado na tela do carrinho, histórico quebrado virava **tela branca** | leitura do código antes de usar | `pedidosParaValvula()` encapsula a leitura no carrinho |
| 17 | `soDigitos` já existia em `telegram.js` com **outro sentido** (maiúsculas, para número de pedido) | varredura de colisão de nomes | helper da válvula renomeado para `digitosTel()` |
| 18 | `/capacidade` abriu leitura pública sem a bateria 38 saber | `38-banco-fechado` acusou | allow-list com justificativa + bloco novo provando que só leva número |
| 19 | Comentário com telefone escrito à mao no `loja.js` | `28-consistencia` | comentário reescrito (fonte única é `contatoLoja()`) |
| 20 | `tools/login-google.js` (auxiliar local, não é do site) ficou sem commit e derrubava `22-entrega` | `22-entrega` | `.gitignore` (arquivo preservado na máquina, fora do repo público) |
| 21 | O cabeçalho do `sync-catalogo.js` dizia **"preco vem sempre do site oficial"** — o contrário do que o código faz | leitura do robô ao auditar os preços | comentário corrigido para a regra real |
| 22 | O casamento do preço é por palavra-chave: se o site oficial **renomear** um produto, o preço do dono se perde e o oficial entraria no catálogo | auditoria dos 44 preços contra o site oficial | **resgate pelo código do produto** (`key`), que não muda quando o nome muda + aviso no resumo/Telegram |

### Publicação (versão 20261017v)

- Os **dois APKs foram rebuildados de verdade** — sem JDK 17 e sem `gradle`
  no PATH achei que não daria, mas o `build.gradle` já previa: Gradle 9.1
  roda no Java do sistema e baixa o JDK 17 do toolchain. Build em 30 s.
- **Conferi dentro dos APK** com `aapt2` antes de gravar a versão:
  `versionName 20261017v` nos dois, versionCode 20261017 (cliente) e
  20261117 (vendedor), **mesma chave de assinatura** — dá para atualizar
  por cima do que o cliente já tem.
- `tools/login-google.js` ficou **fora do commit de propósito**: não é meu e
  tem `CLIENT_ID` público dentro; o dono decide se versiona.

## 3. Decisões

- **Preço é do dono — sempre.** O dono falou: *"os preços não é para ser igual do
  site oficial. são meus preços"*. Auditei os 44 produtos contra `precos-base.json`
  **e contra o site oficial**, rodando a lógica real do robô:
  **42 no ar com o preço dele, 2 com preço que ele mesmo editou no painel,
  0 vindos do site oficial** (o site oficial cobra menos em 43 dos 44 — a margem
  é dele e o robô nunca aplica). Dois reforços para que isso não dependa de
  sorte: o comentário do robô que dizia o contrário foi corrigido, e o preço
  agora é **resgatado pelo código do produto** quando o site oficial renomeia o
  item.

- **Preço é do dono.** O robô do catálogo **detecta** a mudança de preço
  no site oficial e avisa no Telegram, mas **nunca aplica**. Motivo:
  vender com margem errada sem o dono ver é pior que aviso.
- **`checkout.html` apagado.** O carrinho virou a página de finalização
  (endereço, Pix/Dinheiro, troco e botão), como o dono pediu.
- **Número do pedido com sufixo.** `CV20261017-001-41392`: curto de
  ler, único por aparelho.
- **37 baterias** em vez de 27: cada uma prova uma camada, executando o
  código de verdade (não só lendo arquivo).
- **Válvula em duas travas (2 por cliente, 80 por loja).** Escolha do dono:
  bloquear e oferecer falar com o vendedor, em vez de aviso em voz alta.
  Um limite que só avisa não impede o dia de afogar; um limite que só
  bloqueia perde venda — então bloqueia **e** dá o caminho.
- **O teto da loja é global (o painel publica), o do cliente é por
  aparelho.** O que der para ser exato sem depender de servidor novo,
  é exato; o resto ficou escrito como limitação, não como promessa.
- **Falha da trava é para o lado seguro:** registro velho **não** bloqueia
  a venda. Uma válvula que derruba o dia inteiro por número velho é pior
  que o travamento que ela evita.

## 4. Como continuar

```powershell
node tests/rodar-todos.js            # as 47 baterias, tem que dar TUDO 10/10
node tests/manter-tudo.js            # versão, datas, links, docs, robô
node .github/scripts/sync-catalogo.js  # conferir o catálogo e a divergência de preço
node tests/bump-versao.js 20261020e  # só na hora de publicar
node apk/android/build.js            # projeto Android na MESMA versão do site
gradle -p apk/android :cliente:assembleRelease :vendedor:assembleRelease
```

Detalhes por arquivo em `docs/ARVORE.md`, regras em `docs/PROJETO.md`,
guia do dono em `docs/MANUAL-DONO.md` e o mapa validado em
`docs/VALIDACAO.md`.

## 5. O que ainda NÃO está pronto (o próximo da fila)

Nada aqui é stabilized só porque os testes passam — são buracos que **só o
dono fecha**, porque exigem conta, senha e decisão de negócio:

1. 🔴 **O banco do Firebase está aberto** (leitura e escrita): qualquer
   pessoa com a URL do projeto lê os pedidos com CPF e ainda apaga.
   **Confirmado ao vivo em 17/10/2026**: `GET /pedidos.json` → HTTP 200 com
   nome, telefone, CPF, endereço e bairro preenchidos. Passo a passo em
   `docs/FECHAR-BANCO.md`.
   **O que já está pronto:** o gateway foi **publicado** na conta
   Cloudflare do dono (`convencao-gateway.rickjax123.workers.dev`) e testado
   ao vivo — de pé, com as rotas sensíveis recusando (401/403). Falta **só a
   chave da conta de serviço** (5 min no console do Firebase), e depois
   `node tools/subir-gateway.js` sobe os 6 segredos e apaga a chave do disco.
2. 🔴 **O token do Telegram está no código público** (`script.js`,
   `telegram.js` e os workflows). Trocar o bot e guardar o token novo
   em **GitHub Secrets** + no gateway, nunca no site.
3. 🟡 O limite por cliente é contado **por aparelho**: para valer entre
   dois celulares do mesmo cliente, a contagem tem que ir para o gateway.
4. 🟡 Testar um pedido completo **no celular de verdade** (as baterias
   rodam a lógica em sandbox, não há navegador).
5. 🟡 8 preços de chopp divergem do site oficial: decisão de negócio.