/* 42 - O CODIGO INLINE DAS PAGINAS COMPILA (10/10)
   Um erro de digitacao dentro de um <script> inline NAO aparece em
   lugar nenhum: a pagina abre, o HTML esta perfeito, os links
   funcionam... e todas as funcoes daquele bloco simplesmente
   NAO EXISTEM. O botao fica ali, clicavel, e nao faz nada.

   Aconteceu de verdade: "functionacabou()" (faltando o espaco)
   derrubou o bloco inteiro do painel, e o botao Testar do painel
   virou um botao morto sem nenhum aviso. Nenhuma das 41 baterias
   pegou, porque elas leem o arquivo ou testam outras telas.

   Aqui: cada bloco <script> inline de cada pagina do projeto e
   extraido e compilado de verdade (node --check). Se um unico
   bloco nao compilar, o painel inteiro daquela pagina fica com
   codigo morto - e a bateria diz qual. */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");

const dir = process.env.WDIR || path.resolve(__dirname, "..");
let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);

const PAGINAS = fs.readdirSync(dir)
    .filter(function (f) { return /\.html$/.test(f) && f !== "produtos_ref.html"; })
    .sort();

const tmp = path.join(os.tmpdir(), "bateria42-" + Date.now());
fs.mkdirSync(tmp, { recursive: true });

console.log("=== 1. CADA BLOCO <script> INLINE COMPILA DE VERDADE ===");
let totalBlocos = 0, totalChars = 0;
const quebrados = [];
PAGINAS.forEach(function (pag) {
    const html = fs.readFileSync(path.join(dir, pag), "utf8");
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let m, i = 0;
    while ((m = re.exec(html)) !== null) {
        i++;
        totalBlocos++;
        totalChars += m[1].length;
        /* bloco vazio (so comentario) nao e codigo */
        const soComentario = !m[1].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "").replace(/<!--[\s\S]*?-->/g, "").trim();
        if (soComentario) continue;
        const arq = path.join(tmp, pag.replace(/[^\w.-]/g, "_") + "-" + i + ".js");
        fs.writeFileSync(arq, m[1], "utf8");
        try {
            execFileSync(process.execPath, ["--check", arq], { stdio: "pipe" });
        } catch (e) {
            const saida = ((e.stderr || Buffer.alloc(0)).toString() || (e.stdout || Buffer.alloc(0)).toString());
            const linha = (saida.match(/:(\d+)\r?\n/) || [])[1] || "?";
            quebrados.push({ pag: pag, bloco: i, linha: linha, erro: saida.split("\n")[0] });
        }
    }
});
if (!quebrados.length) {
    ok(PAGINAS.length + " paginas, " + totalBlocos + " blocos inline, " + totalChars + " caracteres: TODOS compilam");
} else {
    quebrados.forEach(function (b) {
        falha(b.pag + " bloco " + b.bloco + " (linha " + b.linha + ") nao compila: " + b.erro.slice(0, 90));
    });
}

console.log("\n=== 2. A PALAVRA function NAO PODE FICAR COLADA NO NOME ===");
/* o erro que aconteceu: "functionacabou()" e sintaticamente valido
   para o olho, mas quebra o bloco inteiro. A busca e o guarda-costas. */
const coladas = [];
PAGINAS.forEach(function (pag) {
    const html = fs.readFileSync(path.join(dir, pag), "utf8");
    const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
    let m, i = 0;
    while ((m = re.exec(html)) !== null) {
        i++;
        const linhas = m[1].split(/\r?\n/);
        linhas.forEach(function (l, n) {
            if (/^\s*(function|let|const|var)[A-Za-z_$]/.test(l)) {
                coladas.push(pag + " bloco " + i + " linha " + (n + 1) + ": " + l.trim().slice(0, 60));
            }
        });
    }
});
if (!coladas.length) ok("nenhuma palavra-chave colada no nome (function/let/const/var)");
else coladas.forEach(function (c) { falha("palavra-chave colada: " + c); });

console.log("\n=== 3. AS FUNCOES QUE OS BOTOES CHAMAM EXISTEM DE VERDADE ===");
/* o painel e o caso que doeu: o botao Testar ficaria morto sem erro */
const admin = fs.readFileSync(path.join(dir, "admin.html"), "utf8");
["testarPrecosURLAdmin", "bancoEhGateway", "testarBancoGateway", "salvarPrecosURLAdmin",
    "entrar", "sair", "exportarPedidos", "renderAdmin", "alternarMini"].forEach(function (fn) {
    if (new RegExp("function\\s+" + fn + "\\s*\\(").test(admin)) ok("admin.html define " + fn + "()");
    else falha("admin.html perdeu " + fn + "() - o botao que a chama fica morto");
});

console.log("\n=== 4. OS SCRIPTS EXTERNOS CONTINUAM CARREGANDO ===");
const semScript = PAGINAS.filter(function (pag) {
    const html = fs.readFileSync(path.join(dir, pag), "utf8");
    return !/<script[^>]*\bsrc=/i.test(html);
});
if (!semScript.length) ok("toda pagina carrega pelo menos um script externo");
else falha("pagina sem nenhum script carregado: " + semScript.join(", "));

try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) { /* so o tmp */ }
console.log("\n" + (erros === 0 ? "*** CODIGO INLINE COMPILA 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);