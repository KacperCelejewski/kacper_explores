-- Store full destination object for share pages
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS destination_data JSONB;

-- Allow anyone to read trips (share links are public by trip ID)
CREATE POLICY "public_read_trips" ON public.trips
  FOR SELECT USING (true);
