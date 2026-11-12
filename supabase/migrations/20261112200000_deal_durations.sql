-- Czas lotu w minutach (z Travelpayouts prices_for_dates), żeby policzyć, ile godzin zostaje na miejscu.
-- Same nowe kolumny bez wartości domyślnej, więc stary kod i stare wiersze działają dalej: wdrażaj PRZED kodem.
ALTER TABLE public.drop_deals
  ADD COLUMN IF NOT EXISTS duration_to INT,
  ADD COLUMN IF NOT EXISTS duration_back INT;
