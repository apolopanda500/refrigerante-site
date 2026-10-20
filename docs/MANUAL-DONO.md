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

## Antes do primeiro pedido (faça uma vez)

1. **Confira o banco do Firebase (já fechado).** As regras de
   `database.rules.json` estão publicadas: só o gateway (uid
   `gateway-convencao`) lê e grava pedidos; `/precos` e `/capacidade`
   continuam públicos de propósito. **Não** publique
   `{"rules":{".read":false,".write":false}}`: isso quebra o gateway.
   Rode `node tools/checar-banco-real.js` e confira:
   `/pedidos`, `/avaliacoes`, `/config`, `/controle` e `/bot` = 401;
   `/precos` e `/capacidade` = 200.

2. **Teste o painel no celular.** Entre com a senha, escolha
   **Manter conectado: 7 dias**, feche o app e abra de novo: tem de entrar
   direto. Clique em **Sair** e confirme que ele pede a senha outra vez.

3. **Faça um pedido de teste você mesmo**, com um endereço conhecido.
   Confira: pedido aparece no painel, o Telegram avisa, o status muda e o
   cliente vê o histórico em **Meus pedidos**.

4. **Instale o APK do cliente** pelo botão **Configurações > Baixar
   aplicativo** e faça um pedido por ele. A versão do APK tem de ser a
   mesma do site (`apk/versao-apk.txt`).

5. Só depois disso divulgue o link para os clientes.

---

## Login salvo no painel

Na tela de entrada do painel, escolha em **Manter conectado**: *Só neste acesso*,
*1 dia*, *7 dias* (padrão) ou *30 dias*. O APK do vendedor lembra o login nesse
prazo; se vencer, ele pede a senha de novo. O botão **Sair** apaga o login do
aparelho.

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

- **Painel do vendedor** → tabela com todos os pedidos, de **todos os aparelhos**
  (celular, computador, qualquer conta).
- O painel baixa os pedidos da nuvem sozinho (na abertura e no tempo que você
  escolheu em Configurações do painel: 1, 2 ou 5 minutos).
- Quando chega pedido novo de outro aparelho, aparece uma **faixa verde** no
  painel com o número do pedido e o botão *Ver na lista*.
- **Leitura da tabela**: *Rolagem horizontal* (igual ao computador) ou
  *Cartões empilhados* (cada pedido vira um bloco com o nome de cada coluna —
  melhor no celular). Os botões de status funcionam nos dois.
- Em cada pedido, o horário exato (com segundos) e há quanto tempo ele chegou.
  Os **ticks** (acompanhamento) ficam recolhidos: abre com um toque.
- Busca: procure por cliente, telefone, bairro, número ou produto.

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

Em **Configurações → Notificações** tem **um interruptor só**:

- **Ligado**: o site pede a permissão sozinho e avisa quando o status do
  pedido muda — mesmo com o app fechado. Ao lado, o texto mostra o que está
  acontecendo ("ligado", "bloqueado no navegador", "toque para permitir").
- **Desligado**: para tudo.
- **Testar agora**: manda um aviso na hora, para você conferir.

O aviso chega quando o status muda (aguardando → confirmado → em separação →
saiu para entrega → entregue), com a hora exata.

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

## 7. Limite de pedidos por dia (a válvula)

O site tem duas travas para **nunca travar** e para você não perder venda:

| Trava | Padrão | O que acontece quando bate |
|---|---|---|
| **Por cliente** (telefone) | **2 pedidos por dia** | O mesmo cliente não consegue fazer o 3º pedido naquele dia. |
| **Da loja toda** | **80 pedidos por dia** | Ninguém consegue pedir: a loja fechou as vagas do dia. |

- **O dia vira às 00:00** e a trava zera sozinha. Você não precisa liberar nada.
- **Pedido cancelado não conta** — só gasta vaga o pedido que realmente vai sair.
- Quando o cliente bate no limite, o botão **Finalizar** desliga e ele recebe um
  botão **Falar com o vendedor** (abre o WhatsApp com a mensagem pronta).
  **Nenhum item do carrinho é perdido.**
- Você é avisado: no painel, em *Configurações do painel*, fica escrito
  **“Vagas de hoje: X de 80”**. A tela fica em atenção quando chega perto de fechar.

### Mudar o limite da loja

1. **Painel → Configurações do painel → Sincronização com a nuvem**.
2. Em **Limite de pedidos por dia**, toque em **40**, **60**, **80** ou **120**.
3. O número é salvo na hora e publicado para o site (não precisa reiniciar nada).

O limite por cliente (2) está no código da loja (`loja.js`,
`LIMITE_PEDIDOS_CLIENTE_DIA`) e não muda pela tela — é proposital: dois lugares
para o mesmo número é a forma garantida de dois números diferentes.

### Se um cliente de verdade bater no limite

Chame no WhatsApp e feche o pedido na mão: ou ele espera o dia virar, ou você
libera pelo painel. A trava existe contra repetição, spam e dia de volume — não
é para atrapalhar cliente fiel.

---

## 8. Aplicativo no celular

- **Configurações → Aplicativo do celular → Baixar aplicativo (APK)**.
- Os arquivos atualizados ficam em `Downloads\APK Convencao\` e no repositório,
  em `apk\`:
  - `convencao-cliente.apk` — app do cliente
  - `convencao-vendedor.apk` — **só você**, o painel

Depois de baixar:
1. Abra o arquivo `.apk`.
2. O celular vai avisar que o app veio de fonte desconhecida — permita.
3. Toque em **Instalar**.

No iPhone não existe APK: use o botão **Compartilhar** e depois
**Adicionar à Tela de Início**.

### Gerar APK novo (quando precisar)

```powershell
node apk/android/build.js                     # gera o projeto Android (versao = versao.txt)
gradle -p apk/android :cliente:assembleRelease :vendedor:assembleRelease
```

Precisa de **JDK 17** e do **Android SDK 34**. O APK do cliente sai em
`apk/android/cliente/build/outputs/apk/release/` e o do vendedor em
`apk/android/vendedor/build/outputs/apk/release/`; depois é só copiar para
`apk\` e para `Downloads\APK Convencao\`. A versão nunca é digitada à mão:
o script lê `versao.txt` (é a mesma do site).

---

## 9. Cliente com dúvida

Na página inicial existe o quadro **"Ajuda rápida"**:
o cliente escreve a dúvida e a resposta sai na hora.
Se não tiver resposta automática, ele toca em **Falar com o vendedor**
ou **Falar com o motorista** — abre o WhatsApp com a mensagem pronta
e você recebe aviso no Telegram.

A tabela de informações (dias de entrega, horários, pagamento, frete,
frota e garantia) tem um botão **Minimizar**: no celular ela já começa
recolhida e o cliente abre quando quiser.

---

## 10. Regras que o site segue

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
- **2 pedidos por cliente por dia** e **80 por dia no total da loja** (a válvula;
  você muda o total em *Configurações do painel*).