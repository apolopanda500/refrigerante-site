/* ============================================================
   GATEWAY DA LOJA (Cloudflare Worker / Node)
   ------------------------------------------------
   POR QUE ISTO EXISTE: o banco do Firebase estava aberto - qualquer
   pessoa com a URL lia os pedidos (com CPF) e ainda escrevia/apagava.
   Este arquivo passa a ser o UNICO caminho para o banco.

   O QUE MUDA PARA O DONO:
     - o preco continua publico (todo mundo ve o preço da bebida)
     - os pedidos ficam privados: so o dono lista, so o dono muda status
     - cada cliente ve o pedido dele com uma chave que o proprio
       gateway deu na criacao (ninguem mais consegue ver)
     - o robo do Telegram entra com um segredo proprio

   COMO LIGAR (uma vez):
     1) Firebase Console > Project Settings > Service Accounts >
        "Generate new private key" (guarde o JSON)
     2) Cloudflare Workers > Create > colar este arquivo
     3) Settings > Variables and Secrets (segredos, nao variaveis):
          FB_DB_URL      = https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com
          FB_SA_EMAIL    = robo-catalogo@projeto.iam.gserviceaccount.com
          FB_SA_KEY      = -----BEGIN PRIVATE KEY----- ...
          LOJA_SENHA     = a senha que voce ja usa no painel
          BOT_SEGREDO    = um texto so seu (ex.: 32 caracteres)
        (o segredo do bot tambem vai em GitHub > Settings > Secrets)
     4) No Firebase Console > Realtime Database > Rules: cole as
        regras de database.rules.json (tudo fechado)
     5) No site: Configuracoes do painel > "Banco" > cole a URL do
        gateway (https://...workers.dev). Vazio = modo antigo.

   ESTE ARQUIVO RODA EM DOIS LUGARES (mesmo codigo):
     - como Worker (fetch(req) devolvendo Response)
     - como Node (node server.js) para rodar na sua maquina
   ============================================================ */

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Bot-Segredo, X-Chave-Pedido"
};

const CFG = {
    db: (typeof process !== "undefined" && process.env && process.env.FB_DB_URL) || "https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com",
    email: (typeof process !== "undefined" && process.env && process.env.FB_SA_EMAIL) || "",
    chave: (typeof process !== "undefined" && process.env && process.env.FB_SA_KEY) || "",
    senha: (typeof process !== "undefined" && process.env && process.env.LOJA_SENHA) || "",
    bot: (typeof process !== "undefined" && process.env && process.env.BOT_SEGREDO) || ""
};
const TTL = 12 * 60 * 60 * 1000;   /* sessao do dono: 12 horas */

/* ---------- texto para Web Crypto (compativel com Node e Worker) ---------- */
const b64 = {
    enc(bytes) {
        const bin = (bytes instanceof Uint8Array) ? bytes : new Uint8Array(bytes);
        let s = "";
        for (let i = 0; i < bin.length; i++) s += String.fromCharCode(bin[i]);
        return (typeof btoa === "function" ? btoa(s) : Buffer.from(s, "binary").toString("base64"))
            .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    },
    dec(txt) {
        const s = txt.replace(/-/g, "+").replace(/_/g, "/");
        const bin = (typeof atob === "function" ? atob(s) : Buffer.from(s, "base64").toString("binary"));
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    }
};

/* ---------- assinatura do token da sessao (HMAC) ---------- */
let segredoSessao = (typeof process !== "undefined" && process.env && process.env.SESSAO_SEGREDO) || CFG.senha || "convencao";
async function assinar(conteudo) {
    const chave = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(segredoSessao), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return b64.enc(new Uint8Array(await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(conteudo))));
}
async function tokenValido(token) {
    try {
        if (!token || String(token).indexOf(".") < 0) return false;
        const partes = String(token).split(".");
        const dado = JSON.parse(new TextDecoder().decode(b64.dec(partes[0])));
        if (!dado.exp || dado.exp < Date.now()) return false;
        const esperado = await assinar(partes[0]);
        /* comparacao com tempo constante: nao da para Chutar o token */
        if (esperado.length !== partes[1].length) return false;
        let dif = 0;
        for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ partes[1].charCodeAt(i);
        return dif === 0;
    } catch (e) {
        return false;
    }
}

/* ---------- chave do cliente (para ver so o pedido dele) ---------- */
async function chaveDoPedido(id) {
    const chave = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(segredoSessao + "|pedido|" + id), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return b64.enc(new Uint8Array(await crypto.subtle.sign("HMAC", chave, new Uint8Array(0))));
}

