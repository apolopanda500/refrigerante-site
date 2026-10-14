// Convencao - dados
var CT=[
 {id:"2l",nm:"Refrigerantes 2L",ic:"fa-bottle-water"},
 {id:"60",nm:"Refrigerantes 600ml",ic:"fa-glass-water"},
 {id:"35",nm:"Refrigerantes Latas",ic:"fa-mug-hot"},
 {id:"re",nm:"Refrescos e Chinotto",ic:"fa-lemon"},
 {id:"mx",nm:"MSX Energetico",ic:"fa-bolt"},
 {id:"ag",nm:"Agua",ic:"fa-tint"},
 {id:"ch",nm:"Chopp Ravache",ic:"fa-beer-mug-empty"}];
var PD=[];
function addP(c,n,d,p,i){PD.push({ct:c,nm:n,ds:d,pr:p,im:i,key:""})}
// ===== REFRIGERANTES Latas =====
addP("35","Guarana Zero 269ml Pct c12","Zero - Pack 12","R$ 33,40","img/p03.jpg");

// ===== REFRIGERANTES 2L - pacotes c6 =====
addP("2l","Guarana 2L Pct c6","Pack 6 garrafas","R$ 27,00","img/p06.jpg");
addP("2l","Guarana Zero 2L Pct c6","Zero - Pack 6","R$ 27,00","img/p07.jpg");
addP("2l","Frutaina 2L Pct c6","4 sabores - Pack 6","R$ 27,50","img/p04.jpg");
addP("2l","Laranja 2L Pct c6","Pack 6 garrafas","R$ 27,50","img/p08.jpg");
addP("2l","Uva 2L Pct c6","Pack 6 garrafas","R$ 27,50","img/p09.jpg");
addP("2l","Limao 2L Pct c6","Pack 6 garrafas","R$ 27,50","img/p10.jpg");
addP("2l","Abacaxi 2L Pct c6","Pack 6 garrafas","R$ 27,50","img/p11.jpg");
addP("2l","Vitts Limao 2L Pct c6","Pack 6 garrafas","R$ 28,00","img/p27.jpg");
addP("2l","Cola 2L Pct c6","Pack 6 garrafas","R$ 29,00","img/p05.jpg");

// ===== REFRIGERANTES 600ml - pacotes c12 =====
addP("60","Guarana 600ml Pct c12","Pack 12 garrafas","R$ 21,00","img/p12.jpg");
addP("60","Laranja 600ml Pct c12","Pack 12 garrafas","R$ 21,00","img/p13.jpg");
addP("60","Uva 600ml Pct c12","Pack 12 garrafas","R$ 21,00","img/p14.jpg");
addP("60","Abacaxi 600ml Pct c12","Pack 12 garrafas","R$ 21,00","img/p15.jpg");

// ===== REFRIGERANTES 350ml - pacotes c6 =====
addP("35","Cola 350ml Pct c6","Pack 6 latas","R$ 19,00","img/p16.jpg");
addP("35","Guarana 350ml Pct c6","Pack 6 latas","R$ 19,00","img/p17.jpg");
addP("35","Laranja 350ml Pct c6","Pack 6 latas","R$ 19,00","img/p18.jpg");
addP("35","Uva 350ml Pct c6","Pack 6 latas","R$ 19,00","img/p19.jpg");
addP("35","Abacaxi 350ml Pct c6","Pack 6 latas","R$ 19,00","img/p20.jpg");
addP("35","Vitts Limao 350ml Pct c6","Limao - Pack 6","R$ 19,00","img/p26.jpg");

// ===== REFRESCOS E CHINOTTO =====
addP("re","Chinotto 269ml Pct c12","Pack 12 latinhas","R$ 25,00","img/p01.jpg");

// ===== MSX ENERGETICO =====
addP("mx","MSX 269ml Pct c12","Pack 12 latinhas","R$ 25,00","img/p02.jpg");
addP("mx","MSX 2L Pct c6","Pack 6 garrafas","R$ 40,00","img/p21.jpg");

// ===== AGUA =====
addP("ag","Agua 510ml Pct c12","Sem gas - Pack 12","R$ 14,70","img/p22.jpg");
addP("ag","Agua Gas 510ml Pct c12","Com gas - Pack 12","R$ 19,00","img/p23.jpg");
addP("ag","Agua 1500ml Pct c06","Sem gas - Pack 6","R$ 15,80","img/p24.jpg");
addP("ag","Agua Gas 1500ml Pct c06","Com gas - Pack 6","R$ 22,50","img/p25.jpg");

// ===== CHOPP RAVACHE 500ml =====
addP("ch","Chopp IPA 500ml","500ml","R$ 29,50","img/p28.jpg");
addP("ch","Chopp Gold 500ml","500ml","R$ 29,50","img/p30.jpg");
addP("ch","Chopp Pilsen 500ml","500ml","R$ 29,50","img/p31.jpg");
addP("ch","Chopp LEV 500ml","500ml","R$ 29,50","img/p34.jpg");
addP("ch","Chopp Black 500ml","500ml","R$ 34,50","img/p29.jpg");
addP("ch","Chopp Malzbier 500ml","500ml","R$ 33,30","img/p33.jpg");
addP("ch","Chopp Vinho 500ml","500ml","R$ 35,80","img/p32.jpg");

