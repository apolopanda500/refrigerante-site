function validarEmail(email) {
    var re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email || "").toLowerCase());
}

function validarNome(nome) {
    var s = String(nome || "").trim();
    return s.length >= 3 && /^[a-zA-ZÀ-ÿ\s]+$/.test(s);
}

function validarCEP(cep) {
    var s = String(cep || "").replace(/\D/g, "");
    return s.length === 8;
}

function validarPreco(preco) {
    var v = parseFloat(preco);
    return !isNaN(v) && v >= 0;
}

function validarQuantidade(qtd) {
    var q = parseInt(qtd);
    return !isNaN(q) && q >= 1;
}

/* ============================================
   VALIDAÇÕES DO SITE - REFRIGERANTES CONVENÇÃO
   ============================================ */
"use strict";

var Validacao = (function () {

    function validarCPF(cpf) {
        var s = String(cpf || "").replace(/\D/g, "");
        if (s.length !== 11) return false;
        if (/^(\d)\1{10}$/.test(s)) return false;
        var soma = 0;
        for (var i = 0; i < 9; i++) soma += parseInt(s.charAt(i)) * (10 - i);
        var resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        if (resto !== parseInt(s.charAt(9))) return false;
        soma = 0;
        for (var i = 0; i < 10; i++) soma += parseInt(s.charAt(i)) * (11 - i);
        resto = (soma * 10) % 11;
        if (resto === 10 || resto === 11) resto = 0;
        return resto === parseInt(s.charAt(10));
    }

    function validarTelefone(tel) {
        var s = String(tel || "").replace(/\D/g, "");
        return s.length >= 10 && s.length <= 11;
    }

    /* ---------- Valida Perfil ---------- */
    function validarPerfil(dados) {
        var erros = [];
        if (!validarNome(dados.nome)) erros.push("Nome é obrigatório (mínimo 3 letras)");
        if (!validarTelefone(dados.tel)) erros.push("WhatsApp inválido (10 ou 11 dígitos)");
        if (dados.email && !validarEmail(dados.email)) erros.push("E-mail inválido");
        if (dados.cpf && !validarCPF(dados.cpf)) erros.push("CPF inválido");
        if (dados.cep && !validarCEP(dados.cep)) erros.push("CEP inválido (8 dígitos)");
        return { valido: erros.length === 0, erros: erros };
    }

    /* ---------- Valida Pedido ---------- */
    function validarPedido(dados) {
        var erros = [];
        if (!validarNome(dados.nome)) erros.push("Nome é obrigatório");
        if (!validarTelefone(dados.tel)) erros.push("WhatsApp inválido");
        if (!dados.regiao) erros.push("Selecione a região");
        if (!dados.itens || dados.itens.length === 0) erros.push("Adicione pelo menos um produto ao carrinho");
        return { valido: erros.length === 0, erros: erros };
    }

    /* ---------- Valida Contato ---------- */
    function validarContato(dados) {
        var erros = [];
        if (!validarNome(dados.nome)) erros.push("Nome é obrigatório");
        if (!validarTelefone(dados.tel)) erros.push("WhatsApp inválido");
        if (dados.email && !validarEmail(dados.email)) erros.push("E-mail inválido");
        if (!dados.mensagem || dados.mensagem.length < 5) erros.push("Mensagem deve ter pelo menos 5 caracteres");
        return { valido: erros.length === 0, erros: erros };
    }

    /* ---------- Mostra Erros ---------- */
    function mostrarErros(containerId, erros) {
        var box = document.getElementById(containerId);
        if (!box) return;
        box.innerHTML = "";
        if (!erros.length) return;
        var html = '<div class="aviso aviso-erro"><i class="fa fa-circle-exclamation"></i><ul>';
        erros.forEach(function (e) { html += '<li>' + e + '</li>'; });
        html += '</ul></div>';
        box.innerHTML = html;
        box.style.display = "block";
        setTimeout(function () { box.style.display = "none"; }, 5000);
    }

    /* ---------- Limpa Erros ---------- */
    function limparErros(containerId) {
        var box = document.getElementById(containerId);
        if (box) { box.innerHTML = ""; box.style.display = "none"; }
    }

    /* ---------- Valida Formulário Genérico ---------- */
    function validarFormulario(formId, regras) {
        var form = document.getElementById(formId);
        if (!form) return { valido: false, erros: ["Formulário não encontrado"] };
        var erros = [];
        var inputs = form.querySelectorAll("input, select, textarea");
        inputs.forEach(function (input) {
            var valor = input.value.trim();
            var nome = input.name || input.id || input.placeholder || "";
            var regra = regras[nome] || regras[input.id] || {};
            if (regra.obrigatorio && !valor) erros.push("Campo '" + (input.placeholder || nome) + "' é obrigatório");
            if (regra.email && valor && !validarEmail(valor)) erros.push("E-mail inválido: " + valor);
            if (regra.telefone && valor && !validarTelefone(valor)) erros.push("Telefone inválido: " + valor);
            if (regra.cpf && valor && !validarCPF(valor)) erros.push("CPF inválido: " + valor);
            if (regra.cep && valor && !validarCEP(valor)) erros.push("CEP inválido: " + valor);
            if (regra.preco && valor && !validarPreco(valor)) erros.push("Preço inválido: " + valor);
            if (regra.quantidade && valor && !validarQuantidade(valor)) erros.push("Quantidade inválida: " + valor);
        });
        return { valido: erros.length === 0, erros: erros };
    }

    /* ---------- Exportar ---------- */
    return {
        validarCPF: validarCPF,
        validarTelefone: validarTelefone,
        validarEmail: validarEmail,
        validarNome: validarNome,
        validarCEP: validarCEP,
        validarPreco: validarPreco,
        validarQuantidade: validarQuantidade,
        validarPerfil: validarPerfil,
        validarPedido: validarPedido,
        validarContato: validarContato,
        validarFormulario: validarFormulario,
        mostrarErros: mostrarErros,
        limparErros: limparErros
    };

})();

window.Validacao = Validacao;
