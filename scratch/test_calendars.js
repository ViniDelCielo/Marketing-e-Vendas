import { createClient } from '@supabase/supabase-js';
import { loadDotEnv, requireEnv } from '../scripts/load-env.js';

loadDotEnv();

const supabase = createClient(
  requireEnv('VITE_SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY')
);

async function testGoogleSync() {
  const employeeId = process.argv[2];
  if (!employeeId) {
    console.error('Uso: node scratch/test_calendars.js <employee_id>');
    process.exit(1);
  }

  const { data: integration } = await supabase
    .from('employee_integrations')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('provider', 'google_calendar')
    .single();

  if (!integration) return console.log('No integration found');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET no .env');
    process.exit(1);
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: integration.refresh_token,
      grant_type: 'refresh_token'
    })
  });
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  console.log('Got access token');

  const calListRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  const calListData = await calListRes.json();
  console.log('Calendars:', calListData.items?.map(c => ({ id: c.id, summary: c.summary })));
}

testGoogleSync();
