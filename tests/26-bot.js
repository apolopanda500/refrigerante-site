/* 26 - BOT DO TELEGRAM 24/7 (10/10)
   O bot tem que funcionar com o painel FECHADO. Isso so e possivel
   com um robo no servidor (GitHub Actions) que le o Telegram, aplica
   o status nos pedidos do Firebase e responde no chat.
   Este teste confere o workflow, o robo e o teclado do cliente. */
const fs = require("fs");
const path = require("path");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const existe = (f) => fs.existsSync(path.join(dir, f));
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

const wf = ".github/workflows/bot.yml";
const robo = ".github/scripts/bot-telegram.js";

console.log("=== 1. O WORKFLOW DO BOT EXISTE ===");
if (!existe(wf)) { falha("falta " + wf); }
else {
    ok("workflow " + wf + " presente");
    const w = ler(wf);
    if (!/cron:\s*'?\*\/5 \* \* \* \*'?/.test(w)) falha("o bot nao roda a cada 5 minutos");
    else ok("agendado a cada 5 minutos (cron */5)");
    if (!/workflow_dispatch/.test(w)) falha("nao da para rodar o bot na mao (sem workflow_dispatch)");
    else ok("da para rodar na mao (workflow_dispatch)");
    if (!/scripts\/bot-telegram\.js/.test(w)) falha("o workflow nao chama o robo do bot");
    else ok("chama o robo .github/scripts/bot-telegram.js");
    if (!/concurrency/.test(w)) falha("sem concurrency o bot pode rodar duas vezes juntas");
    else ok("tem concurrency (uma rodada por vez)");
    if (!/TG_TOKEN/.test(w) || !/TG_CHAT/.test(w)) falha("o workflow nao passa token/chat do bot");
    else ok("recebe TG_TOKEN e TG_CHAT");
}

console.log("\n=== 2. O ROBO LE O TELEGRAM E O FIREBASE ===");
if (!existe(robo)) { falha("falta " + robo); }
else {
    const r = ler(robo);
    if (!/getUpdates/.test(r)) falha("o robo nao le o Telegram (getUpdates)");
    else ok("le o Telegram (getUpdates)");
    if (!/\/pedidos\//.test(r) && !/\/pedidos\.json/.test(r)) falha("o robo nao mexe nos pedidos do Firebase");
    else ok("le/grava os pedidos no Firebase");
    if (!/api\.telegram\.org|setMyCommands/.test(r)) falha("o robo nao fala com a API do Telegram");
    else ok("fala com a API do Telegram");
    if (!/answerCallbackQuery/.test(r)) falha("o robo nao responde ao toque do botao (answerCallbackQuery)");
    else ok("responde ao toque do botao");
    if (!/editMessageText/.test(r)) falha("o robo nao atualiza a mensagem do pedido");
    else ok("atualiza a mensagem do pedido (editMessageText)");
    if (!/offset/.test(r)) falha("o robo nao guarda o offset (pode repetir o mesmo toque)");
    else ok("guarda o offset para nao repetir o toque");
}

console.log("\n=== 3. OS BOTOES E COMANDOS DO BOT ===");
{
    const r = existe(robo) ? ler(robo) : "";
    ["confirmado", "separacao", "enviado", "entregue", "cancelado", "aguardando"].forEach(function (st) {
        if (r.indexOf(st) < 0) falha("o robo nao trata o status \"" + st + "\"");
    });
    if (!/st\|/.test(r) && r.indexOf("st|") < 0) falha("o robo nao entende os botoes de status (st|id|status)");
    else ok("os botoes de status funcionam (st|id|status)");
    const cmds = (r.match(/command:\s*"([a-z]+)"/g) || []).map(function (s) { return s.replace(/.*"([a-z]+)"/, "$1"); });
    const dup = cmds.filter(function (c, i) { return cmds.indexOf(c) !== i; });
    if (dup.length) falha("comandos repetidos no menu: " + dup.join(", "));
    else ok("menu de comandos sem repeticao (" + cmds.length + " comandos)");
    if (cmds.indexOf("confirmar") < 0 || cmds.indexOf("ajuda") < 0) falha("faltam comandos basicos (confirmar/ajuda)");
    else ok("comandos basicos presentes");
}

console.log("\n=== 4. A MENSAGEM DO PEDIDO TEM BOTAO PARA O PAINEL ===");
{
    const s = ler("script.js");
    if (!/tecladoPedidoTG/.test(s)) falha("script.js nao tem o teclado do pedido");
    else ok("teclado do pedido no script.js");
    if (!/callback_data:\s*"st\|"/.test(s)) falha("os botoes do pedido perderam o callback de status");
    else ok("botoes do pedido com callback de status");
    if (!/url:\s*"https:\/\/convencao-site\.rickjax123\.workers\.dev\/admin\.html"/.test(s)) falha("falta o botao \"Abrir painel\" (URL) na mensagem");
    else ok("mensagem tem o botao para abrir o painel");
}

console.log("\n=== 5. O OFFSET E COMPARTILHADO (PAINEL X ROBO) ===");
{
    const tg = ler("telegram.js");
    if (!/bot\/offset/.test(tg)) falha("telegram.js nao usa o offset compartilhado (/bot/offset)");
    else ok("o painel usa o mesmo offset do robo (/bot/offset)");
    if (!/lerOffsetNuvem/.test(tg) || !/gravarOffsetNuvem/.test(tg)) falha("o painel nao le/grava o offset no Firebase");
    else ok("o painel le e grava o offset no Firebase");
    if (!/Math\.max\(\s*local/.test(tg)) falha("o painel nao parte do maior offset (pode repetir um toque velho)");
    else ok("o painel parte do maior offset (nuvem x local)");
    const r = existe(robo) ? ler(robo) : "";
    if (!/\/bot\/offset\.json/.test(r)) falha("o robo do servidor nao usa /bot/offset.json (offsets diferentes)");
    else ok("o robo usa exatamente o mesmo /bot/offset.json");
}

console.log("\n" + (erros === 0 ? "*** BOT 10/10 ***" : "*** " + erros + " ERRO(S) ***"));
process.exit(erros ? 1 : 0);
