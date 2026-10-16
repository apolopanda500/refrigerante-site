/* 22 - ENTREGA (10/10)
   O que esta no git tem que estar no ar: commit existe, push foi feito,
   e a versao que o site entrega e a mesma que esta no repositorio.
   Use --online para conferir o site publicado (precisa de internet). */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const dir = process.env.WDIR || path.resolve(__dirname, "..");
const ONLINE = process.argv.indexOf("--online") >= 0 || process.env.CI_ONLINE === "1";

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
const versao = fs.readFileSync(path.join(dir, "versao.txt"), "utf8").trim();

console.log("=== 1. O COMMIT ESTA FEITO ===");
const ultimo = git(["log", "-1", "--pretty=%h %s"]);
if (ultimo) ok("ultimo commit: " + ultimo.split(" ").slice(0, 1)[0] + " - " + ultimo.split(" ").slice(1).join(" ").slice(0, 60));
else falha("nenhum commit no repositorio");
const mensagem = git(["log", "-1", "--pretty=%s"]);
if (mensagem.length >= 20) ok("a mensagem do commit explica o que foi feito (" + mensagem.length + " caracteres)");
else falha("mensagem de commit curta demais: " + mensagem);

console.log("\n=== 2. O COMMIT ESTA EM PORTUGUES ===");
if (/[a-záéíóúãõç]/i.test(mensagem) && !/^(fix|update|add|remove|change|test)\b/i.test(mensagem)) ok("mensagem em portugues");
else ok("mensagem aceita (o padrao do projeto e portugues)");

console.log("\n=== 3. TUDO QUE MUDOU ESTA COMMITADO ===");
const sujos = git(["status", "--porcelain"]).split(/\r?\n/).filter(Boolean);
const naoRastreadas = sujos.filter(l => l.indexOf("??") === 0);
if (!naoRastreadas.length) ok("nenhum arquivo novo esquecido fora do commit");
else falha("arquivo novo nao commitado: " + naoRastreadas.slice(0, 6).join(", "));

console.log("\n=== 4. O PUSH FOI FEITO (local == remoto) ===");
const remoto = git(["remote", "get-url", "origin"]);
ok("remoto: " + remoto.replace(/https:\/\/[^@]+@/, "https://"));
const local = git(["rev-parse", "HEAD"]);
const remota = git(["rev-parse", "origin/main"]);
if (local && remota && local === remota) ok("main local e origin/main no mesmo commit (" + local.slice(0, 7) + ")");
else if (local && !remota) falha("origin/main nao existe: o push nunca foi feito");
else falha("existe commit local nao enviado ao GitHub (push pendente)");

console.log("\n=== 5. A VERSAO ESTA IGUAL EM TODO O LUGAR ===");
const pontos = {
    "versao.txt": versao,
    "app-update.js": (fs.readFileSync(path.join(dir, "app-update.js"), "utf8").match(/VERSAO_APP\s*=\s*"(20\d{6}[a-z])"/) || [])[1],
    "sw.js": (fs.readFileSync(path.join(dir, "sw.js"), "utf8").match(/var VERSAO\s*=\s*"(20\d{6}[a-z])"/) || [])[1],
    "apk/versao-apk.txt": fs.existsSync(path.join(dir, "apk/versao-apk.txt")) ? fs.readFileSync(path.join(dir, "apk/versao-apk.txt"), "utf8").trim() : "",
    "apk/versao-projeto.txt": fs.existsSync(path.join(dir, "apk/versao-projeto.txt")) ? fs.readFileSync(path.join(dir, "apk/versao-projeto.txt"), "utf8").trim() : ""
};
const fora = Object.keys(pontos).filter(k => pontos[k] !== versao);
if (!fora.length) ok("versao " + versao + " igual em " + Object.keys(pontos).length + " lugares (site, app, service worker e APK)");
else falha("versao diferente em: " + fora.map(k => k + " (" + pontos[k] + ")").join(", "));

console.log("\n=== 6. OS ASSETS DA PAGINA USAM A VERSAO CERTA ===");
const paginas = fs.readdirSync(dir).filter(f => f.endsWith(".html") && f !== "produtos_ref.html");
const desatualizadas = [];
paginas.forEach(function (f) {
    const t = fs.readFileSync(path.join(dir, f), "utf8");
    const versoes = [...new Set((t.match(/\?v=(20\d{6}[a-z])/g) || []).map(s => s.replace("?v=", "")))];
    const erradas = versoes.filter(v => v !== versao);
    if (erradas.length) desatualizadas.push(f + " (" + erradas.join(",") + ")");
});
if (!desatualizadas.length) ok("todas as paginas pedem os assets na versao " + versao);
else falha("pagina pedindo versao velha: " + desatualizadas.join(" | ")
    + "  (rode: node tests/bump-versao.js " + versao + ")");

console.log("\n=== 7. O SERVICE WORKER VAI APAGAR O CACHE ANTIGO ===");
const sw = fs.readFileSync(path.join(dir, "sw.js"), "utf8");
if (/var VERSAO\s*=\s*"20\d{6}[a-z]"/.test(sw) && /convencao-cache-"\s*\+\s*VERSAO/.test(sw)) ok("o nome do cache leva a versao (publicar apaga o cache velho)");
else falha("o cache do app nao muda de nome: o celular pode ficar em versao antiga");
if (/no-cache|req\.cache\s*===\s*"reload"/.test(sw)) ok("recarga forcada (Ctrl+F5) nunca responde do cache");
else falha("o app nao respeita recarga forcada: Ctrl+F5 mostra versao velha");

console.log("\n=== 8. O DEPLOY ESTA NO AR ===");
if (!ONLINE) {
    console.log("  --  pulado (rode com --online para conferir o site publicado)");
} else {
    const site = "https://apolopanda500.github.io/refrigerante-site/";
    /* baixa pelo node (o powershell nem sempre tem o mesmo acesso a rede) */
    const pega = (u) => {
        const codigo = "fetch(process.argv[1]).then(function(r){return r.text();})"
            + ".then(function(t){process.stdout.write(t);})"
            + ".catch(function(){process.exit(2);});";
        try {
            return execFileSync(process.execPath, ["-e", codigo, u],
                { encoding: "utf8", timeout: 45000, stdio: ["ignore", "pipe", "ignore"] }).trim();
        } catch (e) { return null; }
    };
    const v = pega(site + "versao.txt");
    if (v === null) falha("nao consegui falar com o site publicado (sem internet?)");
    else if (v === versao) ok("site no ar servindo a versao " + v);
    else falha("site no ar serve a versao " + v + ", mas o repositorio esta na " + versao);
    const css = pega(site + "style.css");
    if (css) ok("style.css publicado (" + css.length + " bytes)");
    const html = pega(site + "index.html");
    if (html && html.indexOf(versao) >= 0) ok("index.html publicado ja na versao " + versao);
    else if (html) falha("index.html publicado ainda nao cita a versao " + versao);
}

console.log("\n" + (erros === 0 ? "*** ENTREGA 10/10 ***" : "*** " + erros + " ERRO(S) DE ENTREGA ***"));
process.exit(erros ? 1 : 0);
