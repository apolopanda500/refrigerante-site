# Manual do dono da loja — o que dá para fazer

Guia rápido, sem termos técnicos.

## Arquivos que valem a pena conhecer

| Onde | O que tem |
|---|---|
| `apk/convencao-cliente.apk` | App do cliente (o que você instala e entrega) |
| `apk/convencao-vendedor.apk` | App do painel (só você) |
| `img/608VERDE.jpg` / `img/608AZUL.jpeg` | Fotos dos dois caminhões |
| `central.js` | Avisos reais no celular do cliente (código do site) |
| `apk/versao-apk.txt` | Versão do último APK assinado (igual à do site) |

---

## 1. Mudar preço

1. Entre no **Painel do Vendedor** (usuário e senha).
2. Role até **"Editar preços dos produtos"**.
3. Digite o valor novo **com vírgula**: `29,90`.
   (Também aceita ponto: `29.90` — o sistema corrige sozinho.)
4. Clique em **Salvar e aplicar**.

Pronto: **todos os clientes** passam a ver o preço novo na hora,
sem precisar recarregar a página.

> Para voltar aos preços originais: botão **Restaurar originais**.

---

## 2. Quando o site oficial tira um produto

Não é preciso fazer nada. Todo dia às **10:00** um robô entra no site oficial,
vê o que está disponível, baixa as fotos e atualiza o site.
Produto que some (falta de estoque) sai da lista; produto novo entra.

O robô **nunca** muda seus preços.

---

## 3. Acompanhar pedidos

- **Painel do vendedor** → tabela com todos os pedidos.
- O painel baixa os pedidos da nuvem sozinho (na abertura e a cada minuto):
  pedidos feitos em **outro celular ou outra conta** aparecem aqui também.
- Botões de status: Confirmar, Em separação, Enviado, Entregue, Cancelar.
- Clique na linha do pedido para abrir a **ficha completa**
  (itens, endereço, CPF, histórico, botões de WhatsApp).
- Campo de busca: procure por cliente, telefone, bairro, número ou produto.

---

## 4. Aviso no Telegram

Cada pedido novo chega no seu Telegram **com botões**:
basta tocar em *Confirmar*, *Enviado* etc.

Também dá para digitar:

| Comando | O que faz |
|---|---|
| `/confirmar CV20261014-001` | confirma o pedido |
| `/separacao CV20261014-001` | marca em separação |
| `/enviado CV20261014-001` | saiu para entrega |
| `/entregue CV20261014-001` | entregue |
| `/cancelar CV20261014-001` | cancela |
| `/reabrir CV20261014-001` | volta para *aguardando* |
| `/editar 001 bairro Paracambi` | **corrige um dado do pedido** (nome, telefone, cpf, endereço, bairro, complemento, região, pagamento, troco, observação) |
| `/buscar Japeri` | acha pedido por nome, telefone, bairro ou produto |
| `/ultimos` | últimos 5 pedidos |
| `/status CV20261014-001` | mostra o pedido inteiro |
| `/hoje` | resumo do dia (total, aguardando, faturamento) |
| `/ajuda` | lista de comandos |

Dá para escrever só o final: `/entregue 001`.

Na mensagem de cada pedido há também os botões **Editar** (manda a lista de
campos) e **Reabrir** (volta para aguardando).

> **Importante:** o painel precisa estar aberto no computador
> para os comandos serem aplicados (ele lê o Telegram a cada 20 segundos).

### Aviso no celular do cliente

Em **Configurações → Avisos e promoções**:
- **Ativar aviso no aparelho** pede a permissão e, em seguida, manda um
  **aviso de teste** na hora — se não aparecer, é preciso liberar nas
  configurações do navegador (Chrome: ⋮ > Configurações > Notificações).
- **Testar aviso agora** repete o aviso sem pedir permissão de novo.
- O aviso chega quando o **status do pedido muda** (aguardando → confirmado →
  em separação → saiu para entrega → entregue), com a hora exata.

---

## 5. Ferramentas do painel

Os blocos longos do painel (editar preços, ferramentas, anotações,
configurações, bot) têm botão **Minimizar**. O **editor de preços já começa
recolhido**, porque a lista de produtos é grande — toque em *Abrir* só
quando for mudar algum preço.