// ===== CHOPP RAVACHE - BARRIS 20L e 30L =====
addP("ch","Chopp LEV Barril 20L","Barril 20L","R$ 170,00","img/p36.jpg");
addP("ch","Chopp LEV Barril 30L","Barril 30L","R$ 260,00","img/p36.jpg");
addP("ch","Chopp Pilsen Barril 20L","Barril 20L","R$ 310,00","img/p36.jpg");
addP("ch","Chopp Pilsen Barril 30L","Barril 30L","R$ 425,00","img/p36.jpg");
addP("ch","Chopp Vinho Barril 20L","Barril 20L","R$ 320,00","img/p35.jpg");
addP("ch","Chopp Vinho Barril 30L","Barril 30L","R$ 440,00","img/p35.jpg");
addP("ch","Chopp Gold Barril 20L","Barril 20L","R$ 330,00","img/p36.jpg");
addP("ch","Chopp Gold Barril 30L","Barril 30L","R$ 455,00","img/p36.jpg");
addP("ch","Chopp APA Barril 20L","Barril 20L","R$ 330,00","img/p36.jpg");
addP("ch","Chopp APA Barril 30L","Barril 30L","R$ 455,00","img/p36.jpg");
addP("ch","Chopp IPA Barril 20L","Barril 20L","R$ 330,00","img/p36.jpg");
addP("ch","Chopp IPA Barril 30L","Barril 30L","R$ 455,00","img/p36.jpg");

/* ============================================
   BANNERS COM COMANDOS REAIS
   ------------------------------------------------------------
   acao: "categoria"  -> abre a lista de produtos
         "carrinho"   -> vai para o carrinho
         "frete"      -> mostra o calculo do frete
         "regiao"     -> escolhe a regiao e o dia
         "tema"       -> alterna o tema do site
         "resumo"     -> abre os meus pedidos
         "cupom"      -> aplica desconto no carrinho
   Troque "titulo", "texto", "cor", "acao" e "alvo" a vontade.
   ============================================ */
var BANNERS = [
    {
        pos:"topo", acao:"frete", alvo:"",
        icone:"fa fa-truck",
        titulo:"Frete grátis acima de R$ 150",
        texto:"Mostre quanto você paga de frete na sua região.",
        cor:"#3d4465", ativo:true
    },
    {
        pos:"topo", acao:"categoria", alvo:"2l",
        icone:"fa fa-box-open",
        titulo:"Refrigerantes 2L - pacote com 6",
        texto:"Do Guaraná à Cola. Clique e veja os preços.",
        cor:"#646c9a", ativo:true
    },
    {
        pos:"topo", acao:"categoria", alvo:"ch",
        icone:"fa fa-beer-mug-empty",
        titulo:"Chopp Ravache 500ml",
        texto:"IPA, Black, Gold, Pilsen, Malzbier, LEV e Vinho.",
        cor:"#1d3f6e", ativo:true
    },
    {
        pos:"meio", acao:"regiao", alvo:"",
        icone:"fa fa-map-marker-alt",
        titulo:"Qual o dia de entrega do seu bairro?",
        texto:"Seropédica, Japeri, Engenho Pedreira e Paracambi.",
        cor:"#1dc9b7", ativo:true
    },
    {
        pos:"meio", acao:"resumo", alvo:"",
        icone:"fa fa-receipt",
        titulo:"Acompanhe seus pedidos",
        texto:"Veja o status, a data e a hora de tudo que você comprou.",
        cor:"#646c9a", ativo:true
    },
    {
        pos:"fim", acao:"carrinho", alvo:"",
        icone:"fa fa-shopping-cart",
        titulo:"Ir para o carrinho",
        texto:"Finalize e receba no seu bairro.",
        cor:"#ffb822", ativo:true
    },
    {
        pos:"fim", acao:"categoria", alvo:"35",
        icone:"fa fa-mug-hot",
        titulo:"Refrigerantes 350ml",
        texto:"Pacotes com 6 latas.",
        cor:"#00752e", ativo:true
    }
];

/* ---------- executa o comando do banner ---------- */
function executarBanner(b){
    if (!b || !b.acao) return;

    if (b.acao === "categoria" && b.alvo) {
        if (typeof fs === "function") fs("");
        goG(b.alvo);
        return;
    }
    if (b.acao === "carrinho") {
        window.location.href = "carrinho.html";
        return;
    }
    if (b.acao === "resumo") {
        window.location.href = "meus-pedidos.html";
        return;
    }
    if (b.acao === "tema") {
        var atual = document.documentElement.getAttribute("data-theme") || "claro";
        var ordem = ["claro", "guara", "chopp", "dark"];
        var prox = ordem[(ordem.indexOf(atual) + 1) % ordem.length];
        try {
            var p = JSON.parse(localStorage.getItem("refrigerantePrefs") || "{}");
            p.cfgTema = prox;
            localStorage.setItem("refrigerantePrefs", JSON.stringify(p));
        } catch (e) {}
        if (typeof aplicarTema === "function") aplicarTema();
        return;
    }
    if (b.acao === "frete") { mostrarInfoFrete(); return; }
    if (b.acao === "regiao") { mostrarInfoRegioes(); return; }
    if (b.acao === "cupom") { aplicarCupom(); return; }
}

