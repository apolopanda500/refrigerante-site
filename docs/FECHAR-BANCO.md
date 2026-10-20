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

> **Situação em 17/10/2026: o código JÁ ESTÁ PUBLICADO**
> (`wrangler deploy` na conta `rickjax123`, versão `ca4141e1`) em
> <https://convencao-gateway.rickjax123.workers.dev>.
> O teste ao vivo deu `{"ok":true,"banco":true,"servo":false}` —
> ou seja, **o Worker está de pé e esperando só a conta de serviço**
> (passo 1). As rotas que exigem senha já recusam sem ela
> (`/api/pedidos` → 401, `/api/bot` → 403), e `/api/precos` devolve 500
> em vez de vazar preço. O site continua funcionando do jeito antigo:
> ninguém aponta para o gateway ainda, então **nada quebrou**.
>
> O que falta é o passo 1 (a chave). Feito isso, é só rodar:
> ```powershell
> node tools/subir-gateway.js
> ```
> O script lê o JSON de `Downloads`, sobe os 6 segredos, republica e
> testa ao vivo — e **apaga o JSON da chave do disco** no final.

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

O site tem **dois modos**, e a troca é só o campo **Banco**:

| Campo "Banco" | O que acontece | Quando usar |
|---|---|---|
| **vazio** | modo antigo: o navegador fala direto no Firebase (banco aberto) | botão de voltar; antes de fechar |
| **URL do gateway** | tudo passa pelo gateway: o cliente cria o pedido em `/api/pedido` e ganha uma **chave**, o dono entra em `/api/entrar` e leva um **token de 12 h** (ou de 1 a 30 dias com o "Manter conectado") | para poder fechar o banco |

**No painel:** *Configurações do painel → Banco*, cole
`https://convencao-gateway.rickjax123.workers.dev` e salve.
**No cliente:** cada aparelho tem o campo dele (*Configurações → Banco*);
enquanto estiver vazio, o pedido dele ainda sai pelo caminho antigo
(também certo: o pedido fica gravado no aparelho e o dono consegue ver).

**O que muda para o cliente:** nada na tela. O que muda é por onde o pedido
passa — e que a **chave do pedido fica guardada só no aparelho dele**
(`localStorage: convencaoChaves`). É essa chave que permite acompanhar o
pedido depois; sem ela o gateway devolve 403, como deve ser.

**Ordem que não quebra nada:** painel primeiro, cliente depois, regras por
último. Cada passo tem teste:

```powershell
node tools/testar-gateway.js      # Worker de verdade: cria 1 pedido de teste,
                                  # confere chave/token/403 e CANCELA o teste
```

Depois, no repositório, publique: o `.github/scripts/bot-telegram.js`
passa a usar o gateway quando `GATEWAY_URL` e `BOT_SEGREDO` estiverem no
GitHub (**Settings → Secrets**). O valor do `BOT_SEGREDO` é o que está
em `worker/SEGREDOS-LOCAIS.txt` (arquivo local, fora do git).

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

## O QUE VALE ENQUANTO O BANCO NAO FECHA

Fechar as regras depende de o gateway ter identidade no Firebase, e o Google
ainda nao aceitou a troca do token assinado (INVALID_CUSTOM_TOKEN). ate la, o
que protege o cliente nao e a regra: e a **cifra**. O gateway grava nome,
telefone, CPF, endereco e observacao cifrados (AES-GCM, chave no segredo do
Worker), entao quem abrir o banco na internet ve so letras sem sentido.
A bateria 43 prova isso. Status, valor e regiao ficam em claro porque o sistema
precisa deles para filtrar.

**Residuo conhecido:** se o gateway cair, o cliente grava o pedido direto no
Firebase pelo caminho de reserva e esse texto puro passa. E o preco de manter a
venda nunca parar. Para fechar de vez, faca o gateway ter identidade e publique
as regras de `database.rules.json`.
