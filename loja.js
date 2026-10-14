/* ============================================
   CONFIGURACAO GERAL DA LOJA
   Regioes, dias de atendimento, caminhoes, motorista
   ============================================ */

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
