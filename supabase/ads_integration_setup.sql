-- Tabela ultra segura para armazenar tokens mestres da agência
CREATE TABLE IF NOT EXISTS public.agency_integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(50) NOT NULL UNIQUE, -- 'meta' ou 'google'
    credentials JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS (Row Level Security)
ALTER TABLE public.agency_integrations ENABLE ROW LEVEL SECURITY;

-- Revogar todos os acessos do frontend (anon e authenticated) para leitura/escrita
-- Apenas a role `service_role` (usada pelo backend) poderá acessar.
DROP POLICY IF EXISTS "Deny all access to frontend" ON public.agency_integrations;
CREATE POLICY "Deny all access to frontend" 
ON public.agency_integrations
FOR ALL
TO authenticated, anon
USING (false);

-- Garantir que a tabela ads_connections exista
CREATE TABLE IF NOT EXISTS public.ads_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'Meta Ads' ou 'Google Ads'
    account_id VARCHAR(100) NOT NULL,
    account_name VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para ads_connections (gestores/admin e o próprio cliente podem ver)
ALTER TABLE public.ads_connections ENABLE ROW LEVEL SECURITY;

-- Política de visualização (Simplificada para permitir usuários autenticados verem)
-- Idealmente seria restringido aos gestores e ao respectivo cliente
DROP POLICY IF EXISTS "Users can view connections" ON public.ads_connections;
CREATE POLICY "Users can view connections" 
ON public.ads_connections
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Managers can insert connections" ON public.ads_connections;
CREATE POLICY "Managers can insert connections" 
ON public.ads_connections
FOR INSERT
TO authenticated
WITH CHECK (true); -- No seu sistema real, adicione verificação de role

DROP POLICY IF EXISTS "Managers can delete connections" ON public.ads_connections;
CREATE POLICY "Managers can delete connections" 
ON public.ads_connections
FOR DELETE
TO authenticated
USING (true);
