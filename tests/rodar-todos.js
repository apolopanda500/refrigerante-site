/* RODA TODOS OS TESTES DO PROJETO
   uso:  node tests/rodar-todos.js                                        */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const dir = path.resolve(__dirname, "..");
const arquivos = fs.readdirSync(__dirname)
    .filter(f => /^\d\d-.*\.js$/.test(f))
    .sort();

console.log("=====================================================");
console.log("  TESTES DO PROJETO - Refrigerantes Convenção");
console.log("=====================================================\n");

let falhou = 0;
const resultados = [];

for (const a of arquivos) {
    process.stdout.write(">>> " + a + " ... ");
    try {
        const saida = execFileSync(process.execPath, [path.join(__dirname, a)], {
            cwd: dir, encoding: "utf8", env: Object.assign({}, process.env, { WDIR: dir })
        });
        const ultima = saida.trim().split("\n").filter(Boolean).pop();
        console.log(ultima);
        resultados.push({ a, ok: true, msg: ultima });
    } catch (e) {
        const saida = (e.stdout || "") + (e.stderr || "");
        const linhas = saida.split("\n").filter(l => l.trim());
        const erros = linhas.filter(l => l.indexOf("  ERRO ") >= 0);
        console.log("FALHOU");
        console.log(erros.forEach ? "" : "");
        erros.slice(0, 10).forEach(l => console.log("    " + l.trim()));
        falhou++;
        resultados.push({ a, ok: false, msg: linhas.filter(Boolean).pop() });
    }
}

console.log("\n=====================================================");
console.log("  " + (arquivos.length - falhou) + " de " + arquivos.length + " arquivos de teste passaram");
if (falhou) {
    console.log("  FALHARAM: " + resultados.filter(r => !r.ok).map(r => r.a).join(", "));
    console.log("=====================================================\n");
    process.exit(1);
}
console.log("  TUDO 10/10 - nenhum erro");
console.log("=====================================================\n");