/* ---------- conta de servico: o unico que pode falar com o banco ---------- */
let tokenAdmin = null;
let tokenAdminExpira = 0;
function pemParaArray(pem) {
    const limpo = String(pem).replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s+/g, "");
    return Uint8Array.from(b64.dec(limpo).buffer ? Array.from(b64.dec(limpo)) : Array.from(b64.dec(limpo)));
}
async function jwtAdmin() {
    if (tokenAdmin && tokenAdminExpira > Date.now()) return tokenAdmin;
    if (!CFG.email || !CFG.chave) throw new Error("gateway sem conta de servico configurada");
    const agora = Math.floor(Date.now() / 1000);
    const cab = b64.enc(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
    const corpo = b64.enc(new TextEncoder().encode(JSON.stringify({
        iss: CFG.email, scope: "https://www.googleapis.com/auth/firebase.database",
        aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
        iat: agora, exp: agora + 3600
    })));
    const chave = await crypto.subtle.importKey("pkcs8", pemParaArray(CFG.chave), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    const sig = b64.enc(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", chave, new TextEncoder().encode(cab + "." + corpo))));
    tokenAdmin = cab + "." + corpo + "." + sig;
    tokenAdminExpira = Date.now() + 50 * 60 * 1000;
    return tokenAdmin;
}
async function banco(caminho, metodo, corpo) {
    const jwt = await jwtAdmin();
    const r = await fetch(CFG.db + caminho + (CFG.db.indexOf("?") >= 0 ? "&" : "?") + "auth=" + jwt, {
        method: metodo || "GET",
        headers: { "Content-Type": "application/json" },
        body: corpo === undefined ? undefined : JSON.stringify(corpo)
    });
    if (!r.ok) throw new Error("banco respondeu " + r.status);
    const t = await r.text();
    try { return t ? JSON.parse(t) : null; } catch (e) { return t; }
}

/* ---------- formatar ---------- */
function json(dados, status) {
    return new Response(JSON.stringify(dados), {
        status: status || 200,
        headers: { "Content-Type": "application/json; charset=utf-8", ...CORS }
    });
}
async function lerCorpo(req) {
    try { return await req.json(); } catch (e) { return {}; }
}

/* ---------- regra de negocio: o que e um pedido valido ---------- */
function pedidoValido(p) {
    if (!p || typeof p !== "object") return "pedido vazio";
    if (!p.id || !/^CV\d{8}-\d{3}-\d{5}$/.test(String(p.id))) return "numero de pedido invalido";
    if (!p.nome || String(p.nome).trim().length < 2) return "sem nome";
    if (!p.tel || String(p.tel).replace(/\D/g, "").length < 8) return "sem telefone";
    if (!Array.isArray(p.itens) || !p.itens.length) return "sem itens";
    if (!(Number(p.total) >= 0)) return "total invalido";
    if (["aguardando", "confirmado", "separacao", "enviado", "entregue", "cancelado"].indexOf(p.status) < 0) return "status invalido";
    return null;
}

/* ---------- o roteador ---------- */
async function rotear(req, env) {
    if (env) {                                   /* Worker: le do env */
        if (env.FB_DB_URL) CFG.db = env.FB_DB_URL;
        if (env.FB_SA_EMAIL) CFG.email = env.FB_SA_EMAIL;
        if (env.FB_SA_KEY) CFG.chave = env.FB_SA_KEY;
        if (env.LOJA_SENHA) CFG.senha = env.LOJA_SENHA;
        if (env.BOT_SEGREDO) CFG.bot = env.BOT_SEGREDO;
        if (env.SESSAO_SEGREDO) segredoSessao = env.SESSAO_SEGREDO;
    }
    const url = new URL(req.url);
    const rota = url.pathname.replace(/\/+$/, "") || "/";
    const metodo = req.method.toUpperCase();
    if (metodo === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    /* 1) saude: o dono (e o painel) ve se o gateway esta de pe */
    if (rota === "/api/saude") return json({ ok: true, banco: !!CFG.db, servo: !!CFG.email });

    /* 2) o preco e publico: qualquer um pode ver o preco da bebida */
    if (rota === "/api/precos" && metodo === "GET") {
        return json(await banco("/precos.json", "GET"));
    }

    /* 3) login do dono: senha -> token de 12 horas */
    if (rota === "/api/entrar" && metodo === "POST") {
        const corpo = await lerCorpo(req);
        if (!CFG.senha || String(corpo.senha || "") !== CFG.senha) return json({ erro: "senha invalida" }, 401);
        const cab = b64.enc(new TextEncoder().encode(JSON.stringify({ dono: true, exp: Date.now() + TTL })));
        return json({ token: cab + "." + (await assinar(cab)) });
    }

    /* 4) o cliente cria o pedido dele (nao precisa de senha: e o pedido
          dele mesmo; o gateway devolve a chave para ele acompanhar) */
    if (rota === "/api/pedido" && metodo === "POST") {
        const corpo = await lerCorpo(req);
        const problema = pedidoValido(corpo.pedido);
        if (problema) return json({ erro: problema }, 400);
        await banco("/pedidos/" + encodeURIComponent(corpo.pedido.id) + ".json", "PUT", corpo.pedido);
        return json({ ok: true, chave: await chaveDoPedido(corpo.pedido.id) });
    }

    /* 5) o cliente acompanha o pedido dele (so com a chave dele) */
    if (rota === "/api/meu-pedido" && metodo === "GET") {
        const id = url.searchParams.get("id") || "";
        const chave = req.headers.get("X-Chave-Pedido") || "";
        if (!id || !chave || (await chaveDoPedido(id)) !== chave) return json({ erro: "chave invalida" }, 403);
        return json(await banco("/pedidos/" + encodeURIComponent(id) + ".json", "GET"));
    }

    /* 6) o dono lista tudo (so com o token da sessao) */
    if (rota === "/api/pedidos" && metodo === "GET") {
        if (!(await tokenValido(req.headers.get("Authorization")))) return json({ erro: "faça login" }, 401);
        return json(await banco("/pedidos.json", "GET"));
    }

    /* 7) o dono muda o status (o historico nunca e apagado) */
    if (rota === "/api/status" && metodo === "POST") {
        if (!(await tokenValido(req.headers.get("Authorization")))) return json({ erro: "faça login" }, 401);
        const corpo = await lerCorpo(req);
        const atual = await banco("/pedidos/" + encodeURIComponent(corpo.id) + ".json", "GET");
        if (!atual || !atual.id) return json({ erro: "pedido nao encontrado" }, 404);
        atual.status = corpo.status;
        atual.historico = Array.isArray(atual.historico) ? atual.historico : [];
        atual.historico.push({ status: corpo.status, quando: Date.now() });
        atual.atualizadoEm = Date.now();
        await banco("/pedidos/" + encodeURIComponent(atual.id) + ".json", "PUT", atual);
        return json({ ok: true, pedido: atual });
    }

    /* 8) o dono edita um dado do pedido */
    if (rota === "/api/editar" && metodo === "POST") {
        if (!(await tokenValido(req.headers.get("Authorization")))) return json({ erro: "faça login" }, 401);
        const corpo = await lerCorpo(req);
        const atual = await banco("/pedidos/" + encodeURIComponent(corpo.id) + ".json", "GET");
        if (!atual || !atual.id) return json({ erro: "pedido nao encontrado" }, 404);
        ["nome", "tel", "cpf", "end", "comp", "bairro", "regiao", "pagamento", "troco", "observacao"].forEach(function (campo) {
            if (corpo[campo] !== undefined) atual[campo] = String(corpo[campo]).slice(0, 300);
        });
        atual.atualizadoEm = Date.now();
        await banco("/pedidos/" + encodeURIComponent(atual.id) + ".json", "PUT", atual);
        return json({ ok: true, pedido: atual });
    }

    /* 9) o dono publica a tabela de precos */
    if (rota === "/api/precos" && metodo === "PUT") {
        if (!(await tokenValido(req.headers.get("Authorization")))) return json({ erro: "faça login" }, 401);
        const corpo = await lerCorpo(req);
        const tabela = corpo.precos || {};
        if (!Object.keys(tabela).length) return json({ erro: "tabela vazia" }, 400);
        return json(await banco("/precos.json", "PUT", tabela));
    }

    /* 10) avaliacao do cliente (gravada pelo proprio dono da avaliacao) */
    if (rota === "/api/avaliar" && metodo === "POST") {
        const corpo = await lerCorpo(req);
        const p = corpo.avaliacao;
        if (!p || !p.id || !p.pedidoId) return json({ erro: "avaliacao invalida" }, 400);
        return json(await banco("/avaliacoes/" + encodeURIComponent(p.id) + ".json", "PUT", p));
    }

    /* 11) o robo do Telegram: entra com o segredo dele */
    if (rota === "/api/bot" && (metodo === "POST" || metodo === "GET")) {
        const segredo = req.headers.get("X-Bot-Segredo") || "";
        if (!CFG.bot || segredo.length !== CFG.bot.length) return json({ erro: "robo nao autorizado" }, 403);
        let dif = 0;
        for (let i = 0; i < segredo.length; i++) dif |= segredo.charCodeAt(i) ^ CFG.bot.charCodeAt(i);
        if (dif !== 0) return json({ erro: "robo nao autorizado" }, 403);
        if (metodo === "GET") return json({ pedidos: await banco("/pedidos.json", "GET"), offset: await banco("/bot/offset.json", "GET") });
        const corpo = await lerCorpo(req);
        if (corpo.offset !== undefined) await banco("/bot/offset.json", "PUT", corpo.offset);
        if (corpo.pedido) await banco("/pedidos/" + encodeURIComponent(corpo.pedido.id) + ".json", "PUT", corpo.pedido);
        return json({ ok: true });
    }

    return json({ erro: "rota nao encontrada" }, 404);
}

/* ---------- como Worker (Cloudflare) ---------- */
export default {
    async fetch(request, env) {
        try {
            return await rotear(request, env);
        } catch (e) {
            return json({ erro: String(e && e.message || e) }, 500);
        }
    }
};

/* ---------- como Node (para rodar na maquina, sem Cloudflare) ---------- */
if (typeof module !== "undefined" && module.exports) {
    module.exports = { rotear, pedidoValido, chaveDoPedido, tokenValido, assinar, banco, CFG };
}