// ============================================
//  Refrigerantes Convenção - Carrinho & Pedidos
// ============================================

const SHARE_URL = window.location.href.split("#")[0];

// Carrinho: [{ name, price, priceNum, qty }]
let cart = [];

// ---------- Utilidades ----------
// parsePreco: converte "R$ 27,50" -> 27.50 (robusto contra null/undefined/edge cases)
function parsePreco(str) {
    if (str === null || str === undefined) return 0;
    var s = String(str);
    var m = s.match(/[\d.,]+/);
    if (!m) return 0;
    return parseFloat(m[0].replace(/\./g, "").replace(",", "."));
}
// formatBRL: converte 27.5 -> "R$ 27,50" (trata NaN/null/undefined como 0,00)
// Milhar com ponto: 4260 -> "R$ 4.260,00" (padrao brasileiro; sem isso o
// total do carrinho aparecia "R$ 4260,00" e o cliente nao via a quebra)
function formatBRL(n) {
    var v = parseFloat(n);
    if (isNaN(v) || !isFinite(v)) return "R$ 0,00";
    var inteiro = Math.abs(v).toFixed(2).split(".")[0];
    var centavos = Math.abs(v).toFixed(2).split(".")[1];
    inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return "R$ " + (v < 0 ? "-" : "") + inteiro + "," + centavos;
}
// ---------- DINHEIRO: arredonda sempre para centavos ----------
// Sem isso, 10.10 + 20.20 = 30.299999999999997 e o pedido grava valor errado.
function arredonda(v) {
    var n = parseFloat(v);
    if (isNaN(n) || !isFinite(n)) return 0;
    return Math.round((n + Number.EPSILON) * 100) / 100;
}
// centavos(): soma em inteiros para evitar qualquer deriva
function somaCentavos(itens, campoPreco, campoQtd) {
    var total = 0;
    for (var i = 0; i < itens.length; i++) {
        var p = itens[i][campoPreco];
        var q = itens[i][campoQtd];
        if (typeof p !== "number" || isNaN(p)) p = 0;
        if (typeof q !== "number" || isNaN(q) || q <= 0) q = 1;
        total += Math.round(p * 100) * Math.round(q);
    }
    return total / 100;
}

// getCart: lê localStorage e normaliza itens (trata dados legados / campos ausentes)
function getCart() {
    var s = localStorage.getItem("refrigeranteCart");
    if (!s) return [];
    try {
        var items = JSON.parse(s);
        if (!Array.isArray(items)) return [];
        return items.map(function(item) {
            var p = (typeof item.priceNum === 'number') ? item.priceNum : parsePreco(item.price);
            if (isNaN(p)) p = 0;
            var q = (typeof item.qty === 'number' && item.qty > 0) ? item.qty : 1;
            return {
                name: item.name || 'Produto',
                price: typeof item.price === 'string' ? item.price : formatBRL(p),
                priceNum: p,
                qty: q
            };
        });
    } catch (e) {
        console.error("Erro ao ler carrinho:", e);
        return [];
    }
}
function saveCart() {
    try { localStorage.setItem("refrigeranteCart", JSON.stringify(cart)); } catch(e){/* proposital: guardar preferencia nunca pode travar o pedido */}
}
function calcSubtotal() {
    return somaCentavos(cart, "priceNum", "qty");
}
function calcTotalItens() {
    return cart.reduce((t, i) => t + (typeof i.qty === 'number' ? i.qty : 0), 0);
}

// ---------- Inicialização ----------
document.addEventListener("DOMContentLoaded", () => {
    cart = getCart();
    updateCartCount();

    // Animação suave ao rolar (apenas no catálogo)
    if (document.querySelector(".product-item")) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = "1";
                    entry.target.style.transform = "translateY(0)";
                }
            });
        }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });

        document.querySelectorAll(".product-item").forEach(el => {
            el.style.opacity = "0";
            el.style.transform = "translateY(16px)";
            el.style.transition = "opacity 0.4s, transform 0.4s";
            observer.observe(el);
        });
    }
});

// ---------- Catálogo: quantidade e adicionar ----------
function mudarQtd(btn, delta) {
    const card = btn.closest(".product-item");
    if (!card) return;
    const el = card.querySelector(".qtd-valor");
    let q = parseInt(el.textContent) || 0;
    q = Math.max(0, q + delta);
    el.textContent = q;
}

function adicionarAoCarrinho(btn) {
    const card = btn.closest(".product-item");
    if (!card) return;

    const name = card.querySelector(".product-name").innerText;
    const priceStr = card.querySelector(".product-price").innerText;
    const qtd = parseInt(card.querySelector(".qtd-valor").textContent) || 0;

    if (qtd < 1) {
        alert("Use os botões + e - para escolher a quantidade.");
        return;
    }

    const priceNum = parsePreco(priceStr);
    if (isNaN(priceNum) || priceNum <= 0) {
        alert("Erro ao ler o preço do produto. Tente novamente.");
        return;
    }
    const existente = cart.find(i => i.name === name);
    if (existente) {
        existente.qty += qtd;
    } else {
        cart.push({ name, price: priceStr, priceNum: priceNum, qty: qtd });
    }
    saveCart();
    updateCartCount();
    card.querySelector(".qtd-valor").textContent = "0";
    mostrarToast(name + " x" + qtd + " adicionado ao carrinho!");
}

// ---------- Contador do carrinho ----------
function updateCartCount() {
    const el = document.querySelector(".cart-count");
    if (el) el.innerText = calcTotalItens();
    const total = calcTotalItens ? calcTotalItens() : 0;
    document.querySelectorAll(".cart-icon").forEach(function (icon) {
        if (total > 0) icon.classList.add("tem-itens");
        else icon.classList.remove("tem-itens");
    });
}

// ---------- Feedback visual (toast) ----------
function mostrarToast(msg, type) {
    let t = document.getElementById("toast");
    if (!t) {
        t = document.createElement("div");
        t.id = "toast";
        t.className = "toast";
        t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--primary-color);color:var(--white);padding:14px 28px;border-radius:var(--border-radius-lg);font-size:0.9rem;z-index:1000;opacity:0;display:flex;align-items:center;gap:10px;font-weight:500;";
        document.body.appendChild(t);
    }
    t.innerText = msg;
    t.className = "toast" + (type ? " " + type : "");
    t.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => { t.classList.remove("show"); }, 2200);
}

// ---------- Ir para o carrinho ----------
function finalizarPedido() {
    if (cart.length === 0) {
        alert("Seu carrinho está vazio! Adicione produtos com os botões + e -.");
        return;
    }
    window.location.href = "carrinho.html";
}

// ---------- Limpar carrinho ----------
function limparCarrinho() {
    cart = [];
    saveCart();
    updateCartCount();
    if (typeof renderCarrinho === "function") renderCarrinho();
}

// ---------- Compartilhar ----------
async function compartilharSite() {
    const dados = {
        title: "Refrigerantes Convenção - Delivery Online",
        text: "Confira nosso catálogo de refrigerantes, refrescos, águas e chopp! Peça pelo WhatsApp.",
        url: SHARE_URL
    };
    if (navigator.share) {
        try { await navigator.share(dados); }
        catch (e) { copiarLink(); }
    } else {
        copiarLink();
    }
}

async function copiarLink() {
    try {
        await navigator.clipboard.writeText(SHARE_URL);
        alert("Link copiado!\n\n" + SHARE_URL);
    } catch (err) {
        const ta = document.createElement("textarea");
        ta.value = SHARE_URL;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        alert("Link copiado: " + SHARE_URL);
    }
}