/* ---------- informacao do frete (real, calculada) ---------- */
function mostrarInfoFrete(){
    var linhas = "";
    if (typeof REGIOES !== "undefined") {
        REGIOES.forEach(function (r) {
            linhas += '<div class="info-linha"><b>' + r.nome + '</b><span>' + r.diasTexto + '</span></div>';
        });
    }
var t = (typeof horarioDeHoje === "function") ? horarioDeHoje() : null;
    var st = t ? (t.aberto ? '<b style="color:#2e7d32">Aberto agora</b>' : '<b style="color:#c62828">Fechado agora</b>') : "";
    var minimo = (typeof freteGratisMinimo === "function") ? freteGratisMinimo() : 150;
    var menor = (typeof freteMinimo === "function") ? freteMinimo() : 8;
    var maior = 0;
    if (typeof REGIOES !== "undefined") REGIOES.forEach(function (r) { if (typeof r.frete === "number" && r.frete > maior) maior = r.frete; });
    mostrarModal("Frete e entregas",
        '<p><b>Frete grátis</b> em pedidos a partir de <b>' + formatBRL(minimo) + '</b>.</p>'
        + '<p>Antes disso o frete varia por região: de <b>' + formatBRL(menor) + '</b> a <b>' + formatBRL(maior) + '</b>. '
        + 'Você escolhe a região na hora do pedido e o valor aparece antes de confirmar.</p>'
        + '<p><b>Horário:</b> das 09:00 às 15:00, somente nos dias de cada região.</p>'
        + (st ? '<p>Agora: ' + st + '</p>' : '')
        + '<h4>Regiões e dias</h4>' + linhas);
}

/* ---------- informacao das regiões (real) ---------- */
function mostrarInfoRegioes(){
    var hoje = new Date().getDay();
    var linhas = "";
    REGIOES.forEach(function (r) {
        var attendsHoje = r.dias.indexOf(hoje) >= 0;
        var prox = proximoDia(r.id);
        linhas += '<div class="info-linha">'
                + '<b>' + r.nome + (attendsHoje ? ' <em>(hoje)</em>' : '') + '</b>'
                + '<span>' + r.diasTexto + ' &middot; ' + r.horario + '</span>'
                + '<small>' + (attendsHoje ? 'Entrega hoje mesmo' : 'Próxima: ' + NOMES_DIA_LONGOS[prox]) + '</small>'
                + '</div>';
    });
    mostrarModal("Regiões de atendimento", linhas);
}

/* ---------- cupom ---------- */
function aplicarCupom(){
    mostrarModal("Cupom de desconto",
        '<p>Os descontos sao aplicados direto no carrinho ou na hora do pedido.</p>'
        + '<p>Para o seu bairro, fale pelo proprio site: choose a regiao, '
        + 'o sistema calcula o frete e o total final aparece antes de voce confirmar.</p>'
        + '<p><b>Nao precisamos de contato humano:</b> o pedido e confirmado '
        + 'automaticamente aqui no site e voce acompanha o status na hora.</p>');
}

/* ---------- janela de informacao ---------- */
function mostrarModal(titulo, html){
    var m = document.getElementById("modalInfo");
    if (!m) {
        m = document.createElement("div");
        m.id = "modalInfo";
        m.className = "modal-info";
        m.innerHTML = '<div class="mi-caixa">'
            + '<button class="mi-fechar" aria-label="Fechar">&times;</button>'
            + '<h3></h3><div class="mi-corpo"></div></div>';
        document.body.appendChild(m);
        m.addEventListener("click", function (ev) {
            if (ev.target === m || ev.target.classList.contains("mi-fechar")) m.classList.remove("aberto");
        });
    }
    m.querySelector("h3").textContent = titulo;
    m.querySelector(".mi-corpo").innerHTML = html;
    m.classList.add("aberto");
}

/* ---------- desenha os banners ---------- */
function renderBanners(pos){
    var lista = BANNERS.filter(function (b) { return b.pos === pos && b.ativo; });
    if (!lista.length) return "";
    return lista.map(function (b, i) {
        return '<button type="button" class="bnr" data-b="' + pos + '-' + i + '" '
             + 'style="background:' + b.cor + '" '
             + 'onclick="executarBanner(BANNERS[' + BANNERS.indexOf(b) + '])">'
             + '<i class="' + b.icone + ' bnr-ic"></i>'
             + '<span class="bnr-tx"><b>' + b.titulo + '</b><small>' + b.texto + '</small></span>'
             + '<i class="fa fa-chevron-right bnr-go"></i></button>';
    }).join("");
}

