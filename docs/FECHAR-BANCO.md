# FECHAR O BANCO (passo a passo, ~20 minutos)

> **Por que fazer:** testado em 17/10/2026, o banco do Firebase estava
> aberto — qualquer pessoa com a URL do projeto lia **todos os pedidos
> com CPF, telefone e endereço** e ainda conseguia escrever e apagar.
> Este guia fecha isso sem quebrar o site.
>
> **Regra de ouro:** faça na ordem. Enquanto o gateway não estiver no
> ar, **não** cole as regras do banco (o site para de sincronizar).

---

## O que muda para o cliente

Nada. Ele continua vendo o preço, fazendo o pedido e acompanhando o
status igual. A diferença é que o pedido dele passa a ser guardado por
um intermediário (o *gateway*) em vez de ir direto para um banco
aberto.

O que muda é que **cada pedido ganha uma chave**: só quem criou (com a
chave que o gateway devolve) consegue ver aquele pedido.

São **duas** coisas que continuam com leitura pública, e só duas:

| Chave | Por que continua pública | O que tem dentro |
|---|---|---|
| `/precos` | todo mundo precisa ver o preço da bebida | código do produto e preço |
| `/capacidade` | o cliente precisa saber quantas vagas de pedidos do dia ainda têm (a válvula anti-travamento) | `dia`, `pedidos`, `limite` — **só números** |

`/capacidade` não tem nome, CPF, telefone nem endereço: é a contagem do dia,
e só o painel (ou o gateway) escreve nela.

---

## Passo 1 — Criar a conta de serviço do Firebase (5 min)

1. Firebase Console → engrenagem → **Project Settings** → **Service Accounts**.
2. Clique **Generate new private key** e baixe o JSON.
3. Guarde o JSON em lugar seguro (é a chave que fala com o banco).
4. Anote o campo `client_email` (ex.: `firebase-adminsdk-xxxxx@projeto.iam.gserviceaccount.com`).

## Passo 2 — Publicar o gateway no Cloudflare (10 min)

1. Crie uma conta em <https://dash.cloudflare.com> (tem plano grátis).
2. **Workers & Pages → Create → Worker** → nome: `convencao-gateway` → Deploy.
3. **Edit code**: cole o conteúdo de `worker/convencao-gateway.js` (deste repositório) e **Deploy**.
4. **Settings → Variables and Secrets** → add como **Secret** (não variável):

   | Nome | Valor |
   |---|---|
   | `FB_DB_URL` | `https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com` |
   | `FB_SA_EMAIL` | o `client_email` do passo 1 |
   | `FB_SA_KEY` | o campo `private_key` do JSON (com as linhas `-----BEGIN...`) |
   | `LOJA_SENHA` | **a mesma senha que você usa no painel** |
   | `BOT_SEGREDO` | um texto inventado por você (ex.: 32 caracteres) |
   | `SESSAO_SEGREDO` | outro texto inventado (só o seu) |

5. Copie a URL do worker (`https://convencao-gateway.<seu>.workers.dev`).

## Passo 3 — Testar o gateway (1 min)

Abra no navegador (deve responder `{"ok":true,...}`):

```
https://SUA_URL/api/saude
```

E o preço (público, mesmo com o banco fechado):

```
https://SUA_URL/api/precos
```

## Passo 4 — Apontar o site para o gateway

No painel do vendedor, em **Configurações do painel → Banco**, cole a
URL do gateway e salve. Enquanto o campo ficar **vazio**, o site
continua no modo antigo (direto no banco) — é o botão de voltar.

Depois, no repositório, publique: o `.github/scripts/bot-telegram.js`
passa a usar o gateway quando as variáveis `GATEWAY_URL` e
`BOT_SEGREDO` estiverem no GitHub (**Settings → Secrets**).

## Passo 5 — Fechar o banco (o passo que muda tudo)

Agora, e **só agora**:

1. Firebase Console → **Realtime Database → Rules**.
2. Cole o conteúdo de `database.rules.json` deste repositório.
3. Publish.

## Passo 6 — Conferir que ficou tudo certo

Rode na sua máquina:

```powershell
node tests/rodar-todos.js
node tests/22-entrega.js --online
```

E no navegador, confira que **ninguém** consegue mais ler os pedidos:

```
https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com/pedidos.json
```

Tem que responder **Permission denied**. Esse é o sinal de que fechou.

---

## Como voltar atrás (2 min)

Se algo quebrar depois de aplicar as regras:

1. No painel, apague a URL do gateway (o campo volta ao modo antigo).
2. Se ainda assim precisar, volte as regras para `{"rules":{".read":true,".write":true}}`
   **e volte o gateway logo depois** — o banco aberto é o que estamos
   corrigindo.

## Perguntas frequentes

**O preço some do site?** Não: `/precos` continua com leitura pública
pelas regras. Quem escreve preço é o gateway (o dono, pelo painel).

**O robô do Telegram para?** Só se você não colocar `GATEWAY_URL` e
`BOT_SEGREDO` nos Secrets do GitHub (passo 4). Sem isso, ele continua
tentando o caminho antigo e o banco fechado barra.

**Dá para rodar o gateway sem Cloudflare?** Sim. O mesmo arquivo roda
em Node (`module.exports.rotear`), com um `http.createServer` simples.
Dá para rodar na sua máquina ou em qualquer hospedagem com Node — mas
aí ele precisa ficar ligado 24h, senão o painel não sincroniza.