// ============================================
//  Refrigerantes Conven��o - Carrinho & Pedidos
// ============================================

const MENTOR_WHATSAPP = "5521983158911"; // (21) 9-8315-8911
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
function formatBRL(n) {
    var v = parseFloat(n);
    if (isNaN(v) || !isFinite(v)) return "R$ 0,00";
    return "R$ " + v.toFixed(2).replace(".", ",");
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

// getCart: l� localStorage e normaliza itens (trata dados legados / campos ausentes)
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
    try { localStorage.setItem("refrigeranteCart", JSON.stringify(cart)); } catch(e) {}
}
function calcSubtotal() {
    return somaCentavos(cart, "priceNum", "qty");
}
function calcTotalItens() {
    return cart.reduce((t, i) => t + (typeof i.qty === 'number' ? i.qty : 0), 0);
}

// ---------- Inicializa��o ----------
document.addEventListener("DOMContentLoaded", () => {
    cart = getCart();
    updateCartCount();

    // Anima��o suave ao rolar (apenas no cat�logo)
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

// ---------- Cat�logo: quantidade e adicionar ----------
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
        alert("Use os bot�es + e - para escolher a quantidade.");
        return;
    }

    const priceNum = parsePreco(priceStr);
    if (isNaN(priceNum) || priceNum <= 0) {
        alert("Erro ao ler o pre�o do produto. Tente novamente.");
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
        alert("Seu carrinho est� vazio! Adicione produtos com os bot�es + e -.");
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
        title: "Refrigerantes Conven��o - Delivery Online",
        text: "Confira nosso cat�logo de refrigerantes, refrescos, �guas e chopp! Pe�a pelo WhatsApp.",
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
const ADMIN_SENHA = "admin123";

const STATUS_LABEL = {
    aguardando: "Aguardando confirmação",
    confirmado: "Confirmado",
    separacao: "Em separa��o",
    enviado: "Saiu para entrega",
    entregue: "Entregue",
    cancelado: "Cancelado"
};

function getPedidos() {
    const s = localStorage.getItem(PEDIDOS_KEY);
    return s ? JSON.parse(s) : [];
}
function savePedidos(p) {
    localStorage.setItem(PEDIDOS_KEY, JSON.stringify(p));
}
function gerarId() {
    const d = new Date();
    const n = getPedidos().length + 1;
    return "CV" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-" + String(n).padStart(3, "0");
}
function criarPedido(dados) {
    const pedidos = getPedidos();
    const pedido = {
        id: gerarId(),
        nome: dados.nome, tel: dados.tel, end: dados.end, bairro: dados.bairro, comp: dados.comp,
        regiao: dados.regiao, frete: dados.frete, pagamento: dados.pagamento, troco: dados.troco,
        itens: dados.itens, subtotal: dados.subtotal, total: dados.total,
        status: "aguardando", criadoEm: Date.now(),
        historico: [{ status: "aguardando", quando: Date.now() }]
    };
    pedidos.unshift(pedido);
    savePedidos(pedidos);
    return pedido;
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
        savePedidos(pedidos);
    }
    return p;
}
function dataHora(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function statusBadge(status) {
    const cores = {
        aguardando: "#FF9800", confirmado: "#2e7d32", separacao: "#9C27B0",
        enviado: "#00BCD4", entregue: "#4CAF50", cancelado: "#f44336"
    };
    const cor = cores[status] || "#777";
    return '<span style="background:' + cor + ';color:#fff;padding:4px 12px;border-radius:14px;font-size:0.8rem;font-weight:bold;white-space:nowrap">' + (STATUS_LABEL[status] || status) + "</span>";
}



/* ============================================
   PEDIDO 100% DIGITAL - sem contato humano
   O pedido e confirmado e avanzado sozinho
   ============================================ */
var STATUS_AUTOMATICO = {
    aguardando: { rotulo:"Aguardando confirmação", proximo:"confirmado", minutos:1 },
    confirmado: { rotulo:"Confirmado",            proximo:"separacao",   minutos:1 },
    separacao:  { rotulo:"Em separacao",          proximo:"enviado",     minutos:1 },
    enviado:    { rotulo:"Saiu para entrega",     proximo:"entregue",    minutos:2 }
};

function horarioAberto(){
    if (typeof HORA_ABERTURA === "undefined") return true;
    if (typeof horarioDeHoje === "function") return horarioDeHoje().aberto;
    var h = new Date();
    return h.getHours() >= HORA_ABERTURA && h.getHours() < HORA_FECHAMENTO;
}

/* avanca o status de um pedido a cada X minutos, sem ninguem tocar */
function agendarAvanco(pedido){
    var regra = STATUS_AUTOMATICO[pedido.status];
    if (!regra) return;
    setTimeout(function () {
        var pedidos = getPedidos();
        var p = pedidos.find(function (x) { return x.id === pedido.id; });
        if (!p || p.status !== pedido.status) return;   // ja mudou na mao
        if (!p.digital) return;                           // nao mexe em pedido feito no admin
        p.status = regra.proximo;
        p.historico.push({ status: regra.proximo, quando: Date.now() });
        savePedidos(pedidos);
        agendarAvanco(p);
    }, regra.minutos * 60000);
}

function iniciarAutomacao(){
    // pedidos feitos pelo site comecam a andar sozinhos
    getPedidos().forEach(function (p) {
        if (p.digital && STATUS_AUTOMATICO[p.status]) agendarAvanco(p);
    });
    if (typeof setInterval === "function") {
        setInterval(function () {
            if (!horarioAberto()) return;
            document.dispatchEvent(new CustomEvent("atualizaPedidos"));
        }, 30000);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarAutomacao);
} else { iniciarAutomacao(); }
