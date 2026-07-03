export const normalizeCorporateName = (name) => {
  if (!name) return '';
  
  // 1. Lowercase e remove espaços no início/fim
  let n = name.toLowerCase().trim();

  // 2. Remove acentos
  n = n.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // 3. Substitui caracteres de pontuação por espaço para não colar palavras
  // ex: "empresa.com" vira "empresa com"
  n = n.replace(/[^a-z0-9]/gi, ' ');

  // 4. Termos societários comuns e conectivos para remover
  const termsToRemove = [
    'ltda', 'limitada', 'me', 'epp', 'sa', 's a', 's/a', 'sociedade anonima',
    'cia', 'companhia', 'inc', 'corp', 'corporation', 'llc', 'eireli',
    'de', 'da', 'do', 'das', 'dos', 'e'
  ];

  // 5. Quebra em palavras, filtra as inúteis e junta com 1 único espaço
  const words = n.split(/\s+/);
  const cleanWords = words.filter(w => w.length > 0 && !termsToRemove.includes(w));

  return cleanWords.join(' ');
};

export const isSameClient = (clientA, clientB) => {
  if (!clientA || !clientB) return false;

  // 1. Comparação de Documento (CNPJ/CPF) - Forte
  const docA = (clientA.document || '').replace(/\D/g, '');
  const docB = (clientB.document || '').replace(/\D/g, '');
  
  if (docA && docB && docA === docB) {
    return true; // Match exato de documento
  }

  // 2. Comparação de E-mail - Forte
  const emailA = (clientA.email || '').toLowerCase().trim();
  const emailB = (clientB.email || '').toLowerCase().trim();
  
  if (emailA && emailB && emailA === emailB) {
    return true; // Match exato de email
  }

  // 3. Comparação de Nome/Empresa - Exata (normalizada)
  const nameA = normalizeCorporateName(clientA.name || '');
  const nameB = normalizeCorporateName(clientB.name || '');
  const compA = normalizeCorporateName(clientA.company || '');
  const compB = normalizeCorporateName(clientB.company || '');

  // Match exato de nome ou empresa
  if (nameA && nameB && nameA === nameB) return true;
  if (compA && compB && compA === compB) return true;
  if (nameA && compB && nameA === compB) return true;
  if (compA && nameB && compA === nameB) return true;

  // 4. Substring RIGOROSA: a palavra menor deve ter >= 75% do tamanho da maior
  // Isso evita que "LIG TELECOM" (10 chars) bata "LIG TELECOM SOLUCOES" (20 chars) = 50% < 75%
  const isSubstring = (a, b) => {
    if (a.length < 8 || b.length < 8) return false; // mínimo de 8 chars
    const shorter = a.length <= b.length ? a : b;
    const longer  = a.length <= b.length ? b : a;
    const ratio   = shorter.length / longer.length;
    if (ratio < 0.75) return false; // exige >= 75% de similaridade de tamanho
    return longer.includes(shorter);
  };
  
  if (nameA && nameB && isSubstring(nameA, nameB)) return true;
  if (compA && compB && isSubstring(compA, compB)) return true;

  return false;
};

