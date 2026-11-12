-- Etap 2 nowego modelu, krok 2 z 2: nowe konta startują z miesięcznymi planami zamiast 5 kredytów.
-- Zastosuj dopiero PO wdrożeniu kodu z etapu 2: stary kod uznaje konto z 0 kredytów za bez planów
-- i zablokowałby nowych użytkowników. Istniejące konta i ich kredyty zostają bez zmian.

-- Nowe konta nie dostają już 5 kredytów na start, tylko miesięczne plany
ALTER TABLE public.user_profiles ALTER COLUMN credits_remaining SET DEFAULT 0;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, credits_remaining, subscription_tier)
  VALUES (NEW.id, 0, 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
