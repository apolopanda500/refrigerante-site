/* ============================================
   CONFIGURACAO GERAL DA LOJA
   Regioes, dias de atendimento, caminhoes, motorista
   ============================================ */

/* ============================================
   FRETE - FONTE UNICA DA VERDADE
   Usada pelo carrinho, pelo checkout e pelo painel,
   para o valor ser sempre o mesmo em todas as telas.
   ============================================ */

/* pedido minimo para o frete sair de graca (o vendedor pode mudar em Configuracoes) */
function freteGratisMinimo() {
    try {
        var p = JSON.parse(localStorage.getItem("refrigerantePrefs") || "{}");
        var v = parseFloat(p.cfgFreteGratisAcima);
        return (isNaN(v) || v <= 0) ? 150 : v;
    } catch (e) { return 150; }
}

/* menor frete charged entre as regioes (usado nos avisos) */
function freteMinimo() {
    if (typeof REGIOES === "undefined" || !REGIOES.length) return 0;
    var menor = REGIOES[0].frete;
    REGIOES.forEach(function (r) { if (typeof r.frete === "number" && r.frete < menor) menor = r.frete; });
    return typeof menor === "number" ? menor : 0;
}

/* regiao escolhida; se nada estiver marcado, usa a primeira (nunca frete 0 por engano) */
function regiaoDoPedido(regiaoId) {
    if (typeof REGIOES === "undefined" || !REGIOES.length) return null;
    var achada = null;
    REGIOES.forEach(function (r) { if (r.id === regiaoId) achada = r; });
    return achada || REGIOES[0];
}

/* CALCULA o frete: { subtotal, frete, total, gratis, faltaParaGratis, regiao }
   - carrinho vazio nunca paga frete
   - sem regiao valida, cobra a menor regiao (seguro contra frete gratis indevido)
   - acima do minimo: frete 0 (gratis) */
function calcularFrete(subtotal, regiaoId) {
    var reg = regiaoDoPedido(regiaoId);
    var minimo = freteGratisMinimo();
    var base = (reg && typeof reg.frete === "number") ? reg.frete : freteMinimo();
    var sub = arredonda(Number(subtotal) || 0);

    var frete = 0;
    var gratis = false;
    if (sub > 0 && sub >= minimo) { frete = 0; gratis = true; }
    else if (sub > 0) { frete = arredonda(base); }

    return {
        subtotal: sub,
        frete: frete,
        total: arredonda(sub + frete),
        gratis: gratis,
        regiao: reg,
        minimo: minimo,
        faltaParaGratis: (sub > 0 && sub < minimo) ? arredonda(minimo - sub) : 0
    };
}

/* ---------- REGIOES DE ATENDIMENTO ----------
   dias = dias de ENTREGA (0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sab)

   REGRA DO PEDIDO: o pedido pode ser feito em QUALQUER
   dia que antecede uma entrega. Como o pedido é sempre
   UM DIA ANTES da entrega, os dias de pedido de cada
   região são exatamente "o dia anterior de cada dia
   de entrega" (ver diasPedidoDaRegiao).
     - Seropédica entrega sex/sáb  -> pedidos qui e sex
     - Paracambi entrega qui/sex/sáb -> pedidos qua, qui e sex
     - Japeri e Engenho entregam ter-sáb -> pedidos seg a sex  */
var REGIOES = [
    {
        id: "seropedica",
        nome: "Seropédica",
        dias: [5, 6],
        diasTexto: "Sexta e Sábado",
        horario: "6h às 18h",
        frete: 8,
        obs: "Entrega sexta e sábado. Pedido na quinta (para sexta) e na sexta (para sábado)."
    },
    {
        id: "japeri",
        nome: "Japeri",
        dias: [2, 3, 4, 5, 6],
        diasTexto: "Terça a Sábado",
        horario: "6h às 18h",
        frete: 12,
        obs: "Entrega de terça a sábado. Pedido de segunda a sexta, sempre um dia antes da entrega."
    },
    {
        id: "engenhopedreira",
        nome: "Engenho Pedreira",
        dias: [2, 3, 4, 5, 6],
        diasTexto: "Terça a Sábado",
        horario: "6h às 18h",
        frete: 15,
        obs: "Entrega de terça a sábado. Pedido de segunda a sexta, sempre um dia antes da entrega."
    },
    {
        id: "paracambi",
        nome: "Paracambi",
        dias: [4, 5, 6],
        diasTexto: "Quinta, Sexta e Sábado",
        horario: "6h às 18h",
        frete: 20,
        obs: "Entrega quinta, sexta e sábado. Pedido na quarta (para quinta), na quinta (para sexta) e na sexta (para sábado)."
    }
];

