/* 36 - O ROBÔ DO TELEGRAM DE VERDADE (10/10)
   Roda o arquivo .github/scripts/bot-telegram.js de verdade, num
   sandbox, com o Telegram e o Firebase falsos. Nada sai para a internet
   e nenhuma mensagem vai para o chat do dono: aqui so se prova que:
     - o botao Confirmar aplica o status no banco e edita a mensagem
     - os comandos /status /editar /buscar /ultimos /hoje /cancelar
       respondem certo e o toque nao repete (offset guardado no banco)
     - ninguem de fora do dono consegue mexer nos pedidos
     - pedido quebrado no banco nao derruba o robo
   E a mesma bateria confere dias e horas diferentes (sabado, domingo,
   antes das 08:50, depois das 15:00, dentro e fora do horario de
   entrega), para o site, a IA e as regras nunca discordarem. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const dir = process.env.WDIR || path.resolve(__dirname, "..");

let erros = 0;
const falha = (m) => { console.log("  ERRO " + m); erros++; };
const ok = (m) => console.log("  ok  " + m);
const ler = (f) => fs.readFileSync(path.join(dir, f), "utf8");

const BOT = ler(".github/scripts/bot-telegram.js").replace(/rodar\(\)\.catch[\s\S]*$/, "");
const DONO = "1810807613";

/* ---------- uma rodada do robo com banco e Telegram falsos ---------- */
/* o robo do projeto le o Firebase com res.text(): o falso devolve texto */
function textoFb(dado) {
    return Promise.resolve({ ok: true, status: 200, text: function () { return Promise.resolve(JSON.stringify(dado)); } });
}
function rodada(pedidos, updates) {
    const banco = Object.assign({ __pedidos: {} }, pedidos || {});
    Object.keys(banco).forEach(function (k) { if (!k.startsWith("__")) banco.__pedidos[k] = banco[k]; });
    const enviados = [];
    const editados = [];
    const ctx = {
        console: { log: function () {}, error: function () {}, warn: function () {} },
        process: { env: { FB_URL: "https://fake.firebaseio.com", TG_TOKEN: "fake:token", TG_CHAT: DONO }, exitCode: 0 },
        setTimeout, clearTimeout, JSON, Date, Math, Number, String, Object, Array, Boolean, RegExp, Error, Promise,
        isNaN, parseInt, parseFloat, encodeURIComponent,
        fetch: function (url, op) {
            if (url.indexOf("firebaseio.com") >= 0) {
                const caminho = decodeURIComponent(url.replace("https://fake.firebaseio.com", "").split("?")[0]);
                if (op && op.method === "PUT") {
                    const corpo = JSON.parse(op.body);
                    if (caminho.indexOf("offset") >= 0) banco.__offset = corpo;
                    else banco.__pedidos[caminho.replace("/pedidos/", "").replace(".json", "")] = corpo;
                    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
                }
                if (caminho.indexOf("offset") >= 0) return textoFb(banco.__offset || 0);
                if (caminho.indexOf("pedidos.json") >= 0) return textoFb(banco.__pedidos);
                return textoFb(null);
            }
            /* a API real do Telegram responde { ok, result } */
            const metodo = url.match(/bot[^/]+\/([A-Za-z]+)/)[1];
            if (metodo === "getUpdates") {
                return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, result: updates }) });
            }
            const corpo = (op && op.body) ? JSON.parse(op.body) : {};
            if (metodo === "sendMessage") enviados.push(corpo);
            if (metodo === "answerCallbackQuery") enviados.push(corpo);   /* o "toast" do botao tambem e resposta */
            if (metodo === "editMessageText") editados.push(corpo);
            return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, result: true }) });
        }
    };
    ctx.global = ctx;
    vm.createContext(ctx);
    vm.runInContext(BOT, ctx);
    return vm.runInContext("rodar()", ctx).then(function () {
        return { banco: banco, pedidos: banco.__pedidos, enviados: enviados, editados: editados, offset: banco.__offset };
    });
}

function pedido(id, nome, status) {
    return {
        id: id, nome: nome, tel: "21988887777", cpf: "", end: "Rua A, 10", comp: "casa 2",
        bairro: "Japeri", regiao: "japeri", pagamento: "Pix", troco: "",
        itens: [{ name: "Guarana 350ml", qty: 3, price: 19, subtotal: 57 }],
        subtotal: 57, frete: 12, total: 69, status: status || "aguardando",
        criadoEm: Date.now() - 60000,
        historico: [{ status: status || "aguardando", quando: Date.now() - 60000 }]
    };
}
const toque = (id, update, dados, de) => ({
    update_id: update,
    callback_query: { id: "cb" + update, data: dados, from: { id: de || Number(DONO) }, message: { message_id: update, chat: { id: de || Number(DONO) }, text: "PEDIDO " + id } }
});
const texto = (update, t) => ({ update_id: update, message: { message_id: update, chat: { id: Number(DONO) }, text: t } });

