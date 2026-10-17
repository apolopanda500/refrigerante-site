# REGISTRO DO TRABALHO (conversa e decisões)

> Resumo fiel do que foi pedido, do que foi feito e do que ficou
> decidido. Serve para quem (humano ou agente) continuar sem ler a
> conversa inteira. Datas em `dd/mm/aaaa`.

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

## 3. Decisões

- **Preço é do dono.** O robô do catálogo **detecta** a mudança de preço
  no site oficial e avisa no Telegram, mas **nunca aplica**. Motivo:
  vender com margem errada sem o dono ver é pior que aviso.
- **`checkout.html` apagado.** O carrinho virou a página de finalização
  (endereço, Pix/Dinheiro, troco e botão), como o dono pediu.
- **Número do pedido com sufixo.** `CV20261017-001-41392`: curto de
  ler, único por aparelho.
- **37 baterias** em vez de 27: cada uma prova uma camada, executando o
  código de verdade (não só lendo arquivo).

## 4. Como continuar

```powershell
node tests/rodar-todos.js            # as 37 baterias, tem que dar TUDO 10/10
node tests/manter-tudo.js            # versão, datas, links, docs, robô
node .github/scripts/sync-catalogo.js  # conferir o catálogo e a divergência de preço
node tests/bump-versao.js 20261017u  # só na hora de publicar
```

Detalhes por arquivo em `docs/ARVORE.md`, regras em `docs/PROJETO.md`,
guia do dono em `docs/MANUAL-DONO.md` e o mapa validado em
`docs/VALIDACAO.md`.