/* segunda-feira: dia de montar os pedidos */
var DIA_SOMENTE_PEDIDOS = 1;

/* A LOJA SO FUNCIONA DE SEGUNDA A SEXTA.
   Sábado e domingo: só entrega (sábado) ou nada (domingo). */
var DIAS_LOJA = [1, 2, 3, 4, 5];           /* seg, ter, qua, qui, sex */
var TEXTO_LOJA_FECHADA = "A loja funciona de segunda a sexta. Sábado é só dia de entrega.";

function lojaAbertaNoDia(diaSemana) {
    return DIAS_LOJA.indexOf(diaSemana) >= 0;
}

/* sabado e domingo: dia de entrega, nunca de pedido */
function diaSomenteEntrega(diaSemana) {
    return !lojaAbertaNoDia(diaSemana);
}


/* ============================================
   REGRA DE OURO DO ATENDIMENTO
   1) So aceitamos pedidos dos 4 bairros abaixo
   2) So aceitamos pedidos das 08:50 as 15:00
   ============================================ */
var BAIRROS_ATENDIDOS = ["japeri", "engenho pedreira", "paracambi", "seropedica"];
var BAIRROS_ATENDIDOS_TEXTO = "Japeri, Engenho Pedreira, Paracambi e Seropédica";
var HORA_ABRE_PEDIDOS = 8 * 60 + 50;   // 08:50 (abre 10 minutos antes)
var HORA_FECHA_PEDIDOS = 15 * 60;      // 15:00 em ponto

/* ---------- DINHEIRO ---------- */
/* arredonda: dinheiro SEMPRE com 2 casas (10.10 + 20.20 nao pode dar
   30.299999999999997 e gravar valor errado no pedido).
   fica aqui porque loja.js e a camada base: nao depende de script.js */
if (typeof arredonda !== "function") {
    var arredonda = function (v) {
        var n = parseFloat(v);
        if (isNaN(n) || !isFinite(n)) return 0;
        return Math.round((n + (n >= 0 ? 1e-9 : -1e-9)) * 100) / 100;
    };
}

/* precoNumero: entende "R$ 27,50", "27.5", "2750", 27.5 ...
   (o mesmo cuidado do painel do vendedor, para todo mundo ler igual) */
if (typeof precoNumero !== "function") {
    var precoNumero = function (v) {
        if (typeof v === "number") return isFinite(v) ? v : 0;
        var s = String(v == null ? "" : v).trim().replace(/R\$\s*/i, "").replace(/\s/g, "");
        if (!s) return 0;
        var temPonto = s.indexOf(".") >= 0;
        var temVirgula = s.indexOf(",") >= 0;
        if (temPonto && temVirgula) {
            if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
            else s = s.replace(/,/g, "");
        } else if (temVirgula) {
            s = s.replace(",", ".");
        } else if (temPonto) {
            var partes = s.split(".");
            if (partes.length === 2 && partes[1].length !== 3) { /* mantem o decimal */ }
            else s = s.replace(/\./g, "");
        }
        var n = parseFloat(s);
        return isNaN(n) || n < 0 ? 0 : n;
    };
}

/* precoSaneio: protege contra o erro de digito classico (27,50 <-> 275,00).
   Se o preco salvo for exatamente 10x ou 1/10 do preco do catalogo,
   ele e descartado e vale o preco do catalogo. */
if (typeof precoSaneio !== "function") {
    var precoSaneio = function (salvo, doCatalogo) {
        var s = precoNumero(salvo);
        var c = precoNumero(doCatalogo);
        if (s <= 0) return c;
        if (c > 0) {
            if (Math.abs(s - c * 10) < 0.005) return c;     // 27,50 gravado como 275,00
            if (Math.abs(s * 10 - c) < 0.005) return c;     // 275,00 gravado como 27,50
        }
        return s;
    };
}

/* ---------- DINHEIRO ---------- */
/* precoTexto: o UNICO jeito de mostrar preco na tela.
   Aceita numero (27.5) ou texto ("R$ 27,50") e devolve
   sempre "R$ 27,50" - nunca "27.5" nem "27,5". */
if (typeof precoTexto !== "function") {
    var precoTexto = function (v) {
        var n = precoNumero(v);
        return "R$ " + n.toFixed(2).replace(".", ",");
    };
}
/* sem o "R$ ", so o numero com centavos: "27,00" */
if (typeof precoNumeroBR !== "function") {
    var precoNumeroBR = function (v) {
        return precoNumero(v).toFixed(2).replace(".", ",");
    };
}