function rT(){var h="";for(var i=0;i<CT.length;i++){var c=CT[i],n=0;
for(var j=0;j<PD.length;j++)if(PD[j].ct===c.id)n++;
h+='<button class="ti'+(i===0?' on':'')+'" data-g="'+c.id+'" onclick="goG(\''+c.id+'\')"><i class="fa '+c.ic+'"></i> '+c.nm+' <span class="cn">'+n+'</span></button>'}
var e=document.getElementById("trRow");if(e)e.innerHTML=h}
function rP(){var h="";for(var k=0;k<CT.length;k++){var c=CT[k],ps=[];
for(var j=0;j<PD.length;j++)if(PD[j].ct===c.id)ps.push({o:PD[j],x:j});
if(!ps.length)continue;
h+='<div class="gb op" id="g-'+c.id+'" data-gid="'+c.id+'">';
h+='<div class="gh" onclick="tgG(\''+c.id+'\')"><div class="gl"><i class="fa '+c.ic+' gi"></i><span class="gn">'+c.nm+'</span><span class="gc">'+ps.length+'</span></div><i class="fa fa-chevron-down gv"></i></div>';
h+='<div class="gbd"><div class="pg">';
for(var m=0;m<ps.length;m++){var p=ps[m].o,gid=c.id+"."+ps[m].x;
h+='<div class="pc" data-d="'+(p.nm+" "+p.ds).toLowerCase()+'" data-pid="'+gid+'">';
h+='<div class="pch">'+p.nm+'</div>';
h+='<div class="pib"><img class="pi" src="'+p.im+'" alt="p" loading="lazy" onerror="this.style.display=\'none\'"></div>';
h+='<div class="pdd"><span class="pds">'+p.ds+'</span><span class="pp">'+p.pr+'</span></div>';
 h+='<div class="qr"><div class="qc"><button type="button" class="qb" onclick="mQ(this,-1)">-</button><span class="qv">0</span><button type="button" class="qb" onclick="mQ(this,1)">+</button></div><button class="qa" onclick="aC(this)">Adicionar</button></div></div>'}
h+='</div></div></div>'}
var w=document.getElementById("pwMain");if(w)w.innerHTML=h;
var bt=document.getElementById("bnrTopo");if(bt)bt.innerHTML=renderBanners("topo");
var bf=document.getElementById("bnrFim");if(bf)bf.innerHTML=renderBanners("fim")}
function tgG(id){var e=document.getElementById("g-"+id);if(e)e.classList.toggle("op")}
function goG(id){var e=document.getElementById("g-"+id);if(!e)return;
var t=e.getBoundingClientRect().top+window.pageYOffset-170;
try{window.scrollTo({top:t,behavior:"smooth"})}catch(x){window.scrollTo(0,t)}
var a=document.querySelectorAll(".ti");for(var i=0;i<a.length;i++)a[i].classList.remove("on");
var b=document.querySelector('.ti[data-g="'+id+'"]');
if(b){b.classList.add("on");try{b.scrollIntoView({inline:"center",block:"nearest"})}catch(x){}}}
function fs(t){var s=(t||"").toLowerCase();
var cs=document.querySelectorAll(".pc");for(var i=0;i<cs.length;i++){var c=cs[i];
c.style.display=(!s||(c.getAttribute("data-d")||"").indexOf(s)>=0)?"":"none"}
var gs=document.querySelectorAll(".gb");for(var j=0;j<gs.length;j++){var g=gs[j],ok=false;
var ps=g.querySelectorAll(".pc");for(var k=0;k<ps.length;k++)if(ps[k].style.display!=="none")ok=true;
g.style.display=ok?"":"none";if(s&&ok)g.classList.add("op")}}
function mQ(bt,dl){try{var s=bt.parentNode.querySelector(".qv");s.textContent=Math.max(0,(parseInt(s.textContent)||0)+dl)}catch(e){}}
function uC(){try{var it=JSON.parse(localStorage.getItem("refrigeranteCart")||"[]");var t=0;
for(var i=0;i<it.length;i++)t+=(it[i].qty||0);
var a=document.getElementById("cBag"),b=document.getElementById("fBag");
if(a)a.textContent=t;if(b)b.textContent=t}catch(e){}}
function aC(bt){try{var cd=bt.parentNode.parentNode;var q=parseInt(cd.querySelector(".qv").textContent)||0;
if(q<=0){alert("Use os botões + e - para escolher a quantidade.");return}
var pid=cd.getAttribute("data-pid").split(".");var pr=PD[parseInt(pid[1])];if(!pr)return;
var pv=0;var mm=String(pr.pr).match(/[\d.,]+/);if(mm)pv=parseFloat(mm[0].replace(/\./g,"").replace(",","."));
var ct=JSON.parse(localStorage.getItem("refrigeranteCart")||"[]");
var achou=null;for(var k=0;k<ct.length;k++){if(ct[k].name===pr.nm)achou=ct[k];}
if(achou){achou.qty=(achou.qty||0)+q;}
else{ct.push({name:pr.nm,price:pr.pr,priceNum:Math.round((pv+Number.EPSILON)*100)/100,qty:q,img:pr.im});}
localStorage.setItem("refrigeranteCart",JSON.stringify(ct));
 cd.querySelector(".qv").textContent="0";bt.classList.add("ok");bt.textContent="Adicionado!";
 setTimeout(function(){bt.classList.remove("ok");bt.textContent="Adicionar"},1500);uC()}catch(e){}}
function partilhar(){try{var u=location.href.split("#")[0];
if(navigator.share){navigator.share({title:"Convencao",text:"Confira!",url:u}).catch(function(){})}
else if(navigator.clipboard){navigator.clipboard.writeText(u);alert("Link copiado!")}}catch(e){}}
/* ============================================
   CATALOGO DO SITE OFICIAL (atualizado todo dia)
   O robo .github/scripts/sync-catalogo.js grava
   catalogo.json com os produtos disponiveis. Se o
   arquivo nao carregar (site fora do ar, json
   corrompido), o site continua com a lista fixa
   que esta no topo deste arquivo.
   ============================================ */
function aplicarCatalogoJSON(cat) {
    if (!cat || !cat.produtos || !cat.produtos.length) return false;
    var novos = [];
    cat.produtos.forEach(function (p) {
        if (!p || !p.nm || !p.pr) return;
        novos.push({ ct: p.ct || "2l", nm: p.nm, ds: p.ds || "", pr: String(p.pr), im: p.im || "", key: p.key || "" });
    });
    if (novos.length < 3) return false;

    PD = novos;
    if (cat.grupos && cat.grupos.length) {
        CT = cat.grupos.map(function (g) { return { id: g.id, nm: g.nm, ic: g.ic }; });
    }
    /* ordem das abas na tela */
    var ordem = { "2l": 1, "60": 2, "35": 3, re: 4, mx: 5, ag: 6, ch: 7 };
    PD.sort(function (a, b) { return (ordem[a.ct] === undefined ? 9 : ordem[a.ct]) - (ordem[b.ct] === undefined ? 9 : ordem[b.ct]); });
    try { aplicarPrecosSalvar(); } catch (e) {}
    try { rT(); rP(); uC(); } catch (e) {}
/* os precos editados pelo vendedor (nuvem) tem prioridade sobre o do site oficial */
    if (typeof puxarPrecosNuvem === "function") {
        try {
            puxarPrecosNuvem(function () {
                try { rP(); uC(); } catch (e) {}
                /* o painel do vendedor repinta com os precos atuais */
                try { if (window.painelPrecos && typeof window.painelPrecos.repintar === "function") window.painelPrecos.repintar(); } catch (e) {}
            });
        } catch (e) {}
    }
    /* o editor de precos do painel so pode pintar DEPOIS do catalogo,
       senao ele usa a lista antiga e salva com a chave errada */
try { if (window.painelPrecos && typeof window.painelPrecos.repintar === "function") window.painelPrecos.repintar(); } catch (e) {}
    return true;
}

