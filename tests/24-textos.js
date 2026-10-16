/* 24 - TEXTO DO CLIENTE (10/10)
   ------------------------------------------------------
   O dono reclamou de "textos com erro de digito". Aqui confere so o que
   ele LÊ NA TELA: o texto entre > < de cada pagina, fora de <script> e
   <style>. Codigo (variavel, funcao, nome de arquivo) NAO conta, porque
   la o ASCII e proposital e funciona em qualquer maquina - e foi justamente
   porFiscalizar codigo que a primeira versao desta bateria acusou 144 coisas
   erradas (p.regiao, function numero, "versao.txt") e virou alarme falso. */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = function (m) { console.log("  ERRO " + m); erros++; };
const ok = function (m) { console.log("  ok   " + m); };

/* palavra escrita -> palavra certa */
const CERTO = [
    ["Regioes", "Regiões"], ["Regiao", "Região"], ["regiao de entrega", "região de entrega"],
    ["proprio", "próprio"], ["proprios", "próprios"], ["propria", "própria"],
    ["Codigo", "Código"], ["codigo", "código"],
    ["Numero", "Número"], ["Numero:", "Número:"], ["numero", "número"],
    ["Precos", "Preços"], ["precos", "preços"],
    ["Endereco de entrega", "Endereço de entrega"], ["Endereco", "Endereço"],
    ["Horarios", "Horários"], ["horarios", "horários"],
    ["Sabado", "Sábado"], ["sabado", "sábado"],
    ["Informacoes", "Informações"], ["informacoes", "informações"],
    ["versao", "versão"], ["Versao", "Versão"],
    ["Conexao", "Conexão"], ["conexao", "conexão"],
    ["voce", "você"], ["sao", "são"],
    ["Maca", "Maçã"], ["acai", "açaí"],
    ["Facil", "Fácil"], ["facil", "fácil"],
    ["possivel", "possível"], ["Possivel", "Possível"],
    ["rapido", "rápido"], ["Rapido", "Rápido"],
    ["duvida", "dúvida"], ["nivel", "nível"]
];

const paginas = fs.readdirSync(dir).filter(function (f) {
    return /\.html$/.test(f) && f !== "produtos_ref.html";
});

/* so o texto que aparece na tela: tira script/style, depois TIRA a tag
   inteira (inclusive os atributos - data-conta="numero" e'id', nao e
   palavra que o cliente le) */
function textoDaTela(fonte) {
    return fonte
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<[^>]*>/g, " ")
        .replace(/&[a-z#0-9]+;/gi, " ")
        .replace(/\s+/g, " ");
}

console.log("=== 1. PALAVRA NA TELA SEM O ACENTO CERTO ===");
let achados = 0;
paginas.forEach(function (arq) {
    const t = textoDaTela(fs.readFileSync(path.join(dir, arq), "utf8"));
    CERTO.forEach(function (par) {
        let de = 0;
        const re = new RegExp("(^|[^A-Za-zÀ-ÿ])" + par[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "([^A-Za-zÀ-ÿ]|$)");
        while (re.test(t) && de < 3) {
            achados++; de++;
            const perto = t.substr(Math.max(0, t.indexOf(par[0]) - 22), 66);
            if (achados <= 10) falha(arq + ": '" + par[0] + "' devia ser '" + par[1] + "'  |  ..." + perto.trim());
        }
    });
});
if (!achados) ok("nenhum texto da tela sem acento (" + paginas.length + " paginas conferidas)");
else console.log("       (total de ocorrencias: " + achados + ")");

console.log("\n=== 2. CARACTERE CORROMPIDO (ACENTO QUE SE PERDEU AO GRAVAR) ===");
/* o defeito que quebrou o site uma vez: o arquivo foi gravado com o encoding
   errado e TODO acento virou "Ã" seguido de outro caractere (CaminhÃ£o).
   Aqui varre html, js, css, json, md e txt: nao sobra arquivo de fora. */
const todos = fs.readdirSync(dir).filter(function (f) {
    return /\.(html|js|css|json|md|txt)$/.test(f) && f !== "produtos_ref.html";
});
let corrompidos = 0;
todos.forEach(function (arq) {
    const t = fs.readFileSync(path.join(dir, arq), "utf8");
    const moji = (t.match(/\u00C3[\u0080-\u00BF]/g) || []).length;
    const subst = (t.match(/\uFFFD/g) || []).length;
    if (moji || subst) {
        falha(arq + " corrompido: " + moji + " acento(s) virado(s) em 'Ã…' e " + subst + " caractere(s) invalido(s)");
        corrompidos++;
    }
});
if (!corrompidos) ok("nenhum arquivo corrompido (" + todos.length + " arquivos: html, js, css, json, md, txt)");

console.log("\n=== 2b. OS JSON ABREM SEM ERRO ===");
let jsonOk = 0;
todos.filter(function (f) { return /\.json$/.test(f); }).forEach(function (arq) {
    try { JSON.parse(fs.readFileSync(path.join(dir, arq), "utf8")); jsonOk++; }
    catch (e) { falha(arq + " nao e um JSON valido: " + e.message); }
});
ok(jsonOk + " JSON(s) validos");

console.log("\n=== 3. O MENU E OS NOMES DAS REGI0ES ===");
const loja = fs.readFileSync(path.join(dir, "loja.js"), "utf8");
if (/Serop[eé]dica/.test(loja) && /Paracambi/.test(loja) && /Japeri/.test(loja) && /Engenho Pedreira/.test(loja))
    ok("as 4 regioes com o nome certo");
else falha("nome de regiao com acento errado");
const home = textoDaTela(fs.readFileSync(path.join(dir, "index.html"), "utf8"));
["Produtos", "Hist", "Configura", "Perfil"].forEach(function (w) {
    if (home.indexOf(w) < 0) falha("a home perdeu a palavra do menu '" + w + "'");
});
ok("o menu da home em portugues");

console.log("\n" + (erros === 0 ? "*** TEXTO 10/10 ***" : "*** " + erros + " ERRO(S) DE TEXTO ***"));
process.exit(erros ? 1 : 0);