/* formatBRL: converte 27.5 -> "R$ 27,50" (NaN/null viram R$ 0,00)
   fica aqui porque a home NAO carrega o script.js */
if (typeof formatBRL !== "function") {
    var formatBRL = function (n) {
        var v = parseFloat(n);
        if (isNaN(v) || !isFinite(v)) return "R$ 0,00";
        return "R$ " + v.toFixed(2).replace(".", ",");
    };
}

function semAcento(t) {
    return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
function bairroAtendido(bairro) {
    var b = semAcento(bairro);
    if (!b || b.length < 3) return false;
    for (var i = 0; i < BAIRROS_ATENDIDOS.length; i++) {
        var alvo = BAIRROS_ATENDIDOS[i];
        if (b === alvo) return true;
        if (b.indexOf(alvo) >= 0) return true;
        if (alvo.indexOf(b) >= 0 && b.length >= 5) return true;
    }
    return false;
}
/* devolve {liberado, motivo} - motivo: horario | ok
   ATENCAO: bairro vazio NAO pode travar o pedido (o campo
   so e preenchido no perfil). Quem decide a area de entrega
   e a regiao escolhida no checkout.
   agora: opcional, {dia, minutos}. Sem isso usa o relogio de SP.
   (os testes passam o horario para nao depender da hora do dia) */
function pedidosLiberados(bairro, agora) {
    var a = agora || ((typeof agoraSP === "function") ? agoraSP() : { dia: new Date().getDay(), minutos: new Date().getHours() * 60 + new Date().getMinutes() });
    var m = a.minutos;

    /* a loja nao abre sabado nem domingo */
    if (typeof lojaAbertaNoDia === "function" && !lojaAbertaNoDia(a.dia)) {
        return { liberado: false, motivo: "fechado", texto: TEXTO_LOJA_FECHADA };
    }
    if (m < HORA_ABRE_PEDIDOS) {
        return { liberado: false, motivo: "horario", texto: "Os pedidos abrem às 08:50. Agora ainda não estão sendo recebidos." };
    }
    if (m >= HORA_FECHA_PEDIDOS) {
        return { liberado: false, motivo: "horario", texto: "Os pedidos de hoje encerraram às 15:00. Voltamos amanhã às 08:50." };
    }
    return { liberado: true, motivo: "ok", texto: "" };
}

/* bairro digitado esta FORA da area de entrega? (o checkout BLOQUEIA o envio) */
function bairroForaDaArea(bairro) {
    var b = String(bairro || "").trim();
    if (!b) return false;
    return !bairroAtendido(b);
}

/* qual regiao atende um bairro? (id da regiao ou "")
   compara normalizado: nome exato, contido no bairro ou bairro na regiao */
function regiaoDoBairro(bairro) {
    var b = semAcento(String(bairro || "").trim().toLowerCase());
    if (!b) return "";
    for (var i = 0; i < REGIOES.length; i++) {
        var r = REGIOES[i];
        var id = semAcento(String(r.id || "").toLowerCase());
        var nome = semAcento(String(r.nome || "").toLowerCase());
        if (!nome) continue;
        if (b === nome || b === id) return r.id;
        if (b.indexOf(nome) >= 0 || (nome.length >= 4 && id && b.indexOf(id) >= 0)) return r.id;
        if (nome.indexOf(b) >= 0 && b.length >= 4) return r.id;
    }
    return "";
}

/* ---------- HORARIOS: EMPRESA e ENTREGA sao diferentes ---------- */
/* A LOJA abre para montar pedidos. O CAMINHAO entrega em outro horario. */
var HORARIOS = {
    loja: {
        abre: 9,          // 09:00
        fecha: 15,        // 15:00
        rotulo: "Loja / Empresa",
        obs: "Horario em que a loja monta e organiza os pedidos."
    },
entrega: {
        abre: 6,          // 06:00 - o freteiro sai as 6h
        fecha: 18,        // 18:00 - entrega ate as 18h
        rotulo: "Entrega nas ruas",
        obs: "A entrega nas ruas vai das 06:00 às 18:00."
    },
    carga: {
        antecedencia: 1,  // o caminhao carrega UM DIA ANTES de sair
        rotulo: "Carga",
        obs: "O caminhao carrega um dia antes para sair na entrega."
    }
};

/* ---------- agora em horario de SAO PAULO ---------- */
function agoraSP() {
    var d = new Date();
    var utc = d.getTime() + d.getTimezoneOffset() * 60000;
    var h = new Date(utc - 3 * 3600000);
    return {
        dia: h.getDay(),
        hh: h.getHours(),
        mm: h.getMinutes(),
        minutos: h.getHours() * 60 + h.getMinutes()
    };
}

/* ---------- a LOJA esta aberta agora? ---------- */
function lojaAberta(agora) {
    var a = agora || agoraSP();
    /* a loja so funciona de segunda a sexta */
    if (typeof lojaAbertaNoDia === "function" && !lojaAbertaNoDia(a.dia)) return false;
    if (typeof somentePedidos === "function" && somentePedidos(a.dia)) return false;
    if (regioesDoDia(a.dia).length === 0) return false;
    var L = HORARIOS.loja;
    return a.minutos >= L.abre * 60 && a.minutos < L.fecha * 60;
}

/* ---------- a ENTREGA esta acontecendo agora? ---------- */
function entregaAberta(agora) {
    var a = agora || agoraSP();
    if (typeof somentePedidos === "function" && somentePedidos(a.dia)) return false;
    if (regioesDoDia(a.dia).length === 0) return false;
    var E = HORARIOS.entrega;
    return a.minutos >= E.abre * 60 && a.minutos < E.fecha * 60;
}

/* ---------- texto "das 6h as 18h" ---------- */
function textoHorario(qual) {
    var h = HORARIOS[qual];
    return "das " + h.abre + "h às " + h.fecha + "h";
}

/* ============================================
   PROXIMO DIA DE ENTREGA
   O caminhao carrega UM DIA ANTES, entao um pedido
   feito hoje so pode sair na entrega de AMANHA
   ou depois, e so se for dia de entrega da regiao.
   ============================================ */
function proximoDiaEntrega(regiaoId, hoje) {
    var dia = (hoje === undefined) ? agoraSP().dia : hoje;
    var salto = HORARIOS.carga.antecedencia;   // 1 dia de antecedencia
    for (var i = 1; i <= 14; i++) {
        var cand = (dia + salto + i - 1 + 14) % 7;
        if (atendeHoje(regiaoId, cand)) return cand;
    }
    return -1;
}

/* dia em que o caminhao carrega esse pedido */
function diaDaCarga(regiaoId, hoje) {
    var entrega = proximoDiaEntrega(regiaoId, hoje);
    if (entrega === -1) return -1;
    return (entrega - HORARIOS.carga.antecedencia + 7) % 7;
}

/* ---------- resumo completo para o cliente ---------- */
function resumoEntrega(regiaoId) {
    var a = agoraSP();
    var reg = null;
    REGIOES.forEach(function (r) { if (r.id === regiaoId) reg = r; });
    if (!reg) return null;

    var prox = proximoDiaEntrega(regiaoId, a.dia);
    var carga = diaDaCarga(regiaoId, a.dia);

    return {
        regiao: reg,
        entregaEm: prox,
        entregaEmNome: prox === -1 ? "—" : NOMES_DIA_LONGOS[prox],
        cargaEm: carga,
        cargaEmNome: carga === -1 ? "—" : NOMES_DIA_LONGOS[carga],
        janelaEntrega: textoHorario("entrega"),
        horarioLoja: textoHorario("loja"),
        atendendoHoje: reg.dias.indexOf(a.dia) >= 0
    };
}

/* ===== override de dias de entrega (config do vendedor) ===== */
try {
    var _ov = JSON.parse(localStorage.getItem("convencaoRegioesDias") || "{}");
    REGIOES.forEach(function(r){ if(_ov[r.id]) r.dias = _ov[r.id]; });
} catch(e){}

var CAMINHOES = [
    {
        id: "verde",
        cor: "verde",
        placa: "LKC5610",
        modelo: "Mercedes-Benz L-608 D",
        modeloCurto: "L-608 D",
        corNome: "Verde",
        motorista: "LEANDRO LUCIANO RAMOS",
        telefone: "(21) 965667468",
        whatsapp: "5521965667468",
        imagem: "img/608VERDE.jpg",
        regioes: ["seropedica", "japeri", "engenhopedreira"]
    },
    {
        id: "azul",
        cor: "azul",
        placa: "A INFORMAR",
        modelo: "Mercedes-Benz L-608 E",
        modeloCurto: "L-608 E",
        corNome: "Azul",
        motorista: "A INFORMAR",
        telefone: "A INFORMAR",
        whatsapp: "",
        imagem: "img/608AZUL.jpeg",
        regioes: ["paracambi"]
    }
];

/* ---------- NOMES DOS DIAS ---------- */
var NOMES_DIA_LONGOS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
                        "Quinta-feira", "Sexta-feira", "Sábado"];