// ============================================
//  SISTEMA DE PEDIDOS (status)
// ============================================
const PEDIDOS_KEY = "convencao_pedidos";
// acesso do vendedor (painel admin.html)
// ATENCAO: este arquivo e PUBLICO. Qualquer pessoa que abrir o codigo-fonte
// do site ve estas duas linhas - e por isso que a protecao de verdade dos
// pedidos sao as REGRAS DO FIREBASE (veja docs/PROJETO.md). O login serve
// para esconder a tela de quem nao e o dono, nao para segurar um invasor.
// O usuario nao diferencia maiuscula/minuscula (comparacao em
// normalizarUsuario), senao "Apolopanda500" e "apolopanda500" travavam o dono
// fora depois de 5 tentativas.
const VENDEDOR_USUARIO = "Apolopanda500";
const VENDEDOR_SENHA = "Naruto123@";

/* usuario nao distingue maiuscula/minuscula e ignora espaco nas pontas:
   evita o dono ficar trancado fora so por digitar com outra caixa */
function normalizarUsuario(txt) {
    return String(txt == null ? "" : txt).trim().toLowerCase();
}
function credenciaisConfere(usuario, senha) {
    if (normalizarUsuario(usuario) !== normalizarUsuario(VENDEDOR_USUARIO)) return false;
    return String(senha == null ? "" : senha) === VENDEDOR_SENHA;
}

/* ---------- validacao de CPF (digitos verificadores) ---------- */
function cpfValido(cpf) {
    var s = String(cpf || "").replace(/\D/g, "");
    if (s.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(s)) return false;
    var soma = 0, i, resto;
    for (i = 0; i < 9; i++) soma += parseInt(s.charAt(i)) * (10 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(s.charAt(9))) return false;
    soma = 0;
    for (i = 0; i < 10; i++) soma += parseInt(s.charAt(i)) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(s.charAt(10))) return false;
    return true;
}


/* ---------- validacao de CELULAR (mesma regra do servidor) ----------
   O gateway exige 11 digitos com o 9 na terceira posicao. Aqui o cliente
   confere antes de enviar, para o erro aparecer na hora - e nao so depois
   de o servidor recusar o pedido. */
function celularValido(tel) {
    var s = String(tel || "").replace(/\D/g, "");
    if (s.length !== 11) return false;
    var ddd = parseInt(s.slice(0, 2), 10);
    if (isNaN(ddd) || ddd < 11 || ddd > 99) return false;
    if (s.charAt(2) !== "9") return false;
    return true;
}

/* ---------- de onde vem o CPF e o celular do cliente ----------
   O Perfil grava em refrigerantePerfil/convencao_usuario (Conta).
   Ler refrigerantePrefs aqui fazia o pedido ser recusado mesmo com o
   Perfil preenchido - a tela pedia o CPF que o cliente ja tinha. */
function dadosDoCliente() {
    try {
        if (typeof Conta !== "undefined" && Conta.dados) {
            var d = Conta.dados();
            if (d && (d.cpf || d.tel)) return d;
        }
    } catch (e) { /* perfil bloqueado nao pode travar o pedido */ }
    try {
        var p = JSON.parse(localStorage.getItem("refrigerantePerfil") || "{}") || {};
        if (p.cpf || p.tel) return p;
    } catch (e) { /* perfil corrompido: tenta as preferencias */ }
    try { return JSON.parse(localStorage.getItem("refrigerantePrefs") || "{}") || {}; }
    catch (e) { return {}; }
}

/* ---------- o cliente esta com documento e celular em dia? ----------
   Devolve "" quando esta tudo certo, ou o texto do que falta. */
