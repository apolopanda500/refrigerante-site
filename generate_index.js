// fix_bom_and_verify.cjs - Fix BOM and verify index.html
const fs = require('fs');
const filePath = 'C:\\Users\\Micro\\refrigerante-site\\index.html';

let buf = fs.readFileSync(filePath);

// Verificar se tem BOM
const hasBOM = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF;
console.log('BOM present:', hasBOM);

// Se nao tem, adicionar
if (!hasBOM) {
  const content = buf.toString('utf8');
  buf = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(content, 'utf8')]);
  fs.writeFileSync(filePath, buf);
  console.log('BOM adicionado');
}

// Ler e verificar
const content = buf.toString('utf8');
const badCount = (content.match(/Ã/g) || []).length;
console.log('\n=== VERIFICAÇÃO FINAL ===');
console.log('Tamanho:', content.length, 'chars');
console.log('Bad chars (Ã):', badCount);
console.log('Produtos:', (content.match(/product-item/g) || []).length);
console.log('Preços:', (content.match(/product-price/g) || []).length);
console.log('Categorias:', (content.match(/cat-title/g) || []).length);
console.log('---');
console.log('Convenção:', content.includes('Convenção') ? '✓ OK' : '✗ FAIL');
console.log('Guaraná:', content.includes('Guaraná') ? '✓ OK' : '✗ FAIL');
console.log('Frutaína:', content.includes('Frutaína') ? '✓ OK' : '✗ FAIL');
console.log('Limão:', content.includes('Limão') ? '✓ OK' : '✗ FAIL');
console.log('Água Natural:', content.includes('Água Natural') ? '✓ OK' : '✗ FAIL');
console.log('Tônica:', content.includes('Tônica') ? '✓ OK' : '✗ FAIL');
console.log('Refrescos:', content.includes('Refrescos') ? '✓ OK' : '✗ FAIL');
console.log('Histórico de Pedidos:', content.includes('Histórico de Pedidos') ? '✓ OK' : '✗ FAIL');
console.log('Configurações:', content.includes('Configurações') ? '✓ OK' : '✗ FAIL');
console.log('Perfil:', content.includes('Perfil') ? '✓ OK' : '✗ FAIL');
console.log('---');
console.log('JPG images:', (content.match(/\.jpg/g) || []).length);
console.log('SVG images:', (content.match(/\.svg/g) || []).length);
console.log('Message removed:', !content.includes('PARA VERIFICAR O PRAZO') ? '✓ OK' : '✗ FAIL');
