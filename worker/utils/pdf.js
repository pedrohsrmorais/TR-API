'use strict';

/**
 * Gera um PDF de uma página só com texto (Helvetica), sem dependências.
 * Usado pelo adapter de simulação.
 */

// Helvetica + WinAnsi cobre acentos do português (latin1); normaliza o resto.
const escapar = (s) =>
  s
    .normalize('NFC')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[^\x00-\xff]/g, '?')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

/**
 * @param {Array<string | { texto: string, tamanho?: number }>} linhas
 * @returns {Buffer}
 */
function gerarPdfTexto(linhas) {
  const comandos = ['BT', '50 790 Td'];
  let primeira = true;
  for (const l of linhas) {
    const { texto, tamanho = 11 } = typeof l === 'string' ? { texto: l } : l;
    if (!primeira) comandos.push(`0 -${Math.round(tamanho * 1.6)} Td`);
    comandos.push(`/F1 ${tamanho} Tf`, `(${escapar(String(texto))}) Tj`);
    primeira = false;
  }
  comandos.push('ET');
  const conteudo = Buffer.from(comandos.join('\n'), 'latin1');

  const objetos = [
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'latin1'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>', 'latin1'),
    Buffer.from('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', 'latin1'),
    Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>', 'latin1'),
    Buffer.concat([Buffer.from(`<< /Length ${conteudo.length} >>\nstream\n`, 'latin1'), conteudo, Buffer.from('\nendstream', 'latin1')]),
  ];

  const partes = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
  let tamanho = partes[0].length;
  const offsets = [];
  objetos.forEach((corpo, i) => {
    offsets.push(tamanho);
    const bloco = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), corpo, Buffer.from('\nendobj\n', 'latin1')]);
    partes.push(bloco);
    tamanho += bloco.length;
  });

  const xref = [`xref\n0 ${objetos.length + 1}\n`, '0000000000 65535 f \n', ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)].join('');
  partes.push(Buffer.from(`${xref}trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${tamanho}\n%%EOF\n`, 'latin1'));

  return Buffer.concat(partes);
}

module.exports = { gerarPdfTexto };