/* ---------- REGIAO: DIA DE PEDIDO (um dia antes da entrega) ----------
   O pedido pode ser feito em QUALQUER dia que antecede uma
   entrega. Exemplo:
     - Seropedica entrega sex/sab  -> pedidos qui e sex
     - Paracambi entrega qui/sex/sab -> pedidos qua, qui e sex
     - Japeri entrega ter-sab -> pedidos seg a sex          */
function regiaoPorId(regiaoId) {
    if (typeof REGIOES === "undefined") return null;
    var achada = null;
    REGIOES.forEach(function (r) { if (r.id === regiaoId) achada = r; });
    return achada;
}

/* dias em que os pedidos desta regiao abrem (dia anterior de cada entrega) */
function diasPedidoDaRegiao(regiao) {
    if (!regiao || !regiao.dias || !regiao.dias.length) return [];
    var vistos = {};
    var lista = [];
    regiao.dias.forEach(function (d) {
        var anterior = (d + 6) % 7;           /* um dia antes */
        if (!vistos[anterior]) { vistos[anterior] = true; lista.push(anterior); }
    });
    lista.sort(function (a, b) { return a - b; });
    return lista;
}

/* o primeiro dia de pedido (so para rotulos) */
function diaPedidoDaRegiao(regiao) {
    var d = diasPedidoDaRegiao(regiao);
    return d.length ? d[0] : -1;
}

