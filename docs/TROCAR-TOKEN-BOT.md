# OS DOIS ROBÔS DO TELEGRAM

A loja tem **dois robôs**, e cada um tem seu token:

| Robô | Onde roda | Segredo no GitHub | Onde fica o token |
|---|---|---|---|
| **Vendedor** (avisos e botões do painel) | `.github/scripts/bot-telegram.js` | `TG_TOKEN` | só aqui |
| **Clientes** (`/meuspedidos`, `/status`, `/telefone`) | `.github/scripts/bot-clientes.js` | `TG_TOKEN_CLIENTES` e `TG_CHAT_CLIENTES` | só aqui |

**Nenhum dos dois tem token escrito no código.** Isso mudou: o repositório é
**público**, e o token do robô do vendedor estava escrito no arquivo — qualquer
pessoa da internet podia ler, ver os pedidos que chegam no seu robô e mandar
mensagem como se fosse ele. O token do robô de clientes nunca esteve exposto.

## O que fazer agora

### 1. Robô do vendedor — o token precisa entrar no segredo do GitHub

O token antigo que estava no código **já não responde mais** (o Telegram devolveu
erro 401): ele foi trocado ou revogado. Então o robô está parado até você colocar
o token **atual**:

1. No Telegram, abra o **BotFather** e mande `/mybots` → escolha o robô do
   vendedor → **API Token**. Ele mostra o token atual.
2. No GitHub, entre em:
   https://github.com/apolopanda500/refrigerante-site/settings/secrets/actions
3. Clique em **New repository secret**:
   - Name: `TG_TOKEN`
   - Secret: cole o token que o BotFather mostrou
4. Se ainda não existir, crie também `TG_CHAT_ID` com o id do seu chat com o
   robô (o BotFather mostra o id na URL, ou use o bot `@userinfobot`).

Depois vá em **Actions → Bot do Telegram 24/7 → Run workflow** para ele rodar
na hora.

### 2. Robô de clientes — confete se os segredos existem

Esse nunca teve token exposto, mas ele só funciona se os dois segredos existirem:

- `TG_TOKEN_CLIENTES` — token do robô de clientes (BotFather → API Token)
- `TG_CHAT_CLIENTES` — id do chat onde ele atende

Se não existirem, **esse robô nunca funcionou** — vale conferir, porque foi
mexido nele várias vezes.

Depois vá em **Actions → Bot de Clientes → Run workflow**.

### 3. No painel do site

O painel usa o token que **você cola em Configurações** (fica no aparelho do
vendedor, não no código). Depois da troca, cole o token novo lá também — senão o
painel continua tentando chamar o Telegram com o token velho.

### 4. Chave do Google (Firebase)

O alerta do GitHub também aponta uma `apiKey` antiga em `firebase-appcheck.js`.
Chave web do Firebase não é senha, mas precisa de restrição para ninguém usar a
sua cota:

1. Google Cloud Console > APIs e serviços > Credenciais.
2. Apague a chave antiga (ou gere outra).
3. Em "Restrições de aplicativo", escolha **Sites** e cadastre
   `apolopanda500.github.io/*` e `convencao-site.rickjax123.workers.dev/*`.
4. Em "Restrições de API", deixe só o que o site usa (App Check, Identity
   Toolkit e Realtime Database).
5. Se usar, cole a chave nova só no lugar da `apiKey` em `firebase-appcheck.js`.
6. No GitHub, feche o alerta como **revoked**.

Apagar do arquivo não apaga o histórico do Git: o que resolve é revogar a chave
no Google e fechar o alerta.

## Como conferir que está certo

- **Actions**: rode o workflow na mão e veja se o log mostra o robô atendendo.
- **No Telegram**: mande `/start` para cada robô e veja se ele responde.
- **No projeto**: `node tests/manter-tudo.js` — não deve aparecer nenhum token.

⚠️ Nunca mande o token para ninguém, nem para quem estiver ajudando você.