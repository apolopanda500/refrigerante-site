/* 46 - O SERVIDOR QUE DIZ NAO (10/10)
   Um defeito real: quando o servidor recusava o pedido por regra (CPF,
   celular, valor minimo ou o limite do dia), o aparelho mostrava "pedido
   feito" e guardava o pedido na fila para reenviar. O cliente achava que a
   compra tinha saido, e o dono nunca recebia nada - e o pedido ficava
   tentando para sempre.

   Aqui provamos que:
     - recusa por REGRA sai da fila de reenvio (reenviar nao adiantaria)
     - o motivo fica guardado para o cliente ler
     - recusa por QUEDA DE REDE NAO sai da fila (a venda nao pode se perder)
     - o carrinho mostra o motivo em vez de um texto generico
     - a tela de sucesso avisa que o pedido nao entrou
     - o cliente com pedido de hoje nao consegue criar um segundo
*/
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const ok = (m) => console.log("  ok  " + m);
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

const script = ler("script.js");
const carrinho = ler("carrinho.html");
const sucesso = ler("pedido-sucesso.html");

console.log("=== 1. A RECUSA DO SERVIDOR EXISTE E TEM NOME ===");
if (/function marcarRecusaDefinitiva/.test(script)) ok("marcarRecusaDefinitiva(): a recusa por regra e tratada diferente da queda de rede");
else falha("nao existe tratamento para recusa por regra");
if (/function recusaDoServidor/.test(script)) ok("recusaDoServidor(): o motivo fica guardado para o cliente ler");
else falha("o motivo da recusa nao fica guardado");
if (/status: r\.status/.test(script)) ok("o aparelho guarda o status HTTP (so ai da para saber se foi regra ou rede)");
else falha("o aparelho nao sabe distinguir recusa de queda");

console.log("\n=== 2. RECUSA POR REGRA SAI DA FILA (reenviar nao adiantaria) ===");
const corpo = script.slice(script.indexOf("function marcarRecusaDefinitiva"));
const bloco = corpo.slice(0, corpo.indexOf("function recusaDoServidor"));
if (/delete mapa\[pedido\.id\]/.test(bloco)) ok("o pedido recusado sai da fila de reenvio");
else falha("o pedido recusado continuaria na fila para sempre");
if (/convencaoRecusado/.test(bloco)) ok("o motivo e gravado em convencaoRecusado");
else falha("o motivo nao e gravado");

console.log("\n=== 3. QUEDA DE REDE CONTINUA NA FILA (a venda nao se perde) ===");
if (/function enviarPedidoNuvemDireto/.test(script)) ok("a reserva continua existindo");
else falha("a reserva sumiu");
const reserva = script.slice(script.indexOf("function enviarPedidoNuvemDireto"));
if (/marcarFalhaNuvem\(pedido\)/.test(reserva) && /agendarReenvio\(\)/.test(reserva)) ok("sem gateway o pedido fica na fila e o reenvio e agendado");
else falha("sem gateway o pedido se perde");
if (/temPedidoPreso/.test(script)) ok("o agendamento para sozinho quando nao ha mais nada preso (nao gasta bateria)");
else falha("o agendamento fica rodando a toa");

console.log("\n=== 4. O CLIENTE E AVISADO, E NAO ENGANADO ===");
if (/convencaoLimiteRecusado/.test(carrinho)) ok("o carrinho le o motivo da recusa");
else falha("o carrinho mostra um texto generico e esconde o motivo real");
if (/motivo\.motido/.test(carrinho)) ok("o carrinho mostra o texto que veio do servidor (o que falta para consertar)");
else falha("o carrinho nao mostra o motivo que o servidor deu");
if (/recusaDoServidor/.test(sucesso)) ok("a tela de sucesso tambem confere: se o servidor recusou depois, ela avisa");
else falha("a tela de sucesso pode mostrar 'feito' para um pedido que o servidor recusou");
if (/Este pedido nao entrou/.test(sucesso)) ok("a tela de sucesso diz que o pedido NAO entrou, em vez de confirmar");
else falha("a tela de sucesso nao avisa que o pedido nao entrou");

console.log("\n=== 5. UM PEDIDO POR DIA, JA NO APARELHO ===");
const trava = script.slice(script.indexOf("trava ANTES de criar"), script.indexOf("if (typeof problemaDoCliente"));
if (/meuHoje >= LIMITE_PEDIDOS_CLIENTE_DIA/.test(trava)) ok("se o aparelho ja tem pedido de hoje deste CPF, o segundo nem nasce");
else falha("o aparelho deixa criar um segundo pedido do mesmo cliente hoje");
if (/facele quer|se este cliente ja tem pedido de hoje/i.test(trava)) ok("e o motivo fica gravado para o cliente ler");
else falha("sem motivo: o cliente so veria que nao deu");

console.log("\n=== 6. NADA DISSO VOLTA A ESCREVER DADO PESSOAL NO BANCO ===");
if (!/enviarPedidoNuvemDireto[\s\S]{0,900}?fetch\([^)]*\/pedidos/.test(script)) ok("a reserva nao grava mais direto no banco aberto");
else falha("a reserva voltou a gravar o pedido no banco (CPF em texto puro)");

console.log("\n" + (erros === 0 ? "*** O SERVIDOR QUE DIZ NAO 10/10 ***" : "*** " + erros + " FALHA(S) ***"));
process.exit(erros ? 1 : 0);