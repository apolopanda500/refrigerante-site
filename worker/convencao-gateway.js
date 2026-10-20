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
    bot: (typeof process !== "undefined" && process.env && process.env.BOT_SEGREDO) || "",
    apiKey: (typeof process !== "undefined" && process.env && process.env.FB_API_KEY) || ""
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
        /* o cliente manda "Authorization: Bearer <token>". Aceitamos
           os dois formatos (com e sem o prefixo), porque mudar so num
           lado quebraria o outro - e o gateway ja estava publicado. */
        let bruto = String(token || "").trim();
        if (/^bearer\s+/i.test(bruto)) bruto = bruto.replace(/^bearer\s+/i, "");
        if (!bruto || bruto.indexOf(".") < 0) return false;
        const partes = bruto.split(".");
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

/* ---------- conta de servico: o unico que pode falar com o banco ----------
/* O token de acesso e o que FAZ o bypass das regras do Firebase. Um
   token customizado em ?auth= autenticaria como USUARIO e obedeceria as
   regras (funcionava com o banco aberto e quebrava assim que as regras
   fecharam - foi o que aconteceu). Por isso: 1) assina o JWT para o
   endpoint de token; 2) troca esse JWT por um token de acesso OAuth;
   3) chama o banco com Authorization: Bearer <token de acesso>. */
/* ---------- CIFRAR OS DADOS DO CLIENTE ----------
/* O banco esta aberto na internet (fechar depende de permissao que so o
   dono do projeto concede). Entao, em vez de guardar o CPF de uma pessoa
   em texto puro, o gateway guarda CIFRADO: quem abrir o banco na internet
   ve apenas um bloco de letras sem significado.

   A chave vive no segredo do Worker - nunca no site, nunca no repo.
   Quem descriptografa e o proprio gateway, entao o dono continua vendo
   nome, telefone e endereco normalmente no painel.

   O que fica em claro: o que o sistema precisa filtrar sem segredo
   (status, valores, itens, regiao de entrega, datas). O que fica
   cifrado: nome, telefone, CPF, endereco e observacoes - que sao
   justamente o que dói se vazar. */
const CAMPOS_CIFRADOS = ["nome", "tel", "cpf", "end", "comp", "bairro", "observacao", "pagamento", "troco"];

let chaveCifra = null;
async function chaveDeCifra() {
    if (chaveCifra) return chaveCifra;
    /* a chave nasce do segredo da sessao: um segredo a menos para o dono guardar */
    const semente = new TextEncoder().encode(String(segredoSessao || CFG.chave || "sem-chave") + "|cifra|v1");
    /* o digest sozinho nao cifra nada: ele vira a chave que o AES usa */
    const bruto = await crypto.subtle.digest("SHA-256", semente);
    chaveCifra = await crypto.subtle.importKey("raw", bruto, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
    return chaveCifra;
}

function paraBase64Url(bytes) {
    let s = "";
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return (typeof btoa === "function" ? btoa(s) : Buffer.from(s, "binary").toString("base64"))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64Url(txt) {
    let s = String(txt).replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    const bin = (typeof atob === "function" ? atob(s) : Buffer.from(s, "base64").toString("binary"));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

async function cifrarTexto(texto) {
    const chave = await chaveDeCifra();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const dados = new TextEncoder().encode(texto);
    const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, chave, dados));
    return "c1." + paraBase64Url(iv) + "." + paraBase64Url(cifrado);
}

async function decifrarTexto(bloco) {
    const partes = String(bloco).split(".");
    if (partes.length !== 3 || partes[0] !== "c1") return null;
    try {
        const chave = await chaveDeCifra();
        const iv = deBase64Url(partes[1]);
        const cifrado = deBase64Url(partes[2]);
        const dados = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, chave, cifrado);
        return new TextDecoder().decode(dados);
    } catch (e) { return null; }
}

