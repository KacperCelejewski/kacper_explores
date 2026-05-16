-- Allow users to make trips publicly listed in gallery
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS trips_is_public_idx ON public.trips (is_public, created_at DESC)
  WHERE is_public = TRUE;
