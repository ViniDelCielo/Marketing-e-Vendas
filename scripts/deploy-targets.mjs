/** Destinos oficiais — ViniDelCielo / Kaizen (ÚNICO destino de escrita) */
export const KAIZEN_PROJECT_REF = 'vpcdbrzpxhhykupjdwti';
export const KAIZEN_SUPABASE_HOST = `${KAIZEN_PROJECT_REF}.supabase.co`;

/** Projetos de origem — SOMENTE LEITURA (puxar código/dados) */
export const READ_ONLY_PROJECT_REFS = [
  'mbwhwimyetpavwvowbdb', // Roiexpert (Gerson)
  'nhxtblfprufkadlpcpgy', // Roimax
];

export const ALLOWED_GITHUB_REMOTE = 'ViniDelCielo/Marketing-e-Vendas';

/** Logins CLI bloqueados para deploy (case-insensitive) */
export const BLOCKED_CLI_IDENTITIES = ['gersonbarbosahp', 'gerson'];

export function extractProjectRef(urlOrHost = '') {
  const m = String(urlOrHost).match(/([a-z0-9]{20})\.supabase\.co/i);
  return m?.[1] ?? '';
}

export function isReadOnlyRef(ref = '') {
  return READ_ONLY_PROJECT_REFS.includes(ref);
}

export function isKaizenRef(ref = '') {
  return ref === KAIZEN_PROJECT_REF;
}

export function assertWriteTarget(urlOrRef, label = 'destino') {
  const ref = urlOrRef.includes('supabase.co') ? extractProjectRef(urlOrRef) : urlOrRef;
  if (!ref) {
    throw new Error(`❌ ${label}: URL/ref Supabase inválida.`);
  }
  if (isReadOnlyRef(ref)) {
    throw new Error(
      `❌ BLOQUEADO: tentativa de ESCREVER no projeto de origem (${ref}).\n` +
      '   Origem (Gerson/Roiexpert) é SOMENTE LEITURA. Escrita só no Kaizen (ViniDelCielo).'
    );
  }
  if (!isKaizenRef(ref)) {
    throw new Error(
      `❌ BLOQUEADO: ${label} deve ser o projeto Kaizen (${KAIZEN_PROJECT_REF}), recebido: ${ref}`
    );
  }
}

export function assertReadOnlySource(urlOrRef, label = 'origem') {
  const ref = urlOrRef.includes('supabase.co') ? extractProjectRef(urlOrRef) : urlOrRef;
  if (!ref) {
    throw new Error(`❌ ${label}: URL/ref Supabase inválida.`);
  }
  if (isKaizenRef(ref)) {
    throw new Error(`❌ BLOQUEADO: origem não pode ser o Kaizen — use o projeto Gerson/Roiexpert.`);
  }
}
