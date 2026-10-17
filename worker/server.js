/* ============================================================
   GATEWAY DA LOJA - versao Node (para rodar na sua maquina)
   Uso:
     set FB_DB_URL=https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com
     set FB_SA_EMAIL=robo@projeto.iam.gserviceaccount.com
     set FB_SA_KEY="-----BEGIN PRIVATE KEY----- ... "
     set LOJA_SENHA=a-senha-do-painel
     set BOT_SEGREDO=um-texto-seu
     set SESSAO_SEGREDO=outro-texto-seu
     node worker/server.js
   Depois: http://localhost:8787/api/saude
   ============================================================ */
const http = require("http");
const path = require("path");

(async () => {
    const mod = await import("file:///" + path.join(__dirname, "convencao-gateway.js").replace(/\\/g, "/"));
    const gateway = mod.default;          /* o Worker: fetch(request, env) */
    const PORTA = Number(process.env.PORT || 8787);

    const servidor = http.createServer(async (req, res) => {
        /* junta o corpo do pedido */
        const partes = [];
        for await (const pedaco of req) partes.push(pedaco);
        const corpo = partes.length ? Buffer.concat(partes).toString("utf8") : undefined;

        const headers = {};
        for (const k of Object.keys(req.headers)) headers[k] = req.headers[k];

        const request = new Request("http://localhost:" + PORTA + req.url, {
            method: req.method,
            headers: headers,
            body: (req.method === "GET" || req.method === "HEAD") ? undefined : (corpo || "")
        });

        try {
            const resposta = await gateway.fetch(request, null);
            res.writeHead(resposta.status, Object.fromEntries(resposta.headers));
            res.end(await resposta.text());
        } catch (e) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ erro: String(e && e.message || e) }));
        }
    });

    servidor.listen(PORTA, () => {
        console.log("Gateway no ar em http://localhost:" + PORTA);
        console.log("  /api/saude   - conferindo se esta de pe");
        console.log("  /api/precos  - preco publico");
    });
})();