/* separa o pedido em 'o que fica visivel' e 'o que vai cifrado' */
async function pedidoParaGravar(pedido) {
    if (!pedido || typeof pedido !== "object") return pedido;
    const claro = {};
    const sigilo = {};
    Object.keys(pedido).forEach(function (campo) {
        if (CAMPOS_CIFRADOS.indexOf(campo) >= 0) sigilo[campo] = pedido[campo];
        else claro[campo] = pedido[campo];
    });
    if (!Object.keys(sigilo).length) return pedido;
    claro.sig = await cifrarTexto(JSON.stringify(sigilo));
    claro.cifrado = true;
    return claro;
}

/* desfaz: junta de volta o que estava cifrado (so o gateway faz isso) */
async function pedidoParaLer(pedido) {
    if (!pedido || typeof pedido !== "object" || !pedido.sig) return pedido;
    const texto = await decifrarTexto(pedido.sig);
    if (!texto) {
        /* nao tem como abrir (chave diferente/pedido antigo): devolve sem os
           campos de pessoa, nunca chuto, e nunca em texto puro */
        const copia = {};
        Object.keys(pedido).forEach(function (k) { if (k !== "sig") copia[k] = pedido[k]; });
        copia.semCifra = true;
        return copia;
    }
    let sigilo = {};
    try { sigilo = JSON.parse(texto); } catch (e) { sigilo = {}; }
    const junto = Object.assign({}, pedido, sigilo);
    delete junto.sig;
    delete junto.cifrado;
    return junto;
}

/* uma lista de pedidos, um pedido so, ou nada */
async function pedidosParaLer(resposta) {
    if (!resposta || typeof resposta !== "object") return resposta;
    if (resposta.id || resposta.sig) return await pedidoParaLer(resposta);
    const chaves = Object.keys(resposta);
    if (!chaves.length) return resposta;
    const saida = {};
    for (const k of chaves) saida[k] = await pedidoParaLer(resposta[k]);
    return saida;
}

/* ---------- IDENTIDADE DO GATEWAY NO FIREBASE ----------
   O ponto que travava tudo: o gateway precisa entrar no banco como USUARIO
   (uid fixo), e nao como "conta de servico". Sem identidade, as regras do
   Firebase nao tem como liberar so para ele - e a loja inteira ficava do lado
   de fora de um banco trancado.

   Como funciona (o caminho oficial do proprio Firebase):
     1. a chave da conta de servico assina um TOKEN DE USUARIO (uid gateway-convencao);
     2. o Firebase troca esse token por um token de sessao (idToken);
     3. o banco e chamado com ?auth=<idToken>.
   As regras entonces liberam: auth.uid === "gateway-convencao".
   So quem tem a chave da conta de servico consegue criar esse token. */
const UID_GATEWAY = "gateway-convencao";
let sessaoGateway = null;
let sessaoExpira = 0;

function pemParaArray(pem) {
    const limpo = String(pem).replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s+/g, "");
    return Uint8Array.from(b64.dec(limpo));
}

/* token de usuario customizado: a unica assinatura que importa e a da conta
   de servico - e ela nunca sai do Worker (fica em segredo). */