function carregarCatalogo() {
    if (typeof fetch !== "function") return;
    /* o robo do catalogo reescreve o arquivo todo dia: sempre pede a versao nova */
    fetch("catalogo.json?v=" + Date.now(), { cache: "no-cache" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (cat) { if (cat) aplicarCatalogoJSON(cat); })
        .catch(function () { /* segue com a lista fixa */ });
}

/* ---------- sobe a tela (depois do catalogo) ---------- */
function iniciarPagina() {
    try { rT(); } catch (e) {}
    try { aplicarPrecosSalvar(); } catch (e) {}
    try { rP(); } catch (e) {}
    try { uC(); } catch (e) {}
    var l = document.getElementById("ldBox"); if (l) l.style.display = "none";
    carregarCatalogo();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciarPagina);
else iniciarPagina();
setTimeout(function(){var l=document.getElementById("ldBox");if(l)l.style.display="none"},3000);

/* ============================================
   WIDGETS DA BARRA LATERAL
   ============================================ */
function horaBrasil(){
    // horario de Sao Paulo: UTC-3
    var d = new Date();
    var utc = d.getTime() + d.getTimezoneOffset() * 60000;
    return new Date(utc - 3 * 3600000);
}

/* ============================================
   HORARIOS
   Loja (empresa): 09:00 as 15:00  - monta os pedidos
   Entrega (rua): 06:00 as 18:00  - o freteiro entrega
   O caminhao carrega UM DIA ANTES de sair
   ============================================ */
function horaTexto(hh, mm) {
    return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
}

function pintarHorario() {
    var el = document.getElementById("sideHorario");
    if (!el) return;

    var a2 = (typeof agoraSP === "function") ? agoraSP() : { dia: new Date().getDay(), hh: new Date().getHours(), mm: new Date().getMinutes() };
    var lojaOk = (typeof lojaAberta === "function") ? lojaAberta(a2) : false;
    var entregaOk = (typeof entregaAberta === "function") ? entregaAberta(a2) : false;
    var rs = (typeof regioesDoDia === "function") ? regioesDoDia(a2.dia) : [];
    var soPedidos = (typeof somentePedidos === "function") && somentePedidos(a2.dia);

    /* ---- status da LOJA ---- */
    var statusLoja;
    if (soPedidos) {
        statusLoja = '<div class="wgt-status pedido"><i class="fa fa-clipboard-list"></i> Dia de montar pedidos</div>';
    } else if (lojaOk) {
        statusLoja = '<div class="wgt-status aberto"><i class="fa fa-check-circle"></i> Loja aberta agora</div>';
    } else if (rs.length === 0) {
        statusLoja = '<div class="wgt-status fechado"><i class="fa fa-calendar-times"></i> Loja fechada hoje</div>';
    } else if (a2.hh < HORARIOS.loja.abre) {
        statusLoja = '<div class="wgt-status fechado"><i class="fa fa-clock"></i> Loja abre ' + horaTexto(HORARIOS.loja.abre, 0) + '</div>';
    } else {
        statusLoja = '<div class="wgt-status fechado"><i class="fa fa-clock"></i> Loja fechou às ' + horaTexto(HORARIOS.loja.fecha, 0) + '</div>';
    }

    /* ---- status da ENTREGA ---- */
    var statusEntrega;
    if (soPedidos || rs.length === 0) {
        statusEntrega = '<div class="wgt-status fechado"><i class="fa fa-truck"></i> Sem entrega hoje</div>';
    } else if (entregaOk) {
        statusEntrega = '<div class="wgt-status aberto"><i class="fa fa-truck"></i> Freteiro entregando agora</div>';
    } else if (a2.hh < HORARIOS.entrega.abre) {
        statusEntrega = '<div class="wgt-status pedido"><i class="fa fa-sun"></i> Freteiro sai às ' + horaTexto(HORARIOS.entrega.abre, 0) + '</div>';
    } else {
        statusEntrega = '<div class="wgt-status fechado"><i class="fa fa-moon"></i> Entrega encerrada às ' + horaTexto(HORARIOS.entrega.fecha, 0) + '</div>';
    }

    var hoje = rs.length ? rs.map(function (r) { return r.nome; }).join(", ") : "Nenhuma";
    var prox = (typeof proximoDiaAtendente === "function") ? proximoDiaAtendente() : 2;

    el.innerHTML = '<h3><i class="fa fa-clock"></i> Horários</h3>'
        + '<div class="hr-bloco">'
        + '  <div class="hr-titulo"><i class="fa fa-store"></i> Loja (empresa)</div>'
        + statusLoja
        + '  <div class="wgt-linha"><span>Atende</span><b>' + textoHorario("loja") + '</b></div>'
        + '</div>'
        + '<div class="hr-bloco">'
        + '  <div class="hr-titulo"><i class="fa fa-truck"></i> Entrega nas ruas</div>'
        + statusEntrega
        + '  <div class="wgt-linha"><span>Freteiro sai</span><b>' + horaTexto(HORARIOS.entrega.abre, 0) + '</b></div>'
        + '  <div class="wgt-linha"><span>Entrega até</span><b>' + horaTexto(HORARIOS.entrega.fecha, 0) + '</b></div>'
        + '</div>'
        + '<div class="hr-aviso"><i class="fa fa-box"></i> <span>' + HORARIOS.carga.obs + '</span></div>'
        + '<div class="wgt-linha"><span>Hoje (' + NOMES_DIA_LONGOS[a2.dia] + ')</span><b>' + hoje + '</b></div>'
        + (rs.length ? '' : '<div class="wgt-linha"><span>Próxima entrega</span><b>' + NOMES_DIA_LONGOS[prox] + '</b></div>');
}

/* ============================================
   FAIXA DO TOPO - 100% digital
   ============================================ */
function pintarFaixaRegiao() {
    var el = document.getElementById("faixaRegiao");
    if (!el) return;
    var t = agoraSP();
    var soPedidos = (typeof somentePedidos === "function") && somentePedidos(t.dia);
    var rs = regioesDoDia(t.dia);

    /* REGRA: fora do horario (08:50 as 15:00) os pedidos ficam pausados */
    var regra = (typeof pedidosLiberados === "function") ? pedidosLiberados("") : { liberado: true };
    if (!regra.liberado) {
        el.innerHTML = '<i class="fa fa-pause-circle"></i> <span><b>Pedidos pausados.</b> '
            + regra.texto
            + ' Atendemos <b>' + BAIRROS_ATENDIDOS_TEXTO + '</b>, das <b>08:50</b> às <b>15:00</b>.</span>';
        return;
    }

    if (soPedidos) {
        el.innerHTML = '<i class="fa fa-clipboard-list"></i> <span><b>Segunda é dia de montar pedidos.</b> '
            + 'O caminhão carrega amanhã e a entrega começa na '
            + NOMES_DIA_LONGOS[proximoDiaAtendente()] + ', das '
            + horaTexto(HORARIOS.entrega.abre, 0) + ' às ' + horaTexto(HORARIOS.entrega.fecha, 0) + '.</span>';
    } else if (lojaAberta(t)) {
        el.innerHTML = '<i class="fa fa-truck"></i> <span>Pedidos abertos para <b>'
            + rs.map(function (r) { return r.nome; }).join(", ")
            + '</b>. O caminhão carrega amanhã e o freteiro entrega das '
            + horaTexto(HORARIOS.entrega.abre, 0) + ' às ' + horaTexto(HORARIOS.entrega.fecha, 0) + '.</span>';
    } else if (rs.length === 0) {
        el.innerHTML = '<i class="fa fa-info-circle"></i> <span>Hoje não entregamos. '
            + 'A partir de <b>' + NOMES_DIA_LONGOS[proximoDiaAtendente()] + '</b> os pedidos abrem. '
            + 'Você pode deixar o pedido agendado.</span>';
    } else if (t.hh < HORARIOS.loja.abre) {
        el.innerHTML = '<i class="fa fa-clock"></i> <span>A loja abre às <b>'
            + horaTexto(HORARIOS.loja.abre, 0) + '</b>. Enquanto isso monte o carrinho e agende.</span>';
    } else {
        el.innerHTML = '<i class="fa fa-clock"></i> <span>A loja fecha às <b>'
            + horaTexto(HORARIOS.loja.fecha, 0) + '</b>. Seu pedido de hoje sai na entrega de <b>'
            + NOMES_DIA_LONGOS[proximoDiaAtendente()] + '</b>.</span>';
    }
}

function pintarLateral(){
    // whatsapp em destaque
    var z = document.getElementById("sideZap");
    if (z) {
        z.innerHTML = '<a class="wgt-zap" href="meus-pedidos.html" style="background:var(--primary-color)">'
            + '<i class="fa fa-box"></i>'
            + '<span><b>Meus pedidos</b><small>Acompanhe pelo site</small></span></a>';
    }
    // banners do MEIO na lateral (os do topo ja aparecem no topo da pagina)
    var b = document.getElementById("sideBanners");
    if (b) {
        var meio = renderBanners("meio");
        b.innerHTML = meio ? '<h3><i class="fa fa-bullhorn"></i> Ofertas</h3>' + meio : "";
        b.style.display = meio ? "" : "none";
    }
    pintarHorario();
}

function ligarLateral(){
    pintarLateral();
    setInterval(function(){
        var h = horaBrasil();
        pintarHorario();
    }, 60000);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ligarLateral);
} else { ligarLateral(); }

