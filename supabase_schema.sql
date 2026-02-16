-- ATENÇÃO: Este script apaga e recria a tabela 'assets' para garantir que a integração funcione 100%.

-- 1. Limpeza: Remove a tabela antiga se ela já existir
DROP TABLE IF EXISTS public.assets;

-- 2. Criação da Tabela com todas as colunas necessárias para o App
CREATE TABLE public.assets (
    id text PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    title text NOT NULL,
    artist text NOT NULL,
    year text,
    total_value numeric,        -- Corresponde a 'totalValue'
    fraction_price numeric,     -- Corresponde a 'fractionPrice'
    total_fractions integer,    -- Corresponde a 'totalFractions'
    available_fractions integer,-- Corresponde a 'availableFractions'
    image_url text,             -- Armazena URL ou Base64 da imagem
    gallery jsonb DEFAULT '[]'::jsonb, -- Armazena a galeria extra
    insurance_status text,      -- Corresponde a 'insuranceStatus'
    insurance_company text,     -- Corresponde a 'insuranceCompany'
    policy_number text,         -- Corresponde a 'policyNumber'
    insurance_expiry text,      -- Corresponde a 'insuranceExpiry'
    technical_report_url text,  -- Corresponde a 'technicalReportUrl'
    description text,
    is_catalog_only boolean DEFAULT false -- Corresponde a 'isCatalogOnly'
);

-- 3. Habilitar Segurança a Nível de Linha (RLS)
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- 4. Criar Políticas de Acesso (Permite Ler, Criar, Editar e Excluir sem login)
-- Isso é ideal para o modo de demonstração.

-- Permitir Leitura (SELECT)
CREATE POLICY "Permitir Leitura Publica" 
ON public.assets FOR SELECT 
USING (true);

-- Permitir Inserção (INSERT)
CREATE POLICY "Permitir Insercao Publica" 
ON public.assets FOR INSERT 
WITH CHECK (true);

-- Permitir Atualização (UPDATE)
CREATE POLICY "Permitir Atualizacao Publica" 
ON public.assets FOR UPDATE 
USING (true);

-- Permitir Exclusão (DELETE)
CREATE POLICY "Permitir Exclusao Publica" 
ON public.assets FOR DELETE 
USING (true);