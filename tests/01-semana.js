/* 01 - SEMANA DE TRABALHO (10/10)
   - pedido so existe se a vespera for dia de entrega
   - sabado: so entrega, loja fechada
   - domingo: nada
   - a loja funciona de segunda a sexta                */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

const loja = fs.readFileSync(path.join(dir, "loja.js"), "utf8");
const sandbox = {
    console, Date, Math, JSON, parseInt, parseFloat, isNaN, isFinite, String, Array, Object, Number, Boolean,
    document: { readyState: "complete", addEventListener() {}, querySelectorAll: () => [], getElementById: () => null },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    window: {}, setInterval() {}, setTimeout() {}
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(loja, sandbox, { filename: "loja.js" });

const N = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };

console.log("=== DIAS DE PEDIDO DE CADA REGIAO ===");
const esperado = {
    seropedica: [4, 5],
    paracambi: [3, 4, 5],
    japeri: [1, 2, 3, 4, 5],
    engenhopedreira: [1, 2, 3, 4, 5]
};
sandbox.REGIOES.forEach(function (r) {
    const dp = sandbox.diasPedidoDaRegiao(r);
    const ok = JSON.stringify(dp) === JSON.stringify(esperado[r.id]);
    if (!ok) falha(r.nome + ": dias de pedido " + dp + " (esperado " + esperado[r.id] + ")");
    console.log((ok ? "  ok   " : "  ERRO ") + r.nome.padEnd(18)
        + "entrega: " + r.dias.map(d => N[d]).join(", ").padEnd(32)
        + "pedido: " + dp.map(d => N[d]).join(", "));
});

console.log("\n=== SEMANA ===");
for (let d = 1; d <= 6; d++) {
    const pe = sandbox.regioesPedidoHoje(d).map(r => r.nome);
    const en = sandbox.regioesDoDia(d).map(r => r.nome);
    console.log("  " + N[d].padEnd(8) + "loja " + (sandbox.lojaAbertaNoDia(d) ? "ABERTA " : "fechada")
        + " | pedido: " + (pe.length ? pe.join(", ") : "-").padEnd(34)
        + " | entrega: " + (en.length ? en.join(", ") : "-"));
}

console.log("\n=== REGRAS ===");
sandbox.REGIOES.forEach(function (r) {
    for (let d = 0; d <= 6; d++) {
        const pode = sandbox.diasPedidoDaRegiao(r).indexOf(d) >= 0;
        const entregaAmanha = r.dias.indexOf((d + 1) % 7) >= 0;
        if (pode && !entregaAmanha) falha(r.nome + ": " + N[d] + " abre pedido sem entrega no dia seguinte");
    }
});
console.log("  ok  pedido so quando a vespera tem entrega (4 regioes x 7 dias)");

if (!sandbox.lojaAbertaNoDia(6)) console.log("  ok  sabado: loja fechada"); else falha("loja aberta no sabado");
if (!sandbox.lojaAbertaNoDia(0)) console.log("  ok  domingo: loja fechada"); else falha("loja aberta no domingo");
if (sandbox.regioesDoDia(0).length === 0) console.log("  ok  domingo: sem entrega"); else falha("domingo com entrega");
if (sandbox.regioesPedidoHoje(0).length === 0) console.log("  ok  domingo: sem pedido"); else falha("domingo com pedido");
for (let d = 1; d <= 5; d++) if (!sandbox.lojaAbertaNoDia(d)) falha("loja fechada em " + N[d]);
console.log("  ok  segunda a sexta a loja funciona");
console.log("  ok  sabado entrega em: " + sandbox.regioesDoDia(6).map(r => r.nome).join(", "));

console.log("\n" + (erros === 0 ? "*** SEMANA 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);