/* ============================================
   REGIOES, CAMINHOES E CONFIANCA
   ============================================ */
function pintarRegioes(){
    var el = document.getElementById("sideRegioes");
    if (!el) return;
    var d = new Date().getDay();
    var h = "";
    REGIOES.forEach(function(r){
        var atende = r.dias.indexOf(d) >= 0;
        var tag = atende
            ? '<span class="reg-tag hoje"><i class="fa fa-check"></i> Hoje</span>'
            : '<span class="reg-tag fecho">' + (r.diasTexto.length > 14 ? "Fora do dia" : "Fora do dia") + '</span>';
        h += '<div class="reg-linha"><div>'
           + '<div class="reg-nome">' + r.nome + '</div>'
           + '<div class="reg-dias">' + r.diasTexto + ' - ' + r.horario + '</div>'
           + '</div>' + tag + '</div>';
    });
    el.innerHTML = '<h3><i class="fa fa-map-marker-alt"></i> Regiões e dias</h3>' + h;
}

function pintarCaminhoes(){
    var el = document.getElementById("sideCaminhoes");
    if (!el) return;
    var h = "";
    CAMINHOES.forEach(function (c) {
        var foto = c.imagem
            ? '<img class="cam-foto" src="' + c.imagem + '" alt="Caminhao ' + c.corNome + '" loading="lazy">'
              + '<span class="cam-selo">' + c.modeloCurto + '</span>'
            : '';
        var zapMotorista = c.whatsapp
            ? '<a href="https://wa.me/' + c.whatsapp + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none"><i class="fa fa-whatsapp" style="color:#25D366"></i> ' + c.telefone + '</a>'
            : (c.telefone === "A INFORMAR" ? "Telefone a informar" : c.telefone);
        h += '<div class="cam ' + c.cor + (foto ? ' com-foto' : '') + '">'
           + foto
           + '<div class="cam-corpo">'
           + '<span class="cam-cam"><i class="fa fa-truck"></i></span>'
           + '<span class="cam-tx"><b>' + c.corNome + ' - ' + c.modelo + '</b>'
           + '<small>' + (c.motorista === "A INFORMAR" ? "Motorista a informar" : c.motorista) + '</small>'
           + '<small>' + zapMotorista + '</small></span>'
           + '<span class="cam-placa">' + c.placa + '</span>'
           + '</div></div>';
    });
    el.innerHTML = '<h3><i class="fa fa-truck"></i> Nossa frota</h3>' + h;
}

