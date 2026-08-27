CREATE TABLE public.industries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  industry_id UUID NOT NULL REFERENCES public.industries(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX companies_industry_id_idx ON public.companies(industry_id);

CREATE TABLE public.app_settings (
  key TEXT NOT NULL PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.industries TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO anon, authenticated;
GRANT ALL ON public.industries TO service_role;
GRANT ALL ON public.companies TO service_role;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can manage industries" ON public.industries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public can manage companies" ON public.companies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public can manage settings" ON public.app_settings FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER industries_touch BEFORE UPDATE ON public.industries FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER companies_touch BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER app_settings_touch BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.industries (name, code, sort_order) VALUES
  ('Auto & Auto Ancillaries', 'AUTO', 1),
  ('Pharma', 'PHRM', 2),
  ('Retail', 'RTL', 3),
  ('FMCG', 'FMCG', 4),
  ('Building Materials', 'BLD', 5),
  ('BFSI', 'BFSI', 6);

INSERT INTO public.app_settings (key, value) VALUES
  ('themes', '["Preserving market leadership in a specific product/business line","Dealing with intense competition and potential loss of market position & reduced morale","Increased funding for aggressive growth/expansion of business - more dealers/network growth","Increase production capacity in new areas/locations leading to more dealers","Building future-ready talent and leadership pipeline","Driving digital and technology transformation"]'::jsonb),
  ('challenge_tags', '["Company-wide business problem","BU-specific"]'::jsonb),
  ('financial_tags', '["High performing","Moderate performing","Low performing"]'::jsonb),
  ('initiative_areas', '["Digital Transformation","Sustainability","Talent & Capability","Customer Experience","Manufacturing & Operations"]'::jsonb),
  ('engagement_stages', '["Initial conversation","Proposal","Pilot","Delivery","Post-delivery review"]'::jsonb);