/* os pedidos desta regiao abrem hoje? */
function pedidoAbreHoje(regiao) {
    return diasPedidoDaRegiao(regiao).indexOf(diaDeHoje()) >= 0;
}

/* dia da semana de Sao Paulo (0=Dom ... 6=Sab) */
function diaDeHoje() {
    if (typeof agoraSP === "function") return agoraSP().dia;
    return new Date().getDay();
}

/* nome curto dos dias: "qui", "sex" */

/* "quinta e sexta" / "quarta, quinta e sexta" */
function textoDiasPedido(regiao) {
    var ds = diasPedidoDaRegiao(regiao);
    if (!ds.length) return "-";
    var nomes = ds.map(function (d) {
        return (typeof NOMES_DIA_LONGOS !== "undefined") ? NOMES_DIA_LONGOS[d].toLowerCase() : String(d);
    });
    if (nomes.length === 1) return nomes[0];
    if (nomes.length === 2) return nomes[0] + " e " + nomes[1];
    return nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1];
}

/* texto pronto: "Pedidos na quinta e sexta · entrega sexta e sábado" */
function textoAgendaRegiao(regiao) {
    if (!regiao) return "";
    return "Pedido " + textoDiasPedido(regiao) + " · entrega " + regiao.diasTexto.toLowerCase();
}

/* ---------- REGIAO: DIA DE ENTREGA ---------- */
function regioesDoDia(diaSemana) {
    if (diaSemana === DIA_SOMENTE_PEDIDOS) return [];
    return REGIOES.filter(function (r) { return r.dias.indexOf(diaSemana) >= 0; });
}

/* regioes cujos pedidos abrem hoje */
function regioesPedidoHoje(diaSemana) {
    if (typeof diaSemana === "undefined") diaSemana = diaDeHoje();
    return REGIOES.filter(function (r) { return diasPedidoDaRegiao(r).indexOf(diaSemana) >= 0; });
}

/* ---------- VERIFICA SE ATENDE HOJE ---------- */
function atendeHoje(regiaoId, diaSemana) {
    if (diaSemana === DIA_SOMENTE_PEDIDOS) return false;
    for (var i = 0; i < REGIOES.length; i++) {
        if (REGIOES[i].id === regiaoId) return REGIOES[i].dias.indexOf(diaSemana) >= 0;
    }
    return false;
}

/* ---------- SEGUNDA E DIA DE PEDIDOS? ---------- */
function somentePedidos(diaSemana) {
    return diaSemana === DIA_SOMENTE_PEDIDOS;
}

/* ---------- PRÓXIMO DIA DE ATENDIMENTO ---------- */
function proximoDia(regiaoId, aPartirDe) {
    var dia = (aPartirDe === undefined) ? new Date().getDay() : aPartirDe;
    for (var i = 0; i < 8; i++) {
        if (dia !== DIA_SOMENTE_PEDIDOS && atendeHoje(regiaoId, dia)) return dia;
        dia = (dia + 1) % 7;
    }
    return -1;
}

/* ---------- CAMINHO QUE ATENDE A REGIAO ---------- */
function caminhaoDaRegiao(regiaoId) {
    for (var i = 0; i < CAMINHOES.length; i++) {
        if (CAMINHOES[i].regioes.indexOf(regiaoId) >= 0) return CAMINHOES[i];
    }
    return CAMINHOES[0];
}
