import fs from 'fs';
import path from 'path';

/** Carrega variáveis do .env para process.env (uso em scripts Node). */
export function loadDotEnv(envFile = '.env') {
  const envPath = path.join(process.cwd(), envFile);
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Variável obrigatória ausente no .env: ${name}`);
    process.exit(1);
  }
  return value;
}
