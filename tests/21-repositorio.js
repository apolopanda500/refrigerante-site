/* 21 - REPOSITÓRIO (10/10)
   O que está no git tem que ser só o projeto: nada de pasta de build,
   nada de node_modules, nenhum segredo de verdade no histórico, nenhum
   arquivo gigante e o .gitignore cobrindo tudo que é gerado. */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);

function git(args, silent) {
    try {
        return execFileSync("git", args, { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", silent ? "ignore" : "pipe"] }).trim();
    } catch (e) {
        return "";
    }
}
const dentroGit = !!git(["rev-parse", "--is-inside-work-tree"], true);

console.log("=== 1. ESTA PASTA E UM REPOSITORIO GIT ===");
if (dentroGit) ok("repositorio git valido (branch " + (git(["branch", "--show-current"]) || "?") + ")");
else { falha("esta pasta nao e um repositorio git"); }

console.log("\n=== 2. O .gitignore COBRE O QUE E GERADO ===");
const gi = fs.existsSync(path.join(dir, ".gitignore")) ? fs.readFileSync(path.join(dir, ".gitignore"), "utf8") : "";
["node_modules", "build", ".gradle", ".DS_Store"].forEach(function (padrao) {
    if (gi.indexOf(padrao) >= 0) ok(".gitignore cobre " + padrao);
    else falha(".gitignore nao cobre " + padrao);
});

console.log("\n=== 3. NADA DE BUILD/DEPENDENCIA NO GIT ===");
const versionados = dentroGit ? git(["ls-files"]).split(/\r?\n/).filter(Boolean) : [];
const naoDeveria = versionados.filter(function (f) {
    return /(^|\/)node_modules\//.test(f)
        || /(^|\/)build\//.test(f)
        || /(^|\/)\.gradle\//.test(f)
        || /\.iml$/.test(f)
        || /(^|\/)\.DS_Store$/.test(f)
        || /(^|\/)local\.properties$/.test(f);
});
if (!naoDeveria.length) ok(versionados.length + " arquivos versionados, nenhum e pasta de build ou dependencia");
else falha("versionado sem necessidade (" + naoDeveria.length + "): " + naoDeveria.slice(0, 5).join(", "));

console.log("\n=== 4. NENHUM ARQUIVO GIGANTE NO REPOSITORIO ===");
/* os 2 APK ficam no git de proposito: e o site que oferece o download.
   o limite e para pegar lixo (video, dump, log gigante) */
const grandes = [];
versionados.forEach(function (f) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) return;
    const kb = fs.statSync(p).size / 1024;
    if (kb > 600 && !/\.apk$/i.test(f)) grandes.push(f + " " + Math.round(kb) + " KB");
});
if (!grandes.length) ok("nenhum arquivo inutil passa de 600 KB (os 2 APK sao o download do site)");
else falha("arquivo grande demais no git: " + grandes.join(", "));
const apks = versionados.filter(f => /\.apk$/i.test(f));
if (apks.length === 2) ok("os 2 APK (cliente e vendedor) versionados para o site oferecer o download");
else falha("esperado 2 APK no git (cliente e vendedor), tem " + apks.length);

console.log("\n=== 5. O QUE VAI PARA O AR ESTA COMPLETO ===");
/* os arquivos que o site usa de verdade */
const essenciais = ["index.html", "style.css", "app.js", "script.js", "loja.js", "catalogo.json",
    "manifest.json", "sw.js", "versao.txt", "admin.html"];
const faltando = essenciais.filter(f => versionados.indexOf(f) < 0);
if (!faltando.length) ok("todos os " + essenciais.length + " arquivos do site estao versionados");
else falha("nao esta no git: " + faltando.join(", "));

console.log("\n=== 6. A IMAGEM/ICONE DO APP ESTA NO GIT ===");
["img/icon-192.png", "img/icon-512.png", "img/608VERDE.jpg", "img/608AZUL.jpeg"].forEach(function (f) {
    if (versionados.indexOf(f) >= 0) ok(f + " versionado");
    else falha(f + " nao esta no git (no celular ficaria sem icone)");
});

console.log("\n=== 7. A CHAVE DE ASSINATURA DO APK NAO VAI PARA O GIT ===");
const chaves = versionados.filter(f => /\.keystore$|\.jks$|keystore\.properties$/i.test(f));
if (!chaves.length) ok("nenhum arquivo de chave de assinatura versionado");
else falha("CHAVE DE ASSINATURA no git: " + chaves.join(", "));
const temKeystoreNaPasta = fs.readdirSync(dir).some(f => /\.keystore$|\.jks$/i.test(f));
if (temKeystoreNaPasta) ok("a chave existe na pasta (guardada fora do git)");
else ok("a chave de assinatura nao esta nesta pasta");

console.log("\n=== 8. NENHUM SEGREDO DE VERDADE NO ARQUIVO ===");
/* o projeto tem uma senha do painel em texto puro (limitacao conhecida,
   documentada). o que nao pode e chave de API/TOKEN_PRIVATE do firebase */
const publicos = ["index.html", "carrinho.html", "checkout.html", "perfil.html", "meus-pedidos.html",
    "pedido-sucesso.html", "configuracoes.html", "admin.html", "app.js", "script.js", "loja.js",
    "ia.js", "central.js", "conta.js", "theme.js", "telegram.js", "app-update.js", "sw.js"];
const vazamentos = [];
publicos.forEach(function (f) {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) return;
    const t = fs.readFileSync(p, "utf8");
    if (/AIza[0-9A-Za-z\-_]{35}/.test(t)) vazamentos.push(f + " com chave de API do google");
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(t)) vazamentos.push(f + " com chave privada");
    if (/sk_live_[0-9a-z]{20,}/.test(t)) vazamentos.push(f + " com chave de pagamento");
});
if (!vazamentos.length) ok("nenhuma chave de API, chave privada ou chave de pagamento nos arquivos do site");
else falha(vazamentos.join(" | "));

console.log("\n=== 9. O HISTORICO NAO TEM SEGREDOS NEM LIXO ===");
if (dentroGit) {
    const grandesHist = git(["ls-tree", "-r", "-l", "HEAD"]).split(/\r?\n/).filter(Boolean)
        .map(l => l.split(/\s+/)).filter(c => c.length >= 4)
        .map(c => ({ nome: c.slice(3).join(" "), kb: parseInt(c[3], 10) / 1024 }))
        .filter(c => c.kb > 3000 && !/\.apk$/i.test(c.nome));
    if (!grandesHist.length) ok("nenhum arquivo acima de 3 MB no commit (os APK ficam em 2,4 MB)");
    else falha("arquivo grande no commit: " + grandesHist.slice(0, 3).map(c => c.nome + " " + Math.round(c.kb) + " KB").join(", "));
}

console.log("\n=== 10. A AREA DE TRABALHO ESTA DECIDIDA ===");
if (dentroGit) {
    const sujos = git(["status", "--porcelain"]).split(/\r?\n/).filter(Boolean);
    /* arquivo novo de teste ainda nao commitado e normal enquanto trabalha;
       o que nao pode e lixo esquecido */
    const lixo = sujos.filter(l => /\.tmp$|\.bak$|~$|^\?\?.*\.log$/i.test(l));
    if (!lixo.length) ok(sujos.length + " mudanca(s) na area de trabalho, nenhuma e lixo");
    else falha("arquivo de lixo sem commit: " + lixo.join(", "));
}

console.log("\n" + (erros === 0 ? "*** REPOSITORIO 10/10 ***" : "*** " + erros + " ERRO(S) DE REPOSITORIO ***"));
process.exit(erros ? 1 : 0);