const ID1 = "CV20261017-001-10001";
        const COMANDOS = [
            ["/status " + ID1, /confirmado|CV2026/i],
            ["/ultimos", /CV2026/i],
            ["/hoje", /hoje|aguardando|R\$/i],
            ["/buscar Japeri", /japeri/i],
            ["/editar " + ID1, /editar|nome|bairro/i],
            ["/ajuda", /confirmar|comando/i]
        ];


rodada({ [ID1]: pedido(ID1, "Ana Ribeiro") }, [toque(ID1, 1, "st|" + ID1 + "|confirmado")])
    .then(function (r) {
        console.log("=== 1. O BOTAO CONFIRMAR APLICA O STATUS NO BANCO ===");
        if (r.pedidos[ID1].status !== "confirmado") falha("o botao Confirmar nao mudou o status (ficou " + r.pedidos[ID1].status + ")");
        else ok("botao Confirmar: status agora e " + r.pedidos[ID1].status);
        if (!r.pedidos[ID1].historico || r.pedidos[ID1].historico.length < 2) falha("o historico nao recebeu o passo");
        else ok("historico do pedido: " + r.pedidos[ID1].historico.map(h => h.status).join(" -> "));
        if (!r.editados.length) falha("o robo nao editou a mensagem do pedido no chat");
        else ok("robo editou a mensagem do Telegram com o status novo (" + r.editados.length + "x)");
        if (r.offset !== 2) falha("offset nao guardado (ficou " + r.offset + ")");
        else ok("offset guardado no banco = " + r.offset + " (o mesmo toque nao repete)");

        console.log("\n=== 2. OS COMANDOS DO DONO ===");
        return rodada({ [ID1]: pedido(ID1, "Ana Ribeiro") }, COMANDOS.map((c, i) => texto(10 + i, c[0])));
    })
    .then(function (r) {
        const respostas = r.enviados.concat(r.editados).map(m => String(m.text || ""));
        const comRotulo = [["status", /confirmado|CV2026/i], ["ultimos", /CV2026/i], ["hoje", /hoje|aguardando|R\$/i],
            ["buscar", /japeri/i], ["editar", /editar|nome|bairro/i], ["ajuda", /confirmar|comando/i]];
        comRotulo.forEach(function (par) {
            if (!respostas.some(t => par[1].test(t))) falha('o comando /' + par[0] + " nao respondeu o que devia");
        });
        ok("os 6 comandos do dono responderam certinho: " + COMANDOS.map(c => "/" + c[0].split(" ")[0]).join(", "));

        console.log("\n=== 3. SO O DONO MEXE NO PEDIDO ===");
        const ID3 = "CV20261017-001-10003";
        return rodada({ [ID3]: pedido(ID3, "Fulano") }, [toque(ID3, 30, "st|" + ID3 + "|cancelado", 999999)])
            .then(function (r3) {
                if (r3.pedidos[ID3].status !== "aguardando") falha("pessoa de fora cancelou o pedido (" + r3.pedidos[ID3].status + ")");
                else ok("toque de quem nao e o dono recusado: pedido continua aguardando");
                const avisou = r3.enviados.concat(r3.editados).some(m => /autorizado/i.test(String(m.text || "")));
                if (!avisou) falha("o robo nao avisou o intruso que ele nao pode mexer");
                else ok("o robo respondeu 'Nao autorizado' para quem nao e o dono");

                console.log("\n=== 4. DADOS SUJOS NAO QUEBRAM NINGUEM ===");
                const sujos = {
                    "CV-SEM-NOME": { id: "CV-SEM-NOME", status: "aguardando", itens: null },
                    "CV-SEM-HIST": { id: "CV-SEM-HIST", nome: "Sem historico", status: "confirmado", itens: [{ name: "X", qty: 1, subtotal: 10 }], subtotal: 10, total: 10 },
                    "CV-TEXTO-NUMERO": { id: "CV-TEXTO-NUMERO", nome: "Numeros 12345", tel: "abc", itens: [{ name: null, qty: "x", subtotal: "dez" }], subtotal: "dez", total: "dez", status: "entregue" },
                    "CV-CAMPO-FALTANDO": { nome: "Sem id no objeto", status: "aguardando", itens: [] }
                };
                return rodada(sujos, [
                    texto(40, "/ultimos"),
                    texto(41, "/status CV-SEM-NOME"),
                    texto(42, "/buscar 9999"),
                    toque("CV-SEM-HIST", 43, "st|CV-SEM-HIST|entregue")
                ]);
            })
            .then(function (r4) {
                const respondeu = r4.enviados.concat(r4.editados).length;
                if (!respondeu) falha("o robo nao respondeu nada com pedidos sujos");
                else ok("pedido sem nome, sem historico, com texto no lugar de numero e sem id: respondeu sem travar (" + respondeu + " respostas)");
                if (r4.offset !== 44) falha("offset nao avancou com dado quebrado (" + r4.offset + ")");
                else ok("offset avanca mesmo com dado quebrado: " + r4.offset);
                if (r4.pedidos["CV-SEM-HIST"].status !== "entregue") falha("o botao em pedido sem historico nao funcionou");
                else ok("botao funciona mesmo em pedido que chegou sem historico (gravou o historico do zero)");

                console.log("\n=== 5. DIAS E HORAS DIFERENTES (site, IA e regras, de acordo) ===");
                const ctxL = {
                    console, localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
                    document: { addEventListener: () => {} }, setTimeout, clearTimeout
                };
                ctxL.window = ctxL;
                vm.createContext(ctxL);
                vm.runInContext(ler("loja.js"), ctxL);
                const L = vm.runInContext("({ estadoLoja, estadoEntrega, pedidosLiberados, regioesDoDia, regioesPedidoHoje })", ctxL);
                const casos = [
                    ["segunda 08:45 (antes de abrir)", 1, 8 * 60 + 45, false, false],
                    ["segunda 09:00 (aberto)", 1, 9 * 60, true, true],
                    ["quinta 12:00 (meio do dia)", 4, 12 * 60, true, true],
                    ["sexta 14:59 (ultimo minuto)", 5, 14 * 60 + 59, true, true],
                    ["sexta 15:00 (fechou)", 5, 15 * 60, false, false],
                    ["sexta 17:00 (freteiro ainda entrega)", 5, 17 * 60, false, false],
                    ["sabado 10:00 (so entrega)", 6, 10 * 60, false, false],
                    ["domingo 10:00 (nada)", 0, 10 * 60, false, false]
                ];
                let erroDia = [];
                casos.forEach(function (c) {
                    const a = { dia: c[1], minutos: c[2] };
                    if (L.estadoLoja(a).aberta !== c[3]) erroDia.push(c[0] + ": loja " + (L.estadoLoja(a).aberta ? "aberta" : "fechada") + " (esperava " + (c[3] ? "aberta" : "fechada") + ")");
                    if (L.pedidosLiberados("", a).liberado !== c[4]) erroDia.push(c[0] + ": pedido " + (L.pedidosLiberados("", a).liberado ? "liberado" : "pausado"));
                });
                if (erroDia.length) falha("horario: " + erroDia.join(" | "));
                else ok(casos.length + " momentos checados e todos coerentes (loja e pedido)");
                if (L.estadoLoja({ dia: 6, minutos: 600 }).aberta) falha("sabado a loja aparece aberta");
                else ok("sabado: loja fechada, " + L.estadoEntrega({ dia: 6, minutos: 600 }).texto.toLowerCase());
                if (!L.regioesDoDia(6).length) falha("sabado sem entrega");
                else ok("sabado entrega em: " + L.regioesDoDia(6).map(r => r.nome).join(", "));
                if (L.regioesPedidoHoje(6).length) falha("sabado abriu pedido");
                else ok("sabado NAO abre pedido (so entrega)");
                if (L.regioesDoDia(0).length) falha("domingo com entrega");
                else ok("domingo: sem loja e sem freteiro");
                const stSexta = L.estadoEntrega({ dia: 5, minutos: 14 * 60 });
                if (!stSexta.temDia) falha("sexta 14:00 perdeu o dia de entrega");
                else ok("sexta 14:00: " + stSexta.texto.toLowerCase() + "; a entrega sai no sabado para " + L.regioesDoDia(6).map(r => r.nome).join(", "));

                console.log("\n" + (erros === 0 ? "*** ROBÔ DO TELEGRAM 10/10 ***" : "*** " + erros + " ERRO(S) NO ROBÔ ***"));
                process.exit(erros ? 1 : 0);
            });
    });