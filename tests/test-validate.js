const fs = require('fs');
const src = fs.readFileSync('js/validate.js', 'utf8');
eval(src.replace('window.Validacao = Validacao;', ''));

let pass = 0, fail = 0;
function t(desc, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log('OK  ' + desc); }
  else { fail++; console.log('ERRO ' + desc + ' -> obtido=' + JSON.stringify(got) + ' esperado=' + JSON.stringify(want)); }
}

t('CPF valido 529.982.247-25', Validacao.validarCPF('52998224725'), true);
t('CPF valido 111.444.777-35', Validacao.validarCPF('11144477735'), true);
t('CPF invalido (digitos iguais)', Validacao.validarCPF('11111111111'), false);
t('CPF invalido (10 digitos)', Validacao.validarCPF('1234567890'), false);
t('CPF invalido (digito errado)', Validacao.validarCPF('52998224726'), false);

t('Telefone 11983158911', Validacao.validarTelefone('(11) 98315-8911'), true);
t('Telefone 1133334444', Validacao.validarTelefone('1133334444'), true);
t('Telefone curto', Validacao.validarTelefone('12345'), false);

t('Email valido', Validacao.validarEmail('rickjax123@gmail.com'), true);
t('Email invalido', Validacao.validarEmail('nao-e-email'), false);

t('Nome valido', Validacao.validarNome('Henrique de Carvalho'), true);
t('Nome curto', Validacao.validarNome('Al'), false);

t('CEP valido', Validacao.validarCEP('13470-000'), true);
t('CEP invalido', Validacao.validarCEP('123'), false);

t('Preco valido', Validacao.validarPreco('29.90'), true);
t('Preco negativo', Validacao.validarPreco('-5'), false);

t('Quantidade valida', Validacao.validarQuantidade('6'), true);
t('Quantidade zero', Validacao.validarQuantidade('0'), false);

const perfilOk = Validacao.validarPerfil({ nome: 'Maria Silva', tel: '11983158911', email: 'maria@email.com', cpf: '52998224725', cep: '13470000' });
t('Perfil completo valido', perfilOk.valido, true);
t('Perfil sem erros', perfilOk.erros, []);
const perfilRuim = Validacao.validarPerfil({ nome: 'X', tel: '123' });
t('Perfil invalido detecta erros', perfilRuim.valido, false);
t('Perfil: 2 erros (nome+tel)', perfilRuim.erros.length, 2);

const pedidoOk = Validacao.validarPedido({ nome: 'Joao', tel: '11983158911', regiao: 'seropedica', itens: [{ name: 'Chopp' }] });
t('Pedido valido', pedidoOk.valido, true);
const pedidoVazio = Validacao.validarPedido({ nome: 'Joao', tel: '11983158911', regiao: null, itens: [] });
t('Pedido vazio: 2 erros', pedidoVazio.erros.length, 2);

const contatoOk = Validacao.validarContato({ nome: 'Ana', tel: '11983158911', mensagem: 'Quero saber o preco' });
t('Contato valido', contatoOk.valido, true);
const contatoRuim = Validacao.validarContato({ nome: 'Ana', tel: '11983158911', mensagem: 'oi' });
t('Contato mensagem curta', contatoRuim.erros.length, 1);

console.log('\n' + pass + ' passaram, ' + fail + ' falharam');
process.exit(fail ? 1 : 0);