function problemaDoCliente() {
    var p = dadosDoCliente();
    var cpf = String(p.cpf || "").replace(/\D/g, "");
    if (!cpf) return "Coloque o seu CPF no Perfil para pedir. E ele que identifica a sua conta.";
    if (!cpfValido(cpf)) return "O CPF do Perfil nao confere. Confira os 11 digitos.";
    if (!celularValido(p.tel)) return "O celular do Perfil precisa ter DDD + 9 + 8 digitos (11 ao todo).";
    return "";
}
/* ---------- validacao de nome (nome completo, so letras) ---------- */
function nomeValido(nome) {
    var n = String(nome || "").trim().replace(/\s+/g, " ");
    if (n.length < 5 || n.length > 80) return false;
    if (!/^[A-Za-zÀ-ÿ'\- ]+$/.test(n)) return false;
    return n.split(" ").length >= 2;
}

/* ---------- telefone: so digitos, sem o 55 do meio ---------- */
function telNormalizado(tel) {
    var d = String(tel || "").replace(/\D/g, "");
    if (d.length === 13 && d.indexOf("55") === 0) d = d.slice(2);
    return d;
}
/* ---------- comparacao de telefones: aceita 8 ou 9 digitos finais ---------- */
function mesmoTelefone(a, b) {
    var x = telNormalizado(a), y = telNormalizado(b);
    if (!x || !y) return false;
    if (x === y) return true;
    var menor = x.length <= y.length ? x : y;
    var maior = x.length <= y.length ? y : x;
    return menor.length >= 8 && maior.slice(-menor.length) === menor;
}

const STATUS_LABEL = {
    aguardando: "⏳ Aguardando confirmação",
    confirmado: "✅ Confirmado",
    separacao: "📦 Em separação",
    enviado: "🚚 Saiu para entrega",
    entregue: "🎉 Entregue",
    cancelado: "❌ Cancelado"
};
const STATUS_ICON = {
    aguardando: "fa-clock",
    confirmado: "fa-check-circle",
    separacao: "fa-box",
    enviado: "fa-truck",
    entregue: "fa-check-double",
    cancelado: "fa-times-circle"
};
const STATUS_COR = {
    aguardando: "#FF9800", confirmado: "#2e7d32", separacao: "#9C27B0",
    enviado: "#00BCD4", entregue: "#4CAF50", cancelado: "#f44336"
};

function getPedidos() {
    const s = localStorage.getItem(PEDIDOS_KEY);
    return s ? JSON.parse(s) : [];
}
function savePedidos(p) {
    localStorage.setItem(PEDIDOS_KEY, JSON.stringify(p));
}

/* ============================================
   PEDIDOS NA NUVEM (Firebase Realtime Database)
   Cada aparelho guarda os pedidos no proprio navegador.
   Para o PAINEL ver os pedidos de TODO mundo (clientes
   de outros aparelhos/contas), o pedido novo e enviado
   para o banco e o painel baixa tudo e junta.
   - enviarPedidoNuvem: grava (fogo e esquece: nunca
     quebra o pedido local se a rede falhar)
   - sincronizarPedidosNuvem: baixa e mescla (só o painel)
   ============================================ */
var NUVEM_ENDERECOS = [
    "https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com",
    "https://planning-with-ai-9b2c9.firebaseio.com"
];
function nuvemEnderecos() {
    var out = [];
    try {
        var p = JSON.parse(localStorage.getItem("refrigerantePrefs") || "{}");
        var salvo = String(p.cfgPrecosURL || "").trim().replace(/\/+$/, "");
        if (salvo) out.push(salvo);
    } catch(e){/* proposital: guardar preferencia nunca pode travar o pedido */}
    NUVEM_ENDERECOS.forEach(function (u) { if (out.indexOf(u) < 0) out.push(u); });
    return out;
}

/* ============================================
   MODO GATEWAY - O CAMINHO DO BANCO FECHADO
   ============================================
   Campo "Banco" VAZIO = modo antigo: o navegador fala direto
   no Firebase (banco aberto). Esse e o botao de voltar.

   Campo "Banco" com a URL do gateway = tudo passa por ele e o
   banco pode ser fechado, porque quem fala com o Firebase e so
   o gateway (com a conta de servico). A Diferenca de formato:
     - o cliente cria o pedido em POST /api/pedido e GANHA UMA
       CHAVE; so com essa chave ele volta a ler o pedido dele;
     - o dono entra com a senha em POST /api/entrar e recebe um
       token de 12h; so com ele ele lista e muda status;
     - ninguem mais le o pedido dos outros.

   A chave e o token NUNCA vao para a nuvem: ficam so neste
   aparelho (localStorage e sessionStorage).
   ============================================ */
var GW_CHAVES = "convencaoChaves";      /* pedido -> chave do gateway */
var GW_TOKEN = "convencaoToken";        /* token do dono (12h) */

/* ---------- O GATEWAY DA LOJA (padrao do site) ----------
   Endereco do Worker que guarda os pedidos. Ele entra aqui como
   PADRAO: o cliente nao tem campo para colar nada, e mesmo teria
   que colar em cada celular. Como o pedido do cliente e gravado no
   aparelho ANTES de ir para a nuvem, se o gateway estiver fora do
   ar a funcao simply devolve "" e o pedido tenta o caminho antigo
   - a venda nunca para por causa disso. */
var GATEWAY_PADRAO = "https://convencao-gateway.rickjax123.workers.dev";

/* a URL do gateway, se o dono colar no campo "Banco".
   navegador do cliente = refrigerantePrefs; painel = vendedorPrefs */
function gatewayURL() {
    try {
        var noPainel = /admin\.html$/i.test((typeof location !== "undefined" && location.pathname) || "");
        var chave = noPainel ? "vendedorPrefs" : "refrigerantePrefs";
        var p = JSON.parse(localStorage.getItem(chave) || "{}");
        /* ---------- A VALVULA DE ESCAPE ----------
           cfgGatewayOff = true DESLIGA o gateway e volta tudo para o
           caminho antigo, mesmo com a URL do gateway preenchida. Sem
           isso, se o Worker caisse nao haveria como reverter - o dono
           ficaria preso num caminho so. E o que as baterias usam para
           conferir o modo antigo de verdade. */
        if (p.cfgGatewayOff === true) return "";
        var u = String(p.cfgPrecosURL || "").trim();
        u = u.replace(/\/+$/, "");
        /* so mesmo e o gateway: URL de arquivo .json ou de outro
           banco NAO entra neste modo */
        if (u && !/\.json$/i.test(u) && /\/api|workers\.dev|convencao-gateway/i.test(u)) return u;
    } catch (e) { /* proposital: sem preferencia e o modo antigo */ }
    /* ---------- O GATEWAY JA EH O PADRAO ----------
       O cliente nao tem campo para colar a URL: pedir isso a cada
       aparelho seria pedir para o cliente instalar errado. Entao o
       gateway vem aqui como padrao e o caminho antigo fica de
       reserva: se o gateway cair, a funcao devolve "" e cada
       chamada cai no banco aberto (quando ele ainda estiver
       aberto) - ou seja, a venda nunca para. */
    if (typeof GATEWAY_PADRAO === "string" && GATEWAY_PADRAO) return GATEWAY_PADRAO;
    return "";
}
function gatewayLigado() { return gatewayURL() !== ""; }

/* headers do dono (painel). Sem token, o gateway recusa. */
function gatewayCabecalhoDono(extra) {
    var h = extra || {};
    try {
        var t = sessionStorage.getItem(GW_TOKEN);
        if (t) h.Authorization = "Bearer " + t;
    } catch (e) { /* proposital: aba anonima nao guarda sessao */ }
    return h;
}

/* ---------- chave do pedido (o cliente guarda a dele) ---------- */
function gwGuardarChave(id, chave) {
    if (!id || !chave) return;
    try {
        var mapa = JSON.parse(localStorage.getItem(GW_CHAVES) || "{}");
        mapa[id] = chave;
        localStorage.setItem(GW_CHAVES, JSON.stringify(mapa));
    } catch (e) { /* proposital: guardar preferencia nunca pode travar o pedido */ }
}
function gwChaveDoPedido(id) {
    try { return (JSON.parse(localStorage.getItem(GW_CHAVES) || "{}"))[id] || ""; }
    catch (e) { return ""; }
}

/* ---------- o dono entra e ganha o token de 12 horas ----------
   Senha errada devolve 401 e nao guarda nada: o painel nao
   entra no modo gateway e o dono ve o erro na tela. */
function gatewayEntrar(senha, cb) {
    var u = gatewayURL();
    if (!u) { if (cb) cb(false, "sem gateway"); return; }
    try {
        fetch(u + "/api/entrar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ senha: String(senha || "") })
        })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
            if (!res.ok || !res.d || !res.d.token) { if (cb) cb(false, "senha invalida"); return; }
            try { sessionStorage.setItem(GW_TOKEN, res.d.token); } catch (e) { /* aba anonima */ }
            if (cb) cb(true, "ok");
        })
        .catch(function () { if (cb) cb(false, "gateway nao respondeu"); });
    } catch (e) { if (cb) cb(false, "erro"); }
}
function gatewayToken() {
    try { return sessionStorage.getItem(GW_TOKEN) || ""; } catch (e) { return ""; }
}
function gatewaySair() { try { sessionStorage.removeItem(GW_TOKEN); } catch (e) {} }

/* ============================================
   PEDIDO NOVO PELO GATEWAY
   O pedido ja esta salvo no aparelho: se o gateway falhar,
   ele tenta o caminho antigo e o cliente nunca perde a venda.
   ============================================ */
function enviarPedidoGateway(pedido, cb) {
    var u = gatewayURL();
    if (!u || !pedido || !pedido.id) { if (cb) cb(false, "sem gateway"); return; }
    try {
        fetch(u + "/api/pedido", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pedido: pedido })
        })
            .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d, status: r.status }; }); })
            .then(function (res) {
                if (!res.ok || !res.d || !res.d.chave) {
                    /* O SERVIDOR RECUSOU POR REGRA (CPF, celular, valor minimo
                       ou o limite do dia). Nao e queda de rede: reenviar nao
                       resolve. O pedido sai da fila e o motivo fica guardado,
                       senao o cliente veria "pedido feito" e o dono nunca
                       receberia nada. */
                    if (res.d && res.d.erro && res.status >= 400 && res.status < 500) {
                        marcarRecusaDefinitiva(pedido, res.d.erro);
                        if (cb) cb(false, "recusado", res.d.erro);
                        return;
                    }
                    if (cb) cb(false, "recusado", (res.d && res.d.erro) || "");
                    return;
                }
                /* a chave e o que permite acompanhar o pedido depois */
                gwGuardarChave(pedido.id, res.d.chave);
                if (cb) cb(true, "ok");
            })
            .catch(function () { if (cb) cb(false, "sem rede"); });
    } catch (e) { if (cb) cb(false, "erro"); }
}

