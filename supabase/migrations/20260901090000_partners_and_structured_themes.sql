-- Reusable partner profiles (name, photo, LinkedIn, experience) that can be
-- mapped to any number of companies.
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  photo_url TEXT NOT NULL DEFAULT '',
  linkedin_url TEXT NOT NULL DEFAULT '',
  experience JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO anon, authenticated;
GRANT ALL ON public.partners TO service_role;

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can manage partners" ON public.partners;
CREATE POLICY "Public can manage partners" ON public.partners FOR ALL USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS partners_touch ON public.partners;
CREATE TRIGGER partners_touch BEFORE UPDATE ON public.partners
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Move the "themes" setting to the structured shape: { name, mood, examples[] }.
INSERT INTO public.app_settings (key, value) VALUES (
  'themes',
  '[
    {"name":"Preserving market leadership in a specific product / business line","mood":"challenge","examples":["Defending a category the company itself created as competitors scale fast","Holding share in the flagship product against aggressive new entrants"]},
    {"name":"Dealing with intense competition and a slipping market position","mood":"challenge","examples":["Running a clear second to the #1 player in a core segment","Reduced morale in the sales / channel organisation as share erodes"]},
    {"name":"Funding and executing aggressive growth / network expansion","mood":"aspiration","examples":["Adding dealers and widening the retail network at pace","Raising capital specifically to expand distribution"]},
    {"name":"Adding production capacity in new locations","mood":"aspiration","examples":["New plants / lines opening up new dealer catchments"]},
    {"name":"Building a future-ready talent and leadership pipeline","mood":"aspiration","examples":["Capability building for frontline sales & service teams"]},
    {"name":"Driving digital and technology transformation","mood":"aspiration","examples":["Digitising lead generation and dealer operations end to end"]},
    {"name":"Absorbing a compound external / operational shock","mood":"challenge","examples":["A cyberattack, tariff regime or supply shock hitting a key subsidiary at once"]}
  ]'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
WHERE jsonb_typeof(public.app_settings.value -> 0) IS DISTINCT FROM 'object';
