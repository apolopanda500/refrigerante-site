# ENTREGA DO PROJETO — Refrigerantes Convenção

> **Status:** pronto para operar com clientes reais.
> **Data de fechamento:** 20/10/2026
> **Versão:** 20261020f

---

## 1. Links oficiais

| O que | Endereço |
|---|---|
| Loja (cliente) | https://convencao-site.rickjax123.workers.dev/ |
| Painel (vendedor) | https://convencao-site.rickjax123.workers.dev/admin.html |
| Gateway | https://convencao-gateway.rickjax123.workers.dev |
| Espelho GitHub Pages | https://apolopanda500.github.io/refrigerante-site/ |
| Repositório | https://github.com/apolopanda500/refrigerante-site |

Os APKs usam o espelho do GitHub Pages:

- Cliente: `https://apolopanda500.github.io/refrigerante-site/index.html`
- Vendedor: `https://apolopanda500.github.io/refrigerante-site/admin.html`

---

## 2. O que está pronto e testado

- Banco do Firebase **fechado**: `/pedidos`, `/avaliacoes`, `/config`,
  `/controle` e `/bot` respondem **401** sem senha. Apenas o gateway
  (uid `gateway-convencao`) lê e grava.
- `/precos` e `/capacidade` continuam públicos de propósito (preço e vagas).
- Gateway com identidade confirmada:
  `{"ok":true,"banco":true,"servo":true,"caminho":"identidade"}`.
- Pedido real criado, lido, alterado e cancelado pelo gateway sem erro.
- APKs cliente e vendedor na versão `20261020f`, assinados e publicados.
- Suíte completa: **47/47 baterias**, sem erro.
- Baterias de navegador real: cliente **10/10** e painel **10/10**.
- Entrega online: site, CSS, HTML e APKs respondendo **200**.

---

## 3. Antes de abrir amanhã (5 minutos)

1. Instale o APK do vendedor no celular e entre com a senha.
2. Marque **Manter conectado: 7 dias**.
3. Abra o painel e clique em **Testar**: tem de aparecer “Tudo certo”.
4. Instale o APK do cliente em outro celular.
5. Faça um pedido de teste você mesmo, com valor acima de R$ 100,00.
6. Acompanhe o pedido no painel até “entregue”.
7. Confira a chave Pix e o comprovante antes de divulgar a loja.

---

## 4. Onde ficam as coisas sensíveis

- **Senhas e chaves do gateway:** Secrets do Cloudflare Worker
  (`FB_DB_URL`, `FB_SA_EMAIL`, `FB_SA_KEY`, `FB_API_KEY`, `LOJA_SENHA`,
  `BOT_SEGREDO`, `SESSAO_SEGREDO`).
- **Token do robô do Telegram:** GitHub Secrets (`TG_TOKEN`, `GATEWAY_URL`,
  `BOT_SEGREDO`). Nunca no site.
- **Assinatura dos APKs:** `apk/convencao.jks` (fora do Git).
- **Chave da conta de serviço:** não fica no repositório nem no disco.

Se alguma chave for exposta, troque no Cloudflare/GitHub e não reabra o
banco do Firebase.

---

## 5. O que NÃO fazer

- **Não** publique `{"rules":{".read":false,".write":false}}`: isso fecha
  também o gateway e para os pedidos.
- **Não** reabra as regras do Firebase para “testar”.
- **Não** suba `apk/convencao.jks`, `worker/SEGREDOS-LOCAIS.txt` nem
  `tools/login-google.js` para o GitHub.
- Se o gateway cair, o pedido fica salvo no aparelho e o painel avisa.
  Conserte o gateway; não volte ao banco aberto.

---

## 6. Conferência rápida de saúde

```powershell
node tools/checar-banco-real.js   # pedidos/avaliacoes/etc = 401
node tools/testar-gateway.js      # cria e cancela um pedido real
node tests/rodar-todos.js         # 47/47
```

Saúde do gateway no navegador:

```
https://convencao-gateway.rickjax123.workers.dev/api/saude
```

Resposta esperada: `"banco":true`.

---

## 7. Documentos do projeto

| Documento | Para quê |
|---|---|
| `docs/MANUAL-DONO.md` | operação do dia a dia, sem termos técnicos |
| `docs/VALIDACAO.md` | o que foi testado e como repetir |
| `docs/FECHAR-BANCO.md` | regras do Firebase e gateway |
| `docs/REGISTRO.md` | histórico das decisões e desta conversa |
| `docs/PROJETO.md` | referência técnica |
| `docs/ARVORE.md` | mapa de arquivos |
| `docs/TROCAR-TOKEN-BOT.md` | troca de tokens dos robôs |

---

## 8. Entrega

O projeto está entregue como:

1. Repositório Git atualizado (`main` = `origin/main`).
2. Site publicado no Cloudflare Workers.
3. Espelho no GitHub Pages atualizado pelo push.
4. Painel do vendedor e APKs assinados na mesma versão.
5. Banco fechado e gateway operando com identidade.

**Pendência do dono:** apenas operar a loja e fazer o primeiro pedido real
de conferência. Nenhuma pendência técnica conhecida.