/* ---------- o cliente acompanha o pedido DELE (so com a chave) ---------- */
function sincronizarPedidosGateway(callback) {
    var u = gatewayURL();
    var meus = getPedidos().filter(function (p) { return p && p.id && gwChaveDoPedido(p.id); });
    if (!u || !meus.length) { if (callback) callback(getPedidos()); return; }
    var n = meus.length, nuvem = [], respondeu = false;
    function devolve() {
        if (respondeu) return;
        respondeu = true;
        var junto = mesclarPedidos(getPedidos(), nuvem);
        if (JSON.stringify(junto) !== JSON.stringify(getPedidos())) savePedidos(junto);
        if (callback) callback(junto);
    }
    setTimeout(devolve, 8000);
    meus.forEach(function (p) {
        fetch(u + "/api/meu-pedido?id=" + encodeURIComponent(p.id), {
            cache: "no-store",
            headers: { "X-Chave-Pedido": gwChaveDoPedido(p.id) }
        })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) { if (d && d.id) nuvem.push(d); })
            .catch(function () { /* proposital: um pedido que nao respondeu nao derruba os outros */ });
    });
    setTimeout(devolve, 1500 + n * 120);
}

/* ---------- o dono lista tudo pelo gateway (so com o token) ---------- */
function sincronizarPedidosGatewayDono(callback) {
    var u = gatewayURL();
    if (!u) { if (callback) callback(null); return; }
    try {
        fetch(u + "/api/pedidos", { cache: "no-store", headers: gatewayCabecalhoDono() })
            .then(function (r) {
                if (r.status === 401) return { naoentrou: true };
                if (!r.ok) throw new Error("http " + r.status);
                return r.json();
            })
            .then(function (dados) {
                if (dados && dados.naoentrou) { if (callback) callback(null, "sem token"); return; }
                var nuvem = (dados && typeof dados === "object")
                    ? Object.keys(dados).map(function (k) { return dados[k]; }).filter(Boolean)
                    : [];
                var atual = getPedidos();
                var junto = mesclarPedidos(atual, nuvem);
                if (JSON.stringify(junto) !== JSON.stringify(atual)) savePedidos(junto);
                if (callback) callback(junto);
            })
            .catch(function () { if (callback) callback(null); });
    } catch (e) { if (callback) callback(null); }
}

/* ---------- o dono muda o status pelo gateway ---------- */
function mudarStatusGateway(id, status, cb) {
    var u = gatewayURL();
    if (!u) { if (cb) cb(false, "sem gateway"); return; }
    try {
        fetch(u + "/api/status", {
            method: "POST",
            headers: Object.assign({ "Content-Type": "application/json" }, gatewayCabecalhoDono()),
            body: JSON.stringify({ id: id, status: status })
        })
            .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
            .then(function (res) {
                if (res.ok && res.d && res.d.pedido && res.d.pedido.id) {
                    savePedidos(mesclarPedidos(getPedidos(), [res.d.pedido]));
                    if (cb) cb(true, res.d.pedido);
                    return;
                }
                if (cb) cb(false, "recusado");
            })
            .catch(function () { if (cb) cb(false, "sem rede"); });
    } catch (e) { if (cb) cb(false, "erro"); }
}

/* ============================================
   CAPACIDADE DO DIA PELO GATEWAY (a valva)
   ============================================ */
function publicarCapacidadeGateway(dia, pedidos, limite, cb) {
    var u = gatewayURL();
    if (!u) { if (cb) cb(false, "sem gateway"); return; }
    try {
        fetch(u + "/api/capacidade", {
            method: "PUT",
            headers: Object.assign({ "Content-Type": "application/json" }, gatewayCabecalhoDono()),
            body: JSON.stringify({ dia: dia, pedidos: pedidos, limite: limite })
        })
            .then(function (r) { if (cb) cb(r.ok); })
            .catch(function () { if (cb) cb(false); });
    } catch (e) { if (cb) cb(false); }
}
function puxarCapacidadeGateway(cb) {
    var u = gatewayURL();
    if (!u) { if (cb) cb(false); return; }
    try {
        fetch(u + "/api/capacidade", { cache: "no-store" })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) { if (d) guardarCapacidade(d); if (cb) cb(!!d); })
            .catch(function () { if (cb) cb(false); });
    } catch (e) { if (cb) cb(false); }
}

/* ============================================
   CAPACIDADE DO DIA - a valva global da loja
   So o PAINEL publica: ele e o unico lugar que ve os
   pedidos de todos os aparelhos, entao e o unico que sabe
   quantas vagas de hoje ja foram usadas. O cliente le esse
   numero (chave publica, so numeros - nenhum dado de cliente)
   e trava quando a loja bateu o teto.
   Falha na leitura NAO bloqueia ninguem: o limite por cliente
   continua valendo e o site segue normal. Melhor vender a
   mais do que derrubar a venda por um numero velho. */
var CHAVE_CAPACIDADE = "convencaoCapacidade";

function caminhoCapacidade(url) {
    return /\.json(\?|$)/i.test(String(url || "")) ? url : url + "/capacidade.json";
}
function guardarCapacidade(dados) {
    if (!dados || typeof dados !== "object") return false;
    var pedidos = parseInt(dados.pedidos, 10);
    if (isNaN(pedidos) || pedidos < 0) return false;
    try {
        /* o minimo do pedido vem do SERVIDOR: e la que a regra e cobrada de
           verdade, entao o site tem que avisar o mesmo numero. Se o dono
           mudar la, o site acompanha sozinho. */
        var salvo = {
            dia: String(dados.dia || ""),
            pedidos: pedidos,
            limite: parseInt(dados.limite, 10) || 0,
            quando: Date.now()
        };
        var minimo = Number(dados.pedidoMinimo);
        if (!isNaN(minimo) && minimo > 0) salvo.pedidoMinimo = minimo;
        localStorage.setItem(CHAVE_CAPACIDADE, JSON.stringify(salvo));
        return true;
    } catch (e) { return false; }
}
function puxarCapacidadeNuvem(cb) {
    if (typeof fetch !== "function") { if (cb) cb(false); return; }
/* modo gateway: a valva tambem passa pelo caminho seguro */
      if (typeof gatewayLigado === "function" && gatewayLigado()) {
          return puxarCapacidadeGateway(cb);
      }
      /* a reserva tambem ignora o gateway (mesmo motivo do pedido) */
var lista = nuvemEnderecos().filter(function (b) {
          return !/\/api|workers\.dev|convencao-gateway/i.test(String(b || ""));
      });
    var i = 0;
    (function tentar() {
        if (i >= lista.length) { if (cb) cb(false); return; }
        var url = lista[i++];
        fetch(caminhoCapacidade(url), { cache: "no-store" })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (dados) {
                if (!dados || typeof dados !== "object") { tentar(); return; }
                guardarCapacidade(dados);
                if (cb) cb(true);
            })
            .catch(function () { tentar(); });
    })();
}
function enviarPedidoNuvem(pedido) {
    if (!pedido || !pedido.id) return;
    /* modo gateway: o pedido vai pelo caminho seguro e o cliente
       ganha a CHAVE dele. Se o gateway nao responder, cai no
       caminho antigo (modo em que o banco ainda esta aberto). */
    if (typeof gatewayLigado === "function" && gatewayLigado() && typeof enviarPedidoGateway === "function") {
        enviarPedidoGateway(pedido, function (ok) { if (!ok) enviarPedidoNuvemDireto(pedido); });
        return;
    }
    enviarPedidoNuvemDireto(pedido);
}
/* RESERVA SEM GRAVAR DADOS PESSOAIS NA INTERNET
   Antes, quando o gateway nao respondia, o aparelho gravava o pedido
   direto no Firebase. O banco esta aberto na internet: la, nome, telefone,
   CPF e endereco ficariam em texto plano para qualquer pessoa que abrisse o
   endereco - e o gateway existe justamente para cifrar isso.

   Entao a reserva mudou de regra: o pedido NAO vai direto para o banco.
   Ele fica salvo neste aparelho (como ja estava) e vai pelo gateway assim
   que o gateway voltar. O cliente ja viu a confirmacao, nada se perde, e
   nao ha mais porta aberta para os dados de uma pessoa vazarem. */
