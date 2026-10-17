/* confere os horarios: pedidos 08:50-15:00 | entrega nas ruas 09:00-18:00 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || ".";

const sandbox = {
    console, Date, Math, JSON, parseInt, parseFloat, isNaN, isFinite, String, Array, Object, Number,
    document: { readyState: "complete", addEventListener() {}, querySelectorAll: () => [], getElementById: () => null },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    window: {}, setInterval() {}, setTimeout() {}
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(dir, "loja.js"), "utf8"), sandbox, { filename: "loja.js" });

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const H = sandbox.HORARIOS, RA = sandbox.REGIOES;

console.log("=== HORARIOS NO CODIGO ===");
console.log("  loja:   " + H.loja.abre + "h às " + H.loja.fecha + "h");
console.log("  entrega:" + H.entrega.abre + "h às " + H.entrega.fecha + "h");
console.log("  pedidos: " + Math.floor(sandbox.HORA_ABRE_PEDIDOS / 60) + "h" +
    (sandbox.HORA_ABRE_PEDIDOS % 60 ? String(sandbox.HORA_ABRE_PEDIDOS % 60).padStart(2, "0") : "") +
    " às " + Math.floor(sandbox.HORA_FECHA_PEDIDOS / 60) + "h");

if (H.entrega.abre !== 6) falha("a entrega deveria comecar as 6h (esta " + H.entrega.abre + ")");
if (H.entrega.fecha !== 18) falha("a entrega deveria terminar as 18h (esta " + H.entrega.fecha + ")");
if (H.loja.abre !== 9 || H.loja.fecha !== 15) falha("a loja deveria ficar 9h-15h");

console.log("\n=== TEXTO DAS REGIOES (o que o cliente ve) ===");
RA.forEach(function (r) {
    const ok = r.horario === "6h às 18h";
    if (!ok) falha(r.nome + " mostra " + r.horario);
    console.log((ok ? "  ok   " : "  ERRO ") + r.nome.padEnd(18) + r.horario);
});

console.log("\n=== ESTADO DA LOJA AO LONGO DO DIA (quarta = pedido + entrega) ===");
[7, 8, 8.5, 9, 10, 12, 14.5, 15, 15.1, 16, 17.5, 18, 19].forEach(function (h) {
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    const a = { dia: 3, hh: hh, mm: mm, minutos: hh * 60 + mm };
    const pl = sandbox.pedidosLiberados("", a);
    const loja = sandbox.lojaAberta(a);
    const ent = sandbox.entregaAberta(a);
    console.log("  " + String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0")
        + "  pedidos=" + (pl.liberado ? "ABERTOS" : "pausados")
        + "  loja=" + (loja ? "aberta" : "fechada")
        + "  entrega=" + (ent ? "em andamento" : "parada"));
});

/* regra: pedido fecha 15:00, entrega continua ate 18:00 */
console.log("\n=== REGRA IMPORTANTE ===");
const as15 = { dia: 3, hh: 15, mm: 0, minutos: 900 };
const as17 = { dia: 3, hh: 17, mm: 0, minutos: 1020 };
if (sandbox.pedidosLiberados("", as15).liberado) falha("as 15:00 os pedidos ainda deveriam estar abertos");
else console.log("  ok  15:00 - pedidos encerram");
if (sandbox.pedidosLiberados("", { dia: 3, hh: 14, mm: 59, minutos: 899 }).liberado !== true) falha("as 14:59 os pedidos ainda deveriam estar abertos");
else console.log("  ok  14:59 - pedidos ainda abertos (fecham em ponto)");
if (sandbox.pedidosLiberados("", { dia: 3, hh: 8, mm: 49, minutos: 529 }).liberado !== false) falha("as 08:49 os pedidos ainda nao deveriam ter aberto");
else console.log("  ok  08:49 - pedidos ainda fechados (abrem as 08:50)");
if (sandbox.pedidosLiberados("", { dia: 6, hh: 10, mm: 0, minutos: 600 }).liberado !== false) falha("sabado nao deveria aceitar pedido");
else console.log("  ok  sabado - so dia de entrega, nunca de pedido");
if (!sandbox.entregaAberta(as17)) falha("as 17:00 a entrega deveria continuar");
else console.log("  ok  17:00 - entrega ainda em andamento (vai ate 18:00)");
if (sandbox.entregaAberta({ dia: 3, hh: 18, mm: 30, minutos: 1110 })) falha("as 18:30 a entrega ja deveria ter parado");
else console.log("  ok  18:30 - entrega encerrada");

console.log("\n=== NENHUM TEXTO FIXO DIZENDO 15H PARA ENTREGA ===");
["app.js", "loja.js", "index.html", "admin.html"].forEach(function (f) {
    const t = fs.readFileSync(path.join(dir, f), "utf8");
    t.split("\n").forEach(function (l, i) {
        if (/entrega/i.test(l) && /15h|15:00/.test(l) && !/pedido/i.test(l)) {
            falha(f + ":" + (i + 1) + " ainda liga 15h a entrega: " + l.trim().substring(0, 70));
        }
    });
});
console.log("  (nenhum aviso acima = tudo certo)");

console.log("\n" + (erros === 0 ? "*** HORARIOS 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);