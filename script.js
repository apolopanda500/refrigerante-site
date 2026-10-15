// ============================================
//  Refrigerantes Convenção - Carrinho & Pedidos
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
    try { localStorage.setItem("refrigeranteCart", JSON.stringify(cart)); } catch(e) {}
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
const ADMIN_SENHA = "Flamengo903@";
// acesso do vendedor (painel admin.html)
const VENDEDOR_USUARIO = "apolopanda500";
const VENDEDOR_SENHA = "Flamengo903@";

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
    aguardando: "Aguardando confirmação",
    confirmado: "Confirmado",
    separacao: "Em separação",
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
            [ { text: "Confirmar", callback_data: "st|" + id + "|confirmado" },
              { text: "Em separacao", callback_data: "st|" + id + "|separacao" } ],
            [ { text: "Enviado", callback_data: "st|" + id + "|enviado" },
              { text: "Entregue", callback_data: "st|" + id + "|entregue" } ],
            [ { text: "Cancelar", callback_data: "st|" + id + "|cancelado" } ]
        ]
    };
}

function notificarTelegramPedido(p) {
    var prefs = {};
    try { prefs = JSON.parse(localStorage.getItem("refrigerantePrefs") || "{}"); } catch(e) {}
    if (prefs.cfgAvisoPedido === false) return;          // desligado (opcao oculta)
    var token = prefs.cfgTelegramToken || "8673434736:AAEit4J3TMwdWsPfP0qZ_hvUbQrmhLKKiAU";
    var chat  = prefs.cfgTelegramChatId || "1810807613";  // chat do vendedor (@Rickcao22)
    if (!token || !chat) return;

    var msg = mensagemPedidoTG(p) + "\n\nToque nos botoes abaixo ou digite /confirmar " + p.id;

    var url = "https://api.telegram.org/bot" + token + "/sendMessage"
            + "?chat_id=" + encodeURIComponent(chat)
            + "&text=" + encodeURIComponent(msg)
            + "&disable_web_page_preview=true"
            + "&reply_markup=" + encodeURIComponent(JSON.stringify(tecladoPedidoTG(p.id)));
    try { fetch(url, { mode: "no-cors" }).catch(function(){}); } catch(e) {}
}

/* aviso simples de texto para o vendedor (usado pela ajuda do site).
   A ajuda chamava notificarTelegram(), que nao existia: o aviso nunca saia. */
function notificarTelegram(texto) {
    var prefs = {};
    try { prefs = JSON.parse(localStorage.getItem("refrigerantePrefs") || "{}"); } catch(e) {}
    var token = prefs.cfgTelegramToken || "8673434736:AAEit4J3TMwdWsPfP0qZ_hvUbQrmhLKKiAU";
    var chat  = prefs.cfgTelegramChatId  || "1810807613";   // chat do vendedor (@Rickcao22)
    if (!token || !chat || !texto) return;
    var url = "https://api.telegram.org/bot" + token + "/sendMessage"
            + "?chat_id=" + encodeURIComponent(chat)
            + "&text=" + encodeURIComponent(texto)
            + "&disable_web_page_preview=true";
    try { fetch(url, { mode: "no-cors" }).catch(function(){}); } catch(e) {}
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
   STATUS 100% MANUAL
   O pedido nasce "aguardando" e so muda quando o
   vendedor clicar em Confirmar / Em separacao /
   Enviado / Entregue no painel. Nada avanca sozinho.
   ============================================ */