function enviarPedidoNuvemDireto(pedido) {
    if (!pedido || !pedido.id) return;
    marcarFalhaNuvem(pedido);
    agendarReenvio();
}

/* Reenvio com folga crescente: o gateway pode estar fora por um instante ou
   por horas, e nao adianta ficar martelando. Quando nao ha mais nada preso,
   o agendamento PARA - nao fica acordando o aparelho a toa. */
var AGENDA_REENVIO = 5000;
function temPedidoPreso() {
    try {
        var mapa = JSON.parse(localStorage.getItem("convencaoNuvemFalhou") || "{}");
        return Object.keys(mapa || {}).length > 0;
    } catch (e) { return false; }
}
function agendarReenvio() {
    try {
        if (typeof setTimeout !== "function") return;
        setTimeout(function () {
            var enviados = 0;
            try { enviados = reenviarPedidosPresos(); } catch (e) { enviados = 0; }
            if (enviados > 0 || temPedidoPreso()) {
                AGENDA_REENVIO = enviados > 0 ? 8000 : Math.min(AGENDA_REENVIO * 2, 5 * 60 * 1000);
                agendarReenvio();
            } else {
                AGENDA_REENVIO = 5000;
            }
        }, AGENDA_REENVIO);
    } catch (e) { /* agenda e um luxo: sem ele, o reenvio manual ainda existe */ }
}

/* O SERVIDOR RECUSOU ESTE PEDIDO (CPF, celular, valor minimo ou o limite
   do dia). Reenviar nao adianta: seria recusado de novo. Por isso o pedido
   sai da fila de reenvio e o motivo fica guardado para o cliente ler - senao
   ele veria "pedido feito" e o dono nunca receberia nada. */
function marcarRecusaDefinitiva(pedido, motivo) {
    if (!pedido || !pedido.id) return;
    try {
        var mapa = JSON.parse(localStorage.getItem("convencaoNuvemFalhou") || "{}");
        delete mapa[pedido.id];
        localStorage.setItem("convencaoNuvemFalhou", JSON.stringify(mapa));
        localStorage.setItem("convencaoRecusado", JSON.stringify({
            id: pedido.id, motivo: String(motivo || ""), quando: Date.now()
        }));
    } catch (e) { /* guardar o motivo e um extra: a fila ja foi limpa */ }
}

/* o que o cliente tem de ler quando o servidor recusou */
function recusaDoServidor() {
    try { return JSON.parse(localStorage.getItem("convencaoRecusado") || "null"); }
    catch (e) { return null; }
}

/* a nuvem nao aceitou: o pedido segue salvo neste aparelho, mas o painel
   pode demorar a ver. avisamos o cliente para ele nao achar que sumiu */
function marcarFalhaNuvem(pedido) {
    try {
        var mapa = JSON.parse(localStorage.getItem("convencaoNuvemFalhou") || "{}");
        mapa[pedido.id] = Date.now();
        localStorage.setItem("convencaoNuvemFalhou", JSON.stringify(mapa));
    } catch (e) { /* proposital: aba anonima nao guarda preferencia */ }
    var aviso = document.getElementById("avisoNuvemFora");
    if (aviso) {
        aviso.style.display = "block";
        aviso.innerHTML = '<i class="fa fa-wifi"></i> O pedido <b>' + String(pedido.id) + '</b> ficou salvo aqui, '
            + 'mas a internet nao deixou enviar para o painel agora. Abrindo o app de novo ele tenta de novo.';
    }
}
/* AUTOMACAO: reenvia sozinho o pedido que ficou preso sem rede.
   O cliente nao precisa pensar nisso: ao abrir o site (e a cada 2
   minutos enquanto a tela estiver aberta) o pedido que ainda nao
   chegou no painel volta a ser enviado. */
function reenviarPedidosPresos() {
    try {
        var mapa = JSON.parse(localStorage.getItem("convencaoNuvemFalhou") || "{}");
        var ids = Object.keys(mapa || {});
        if (!ids.length) return 0;
        var pedidos = getPedidos();
        var enviados = 0;
        ids.forEach(function (id) {
            var p = pedidos.filter(function (x) { return x && x.id === id; })[0];
            if (p) { enviarPedidoNuvem(p); enviados++; }
        });
        if (!enviados) return 0;
        /* limpa o aviso depois do reenvio: o mapa some quando a rede volta */
        setTimeout(function () {
            try {
                var ainda = JSON.parse(localStorage.getItem("convencaoNuvemFalhou") || "{}");
                Object.keys(ainda).forEach(function (id) {
                    var tem = getPedidos().filter(function (x) { return x && x.id === id; })[0];
                    if (tem) enviarPedidoNuvem(tem);
                    else delete ainda[id];
                });
                localStorage.setItem("convencaoNuvemFalhou", JSON.stringify(ainda));
            } catch (e) { /* proposital: repetir mais uma vez nunca pode travar a tela */ }
        }, 4000);
        return enviados;
    } catch (e) {
        return 0;   /* automacao e extra: se falhar, o pedido segue salvo aqui */
    }
}
/* AUTOMACAO: reenvia sozinho o pedido que ficou preso sem rede.
   O cliente nao precisa fazer nada: ao abrir o site (e a cada 2
   minutos com a tela aberta) o pedido que ainda nao chegou no painel
   volta a ser enviado. */
(function () {
    if (typeof document === "undefined" || !document.addEventListener) return;
/* os dois try/catch nao engoliram nada: so protegem a tela de uma
       falha de ambiente (setInterval bloqueado, aba anonima) */
try { setTimeout(function () { reenviarPedidosPresos(); }, 1500); } catch (e) { /* ambiente sem timer */ }
    try { setInterval(function () { reenviarPedidosPresos(); }, 120000); } catch (e) { /* ambiente sem timer */ }
    /* a valva do dia precisa do total da loja antes do cliente
       escolher o que quer: busca assim que a tela abre e de novo
       a cada 5 min (o painel publica a cada sincronizacao) */
    try { setTimeout(function () { puxarCapacidadeNuvem(); }, 400); } catch (e) { /* ambiente sem timer */ }
    try { setInterval(function () { puxarCapacidadeNuvem(); }, 300000); } catch (e) { /* ambiente sem timer */ }
})();

/* junta aparelho + nuvem; para o mesmo id vence o que tem
   mais historico (e, em empate, o mais recente) */
function mesclarPedidos(locais, nuvem) {
    var mapa = {};
    (locais || []).forEach(function (p) {
        if (p && p.id) mapa[p.id] = p;
    });
    (nuvem || []).forEach(function (p) {
        if (!p || !p.id) return;
        var atual = mapa[p.id];
        if (!atual) { mapa[p.id] = p; return; }
        var ha = (atual.historico || []).length, hb = (p.historico || []).length;
        var ta = atual.atualizadoEm || atual.criadoEm || 0;
        var tb = p.atualizadoEm || p.criadoEm || 0;
        if (hb > ha || (hb === ha && tb > ta)) mapa[p.id] = p;
    });
    return Object.keys(mapa).map(function (k) { return mapa[k]; })
        .sort(function (a, b) { return (b.criadoEm || 0) - (a.criadoEm || 0); });
}
/* baixa os pedidos de todos os aparelhos (primeiro banco responde vale);
   salva a juncao e chama o callback com a lista (ou null se ninguem respondeu) */
