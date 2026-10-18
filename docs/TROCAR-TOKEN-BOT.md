# TROCAR O TOKEN DO BOT DO TELEGRAM

**Urgente.** O token antigo ficou exposto num repositório público. Ele ainda
vale para quem já leu. Troque-o e o problema acaba.

## Por que

O repositório `apolopanda500/refrigerante-site` é **público**. Isso significa que
qualquer pessoa da internet pode ler qualquer arquivo dele, inclusive o token do
seu bot. Com esse token em mãos, a pessoa:

- lê as mensagens que chegam no seu bot (que são **pedidos com nome, telefone e endereço**);
- manda mensagem como se fosse o seu robô;
- usa a sua conta do Telegram no lugar do robô.

O código já foi corrigido: o token não está mais escrito em lugar nenhum do
projeto. Mas **o token antigo continua valendo** até você trocá-lo.

## Como trocar (5 minutos, no seu celular)

1. Abra o Telegram e procure o **BotFather** (o robo oficial do Telegram).
2. Mande `/revoke` e escolha o seu bot.
   — Se preferir um bot novo: `/newbot` e siga os passos; nesse caso, atualize
   também o endereço do webhook conforme a nota abaixo.
3. O BotFather devolve um **token novo**. É um código parecido com
   `1234567890:AA...` — **não mande esse token para ninguém, nem para mim.**
4. No seu site, abra **Configurações** e cole o token novo no campo do Telegram.

## Para o robô de fundo (que roda sozinho)

O robô que roda sozinho usa o segredo do GitHub:

- Entre no repositório: https://github.com/apolopanda500/refrigerante-site/settings/secrets/actions
- Clique em **New repository secret**
- Nome: `TG_TOKEN`
- Valor: cole o token novo
- Repita para `TG_CHAT_ID` se ainda não existir (o id do seu chat com o robô)

Depois é só ir em **Actions → Bot do Telegram 24/7 → Run workflow** para ele
rodar na hora com o token novo.

## Como saber que ficou certo

Rode `node tests/manter-tudo.js` e confira que não aparece nenhum token no
projeto. A bateria 46 e a 38 já verificam que nenhum segredo está escrito no
código.