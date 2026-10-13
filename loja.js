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
        obs: "Entregamos sexta e sábado. Faça seu pedido até quinta para sexta."
    },
    {
        id: "japeri",
        nome: "Japeri",
        dias: [2, 3, 4, 5, 6],
        diasTexto: "Terça a Sábado",
        horario: "9h às 15h",
        obs: "Terça, quarta, quinta, sexta e sábado. Pedidos até quarta para quinta e sexta."
    },
    {
        id: "engenhopedreira",
        nome: "Engenho Pedreira",
        dias: [2, 3, 4, 5, 6],
        diasTexto: "Terça a Sábado",
        horario: "9h às 15h",
        obs: "Mesma agenda do Japeri: terça, quarta, quinta, sexta e sábado."
    },
    {
        id: "paracambi",
        nome: "Paracambi",
        dias: [4, 5, 6],
        diasTexto: "Quinta, Sexta e Sábado",
        horario: "9h às 15h",
        obs: "Entregamos quinta, sexta e sábado. Segunda é só para montar pedidos, sem entrega."
    }
];

/* Segunda-feira: dia de montar pedidos, sem entrega */
var DIA_SOMENTE_PEDIDOS = 1;
var TEXTO_SOMENTE_PEDIDOS = "Segunda-feira é o dia de montar os pedidos. A entrega começa na terça.";

/* ---------- CAMINHOES ---------- */
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
