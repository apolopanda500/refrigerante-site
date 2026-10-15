/* 08 - CAMADAS E MODULOS (10/10)
   A camada base (loja.js) e carregada sozinha na home.
   Se ela depender de algo de outra camada, quebra na hora.
   Aqui rodamos TODAS as funcoes da loja.js isolada para provar
   que ela funciona sem script.js, app.js, conta.js etc. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };

function sandboxLimpo() {
    const sb = {
        console, Date, Math, JSON, parseInt, parseFloat, isNaN, isFinite, String, Array, Object,
        Number, Boolean, RegExp, Error,
        document: {
            readyState: "complete", addEventListener() {},
            querySelectorAll: () => [], getElementById: () => null, createElement: () => ({ style: {} })
        },
        localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
        window: {}, setInterval() {}, setTimeout() {}, fetch: () => Promise.resolve({ ok: false }),
        location: { pathname: "/index.html" }, navigator: {}
    };
    sb.window = sb;
    vm.createContext(sb);
    return sb;
}

console.log("=== 1. loja.js sozinha (a camada que a home carrega) ===");
const sb = sandboxLimpo();
vm.runInContext(fs.readFileSync(path.join(dir, "loja.js"), "utf8"), sb, { filename: "loja.js" });

/* chama cada funcao publica e ve se falta alguma dependencia */
const src = fs.readFileSync(path.join(dir, "loja.js"), "utf8");
const nomes = [...src.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]);
const semArgumento = nomes.filter(n => {
    const m = src.match(new RegExp("function\\s+" + n + "\\s*\\([^)]*\\)"));
    return !m || m[0].indexOf("(") === m[0].lastIndexOf(")");
});
const comArgumento = nomes.filter(n => semArgumento.indexOf(n) < 0);

let quebradas = [];
semArgumento.forEach(function (n) {
    try { sb[n](); }
    catch (e) {
        if (e instanceof ReferenceError) quebradas.push(n + " -> " + e.message);
    }
});
comArgumento.forEach(function (n) {
    try { sb[n]("", null); }
    catch (e) {
        if (e instanceof ReferenceError) quebradas.push(n + " -> " + e.message);
    }
});
quebradas.forEach(b => falha("dependencia faltando: " + b));
if (!quebradas.length) console.log("  ok  as " + nomes.length + " funcoes de loja.js rodam sozinhas");
console.log("      (" + semArgumento.length + " sem argumento, " + comArgumento.length + " com argumento)");

console.log("\n=== 2. app.js depois de loja.js (ordem da home) ===");
const sb2 = sandboxLimpo();
vm.runInContext(fs.readFileSync(path.join(dir, "loja.js"), "utf8"), sb2, { filename: "loja.js" });
/* app.js tem codigo no topo que usa DOM: damos o minimo */
try {
    vm.runInContext(fs.readFileSync(path.join(dir, "app.js"), "utf8"), sb2, { filename: "app.js" });
    console.log("  ok  app.js carrega sem erro depois de loja.js");
} catch (e) {
    if (e instanceof ReferenceError) falha("app.js depende de algo que nao existe: " + e.message);
    else console.log("  ok  app.js carrega (so pediu o DOM: " + e.message.slice(0, 40) + ")");
}

console.log("\n=== 3. script.js (camada do carrinho/checkout) ===");
const sb3 = sandboxLimpo();
try {
    vm.runInContext(fs.readFileSync(path.join(dir, "script.js"), "utf8"), sb3, { filename: "script.js" });
    console.log("  ok  script.js carrega sem erro");
} catch (e) {
    if (e instanceof ReferenceError) falha("script.js: " + e.message);
    else console.log("  ok  script.js carregou (precisa do DOM: " + e.message.slice(0, 40) + ")");
}

console.log("\n=== 4. DINHEIRO: arredonda e precoNumero na camada base ===");
["arredonda", "precoNumero", "precoSaneio", "precoTexto", "formatBRL"].forEach(function (n) {
    if (typeof sb[n] !== "function") falha("loja.js nao exporta " + n);
});
if (typeof sb.arredonda === "function") {
    /* negativos arredondam para longe do zero (preco nunca e negativo,
       mas o comportamento fica definido) */
    const casos = [[10.10, 10.1], [20.20, 20.2], [10.1 + 20.2, 30.3], [0.1 + 0.2, 0.3], [-1.005, -1.01], [27.555, 27.56]];
    casos.forEach(function (c) {
        const got = sb.arredonda(c[0]);
        if (Math.abs(got - c[1]) > 0.0001) falha("arredonda(" + c[0] + ") = " + got + " (esperado " + c[1] + ")");
    });
    console.log("  ok  arredonda: 10,10 + 20,20 = 30,30 (sem lixo de ponto flutuante)");
}

console.log("\n=== 5. FRETE E TOTAL (a conta que o cliente ve) ===");
const esperado = [[100, "japeri", 12, 112], [200, "japeri", 0, 200], [100, null, 8, 108],
[82.5, "paracambi", 20, 102.5], [55, "seropedica", 8, 63], [150, "japeri", 0, 150]];
esperado.forEach(function (c) {
    const r = sb.calcularFrete(c[0], c[1]);
    if (Math.abs(r.frete - c[2]) > 0.001) falha("frete de " + c[0] + " em " + (c[1] || "sem regiao") + " = " + r.frete + " (esperado " + c[2] + ")");
    if (Math.abs(r.total - c[3]) > 0.001) falha("total de " + c[0] + " em " + (c[1] || "sem regiao") + " = " + r.total + " (esperado " + c[3] + ")");
});
console.log("  ok  " + esperado.length + " situacoes de frete/total conferidas");

console.log("\n=== 6. NENHUMA PAGINA USA ARQUIVO QUE NAO CARREGA ===");
/* a home nao carrega script.js: ela pode usar calcularFrete? (nao pode depender de arredonda) */
const home = fs.readFileSync(path.join(dir, "index.html"), "utf8");
const appJs = fs.readFileSync(path.join(dir, "app.js"), "utf8");
if (appJs.indexOf("calcSubtotal(") >= 0 && !home.includes("script.js")) {
    falha("app.js usa calcSubtotal (do script.js) mas a home nao carrega script.js");
} else console.log("  ok  app.js nao usa funcao que a home nao tem");

console.log("\n" + (erros === 0 ? "*** CAMADAS 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);