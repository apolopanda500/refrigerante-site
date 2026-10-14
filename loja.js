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

/* ---------- REGIOES DE ATENDIMENTO ---------- */
/* dias: 0=Dom 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sab */
/* Segunda-feira NAO tem entrega: e o dia de montar os pedidos. */
var REGIOES = [
    {
        id: "seropedica",
        nome: "Seropédica",
        dias: [5, 6],
        diasTexto: "Sexta e Sábado",
        horario: "9h às 15h",
        frete: 8,
        obs: "Entregamos sexta e sábado. Faça seu pedido até quinta para sexta."
    },
    {
        id: "japeri",
        nome: "Japeri",
        dias: [2, 3, 4, 5, 6],
        diasTexto: "Terça a Sábado",
        horario: "9h às 15h",
        frete: 12,
        obs: "Terça, quarta, quinta, sexta e sábado. Pedidos até quarta para quinta e sexta."
    },
    {
        id: "engenhopedreira",
        nome: "Engenho Pedreira",
        dias: [2, 3, 4, 5, 6],
        diasTexto: "Terça a Sábado",
        horario: "9h às 15h",
        frete: 15,
        obs: "Mesma agenda do Japeri: terça, quarta, quinta, sexta e sábado."
    },
    {
        id: "paracambi",
        nome: "Paracambi",
        dias: [4, 5, 6],
        diasTexto: "Quinta, Sexta e Sábado",
        horario: "9h às 15h",
        frete: 20,
        obs: "Entregamos quinta, sexta e sábado. Segunda é só para montar pedidos, sem entrega."
    }
];

/* Segunda-feira: dia de montar pedidos, sem entrega */
var DIA_SOMENTE_PEDIDOS = 1;
var TEXTO_SOMENTE_PEDIDOS = "Segunda-feira é o dia de montar os pedidos. A entrega começa na terça.";

var OBS_CARGA = "O caminhão carrega um dia antes para sair na entrega.";

/* ============================================
   REGRA DE OURO DO ATENDIMENTO
   1) So aceitamos pedidos dos 4 bairros abaixo
   2) So aceitamos pedidos das 08:50 as 15:00
   ============================================ */
var BAIRROS_ATENDIDOS = ["japeri", "engenho pedreira", "paracambi", "seropedica"];
var BAIRROS_ATENDIDOS_TEXTO = "Japeri, Engenho Pedreira, Paracambi e Seropédica";
var HORA_ABRE_PEDIDOS = 8 * 60 + 50;   // 08:50 (abre 10 minutos antes)
var HORA_FECHA_PEDIDOS = 15 * 60;      // 15:00 em ponto

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
   e a regiao escolhida no checkout. */
function pedidosLiberados(bairro) {
    var a = (typeof agoraSP === "function") ? agoraSP() : { minutos: new Date().getHours() * 60 + new Date().getMinutes() };
    var m = a.minutos;
    if (m < HORA_ABRE_PEDIDOS) {
        return { liberado: false, motivo: "horario", texto: "Os pedidos abrem às 08:50. Agora ainda não estão sendo recebidos." };
    }
    if (m >= HORA_FECHA_PEDIDOS) {
        return { liberado: false, motivo: "horario", texto: "Os pedidos de hoje encerraram às 15:00. Voltamos amanhã às 08:50." };
    }
    return { liberado: true, motivo: "ok", texto: "" };
}

/* bairro digitado esta FORA da area de entrega? (aviso, nao trava o pedido) */
function bairroForaDaArea(bairro) {
    var b = String(bairro || "").trim();
    if (!b) return false;
    return !bairroAtendido(b);
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
        obs: "O freteiro sai a partir das 06:00 e entrega ate as 18:00."
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
        imagem: "",
        regioes: ["paracambi"]
    }
];

/* ---------- NOMES DOS DIAS ---------- */
var NOMES_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
var NOMES_DIA_LONGOS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
                        "Quinta-feira", "Sexta-feira", "Sábado"];

/* ---------- REGIAO DE UM DIA ---------- */
function regioesDoDia(diaSemana) {
    if (diaSemana === DIA_SOMENTE_PEDIDOS) return [];
    return REGIOES.filter(function (r) { return r.dias.indexOf(diaSemana) >= 0; });
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
