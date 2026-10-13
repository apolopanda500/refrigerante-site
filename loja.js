/* ============================================
   CONFIGURACAO GERAL DA LOJA
   Regioes, dias de atendimento, caminhoes, motorista
   ============================================ */

/* ---------- REGIOES DE ATENDIMENTO ---------- */
/* dias: 1=Seg 2=Ter 3=Qua 4=Qui 5=Sex 6=Sab 0=Dom */
var REGIOES = [
    {
        id: "seropedica",
        nome: "Seropédica",
        dias: [5, 6],
        diasTexto: "Sexta e Sábado",
        horario: "9h às 15h",
        obs: "Atendimento às sextas e sábados. Faça seu pedido até quinta para sexta."
    },
    {
        id: "japeri",
        nome: "Japeri",
        dias: [2, 3, 4, 5, 6],
        diasTexto: "Terça, Quarta, Quinta, Sexta e Sábado",
        horario: "9h às 15h",
        obs: "Cinco dias por semana. Pedidos até quarta para quinta e sexta."
    },
    {
        id: "engenhopedreira",
        nome: "Engenho Pedreira",
        dias: [2, 3, 4, 5, 6],
        diasTexto: "Terça a Sábado",
        horario: "9h às 15h",
        obs: "Terça, quarta, quinta, sexta e sábado."
    },
    {
        id: "paracambi",
        nome: "Paracambi",
        dias: [1],
        diasTexto: "Segunda-feira",
        horario: "9h às 15h",
        obs: "Só na segunda: dia reservado para conferir as contas e receber os pedidos. A entrega começa na terça seguinte."
    }
];

/* ---------- CAMINHOES ---------- */
var CAMINHOES = [
    {
        id: "verde",
        cor: "verde",
        placa: "LKC5610",
        modelo: "Volkswagen Delivery 608",
        corNome: "Verde",
        motorista: "LEANDRO LUCIANO RAMOS",
        telefone: "(21) 965667468",
        whatsapp: "5521965667468",
        regioes: ["seropedica", "japeri"]
    },
    {
        id: "azul",
        cor: "azul",
        placa: "A INFORMAR",
        modelo: "Volkswagen Delivery 608",
        corNome: "Azul",
        motorista: "A INFORMAR",
        telefone: "A INFORMAR",
        whatsapp: "",
        regioes: ["engenhopedreira", "paracambi"]
    }
];

/* ---------- NOMES DOS DIAS ---------- */
var NOMES_DIA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
var NOMES_DIA_LONGOS = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
                        "Quinta-feira", "Sexta-feira", "Sábado"];

/* ---------- REGIAO DE UM DIA ---------- */
function regioesDoDia(diaSemana) {
    return REGIOES.filter(function (r) { return r.dias.indexOf(diaSemana) >= 0; });
}

/* ---------- VERIFICA SE ATENDE HOJE ---------- */
function atendeHoje(regiaoId, diaSemana) {
    for (var i = 0; i < REGIOES.length; i++) {
        if (REGIOES[i].id === regiaoId) return REGIOES[i].dias.indexOf(diaSemana) >= 0;
    }
    return false;
}

/* ---------- PRÓXIMO DIA DE ATENDIMENTO ---------- */
function proximoDia(regiaoId, aPartirDe) {
    var dia = (aPartirDe === undefined) ? new Date().getDay() : aPartirDe;
    for (var i = 0; i < 8; i++) {
        if (atendeHoje(regiaoId, dia)) return dia;
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