function sincronizarPedidosNuvem(callback) {
    /* modo gateway: so o dono logado lista, pelo caminho seguro */
    if (typeof gatewayLigado === "function" && gatewayLigado()) {
        return sincronizarPedidosGatewayDono(callback);
    }
    var bases = nuvemEnderecos();
    var i = 0;
    function tentar() {
        if (i >= bases.length) { if (callback) callback(null); return; }
        var base = bases[i++];
        fetch(base + "/pedidos.json", { cache: "no-store" })
            .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
            .then(function (dados) {
                var nuvem = (dados && typeof dados === "object")
                    ? Object.keys(dados).map(function (k) { return dados[k]; }).filter(Boolean)
                    : [];
                var atual = getPedidos();
                var junto = mesclarPedidos(atual, nuvem);
                if (JSON.stringify(junto) !== JSON.stringify(atual)) savePedidos(junto);
                if (callback) callback(junto);
            })
            .catch(function () { tentar(); });
    }
    tentar();
}
/* baixa da nuvem SO os pedidos do telefone do cliente e junta com os locais.
   Para a notificacao acompanhar o status que o vendedor mudou. */
function sincronizarPedidosCliente(callback) {
    /* modo gateway: o cliente so ve o pedido DELE, e so com a chave
       que o gateway devolveu na hora da criacao */
    if (typeof gatewayLigado === "function" && gatewayLigado()) {
        return sincronizarPedidosGateway(callback);
    }
    if (typeof Conta === "undefined") { if (callback) callback(getPedidos()); return; }
    var tels = [];
    try { (Conta.dados().tel || "").toString(); } catch(e){/* proposital: a conta pode nao existir ainda */}
    try {
        var d = Conta.dados();
        if (d && d.tel) tels.push(String(d.tel).replace(/\D/g, ""));
        var perfil = JSON.parse(localStorage.getItem("refrigerantePerfil") || "{}");
        if (perfil.tel) tels.push(String(perfil.tel).replace(/\D/g, ""));
    } catch(e){/* proposital: guardar preferencia nunca pode travar o pedido */}
    tels = tels.filter(function (t, i) { return t && tels.indexOf(t) === i; });
    if (!tels.length) { if (callback) callback(getPedidos()); return; }
    var bases = nuvemEnderecos();
    var i = 0;
    var respondido = false;
    function devolver(lista) {
        if (respondido) return;
        respondido = true;
        if (callback) callback(lista);
    }
    setTimeout(function() { devolver(getPedidos()); }, 8000);
    function tentar() {
        if (respondido || i >= bases.length) { devolver(getPedidos()); return; }
        var base = bases[i++];
        fetch(base + "/pedidos.json", { cache: "no-store" })
            .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
            .then(function (dados) {
                if (respondido) return;
                var nuvem = (dados && typeof dados === "object")
                    ? Object.keys(dados).map(function (k) { return dados[k]; }).filter(function (p) {
                        return p && p.id && tels.some(function (t) {
                            return String(p.tel || "").replace(/\D/g, "").slice(-8) === t.slice(-8);
                        });
                    })
                    : [];
                var atual = getPedidos();
                var junto = mesclarPedidos(atual, nuvem);
                if (JSON.stringify(junto) !== JSON.stringify(atual)) savePedidos(junto);
                devolver(junto);
            })
            .catch(function () { if (!respondido) tentar(); });
    }
    tentar();
}

/* ============================================================
   AVALIACOES (notas e estrelas)
   O cliente avalia o pedido entregue (1 a 5 estrelas + texto).
   Vai para a nuvem junto do pedido: o vendedor ve a media.
   ============================================================ */
