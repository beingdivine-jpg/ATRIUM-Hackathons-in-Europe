DROP POLICY IF EXISTS "Public can view published exhibitions" ON public.competitions;
CREATE POLICY "Public can view published and archived exhibitions"
  ON public.competitions
  FOR SELECT
  TO public
  USING (status IN ('published', 'archived'));