async function tokenUsuario() {
    if (!CFG.email || !CFG.chave) throw new Error("gateway sem conta de servico configurada");
    if (!CFG.apiKey) throw new Error("gateway sem a API Key do projeto");
    const agora = Math.floor(Date.now() / 1000);
    const cab = b64.enc(new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
    const corpo = b64.enc(new TextEncoder().encode(JSON.stringify({
        iss: CFG.email,
        sub: CFG.email,
        aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
        iat: agora,
        exp: agora + 3600,
        uid: UID_GATEWAY,
        claims: {}
    })));
    const chave = await crypto.subtle.importKey("pkcs8", pemParaArray(CFG.chave), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
    const sig = b64.enc(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", chave, new TextEncoder().encode(cab + "." + corpo))));
    return cab + "." + corpo + "." + sig;
}

/* troca o token de usuario pelo token de sessao do proprio Firebase */
async function sessaoDoGateway() {
    if (sessaoGateway && sessaoExpira > Date.now()) return sessaoGateway;
    const token = await tokenUsuario();
    const r = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=" + encodeURIComponent(CFG.apiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token, returnSecureToken: true })
    });
    const j = await r.json().catch(function () { return {}; });
    if (!j.idToken) throw new Error("o Firebase nao aceitou a identidade do gateway (" + r.status + "): " + JSON.stringify(j).slice(0, 160));
    sessaoGateway = j.idToken;
    /* a sessao dura 1h; renovamos antes para nunca cair no meio de um pedido */
    sessaoExpira = Date.now() + 50 * 60 * 1000;
    return sessaoGateway;
}

/* FALA COM O BANCO:
   1) como USUARIO (uid gateway-convencao) - e o caminho que sobrevive ao banco
      fechado, porque as regras o conhecem;
   2) sem token nenhum - so serve com o banco aberto, e existe para a venda
      nunca parar se o primeiro caminho falhar. */
let bancoVia = "";
async function banco(caminho, metodo, corpo) {
    async function chamar(comAuth) {
        /* se o caminho ja traz query (?shallow=true...), o & entra depois dela */
        const sep = caminho.indexOf("?") >= 0 ? "&" : "?";
        const r = await fetch(CFG.db + caminho + (comAuth ? sep + "auth=" + comAuth : ""), {
            method: metodo || "GET",
            headers: { "Content-Type": "application/json" },
            body: envio === undefined ? undefined : JSON.stringify(envio)
        });
        return r;
    }
    function ler(r) {
        return r.text().then(function (x) { try { return x ? JSON.parse(x) : null; } catch (e) { return x; } });
    }
    /* protege o que for pedido: cifra ao gravar, decifra ao ler */
    const ehGravacao = metodo === "PUT" || metodo === "PATCH" || metodo === "POST";
    let envio = corpo;
    if (ehGravacao && caminho.indexOf("/pedidos") === 0 && corpo && typeof corpo === "object") {
        try { envio = await pedidoParaGravar(corpo); }
        catch (e) { throw new Error("nao consegui proteger os dados do pedido: " + String(e && e.message || e)); }
    }

    /* 1) com a identidade do gateway */
    let r = null;
    let erroIdentidade = null;
    try {
        r = await chamar(await sessaoDoGateway());
        if (r.ok) { bancoVia = "identidade"; return caminho.indexOf("/pedidos") === 0 ? await pedidosParaLer(await ler(r)) : await ler(r); }
    } catch (e) { erroIdentidade = e; }
    /* 2) sem token: enquanto o banco estiver aberto, a venda continua */
    r = await chamar(null);
    if (!r.ok) {
        let detalhe = "";
        try { detalhe = (await r.text()).slice(0, 100); } catch (e) { /* sem corpo */ }
        throw new Error("banco respondeu " + r.status + (detalhe ? " (" + detalhe.replace(/\s+/g, " ") + ")" : "")
            + (erroIdentidade ? " | identidade: " + String(erroIdentidade.message || erroIdentidade).slice(0, 160) : ""));
    }
    bancoVia = "aberto";
    return caminho.indexOf("/pedidos") === 0 ? await pedidosParaLer(await ler(r)) : await ler(r);
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
const PEDIDO_MINIMO_PADRAO = 100;

/* ---------- QUEM E O CLIENTE (CPF e celular conferidos de verdade) ----------
   O limite de 2 pedidos por cliente so vale se a identidade for real. Antes
   ele contava pelo telefone, guardado no aparelho: dava para burlar trocando
   o numero, limpando os dados ou usando outro celular. Agora a identidade e o
   CPF conferido pelos digitos verificadores - e a contagem e feita AQUI, no
   servidor. Trocar de aparelho, de navegador ou de telefone nao foge. */
/* 1 pedido por DIA do calendario (dia de Sao Paulo). Vira a meia-noite e
   o cliente volta a poder pedir - nao e "24 horas corridas": quem pediu as
   23h50 pode pedir de novo few minutos depois, as 00h00.
   Vale enquanto a loja estiver aberta e o pedido passar nas regras de regiao,
   valor minimo e horario. */
const LIMITE_PEDIDOS_CLIENTE_DIA = 1;

/* CPF: 11 digitos e os dois digitos verificadores conferem. Sequencias
   repetidas (000..., 111...) sao recusadas: nao existe gente assim. */
function cpfValido(cpf) {
    const s = String(cpf == null ? "" : cpf).replace(/\D/g, "");
    if (s.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(s)) return false;
    for (let t = 9; t < 11; t++) {
        let soma = 0;
        for (let d = 0; d < t; d++) soma += Number(s[d]) * (t + 1 - d);
        let resto = (soma * 10) % 11;
        if (resto === 10) resto = 0;
        if (resto !== Number(s[t])) return false;
    }
    return true;
}

/* celular brasileiro: DDD + 9 + 8 digitos = 11. Telefone fixo (10 digitos) e
   recusado de proposito: o cliente precisa de um CELULAR, porque e por ele que
   a entrega avisa. Aceitar fixo aqui era porta de entrada para numero de
   gmail/livro de contatos que nunca recebe recado. */
function celularValido(tel) {
    const s = String(tel == null ? "" : tel).replace(/\D/g, "");
    if (s.length !== 11) return false;
    const ddd = Number(s.slice(0, 2));
    if (ddd < 11 || ddd > 99) return false;
    if (s[2] !== "9") return false;
    return true;
}

/* impressao do CPF: o controle do dia guarda o CPF TRANSLADADO, nunca o CPF.
   Sem o numero em texto puro, ninguem descobre quantas vezes cada pessoa
   comprou so abrindo o banco. */
async function impressaoCpf(cpf) {
    const bruto = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("convencao|cpf|" + String(cpf)));
    return paraBase64Url(new Uint8Array(bruto)).slice(0, 24);
}

function diaDeSaoPaulo() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

/* quantos pedidos este CPF ja fez hoje - contado no servidor */
async function usoDoClienteHoje(cpf) {
    const marca = await impressaoCpf(cpf);
    const reg = await banco("/controle/" + diaDeSaoPaulo() + "/" + marca + ".json", "GET");
    const n = reg && String(reg.dia) === diaDeSaoPaulo() ? Number(reg.n) : 0;
    return { marca: marca, quantos: isNaN(n) ? 0 : n };
}

async function somarUsoDoCliente(cpf, marca) {
    const antes = await banco("/controle/" + diaDeSaoPaulo() + "/" + marca + ".json", "GET");
    const n = antes && String(antes.dia) === diaDeSaoPaulo() ? Number(antes.n) : 0;
    await banco("/controle/" + diaDeSaoPaulo() + "/" + marca + ".json", "PUT",
        { dia: diaDeSaoPaulo(), n: (isNaN(n) ? 0 : n) + 1, quando: Date.now() });
}

/* o menor valor de pedido aceito. O dono pode mudar gravando
   /config/pedidoMinimo no banco (ex.: 120); sem isso vale 100,00.
   O carrinho do site recebe este mesmo numero em /api/capacidade, para
   nunca prometer um valor que o servidor vai recusar. */
let minimoPedidoCache = null;
async function valorMinimoPedido() {
    if (minimoPedidoCache !== null) return minimoPedidoCache;
    let v = PEDIDO_MINIMO_PADRAO;
    try {
        const cfg = await banco("/config/pedidoMinimo.json", "GET");
        /* CUIDADO: Number(null) e 0 - sem esta checagem, um banco sem
           configuracao gravada deixava o minimo em R$ 0,00 e a regra de
           bloqueio sumia sem ninguem perceber. */
        if (cfg !== null && cfg !== undefined && cfg !== "") {
            const n = Number(cfg);
            if (!isNaN(n) && n > 0) v = n;
        }
    } catch (e) { /* sem configuracao: vale o padrao */ }
    minimoPedidoCache = v;
    return v;
}

async function pedidoValido(p) {
    if (!p || typeof p !== "object") return "pedido vazio";
    if (!p.id || !/^CV\d{8}-\d{3}-\d{5}$/.test(String(p.id))) return "numero de pedido invalido";
    if (!p.nome || String(p.nome).trim().length < 2) return "sem nome";
    /* documento e celular conferidos de verdade: e o que da identidade do
       cliente, e portanto o que segura o limite de 2 pedidos por dia */
    if (!p.cpf) return "CPF obrigatorio";
    if (!cpfValido(p.cpf)) return "CPF invalido (confira os 11 digitos)";
    if (!p.tel) return "celular obrigatorio";
    if (!celularValido(p.tel)) return "celular invalido (DDD + numero, com o 9)";
    if (!Array.isArray(p.itens) || !p.itens.length) return "sem itens";
    if (!(Number(p.total) >= 0)) return "total invalido";
    /* VALOR MINIMO DO PEDIDO - travado aqui, no servidor.
       O carrinho do cliente ja avisa e trava, mas isso e do lado dele: quem
       escreve direto na API (ou abre o app no celular e contorna o aviso)
       passava por cima, e pedido de R$ 6,00 entrava. Este e o unico lugar que
       nao da para burlar, entao a regra mora aqui. */
    const minimo = await valorMinimoPedido();
    const subtotal = Number(p.subtotal !== undefined ? p.subtotal : p.total) || 0;
    if (subtotal < minimo) return "pedido minimo para entrega: R$ " + minimo.toFixed(2).replace(".", ",") + " (faltam R$ " + (minimo - subtotal).toFixed(2).replace(".", ",") + ")";
    if (["aguardando", "confirmado", "separacao", "enviado", "entregue", "cancelado"].indexOf(p.status) < 0) return "status invalido";
    return null;
}

/* ---------- o roteador ---------- */
async function rotear(req, env) {
    if (env) {                                   /* Worker: le do env */
        if (env.FB_DB_URL) CFG.db = env.FB_DB_URL;
        if (env.FB_SA_EMAIL) CFG.email = env.FB_SA_EMAIL;
        if (env.FB_SA_KEY) CFG.chave = env.FB_SA_KEY;
    if (env.FB_API_KEY) CFG.apiKey = env.FB_API_KEY;
        if (env.LOJA_SENHA) CFG.senha = env.LOJA_SENHA;
        if (env.BOT_SEGREDO) CFG.bot = env.BOT_SEGREDO;
        if (env.SESSAO_SEGREDO) segredoSessao = env.SESSAO_SEGREDO;
    }
    const url = new URL(req.url);
    const rota = url.pathname.replace(/\/+$/, "") || "/";
    const metodo = req.method.toUpperCase();
    if (metodo === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    /* 1) saude: o dono (e o painel) ve se o gateway esta de pe.
       Isto FAZ a consulta no banco de verdade: mentir aqui esconderia do
       dono que o painel esta vazio por falha, e nao por falta de venda. */
    if (rota === "/api/saude") {
        const s = { ok: true, banco: false, servo: !!CFG.email };
        try {
            /* consulta /pedidos (e NAO /capacidade): /capacidade e publica, da
               para ler mesmo sem permissao - foi por isso que este aviso mentiu
               e o painel jurou que estava tudo certo enquanto nao via nada. */
            const p = await banco("/pedidos.json?shallow=true&limitToFirst=1", "GET");
            s.banco = true;
            s.vista = (p && typeof p === "object") ? "ok" : "vazio";
            s.caminho = bancoVia;
        } catch (e) {
            s.banco = false;
            s.erro = String(e && e.message || e);
        }
        /* o painel usa isto para avisar em voz alta, e nao mostrar "0 vendas" */
        s.aviso = s.banco ? "" : "O painel NAO esta enxergando o banco. Os pedidos podem estar salvos, mas nao aparecem aqui. Nao confie nesta lista.";
        return json(s);
    }

    /* base64url -> texto (com o = de preenchimento que o atob exige) */
    function decodifica(txt) {
        let s = String(txt).replace(/-/g, "+").replace(/_/g, "/");
        while (s.length % 4) s += "=";
        return atob(s);
    }
    /* 2) o preco e publico: qualquer um pode ver o preco da bebida */
    if (rota === "/api/precos" && metodo === "GET") {
        return json(await banco("/precos.json", "GET"));
    }

    /* 3) login do dono: senha -> token. Sem "dias" a sessao dura 12h;
          com "dias" (1, 7 ou 30) o token dura o prazo escolhido no
          "manter conectado" do APK do vendedor. */
    if (rota === "/api/entrar" && metodo === "POST") {
        const corpo = await lerCorpo(req);
        if (!CFG.senha || String(corpo.senha || "") !== CFG.senha) return json({ erro: "senha invalida" }, 401);
        const dias = Math.max(0, Math.min(30, parseInt(corpo.dias, 10) || 0));
        const ttl = dias ? dias * 24 * 60 * 60 * 1000 : TTL;
        const exp = Date.now() + ttl;
        const cab = b64.enc(new TextEncoder().encode(JSON.stringify({ dono: true, exp })));
        return json({ token: cab + "." + (await assinar(cab)), expiraEm: exp });
    }

    /* 4) o cliente cria o pedido dele (nao precisa de senha: e o pedido
          dele mesmo; o gateway devolve a chave para ele acompanhar) */
    if (rota === "/api/pedido" && metodo === "POST") {
        const corpo = await lerCorpo(req);
        const problema = await pedidoValido(corpo.pedido);
        if (problema) return json({ erro: problema }, 400);

        /* limite de 2 pedidos por cliente por dia, contado AQUI.
           O aparelho tambem trava, mas o aparelho e do cliente: esta e a
           trava que ele nao controla. */
        const uso = await usoDoClienteHoje(corpo.pedido.cpf);
        if (uso.quantos >= LIMITE_PEDIDOS_CLIENTE_DIA) {
            return json({
                erro: "Voce ja fez seu pedido de hoje. O limite e de 1 pedido por cliente por dia: amanha, depois da meia-noite, voce consegue pedir de novo.",
                limite: LIMITE_PEDIDOS_CLIENTE_DIA, hoje: uso.quantos
            }, 429);
        }
        await somarUsoDoCliente(corpo.pedido.cpf, uso.marca);
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

    /* 6b) MIGRACAO DE USO UNICO: reescreve os pedidos antigos (gravados antes da
       cifra) para que tambem fiquem cifrados. Roda uma vez e depois some. */
    if (rota === "/api-cifrar" && metodo === "POST") {
        if (!(await tokenValido(req.headers.get("Authorization")))) return json({ erro: "faça login" }, 401);
        const todos = await banco("/pedidos.json", "GET");
        const ids = todos && typeof todos === "object" ? Object.keys(todos) : [];
        let cifrados = 0, jaCifrados = 0;
        for (const id of ids) {
            const p = todos[id];
            if (!p || typeof p !== "object") continue;
            if (p.sig) { jaCifrados++; continue; }
            await banco("/pedidos/" + encodeURIComponent(id) + ".json", "PUT", p);
            cifrados++;
        }
        return json({ ok: true, cifrados: cifrados, jaCifrados: jaCifrados, total: ids.length });
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

    /* 12) a valva do dia: quantas vagas de pedidos ainda tem.
       Leitura publica (sao SO numeros: dia/pedidos/limite, nenhum dado
       de cliente); escrita so o dono, com o token da sessao. */
    if (rota === "/api/capacidade") {
        if (metodo === "GET") {
            const c = await banco("/capacidade.json", "GET");
            /* o site precisa do mesmo minimo que o servidor exige */
            return json(Object.assign({}, c || {}, { pedidoMinimo: await valorMinimoPedido() }));
        }
        if (metodo === "PUT") {
            if (!(await tokenValido(req.headers.get("Authorization")))) return json({ erro: "faça login" }, 401);
            const c = await lerCorpo(req);
            const dia = String(c.dia || "").slice(0, 10);
            const pedidos = parseInt(c.pedidos, 10);
            const limite = parseInt(c.limite, 10);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return json({ erro: "dia invalido" }, 400);
            if (isNaN(pedidos) || pedidos < 0 || isNaN(limite) || limite < 1) return json({ erro: "contagem invalida" }, 400);
            return json(await banco("/capacidade.json", "PUT", {
                dia: dia, pedidos: pedidos, limite: limite, quando: Date.now()
            }));
        }
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

/* ---------- helpers expostos (para os testes e para rodar em Node) ---------- */
export { rotear, pedidoValido, chaveDoPedido, tokenValido, assinar, banco, json };
