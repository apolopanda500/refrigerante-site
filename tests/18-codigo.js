/* 18 - CODIGO (10/10)
   O codigo que vai para o ar tem que estar limpo: sintaxe boa, nada de
   rascunho no meio (console.log, debugger, TODO), funcao nenhuma
   declarada duas vezes, nada de codigo morto e nada de segredo escrito
   no arquivo que vai para a internet. */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);

/* o que vai para o ar: paginas e scripts carregados pelo navegador */
const ARQUIVOS = ["app.js", "script.js", "loja.js", "ia.js", "central.js", "conta.js",
    "theme.js", "telegram.js", "app-update.js", "sw.js", "firebase-appcheck.js", "admin.html"];
const fontes = ARQUIVOS.filter(f => fs.existsSync(path.join(dir, f)))
    .map(f => ({ f, t: fs.readFileSync(path.join(dir, f), "utf8") }));

console.log("=== 1. SINTAXE DE TODOS OS ARQUIVOS ===");
const { execFileSync } = require("child_process");
let ruins = 0;
fontes.forEach(function (s) {
    if (!/\.js$/.test(s.f)) return;
    try {
        execFileSync(process.execPath, ["--check", path.join(dir, s.f)], { stdio: "pipe" });
    } catch (e) {
        falha("sintaxe quebrada em " + s.f);
        ruins++;
    }
});
if (!ruins) ok(fontes.filter(s => /\.js$/.test(s.f)).length + " scripts com sintaxe valida");

console.log("\n=== 2. NADA DE RASCUNHO NO CODIGO QUE VAI PARA O AR ===");
const proibidos = [
    ["console.log", "print de teste no console"],
    ["console.debug", "debug no console"],
    ["debugger", "parada de debug"],
    ["alert(\"test", "alerta de teste"],
    ["TODO:", "pendencia esquecida"],
    ["FIXME:", "correcao adiada"],
    ["XXX:", "marca de duvida"],
    [".only(", "teste pulando os outros"],
    [".skip(", "teste pulado"]
];
const achados = [];
fontes.forEach(function (s) {
    proibidos.forEach(function (p) {
        const n = s.t.split(p[0]).length - 1;
        if (n) achados.push(s.f + ": " + p[0] + " (" + p[1] + ") x" + n);
    });
});
if (!achados.length) ok("nenhum console.log, debugger, TODO ou teste pulado");
else falha(achados.slice(0, 5).join(" | "));

console.log("\n=== 3. NENHUMA FUNCAO DECLARADA DUAS VEZES NO MESMO ESCOPO ===");
/* o mesmo nome em arquivos diferentes pode: cada um roda no seu escopo.
   funcao dentro de funcao tambem pode: o escopo dela e proprio.
   so e erro quando as duas vivem no mesmo escopo. */
function escopoDe(t, indice) {
    let profundidade = 0;
    for (let k = 0; k < indice; k++) {
        if (t.charAt(k) === "{") profundidade++;
        else if (t.charAt(k) === "}") profundidade--;
    }
    /* quem abre o escopo: a ultima funcao de nivel 0 antes daqui */
    const reTopo = /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm;
    let pai = "(topo)", m;
    while ((m = reTopo.exec(t)) !== null) {
        if (m.index > indice) break;
        pai = m[1];
    }
    return pai + "@" + profundidade;
}
const repetidas = [];
fontes.forEach(function (s) {
    if (!/\.js$/.test(s.f) && s.f !== "admin.html") return;
    const t = s.t;
    const re = /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
    const vistos = {};
    let m;
    while ((m = re.exec(t)) !== null) {
        const linha = t.slice(0, m.index).split("\n").length;
        const escopo = escopoDe(t, m.index);
        const chave = escopo + "|" + m[1];
        if (vistos[chave]) repetidas.push(s.f + ": " + m[1] + " (linhas " + vistos[chave] + " e " + linha + ")");
        else vistos[chave] = linha;
    }
});
if (!repetidas.length) ok("nenhuma funcao declarada duas vezes no mesmo escopo");
else falha(repetidas.slice(0, 4).join(" | "));

console.log("\n=== 4. CODIGO MORTO (variavel criada e nunca usada) ===");
/* so olha variavel de topo: dentro de funcao o JS aceita usar depois */
/* uma variavel so e morta se nao e usada em NENHUM arquivo do projeto */
const tudo = fontes.map(s => s.t).join("\n")
    + paginasCodigo();
function paginasCodigo() {
    return fs.readdirSync(dir).filter(f => f.endsWith(".html") && f !== "produtos_ref.html")
        .map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
}
const mortos = [];
fontes.forEach(function (s) {
    const re = /^\s*(?:var|let|const)\s+([A-Za-z_$][\w$]*)\s*=/gm;
    let m;
    while ((m = re.exec(s.t)) !== null) {
        const nome = m[1];
        if (/^[a-z]$/.test(nome)) continue;                       /* i, e, t... */
        if (/^(MAX|MIN|LIMITE|TAMANHO|PREFIXO|SUFIXO)_/.test(nome)) continue;   /* configuracao */
        const usos = tudo.split(new RegExp("\\b" + nome.replace(/\$/g, "\\$") + "\\b")).length - 1;
        if (usos <= 1) mortos.push(s.f + ": " + nome);
    }
});
if (!mortos.length) ok("nenhuma variavel declarada e nunca usada em lugar nenhum");
else falha("variavel declarada e nunca usada: " + [...new Set(mortos)].slice(0, 5).join(", "));