var AVALIACOES_KEY = "convencao_avaliacoes";
function getAvaliacoesLocais() {
    try { return JSON.parse(localStorage.getItem(AVALIACOES_KEY) || "[]"); }
    catch (e) { return []; }
}
function saveAvaliacoesLocais(lista) {
    try { localStorage.setItem(AVALIACOES_KEY, JSON.stringify(lista)); } catch(e){/* proposital: guardar preferencia nunca pode travar o pedido */}
}
function enviarAvaliacaoNuvem(av) {
    if (!av || !av.id) return;
    /* modo gateway: a avaliacao tambem passa pelo caminho seguro */
    if (typeof gatewayLigado === "function" && gatewayLigado()) {
        try {
            fetch(gatewayURL() + "/api/avaliar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avaliacao: av })
            }).catch(function () { /* proposital: avaliacao e um extra, nao pode travar o app */ });
        } catch (e) { /* proposital: avaliacao e um extra, nao pode travar o app */ }
        return;
    }
    var corpo = JSON.stringify(av);
    nuvemEnderecos().forEach(function (base) {
        try {
            fetch(base + "/avaliacoes/" + encodeURIComponent(av.id) + ".json",
                { method: "PUT", body: corpo, mode: "cors" }).catch(function () {});
        } catch(e){/* proposital: avaliacao e um extra, nao pode travar o app */}
    });
}
/* grava avaliacao (nova ou substitui a do mesmo pedido) */
function salvarAvaliacao(pedidoId, estrelas, texto) {
    estrelas = Math.max(1, Math.min(5, parseInt(estrelas, 10) || 0));
    if (!pedidoId || !estrelas) return null;
    var av = {
        id: pedidoId + "-" + Date.now(),
        pedidoId: pedidoId,
        estrelas: estrelas,
        texto: String(texto || "").slice(0, 500),
        criadoEm: Date.now()
    };
    try {
        var p = null;
        if (typeof Conta !== "undefined") {
            try { p = Conta.dados(); } catch (e) { /* proposital: conta ainda nao salva */ }
        }
        if (p) av.nome = p.nome || "";
    } catch (e) { /* proposital: nota quebrada nao pode travar o app */ }
    var lista = getAvaliacoesLocais().filter(function (a) { return a.pedidoId !== pedidoId; });
    lista.unshift(av);
    saveAvaliacoesLocais(lista);
    enviarAvaliacaoNuvem(av);
    return av;
}
function avaliacaoDoPedido(pedidoId) {
    return getAvaliacoesLocais().find(function (a) { return a.pedidoId === pedidoId; }) || null;
}
function mediaEstrelas(lista) {
    lista = (lista || []).filter(function (a) { return a && a.estrelas >= 1 && a.estrelas <= 5; });
    if (!lista.length) return { media: 0, total: 0 };
    var soma = lista.reduce(function (t, a) { return t + a.estrelas; }, 0);
    return { media: Math.round((soma / lista.length) * 10) / 10, total: lista.length };
}
/* baixa TODAS as avaliacoes da nuvem (o vendedor ve a media de todo mundo) */
function sincronizarAvaliacoesNuvem(callback) {
    var bases = nuvemEnderecos();
    var i = 0;
    function tentar() {
        if (i >= bases.length) { if (callback) callback(null); return; }
        var base = bases[i++];
        fetch(base + "/avaliacoes.json", { cache: "no-store" })
            .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
            .then(function (dados) {
                var lista = (dados && typeof dados === "object")
                    ? Object.keys(dados).map(function (k) { return dados[k]; }).filter(Boolean)
                    : [];
                if (callback) callback(lista);
            })
            .catch(function () { tentar(); });
    }
    tentar();
}
/* estrelas em HTML (so leitura na loja; voto so no pedido) */
function estrelasHTML(media, total) {
    var h = '<span class="estrelas" title="' + media + ' de 5 (' + total + ' votos)">';
    for (var i = 1; i <= 5; i++) {
        h += '<i class="fa ' + (i <= Math.round(media) ? "fa-star" : "fa-star-o") + '"></i>';
    }
    h += '</span>';
    if (total) h += ' <span class="estrelas-num">' + String(media).replace(".", ",") + " (" + total + ")</span>";
    return h;
}
function gerarId() {
    const d = new Date();
    const n = getPedidos().length + 1;
    const base = "CV" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-" + String(n).padStart(3, "0");
    /* Dois clientes em aparelhos diferentes podem gerar o mesmo numero no
       mesmo dia (os dois CV20261016-001). No banco um sobrescrevia o pedido
       do outro cliente: o sufixo curto mantem o numero legivel e garante
       que cada pedido tenha o seu. */
    const hora = String(Date.now() % 1000).padStart(3, "0");   /* sempre 3 digitos */
    const sorte = 10 + Math.floor(Math.random() * 90);  /* 2 digitos */
    return base + "-" + String(hora) + String(sorte);
}
function criarPedido(dados) {
    const pedidos = getPedidos();
    /* ---------- A VALVA DO DIA (loja.js: checaLimitePedidos) ----------
       Guarda dura: o carrinho ja avisa e desliga o botao, mas
       aqui o limite e conferido de novo na hora de GRAVAR.
       Se alguem chamar criarPedido pelo console do navegador,
       o pedido nao nasce - e a ultima linha de defesa da loja. */
    /* antes de tudo: o cliente tem documento e celular em dia?
       O servidor exige, entao avisar aqui evita o cliente preencher tudo e
       so entao ouvir "CPF invalido". */
    /* trava ANTES de criar: se este cliente ja tem pedido de hoje no aparelho
       (feito ou ainda nao enviado), nao nasce um segundo - e o cliente recebe
       o motivo na hora, em vez de so descobrir depois no painel. */
    var soDigitos = function (v) { return String(v == null ? "" : v).replace(/\D/g, ""); };
    var cpfHoje = soDigitos(dadosDoCliente().cpf || dados.cpf || "");
    if (cpfHoje && typeof LIMITE_PEDIDOS_CLIENTE_DIA === "number") {
        var meuHoje = 0;
        var hojeLocal = String(diaLimite());
        getPedidos().forEach(function (p) {
            if (!p || p.status === "cancelado" || !p.cpf || soDigitos(p.cpf) !== cpfHoje) return;
            /* a data tem de ser a do PEDIDO (criadoEm), nunca "hoje" por padrao:
               sem isso, todo pedido antigo contava como se fosse de hoje e o
               cliente ficava preso para sempre depois do primeiro dia. */
            var diaPedido = (typeof dataDoPedido === "function")
                ? dataDoPedido(p)
                : String(p.dia || "");
            if (diaPedido === hojeLocal) meuHoje++;
        });
        if (meuHoje >= LIMITE_PEDIDOS_CLIENTE_DIA) {
            try { localStorage.setItem("convencaoLimiteRecusado", JSON.stringify({
                quando: Date.now(), tipo: "cliente",
                motivo: "Voce ja fez seu pedido de hoje. O limite e de " + LIMITE_PEDIDOS_CLIENTE_DIA
                    + " pedido por cliente por dia: amanha, depois da meia-noite, voce pode pedir de novo."
            })); } catch (e) { /* guardar e um extra */ }
            return null;
        }
    }
    if (typeof problemaDoCliente === "function") {
        var falta = problemaDoCliente();
        if (falta) {
            try { localStorage.setItem("convencaoLimiteRecusado", JSON.stringify({
                quando: Date.now(), tipo: "cadastro", motivo: falta
            })); } catch (e) { /* guardar preferencia nunca pode travar o pedido */ }
            return null;
        }
    }
    if (typeof checaLimitePedidos === "function") {
        var trava = checaLimitePedidos(dados.tel, pedidos);
        if (trava) {
            try { localStorage.setItem("convencaoLimiteRecusado", JSON.stringify({
                quando: Date.now(), tipo: trava.tipo, motivo: trava.texto
            })); } catch (e) { /* proposital: guardar preferencia nunca pode travar o pedido */ }
            return null;
        }
    }
    const pedido = {
        id: gerarId(),
        nome: dados.nome, tel: dados.tel, cpf: dados.cpf || "",
        end: dados.end, bairro: dados.bairro, comp: dados.comp,
        regiao: dados.regiao, frete: dados.frete, pagamento: dados.pagamento, troco: dados.troco,
        itens: dados.itens, subtotal: dados.subtotal, total: dados.total,
        digital: dados.digital === true,
        status: "aguardando", criadoEm: Date.now(),
        historico: [{ status: "aguardando", quando: Date.now() }]
    };
    pedidos.unshift(pedido);
    savePedidos(pedidos);
    /* manda para a nuvem: o painel do vendedor ve pedidos de TODO mundo */
    if (typeof enviarPedidoNuvem === "function") { try { enviarPedidoNuvem(pedido); } catch(e){/* proposital: guardar preferencia nunca pode travar o pedido */} }
    return pedido;
}

/* ============================================
   AVISO DE NOVO PEDIDO - SOMENTE PARA O VENDEDOR
   A mensagem vai para o chat fixo do dono da loja
   (confirmado com /start no bot). O cliente NAO
   recebe nada no Telegram: ele so usa o site.

   Envio por GET (query string): e o unico metodo que
   passa em qualquer navegador (Android, iPhone, PC),
   porque a API do Telegram barra POST com JSON.

   A mensagem chega com BOTOES: o vendedor toca em
   Confirmar / Separação / Enviado / Entregue /
   Cancelar e o status muda no painel.
   ============================================ */

/* texto da mensagem de um pedido (usado no aviso e na edicao) */
function mensagemPedidoTG(p) {
    var itens = "";
    (p.itens || []).forEach(function(i){ itens += "\n  - " + i.name + " x" + i.qty + " = " + formatBRL(i.subtotal); });
    if (itens.length > 900) itens = itens.slice(0, 900) + "\n  ...(demais itens no painel)";

    var msg = "NOVO PEDIDO " + p.id + "\n"
        + "\nCliente: " + p.nome
        + (p.cpf ? "\nCPF: " + p.cpf : "")
        + "\nWhatsApp: " + p.tel
        + "\nRecebido em: " + dataHoraSegundos(p.criadoEm)
        + "\nEndereco: " + p.end + (p.comp ? " (" + p.comp + ")" : "") + " - " + p.bairro
        + "\nRegiao: " + p.regiao
        + "\nPagamento: " + p.pagamento + (p.pagamento === "Dinheiro" && p.troco ? " (troco para " + p.troco + ")" : "")
        + "\nFrete: " + (p.frete === 0 ? "GRATIS" : formatBRL(p.frete))
        + "\n\nItens:" + itens
        + "\n\nTOTAL: " + formatBRL(p.total)
        + "\n\nStatus: " + (STATUS_LABEL[p.status] || p.status);

    if (msg.length > 3500) msg = msg.slice(0, 3450) + "\n...(veja o pedido completo no painel)";
    return msg;
}

