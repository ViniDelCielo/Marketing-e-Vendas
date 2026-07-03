# Deploy online — SOMENTE conta ViniDelCielo (NUNCA Gerson)
# Pré-requisito:
#   npx vercel logout
#   npx vercel login          → ViniDelCielo
#   npx supabase login        → ViniDelCielo
# Uso: npm run deploy:online

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

Write-Host "`n=== Verificando conta ViniDelCielo ===" -ForegroundColor Yellow
node scripts/ensure-vinidelcielo.mjs --deploy
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Carrega .env local (não commitado)
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) { throw "Arquivo .env não encontrado" }
Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $k, $v = $_ -split '=', 2
  Set-Item -Path "env:$k" -Value $v
}

$supabaseUrl = $env:VITE_SUPABASE_URL
$anonKey = $env:VITE_SUPABASE_ANON_KEY
$serviceKey = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $supabaseUrl -or -not $anonKey) { throw "Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env" }

Write-Host "`n=== Vercel (marketing-kaizen) ===" -ForegroundColor Cyan
npx vercel link --project marketing-kaizen --yes 2>$null
npx vercel env rm VITE_SUPABASE_URL production --yes 2>$null
npx vercel env rm VITE_SUPABASE_ANON_KEY production --yes 2>$null
"VITE_SUPABASE_URL`n$supabaseUrl" | npx vercel env add VITE_SUPABASE_URL production
"VITE_SUPABASE_ANON_KEY`n$anonKey" | npx vercel env add VITE_SUPABASE_ANON_KEY production
npx vercel --prod --yes

Write-Host "`n=== Supabase Edge Functions (KAIZEN) ===" -ForegroundColor Cyan
$ref = ($supabaseUrl -replace 'https://','' -replace '.supabase.co','').Trim()
npx supabase link --project-ref $ref
npx supabase secrets set "SUPABASE_URL=$supabaseUrl" "SUPABASE_SERVICE_ROLE_KEY=$serviceKey" "SUPABASE_ANON_KEY=$anonKey"
Get-ChildItem supabase/functions -Directory | ForEach-Object {
  npx supabase functions deploy $_.Name
}

Write-Host "`n✅ Deploy concluído" -ForegroundColor Green
Write-Host "   Site: https://marketing-kaizen.vercel.app"
Write-Host "   Supabase: $supabaseUrl"