- **Resumo de hoje**: pedidos, aguardando, faturamento do dia, itens vendidos.
- **Calculadora de preço e lucro**: digite o custo e a margem, e veja o preço
  de venda, o lucro e a margem real.
- **Calculadora de troco**: mostra o troco e sugere as notas.
- **Anotações da loja**: lista de compras, combinados, telefones.
  O campo **Título da anotação** é largo (2/3 da linha) e a Data fica ao lado.
- **Histórico de preços**: quem mudou, de quanto para quanto.
- **Exportar pedidos**: baixa um arquivo que abre no Excel.
- **Configurações do painel**: tema, **tamanho da letra**, **leitura da tabela
  de pedidos** (rolagem horizontal ou cartões empilhados), **tempo de
  sincronização** (1, 2 ou 5 minutos), mais a conexão do bot (token e chat).
  Tudo isso vale **só no painel**: o cliente do site nunca é afetado.
- **Ferramentas do vendedor**: campos grandes, pensados para usar no balcão —
  calculadora de preço e lucro, **contagem de mercadorias** (packs, unidades e
  garrafas de 1,5 L), calculadora de troco com as notas, anotações da loja,
  histórico de preços e exportação.
- **Versões e sincronização**: mostra a versão do seu painel, a versão do site
  publicada (e se ele está no ar), quantos pedidos estão aqui e quando foi a
  última sincronização. O botão **Sincronizar agora** busca na hora.
- **Card de IA** (`Configurações → Inteligência Artificial`): escolha Local,
  Grátis (nuvem) ou Personalizada, e botão **Testar** para conferir na hora.
  *Fica guardado para você: o cliente do site só vê o botão de conversa (IA)
  no canto da tela, sem essas opções.*

### Ver a hora de cada coisa

Na tabela de pedidos, cada linha mostra **a hora exata** (com segundos) de
quando o pedido entrou e **há quanto tempo** foi. Abrindo a ficha, o
acompanhamento mostra cada mudança de status com a hora — e no fim, há quanto
tempo o pedido está parado no último passo.

---

## 6. Frete grátis

**O valor é seu, definido no código da loja** (`loja.js`, padrão R$ 150,00).
O cliente não mexe mais nisso: o bloco *Entrega e Frete* saiu das Configurações
para não ter duas versões do valor.

---

## 7. Aplicativo no celular

**Configurações → Aplicativo do celular → Baixar aplicativo (APK)**.

Depois de baixar:
1. Abra o arquivo `.apk`.
2. O celular vai avisar que o app veio de fonte desconhecida — permita.
3. Toque em **Instalar**.

No iPhone não existe APK: use o botão **Compartilhar** e depois
**Adicionar à Tela de Início**.

---

## 8. Cliente com dúvida

Na página inicial existe o quadro **"Ajuda rápida"**:
o cliente escreve a dúvida e a resposta sai na hora.
Se não tiver resposta automática, ele toca em **Falar com o vendedor**
ou **Falar com o motorista** — abre o WhatsApp com a mensagem pronta
e você recebe aviso no Telegram.

A tabela de informações (dias de entrega, horários, pagamento, frete,
frota e garantia) tem um botão **Minimizar**: no celular ela já começa
recolhida e o cliente abre quando quiser.

---

## 9. Regras que o site segue

- Pedidos abertos das **08:50 às 15:00**.
- Entrega em **Japeri, Engenho Pedreira, Paracambi e Seropédica** —
  bairro fora dessa lista **não passa**: o site bloqueia o pedido na
  finalização e o cliente precisa corrigir o bairro no perfil.
- **O pedido é sempre um dia antes da entrega. Pode pedir em qualquer dia que antecede uma entrega:**
  - **Japeri e Engenho Pedreira** — entrega terça a sábado → pedido de segunda a sexta
  - **Paracambi** — entrega quinta, sexta e sábado → pedido na quarta, quinta e sexta
  - **Seropédica** — entrega sexta e sábado → pedido na quinta e sexta
  - Sábado e domingo não abrem pedidos.
  - No mesmo dia pode ser dia de pedido e dia de entrega ao mesmo tempo.
- Pagamento em **Pix ou Dinheiro** na entrega.