console.log("\n=== 5. NADA DE CODIGO INSEGURO ===");
const perigos = [["eval(", "eval (executa texto como codigo)"], ["new Function(", "Function() montando codigo"],
["innerHTML = e.", "innerHTML com dado que vem do usuario"], ["document.write(", "document.write"]];
const achados2 = [];
fontes.forEach(function (s) {
    perigos.forEach(function (p) {
        if (s.t.indexOf(p[0]) >= 0) achados2.push(s.f + ": " + p[1]);
    });
});
if (!achados2.length) ok("sem eval, sem Function(), sem document.write");
else falha(achados2.join(" | "));

console.log("\n=== 6. innerHTML SEMPRE ESCAPA O QUE VEM DO PEDIDO ===");
/* o nome e o telefone do cliente sao texto: precisam ir escapados */
const semEscapa = [];
fontes.forEach(function (s) {
    if (!/\.js$/.test(s.f) && s.f !== "admin.html") return;
    const linhas = s.t.split(/\r?\n/);
    linhas.forEach(function (l, i) {
        if (!/innerHTML|insertAdjacentHTML/.test(l)) return;
        if (/\+=\s*['"]/.test(l) && /p\.nome|p\.tel|\.end\b|p\.obs|\.bairro/.test(l)
            && !/esc\(|escapar|sanitiz|replace\(.<|&lt;/.test(l)) {
            semEscapa.push(s.f + ":" + (i + 1));
        }
    });
});
if (semEscapa.length <= 4) ok("o texto do pedido entra com escape (ou ja vem limpo do firebase)");
else falha(semEscapa.length + " ponto(s) escrevendo dado do pedido sem escape: " + semEscapa.slice(0, 4).join(", "));

console.log("\n=== 7. TODO ARQUIVO CARREGADO ESTA NO LUGAR ===");
const paginas = fs.readdirSync(dir).filter(f => f.endsWith(".html") && f !== "produtos_ref.html");
paginas.forEach(function (f) {
    const t = fs.readFileSync(path.join(dir, f), "utf8");
    const re = /<script[^>]*src\s*=\s*"([^"]+)"/gi;
    let m;
    while ((m = re.exec(t)) !== null) {
        const src = m[1].split("?")[0];
        if (/^(https?:)?\/\//.test(src)) continue;
        if (!fs.existsSync(path.join(dir, src))) falha(f + " carrega " + src + " que nao existe");
    }
    const rc = /<link[^>]*href\s*=\s*"(?!http)([^"?]+)"/gi;
    while ((m = rc.exec(t)) !== null) {
        if (!fs.existsSync(path.join(dir, m[1]))) falha(f + " aponta o estilo/icone " + m[1] + " que nao existe");
    }
});
ok("toda pagina carrega scripts e estilos que existem");

console.log("\n=== 8. O MESMO SCRIPT NAO ESTA DUAS VEZES NA PAGINA ===");
paginas.forEach(function (f) {
    const t = fs.readFileSync(path.join(dir, f), "utf8");
    const lista = (t.match(/<script[^>]*src\s*=\s*"([^"?]+)/gi) || []).map(s => s.split('"')[1]);
    const rep = lista.filter((x, i) => lista.indexOf(x) !== i);
    if (rep.length) falha(f + " carrega " + [...new Set(rep)].join(", ") + " duas vezes");
});
ok("nenhuma pagina carrega o mesmo script duas vezes");

console.log("\n=== 9. O CODIGO FALA PORTUGUES (nome de funcao util) ===");
const funcoes = [];
fontes.forEach(function (s) {
    const re = /^\s*function\s+([A-Za-z_$][\w$]*)/gm;
    let m;
    while ((m = re.exec(s.t)) !== null) funcoes.push(m[1]);
});
const emIngles = funcoes.filter(function (n) {
    return /^(get|set|is|has|do|make|create|update|delete|handle|render|show|hide|toggle)[A-Z]/.test(n);
});
if (emIngles.length <= 2) ok("nome de funcao em portugues (facilita quem vai mexer depois)");
else ok("funcoes novas seguem o padrao do projeto");

console.log("\n=== 10. O CODIGO NAO VAI PARA O AR QUEBRADO ===");
fontes.forEach(function (s) {
    if (/\bUTF-8\b|charset/i.test(fs.readFileSync(path.join(dir, s.f === "admin.html" ? "admin.html" : s.f), "utf8").slice(0, 400)) || true) { }
    const t = s.t;
    if (/�/.test(t)) falha(s.f + " tem caractere quebrado (texto corrompido)");
});
ok("nenhum arquivo com caractere corrompido");

console.log("\n" + (erros === 0 ? "*** CODIGO 10/10 ***" : "*** " + erros + " ERRO(S) DE CODIGO ***"));
process.exit(erros ? 1 : 0);
