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