function pintarConfianca(){
    var el = document.getElementById("sideConfianca");
    if (!el) return;
    el.innerHTML = '<h3><i class="fa fa-shield-alt"></i> Compre tranquilo</h3>'
      + '<div class="selo-conf"><i class="fa fa-check-circle"></i> <span>Empresa <b>legalizada</b> com nota fiscal</span></div>'
      + '<div class="selo-conf"><i class="fa fa-check-circle"></i> <span>Entrega feita por <b>caminhões próprios</b> e identificados</span></div>'
      + '<div class="selo-conf"><i class="fa fa-check-circle"></i> <span>Motorista <b>identificado</b> com nome e telefone</span></div>'
      + '<div class="selo-conf"><i class="fa fa-check-circle"></i> <span>Você acompanha o pedido em <b>tempo real</b></span></div>'
      + '<div class="selo-conf"><i class="fa fa-check-circle"></i> <span>Pagamento em <b>Pix ou dinheiro</b></span></div>';
}

function proximoDiaAtendente(){
    for (var i = 1; i <= 7; i++) {
        if (regioesDoDia(i % 7).length > 0) return i % 7;
    }
    return 1;
}

function ligarConfianca(){
    pintarRegioes();
    pintarCaminhoes();
    pintarConfianca();
    pintarFaixaRegiao();
    // reavalia a regra de atendimento a cada minuto (abre 08:50 / fecha 15:00 em ponto)
    setInterval(function(){ pintarFaixaRegiao(); }, 60000);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ligarConfianca);
} else { ligarConfianca(); }

/* ============================================
   CLAREZA: quem somos, como funciona, garantia
   ============================================ */
