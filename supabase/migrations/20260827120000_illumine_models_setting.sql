-- Seed the predefined Illumine models / solutions list used under a business
-- vertical's "Illumine's potential contributions". New models can be added
-- later from the Settings page.
INSERT INTO public.app_settings (key, value) VALUES
  ('illumine_models', '["ME-Retailer Engagement App","Market Discovery Tool","Business Counselling Toolbox","Scalable Business Coaching Toolbox","Sustainable Learning System (for rapid upgradation)","Flashpoints Management System","Best Practices Toolbox","Customer Discovery / Counselling App"]'::jsonb)
ON CONFLICT (key) DO NOTHING;
