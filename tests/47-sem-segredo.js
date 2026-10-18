/* 47 - NENHUM SEGREDO NO CODIGO (10/10)
   O repositorio e PUBLICO. Isso quer dizer que qualquer pessoa da internet
   le qualquer arquivo dele - inclusive os segredos.

   O token do robo do Telegram estava escrito no arquivo do robo (e em mais
   tres lugares). Quem lesse enxergava os pedidos que chegam no robo do dono
   (nome, telefone, endereco) e ainda podia mandar mensagem como se fosse ele.

   Aqui provamos que:
     - nenhum token de Telegram esta escrito em nenhum arquivo
     - nenhum outro segredo conhecido do projeto esta escrito no codigo
     - o robo e os workflows leem tudo do segredo do GitHub
     - sem o segredo, o robo avisa alto que esta parado (nao falha calado)
     - o repositorio nao guarda copia da chave da conta de servico
*/
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const ok = (m) => console.log("  ok  " + m);
const falha = (m) => { console.log("  ERRO " + m); erros++; };

/* percorre o projeto inteiro, ignorando o que nao vai para o repo */
function varrer(raiz) {
    const achados = [];
    (function anda(dir, prof) {
        if (prof > 5) return;
        let itens = [];
        try { itens = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
        for (const it of itens) {
            if ([".git", "node_modules", "build", ".gradle", "dist"].indexOf(it.name) >= 0) continue;
            const caminho = path.join(dir, it.name);
            if (it.isDirectory()) { anda(caminho, prof + 1); continue; }
            if (!/\.(js|json|yml|yaml|md|html|txt|ps1|properties)$/i.test(it.name)) continue;
            let txt = "";
            try { txt = fs.readFileSync(caminho, "utf8"); } catch (e) { continue; }
            achados.push({ arquivo: path.relative(raiz, caminho), txt: txt });
        }
    })(raiz, 0);
    return achados;
}
const arquivos = varrer(dir);
console.log("=== 1. NENHUM TOKEN DO TELEGRAM NO CODIGO (" + arquivos.length + " arquivos olhados) ===");
/* token do Telegram tem o formato 1234567890:AA... - e a chave privada tem o
   marca BEGIN PRIVATE KEY. As duas coisas nao podem estar em arquivo nenhum. */
const padroes = [
    { nome: "token do Telegram", re: /\d{9,12}:AA[A-Za-z0-9_-]{30,}/ },
    /* uma chave privada de verdade e o cabecalho SEGUIDO do bloco de bytes.
       So o cabecalho sozinho nao e segredo: o gateway usa a string para
       TIRAR o cabecalho, e as baterias fabricam uma chave de mentira na
       hora. O que nao pode existir e a chave colada, inteira. */
    { nome: "chave privada da conta de servico", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----\s*[A-Za-z0-9+/=\r\n]{120,}\s*-----END [A-Z ]*PRIVATE KEY-----/ },
    { nome: "senha do gateway", re: /LOJA_SENHA\s*[:=]\s*["'][A-Za-z0-9]{20,}["']/ }
];
let segredoAlguma = 0;
for (const p of padroes) {
    const onde = arquivos.filter(function (a) { return p.re.test(a.txt); }).map(function (a) { return a.arquivo; });
    if (!onde.length) ok("nenhum " + p.nome + " escrito no projeto");
    else { falha(p.nome + " aparece em: " + onde.join(", ")); segredoAlguma++; }
}

console.log("\n=== 2. O ROBO E OS WORKFLOWS LEEM DO SEGREDO ===");
const robo = fs.readFileSync(path.join(dir, ".github/scripts/bot-telegram.js"), "utf8");
if (/process\.env\.TG_TOKEN/.test(robo)) ok("o robo do vendedor le TG_TOKEN do ambiente");
else falha("o robo do vendedor nao le TG_TOKEN");
if (!/process\.env\.TG_TOKEN\s*\|\|\s*["']\d{9,12}:AA/.test(robo)) ok("o robo nao tem token de reserva no codigo");
else falha("o robo ainda tem token de reserva escrito");
const clientes = fs.readFileSync(path.join(dir, ".github/scripts/bot-clientes.js"), "utf8");
if (/process\.env\.TG_TOKEN_CLIENTES/.test(clientes)) ok("o robo de clientes le TG_TOKEN_CLIENTES do ambiente");
else falha("o robo de clientes nao le TG_TOKEN_CLIENTES");
for (const wf of ["bot.yml", "bot-clientes.yml", "catalogo.yml"]) {
    const txt = fs.readFileSync(path.join(dir, ".github/workflows/" + wf), "utf8");
    if (/secrets\.TG_TOKEN\b/.test(txt) && !/secrets\.TG_TOKEN\s*\|\|/.test(txt)) ok(wf + ": usa secrets.TG_TOKEN sem reserva no codigo");
    else if (/secrets\.TG_TOKEN\b/.test(txt)) falha(wf + ": ainda tem token de reserva no workflow");
    else ok(wf + ": nao mexe no token do vendedor (ok)");
}

console.log("\n=== 3. SEM O SEGREDO, O ROBO AVISA QUE ESTA PARADO ===");
if (/O ROBO DO TELEGRAM ESTA PARADO/.test(robo)) ok("o aviso de 'robo parado' esta no codigo (impossivel de ignorar no log)");
else falha("sem o segredo, o robo sai em silencio e o dono nao descobre");
if (/process\.exit\(0\)/.test(robo)) ok("ele sai sem falhar de proposito (nao spamma erro a cada 5 minutos)");
else falha("o robo falha a cada rodada, cansando o dono com alerta vermelho");

console.log("\n=== 4. O PAINEL NAO TEM TOKEN DE RESERVA ===");
const script = fs.readFileSync(path.join(dir, "script.js"), "utf8");
if (!/cfgTelegramToken\s*\|\|\s*["']\d{9,12}:AA/.test(script)) ok("script.js nao tem token de reserva");
else falha("script.js ainda tem token de reserva");
const tg = fs.readFileSync(path.join(dir, "telegram.js"), "utf8");
if (!/cfgTelegramToken\s*\|\|\s*["']\d{9,12}:AA/.test(tg)) ok("telegram.js nao tem token de reserva");
else falha("telegram.js ainda tem token de reserva");

console.log("\n=== 5. O PASSO A PASSO DO TROCA EXISTE ===");
const doc = path.join(dir, "docs/TROCAR-TOKEN-BOT.md");
if (!fs.existsSync(doc)) falha("faltou docs/TROCAR-TOKEN-BOT.md");
else {
    const d = fs.readFileSync(doc, "utf8");
    if (/TG_TOKEN_CLIENTES/.test(d)) ok("o guia cobre os DOIS robos (vendedor e clientes)");
    else falha("o guia so fala de um robo");
    if (/BotFather/.test(d)) ok("o guia diz onde pegar o token (BotFather)");
    else falha("o guia nao diz onde pegar o token");
}

console.log("\n" + (erros === 0 ? "*** NENHUM SEGREDO NO CODIGO 10/10 ***" : "*** " + erros + " FALHA(S) ***"));
process.exit(erros ? 1 : 0);