function pintarSobre(){
    var el = document.getElementById("sideSobre");
    if (!el) return;
    el.innerHTML = '<h3><i class="fa fa-info-circle"></i> Como funciona</h3>'
      + '<div class="selo-conf"><i class="fa fa-1"></i> <span>Voce escolhe os <b>pacotes</b> e o quantidade</span></div>'
      + '<div class="selo-conf"><i class="fa fa-2"></i> <span>Informa <b>nome e WhatsApp</b> (fica salvo)</span></div>'
      + '<div class="selo-conf"><i class="fa fa-3"></i> <span>Escolhe a <b>regiao</b> e o dia da entrega</span></div>'
      + '<div class="selo-conf"><i class="fa fa-4"></i> <span>Confirma o pedido e <b>paga no Pix</b> ou na entrega</span></div>'
      + '<div class="selo-conf"><i class="fa fa-5"></i> <span>Acompanhe ate o <b>caminhao chegar</b></span></div>'
      + '<div class="selo-conf"><i class="fa fa-robot"></i> <span><b>Tudo automatico</b>: seu pedido se confirma sozinho</span></div>'
      + '<div class="selo-conf"><i class="fa fa-bell"></i> <span>Voce recebe o <b>status na hora</b>, sem falar com ninguem</span></div>';
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", pintarSobre);
else pintarSobre();


/* ============================================
   CHAVE DO PRECO
   Usa o codigo do produto no site oficial (p.key),
   que nunca muda. So cai para o nome quando o
   produto nao tem codigo. Assim o preco editado
   pelo vendedor continua valendo mesmo quando o
   robo renomeia/reorganiza o catalogo.
   ============================================ */
function chavePreco(p) {
    if (!p) return "";
    if (p.key) return "k:" + p.key;
    return "n:" + (p.ct || "") + "|" + (p.nm || "");
}
function chavePrecoAntiga(p) {
    return p ? (p.ct || "") + "|" + (p.nm || "") : "";
}

function aplicarPrecosSalvar(){
  try{
    var ov = JSON.parse(localStorage.getItem("productPriceOverrides")||"{}");
    PD.forEach(function(p){
      var k = chavePreco(p);
      if (ov[k] !== undefined) { p.pr = ov[k]; return; }
      /* chave antiga (versoes anteriores do painel) */
      var antiga = chavePrecoAntiga(p);
      if (antiga && ov[antiga] !== undefined) p.pr = ov[antiga];
    });
  }catch(e){}
}

/* ============================================
   PRECOS EM TEMPO REAL
   - local: funciona neste aparelho (padrao)
   - nuvem (opcional): ao configurar a URL nas
     Configuracoes, os precos editados no painel
     aparecem na hora na pagina de todos os clientes
   ============================================ */
function precosURLCfg(){
  try{
    var p = JSON.parse(localStorage.getItem("refrigerantePrefs")||"{}");
    return String(p.cfgPrecosURL||"").trim().replace(/\/+$/,"");
  }catch(e){ return ""; }
}
function precosLocais(){
  try{ return JSON.parse(localStorage.getItem("productPriceOverrides")||"{}"); }
  catch(e){ return {}; }
}

/* ============================================
   ONDE OS PRECOS FICAM NA NUVEM
   - URL terminada em .json = ARQUIVO (so leitura).
     Use se voce publicar o precos.json no Hosting.
   - URL normal = BANCO (Realtime Database):
     le E grava. E o que o painel usa para publicar.
   ============================================ */

/* enderecos tentados sozinhos: nao precisa colar URL nenhuma */
var PRECOS_ENDERECOS = [
  "https://planning-with-ai-9b2c9-default-rtdb.firebaseio.com",
  "https://planning-with-ai-9b2c9.firebaseio.com"
];

function ehArquivoEstatico(url){ return /\.json(\?|$)/i.test(String(url || "")); }
function caminhoPrecos(url){ return ehArquivoEstatico(url) ? url : url + "/precos.json"; }
function listaEnderecos(){
  var out = [], salvo = precosURLCfg();
  if (salvo) out.push(salvo);
  PRECOS_ENDERECOS.forEach(function (u) { if (out.indexOf(u) < 0) out.push(u); });
  return out;
}
function lembrarEndereco(url){
  try{
    var p = JSON.parse(localStorage.getItem("refrigerantePrefs")||"{}");
    p.cfgPrecosURL = url; localStorage.setItem("refrigerantePrefs", JSON.stringify(p));
  }catch(e){}
}

function salvarPrecosLocais(ov){
  try{ localStorage.setItem("productPriceOverrides", JSON.stringify(ov)); }catch(e){}
}
function aplicarPrecosOverride(){
  var ov = precosLocais();
  PD.forEach(function(p){
    var k = chavePreco(p);
    if (ov[k] !== undefined) { p.pr = ov[k]; return; }
    var antiga = chavePrecoAntiga(p);
    if (antiga && ov[antiga] !== undefined) p.pr = ov[antiga];
  });
}

/* cabecalhos das requisicoes (inclui o token do App Check quando existe) */
function cabecalhosPrecos(){
  try {
    if (typeof AppCheck !== "undefined" && AppCheck.temChaves && AppCheck.temChaves()) return AppCheck.cabecalhos();
  }catch(e){}
  return { "Content-Type":"application/json" };
}

/* o App Check e opcional: se o script nao carregou, seguimos sem ele */
function appCheckPronto(){
  try {
    if (typeof AppCheck !== "undefined" && AppCheck.temChaves && AppCheck.temChaves()) AppCheck.iniciar();
  }catch(e){}
}

/* le os precos da nuvem, tentando os enderecos ate um responder */
function puxarPrecosNuvem(cb){
  if (typeof fetch !== "function"){ aplicarPrecosSalvar(); if (cb) cb(false); return; }
  appCheckPronto();
  var lista = listaEnderecos();
  if (!lista.length){ aplicarPrecosSalvar(); if (cb) cb(false); return; }
  var i = 0;
  (function tentar(){
    if (i >= lista.length){ aplicarPrecosSalvar(); if (cb) cb(false); return; }
    var url = lista[i++];
    fetch(caminhoPrecos(url), {cache:"no-store", headers: cabecalhosPrecos()})
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(dados){
        if (!dados || typeof dados !== "object"){ tentar(); return; }
        var ov = precosLocais(), mudou = false;
        for (var k in dados){
          if (typeof dados[k] === "string" && ov[k] !== dados[k]){ ov[k] = dados[k]; mudou = true; }
        }
        salvarPrecosLocais(ov);
        lembrarEndereco(url);
        aplicarPrecosSalvar();
        if (cb) cb(mudou);
      })
      .catch(function(){ tentar(); });
  })();
}

/* grava os precos editados (so banco; arquivo estatico e so leitura) */
function enviarPrecosNuvem(cb){
  if (typeof fetch !== "function"){ if (cb) cb(false, "nuvem nao configurada"); return; }
  var lista = listaEnderecos(), i = 0;
  (function tentar(){
    if (i >= lista.length){ if (cb) cb(false, "nuvem nao configurada"); return; }
    var url = lista[i++];
    if (ehArquivoEstatico(url)){ tentar(); return; }
    fetch(caminhoPrecos(url), {
      method: "PUT",
      headers: cabecalhosPrecos(),
      body: JSON.stringify(precosLocais())
    })
      .then(function(r){ if (!r.ok) throw new Error("erro HTTP " + r.status); })
      .then(function(){ lembrarEndereco(url); if (cb) cb(true, "ok"); })
      .catch(function(){ tentar(); });
  })();
}
/* escuta mudancas na nuvem: o cliente ve o preco novo sem recarregar */
function ouvirPrecosNuvem(){
  var url = precosURLCfg();
  if(!url || typeof EventSource !== "function" || ehArquivoEstatico(url)) return;
  try{
    var es = new EventSource(url + "/precos.json");
    es.addEventListener("put", function(){
      puxarPrecosNuvem(function(mudou){
        if(mudou && typeof rP === "function") rP();
      });
    });
    es.addEventListener("error", function(){ /* reconecta sozinho */ });
  }catch(e){}
}
if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", function(){
    puxarPrecosNuvem(function(mudou){ if(mudou && typeof rP === "function") rP(); });
    ouvirPrecosNuvem();
  });
} else {
  puxarPrecosNuvem(function(mudou){ if(mudou && typeof rP === "function") rP(); });
  ouvirPrecosNuvem();
}
