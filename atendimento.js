/* ============================================
   ATENDIMENTO AUTOMATICO
   O cliente pergunta e a resposta sai na hora.
   Se a duvida for de pessoa (vendedor ou motorista),
   o botao abre o WhatsApp certo e o vendedor recebe
   aviso no Telegram. Ninguem fica sem resposta.
   ============================================ */
var Atendimento = (function () {

    var ZAP_VENDEDOR = "5521983158911";         // (21) 9-8315-8911
    var MOTORISTAS = (typeof CAMINHOES !== "undefined") ? CAMINHOES : [];

    /* respostas automaticas (digita a duvida, ele acha a resposta) */
    var PERGUNTAS = [
        { chaves: ["horario", "hora", "abre", "fecha", "abrem", "funciona"], resposta: "Atendemos das <b>08:50 às 15:00</b>, de segunda a sexta. Depois das 15h os pedidos do dia ficam pausados e voltam amanhã às 08:50." },
        { chaves: ["frete", "entrega", "taxa", "valor da entrega"], resposta: "O frete é <b>grátis</b> em pedidos a partir de <b>R$ 150,00</b>. Antes disso varia por região: Seropédica R$ 8, Japeri R$ 12, Engenho Pedreira R$ 15 e Paracambi R$ 20." },
        { chaves: ["prazo", "quando", "demora", "quanto tempo", "chega"], resposta: "A entrega é feita pelo nosso caminhão nos dias da sua região. Depois de confirmar, seu pedido entra na fila do dia e você acompanha o status em <b>Meus Pedidos</b>." },
        { chaves: ["pagamento", "pagar", "pix", "dinheiro", "cartao", "cartão", "paguei"], resposta: "Você paga por <b>Pix</b> ou <b>Dinheiro na entrega</b>. A cobrança aparece na hora de finalizar o pedido, com o valor exato." },
        { chaves: ["pedido", "fiz", "enviei", "confirmado", "status", "andamento"], resposta: "Você acompanha tudo em <b>Meus Pedidos</b>: status, horário e histórico do pedido. Se precisar, chame o vendedor por aqui." },
        { chaves: ["endereco", "rua", "bairro", "cep", "morada", "entregar onde"], resposta: "A entrega é feita nos bairros de <b>Japeri, Engenho Pedreira, Paracambi e Seropédica</b>. O endereço vem do seu Perfil e você pode trocar a qualquer momento." },
        { chaves: ["estoque", "acabou", "tem", "disponivel", "disponível", "falta"], resposta: "O catálogo da loja é atualizado todo dia direto do site oficial. Se o produto sumiu da lista, está faltando e volta assim que houver reposição." },
        { chaves: ["alterar", "mudar", "trocar", "editar", "cancelar"], resposta: "Você mesmo altera pelo site: <b>Meus Pedidos</b> para ver ou cancelar antes do despacho, e o <b>Perfil</b> para trocar endereço e telefone." },
        { chaves: ["ajuda", "ninguem", "ninguém", "atendente", "vendedor", "motorista", "falar", "contato", "whatsapp", "telefone"], resposta: "Se a resposta não resolveu, chame agora: <b>vendedor</b> ou o <b>motorista</b> da sua região. O contato abre o WhatsApp direto." }
    ];

    function achar(texto) {
        var t = String(texto || "").toLowerCase();
        for (var i = 0; i < PERGUNTAS.length; i++) {
            for (var j = 0; j < PERGUNTAS[i].chaves.length; j++) {
                if (t.indexOf(PERGUNTAS[i].chaves[j]) >= 0) return PERGUNTAS[i].resposta;
            }
        }
        return null;
    }

    /* manda o vendedor saber que o cliente pediu ajuda (Telegram) */
    function avisarVendedor(assunto) {
        var d = (typeof Conta !== "undefined") ? Conta.dados() : {};
        var msg = "AJUDA NO SITE\n\nCliente: " + (d.nome || "anonimo") + "\nWhatsApp: " + (d.tel || "nao informado")
            + "\nAssunto: " + assunto;
        try {
            if (typeof notificarTelegram !== "function") return;
            notificarTelegram(msg);
        } catch (e) { }
    }

    function abrirWhatsapp(numero, assunto) {
        var texto = "Olá! Preciso de ajuda com a loja: " + (assunto || "");
        window.open("https://wa.me/" + String(numero).replace(/\D/g, "") + "?text=" + encodeURIComponent(texto), "_blank");
        avisarVendedor(assunto || "chamada pelo site");
    }

    function motoristaDaRegiao() {
        try {
            var sel = document.getElementById("fRegiao");
            if (sel && typeof caminhaoDaRegiao === "function") return caminhaoDaRegiao(sel.value);
        } catch (e) { }
        return MOTORISTAS[0];
    }

    function montar(box) {
        var d = (typeof Conta !== "undefined") ? Conta.dados() : {};
        var mot = motoristaDaRegiao();
        var zap = (mot && mot.whatsapp) ? mot.whatsapp : ZAP_VENDEDOR;

        box.innerHTML =
            '<h3><i class="fa fa-headset"></i> Ajuda rapida</h3>'
            + '<p style="font-size:.9rem;color:var(--text-muted);margin:0 0 10px">Escreva sua duvida: a resposta sai na hora. Se precisar de gente, o WhatsApp abre.</p>'
            + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
            + '<input id="atdTexto" type="text" placeholder="Ex.: qual o frete para Japeri?" '
            + 'style="flex:1;min-width:200px;padding:11px 12px;border:1px solid #d8dbe6;border-radius:10px;font-size:1rem">'
            + '<button class="btn-st b-entregar" style="min-height:44px;padding:11px 16px" onclick="Atendimento.perguntar()"><i class="fa fa-paper-plane"></i> Perguntar</button>'
            + '</div>'
            + '<div id="atdResposta" style="margin-top:12px"></div>'
            + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">'
            + '<a class="btn-zap" href="#" onclick="Atendimento.vendedor();return false;"><i class="fa fa-user-tie"></i> Falar com o vendedor</a>'
            + (mot && mot.whatsapp
                ? '<a class="btn-zap" href="#" onclick="Atendimento.motorista();return false;"><i class="fa fa-truck"></i> Falar com o motorista (' + (mot.corNome || "caminhao") + ')</a>'
                : '')
            + '<a class="btn-zap" href="meus-pedidos.html" style="background:#5f6b8a"><i class="fa fa-list"></i> Meus pedidos</a>'
            + '</div>';
    }

    function perguntar() {
        var inp = document.getElementById("atdTexto");
        var out = document.getElementById("atdResposta");
        if (!inp || !out) return;
        var r = achar(inp.value);
        if (r) {
            out.innerHTML = '<div class="aviso-frete"><i class="fa fa-check-circle"></i><span>' + r + '</span></div>';
            return;
        }
        out.innerHTML = '<div class="aviso-frete" style="background:#fff8e1;border-left-color:#ffb822;color:#8a6100">'
            + '<i class="fa fa-question-circle"></i><span>Essa duvida precisa de uma pessoa. Chame o vendedor ou o motorista aqui abaixo:'
            + ' <b>a mensagem vai junto e ele responde no WhatsApp.</b></span></div>';
        avisarVendedor("duvida sem resposta automatica: " + inp.value);
    }

    return {
        montar: montar,
        perguntar: perguntar,
        vendedor: function () { abrirWhatsapp(ZAP_VENDEDOR, "preciso de ajuda com um pedido"); },
        motorista: function () {
            var mot = motoristaDaRegiao();
            abrirWhatsapp((mot && mot.whatsapp) || ZAP_VENDEDOR, "preciso falar com o motorista");
        },
        achar: achar
    };
})();