/* botoes de status que vem na mensagem do pedido */
function tecladoPedidoTG(id) {
    return {
        inline_keyboard: [
            [ { text: "✅ Confirmar", callback_data: "st|" + id + "|confirmado" },
              { text: "📦 Em separação", callback_data: "st|" + id + "|separacao" } ],
            [ { text: "🚚 Saiu p/ entrega", callback_data: "st|" + id + "|enviado" },
              { text: "🏁 Entregue", callback_data: "st|" + id + "|entregue" } ],
            [ { text: "✏️ Editar", callback_data: "ed|" + id },
              { text: "↩️ Reabrir", callback_data: "rb|" + id } ],
            [ { text: "❌ Cancelar", callback_data: "st|" + id + "|cancelado" } ],
            [ { text: "🖥️ Abrir painel", url: "https://convencao-site.rickjax123.workers.dev/admin.html" } ]
        ]
    };
}

function notificarTelegramPedido(p) {
    var prefs = {};
    try { prefs = JSON.parse(localStorage.getItem("refrigerantePrefs") || "{}"); } catch(e){/* proposital: guardar preferencia nunca pode travar o pedido */}
    if (prefs.cfgAvisoPedido === false) return;          // desligado (opcao oculta)
    /* sem token configurado o painel nao chama o Telegram: o token padrao
       vivia neste arquivo, e o repositorio e publico - qualquer um lia. */
    var token = String(prefs.cfgTelegramToken || "").trim();
    if (!token) return;                                   // sem token: quem avisa e o robo 24/7
    var chat  = prefs.cfgTelegramChatId || "1810807613";  // chat do vendedor (@Rickcao22)
    if (!token || !chat) return;

    var msg = mensagemPedidoTG(p) + "\n\nToque nos botoes abaixo ou digite /confirmar " + p.id;

    var url = "https://api.telegram.org/bot" + token + "/sendMessage"
            + "?chat_id=" + encodeURIComponent(chat)
            + "&text=" + encodeURIComponent(msg)
            + "&disable_web_page_preview=true"
            + "&reply_markup=" + encodeURIComponent(JSON.stringify(tecladoPedidoTG(p.id)));
    try { fetch(url, { mode: "no-cors" }).catch(function(){}); } catch(e){/* proposital: guardar preferencia nunca pode travar o pedido */}
}

/* aviso simples de texto para o vendedor (usado pela ajuda do site).
   A ajuda chamava notificarTelegram(), que nao existia: o aviso nunca saia. */
function notificarTelegram(texto) {
    var prefs = {};
    try { prefs = JSON.parse(localStorage.getItem("refrigerantePrefs") || "{}"); } catch(e){/* proposital: guardar preferencia nunca pode travar o pedido */}
    /* sem token configurado o painel nao chama o Telegram: o token padrao
       vivia neste arquivo, e o repositorio e publico - qualquer um lia. */
    var token = String(prefs.cfgTelegramToken || "").trim();
    if (!token) return;                                   // sem token: quem avisa e o robo 24/7
    var chat  = prefs.cfgTelegramChatId  || "1810807613";   // chat do vendedor (@Rickcao22)
    if (!token || !chat || !texto) return;
    var url = "https://api.telegram.org/bot" + token + "/sendMessage"
            + "?chat_id=" + encodeURIComponent(chat)
            + "&text=" + encodeURIComponent(texto)
            + "&disable_web_page_preview=true";
    try { fetch(url, { mode: "no-cors" }).catch(function(){}); } catch(e){/* proposital: guardar preferencia nunca pode travar o pedido */}
}

function pedidosPorTelefone(tel) {
    const t = String(tel).replace(/\D/g, "");
    return getPedidos().filter(p => String(p.tel).replace(/\D/g, "") === t);
}
function atualizarStatus(id, novoStatus) {
    const pedidos = getPedidos();
    const p = pedidos.find(x => x.id === id);
    if (p) {
        p.status = novoStatus;
        p.historico.push({ status: novoStatus, quando: Date.now() });
        p.atualizadoEm = Date.now();
        savePedidos(pedidos);
        /* a mudanca tambem vai para a nuvem (outro aparelho enxerga na hora) */
        if (typeof gatewayLigado === "function" && gatewayLigado()) {
            /* modo gateway: o dono manda o status pelo caminho seguro */
            if (typeof mudarStatusGateway === "function") {
                try { mudarStatusGateway(id, novoStatus); } catch(e){/* proposital: mudar status nunca pode travar o painel */}
            }
        } else if (typeof enviarPedidoNuvem === "function") { try { enviarPedidoNuvem(p); } catch(e){/* proposital: guardar preferencia nunca pode travar o pedido */} }
    }
    return p;
}
/* ---------- data e hora DETALHADAS ----------
   PADRAO DO PROJETO: dd/mm/aaaa hh:mm:ss (ex.: 15/10/2026 14:12:37).
   Tudo que mostra data passa por dataHoraSegundos, assim nao
   existem dois formatos diferentes na loja. */
function dataHora(ts) {
    return dataHoraSegundos(ts);
}
/* com segundos: 15/10/2026 14:12:37 */
function dataHoraSegundos(ts) {
    const d = new Date(ts || Date.now());
    const p = (n) => ("0" + n).slice(-2);
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear()
        + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
}
/* so a data: 15/10/2026 */
function dataCurta(ts) {
    const d = new Date(ts || Date.now());
    const p = (n) => ("0" + n).slice(-2);
    return p(d.getDate()) + "/" + p(d.getMonth() + 1) + "/" + d.getFullYear();
}
/* quanto tempo ja passou: "agora", "3 min", "2 h 15 min", "6 dias" */
function tempoDesde(ts) {
    if (!ts) return "";
    var s = Math.floor((Date.now() - ts) / 1000);
    if (s < 0) return "";
    if (s < 60) return "agora";
    var m = Math.floor(s / 60);
    if (m < 60) return m + " min";
    var h = Math.floor(m / 60), resto = m % 60;
    if (h < 24) return h + " h" + (resto ? " " + resto + " min" : "");
    var d = Math.floor(h / 24);
    return d + (d === 1 ? " dia" : " dias");
}
/* hora exata + quanto tempo faz (o "tick" do painel) */
function tick(ts) {
    return '<span class="tick" title="' + dataHoraSegundos(ts) + '">'
        + '<i class="fa fa-clock"></i> ' + dataHoraSegundos(ts)
        + (tempoDesde(ts) ? ' <em>(' + tempoDesde(ts) + ')</em>' : '') + "</span>";
}
function statusBadge(status) {
    const cor = STATUS_COR[status] || "#777";
    const icone = STATUS_ICON[status] || "fa-circle";
    return '<span style="background:' + cor + ';color:#fff;padding:6px 14px;border-radius:14px;font-size:0.85rem;font-weight:bold;white-space:nowrap;display:inline-flex;align-items:center;gap:6px"><i class="fa ' + icone + '"></i> ' + (STATUS_LABEL[status] || status) + "</span>";
}

/* ===== ordem dos passos da linha do tempo (para destacar o atual) ===== */
const STATUS_ORDEM = ["aguardando", "confirmado", "separacao", "enviado", "entregue"];
function statusIndice(status) { return STATUS_ORDEM.indexOf(status); }



/* ============================================
   STATUS 100% MANUAL
   O pedido nasce "aguardando" e so muda quando o
   vendedor clicar em Confirmar / Em separacao /
   Enviado / Entregue no painel. Nada avanca sozinho.
   ============================================ */
