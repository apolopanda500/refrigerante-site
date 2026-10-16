# 🤖 BOT DO TELEGRAM PARA CLIENTES - CONFIGURAÇÃO

## 📋 O que foi criado

O bot para clientes foi adicionado ao repositório:

- **Arquivo**: `.github/scripts/bot-clientes.js`
- **Workflow**: `.github/workflows/bot-clientes.yml`
- **Comandos**: `/start`, `/ajuda`, `/meuspedidos`, `/status <ID>`, `/telefone <número>`

## 🔑 PASSO 1: Adicionar o Token do Telegram

Para o bot funcionar, você precisa adicionar o token do Telegram nos **GitHub Secrets**:

1. Acesse: https://github.com/apolopanda500/refrigerante-site/settings/secrets/actions
2. Clique em **New repository secret**
3. Nome: `TG_TOKEN_CLIENTES`
4. Valor: Cole o token do seu bot do Telegram (obtido do @BotFather)
5. Clique em **Add secret**

### Como obter o token do BotFather:

1. Abra o Telegram
2. Procure por **@BotFather**
3. Envie: `/newbot`
4. Siga as instruções para criar o bot
5. Copie o **Token** que o BotFather enviar
6. Cole esse token no GitHub Secrets como `TG_TOKEN_CLIENTES`

---

## 🚀 Passo 2: Disparar o workflow

Após adicionar o token, faça um push para disparar o workflow:

```bash
git add .
git commit -m "Ativa bot do Telegram para clientes"
git push origin main
```

Ou simplesmente faça qualquer alteração e faça push.

---

## ✅ Como testar o bot

1. Abra o Telegram
2. Procure pelo seu bot (nome que você deu ao criar no @BotFather)
3. Envie: `/start`
4. Teste: `/meuspedidos`, `/status CV20261016-001`, `/telefone 21999999999`

---

## 📋 Comandos disponíveis

| Comando | Descrição |
|---------|-----------|
| `/start` | Inicia o bot |
| `/ajuda` | Lista comandos |
| `/meuspedidos` | Ver seus pedidos |
| `/status <ID>` | Status de um pedido |
| `/telefone <número>` | Cadastrar WhatsApp |

---

## 📍 Arquivos envolvidos

| Arquivo | Função |
|---------|--------|
| `.github/scripts/bot-clientes.js` | Lógica do bot |
| `.github/workflows/bot-clientes.yml` | Executa a cada 5 min |
| `catalogo.json` | Dados dos produtos |
| `produtos_ref.html` | Catálogo no site |

---

**Após adicionar o token e fazer push, o bot estará online 24/7!** 🚀