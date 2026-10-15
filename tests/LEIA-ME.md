# Validação e testes

Toda alteração passa por aqui antes de ir para o ar.

## Como rodar

```bash
node tests/rodar-todos.js
```

O comando roda **todas** as baterias e só termina com `TUDO 10/10`
se nenhuma falhar. Acompanhe cada arquivo:

| Arquivo | O que confere |
|---|---|
| `01-semana.js` | Dias de pedido e entrega das 4 regiões, sábado só entrega, domingo parado, loja só de segunda a sexta |
| `02-horarios.js` | Loja 9h–15h, pedidos 08:50–15:00, entrega 06:00–18:00, e o texto que o cliente vê |
| `03-precos.js` | Ler preço do jeito que o dono digita, trava do erro de dígito (275 no lugar de 27,50) e `R$ 27,50` sempre com 2 casas |
| `04-catalogo.js` | 45 produtos, imagens, preços e classes — usando o **código real do robô** |
| `05-home.js` | Mini calendário, tabela geral e tabela de ofertas montam sem erro |
| `06-estrutura.js` | Scripts de cada página, links que existem, segurança, versão dos assets igual em todas |
| `07-duplicados.js` | Nada repetido: ids, botões, links, funções e CSS órfão |
| `08-camadas.js` | `loja.js` funciona sozinho (é a camada base da home) e o frete/total fecha |
| `09-carrinho-render.js` | O carrinho desenha, o preço bate com a home, botões ±, botão Editar e total final |
| `10-carrinho.js` | Um botão só de limpar, funcionando com carrinho cheio e vazio |
| `11-tema-escuro.js` | Todo componente novo tem versão escura |
| `12-ia.js` | Assistente: fatos locais, cadeia da nuvem, recomendações, widget, cache offline, MCP e portão automático |

## Ferramentas

```bash
node tests/bump-versao.js 20261014t   # sobe a versao dos assets (obrigatorio a cada publicacao)
node tools/gerar-icone.js            # gera os icones do site e dos apps
node apk/android/build.js            # gera o projeto Android (cliente e vendedor)
```

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

## Antes de publicar

1. `node tests/rodar-todos.js` → tem que dizer **TUDO 10/10**
2. `node tests/bump-versao.js <versao>` → senão o celular fica com cache velho
3. `node --check` em todos os `.js`
4. Conferir no emulador: `adb install -r apk\convencao-cliente.apk`