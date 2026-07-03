import http from 'http';
import url from 'url';
import { loadDotEnv, requireEnv } from '../scripts/load-env.js';

loadDotEnv();

const CLIENT_ID = requireEnv('GOOGLE_CLIENT_ID');
const CLIENT_SECRET = requireEnv('GOOGLE_CLIENT_SECRET');
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000';

const SCOPE = 'https://www.googleapis.com/auth/adwords';
const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(SCOPE)}&access_type=offline&prompt=consent`;

console.log('====================================================');
console.log('Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env antes de rodar.');
console.log('Adicione a URL de redirecionamento no Google Cloud Console:');
console.log(REDIRECT_URI);
console.log('====================================================\n');
console.log('Abra o link abaixo no navegador:');
console.log('\n' + authUrl + '\n');
console.log('Esperando login no Google (servidor na porta 3000)...');

const server = http.createServer(async (req, res) => {
  const query = url.parse(req.url, true).query;

  if (query.code) {
    res.end('Autorizacao concluida! Pode fechar esta aba e voltar para o terminal do VSCode.');
    server.close();

    console.log('\nCódigo de autorização recebido! Trocando pelo Refresh Token...\n');

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: query.code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code'
        })
      });

      const data = await response.json();
      if (data.error) {
        console.error('Erro:', data.error_description || data.error);
        process.exit(1);
      }

      console.log('✅ Refresh Token obtido:');
      console.log(data.refresh_token);
      console.log('\nGuarde esse token com segurança.');
    } catch (err) {
      console.error('Falha na troca do token:', err.message);
    }
    process.exit(0);
  }
});

server.listen(3000);
