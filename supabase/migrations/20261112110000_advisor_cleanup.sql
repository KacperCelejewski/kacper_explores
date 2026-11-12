-- Ostrzeżenia advisora Supabase po zamknięciu luk w dostępie. Bez zmian w zachowaniu aplikacji,
-- więc kolejność względem wdrożenia kodu jest dowolna.

-- SECURITY DEFINER bez ustawionego search_path wykonuje się z cudzym search_path wywołującego.
-- Ciało funkcji używa już pełnych nazw (public.user_profiles), więc pusty search_path niczego nie zmienia.
ALTER FUNCTION public.add_credits(UUID, INT) SET search_path = '';

-- Funkcja triggera rejestracji nie powinna być osiągalna przez /rest/v1/rpc.
-- Trigger nadal działa: EXECUTE jest sprawdzane tylko przy tworzeniu triggera, a funkcja jest SECURITY DEFINER.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Nieużywane: tabela i funkcja z migracji 20260518040000 (dodanej przez pomyłkę, potem usuniętej z repozytorium).
-- Na żywo tabela ma 0 wierszy, a w kodzie nic jej nie woła.
DROP FUNCTION IF EXISTS public.increment_flight_api_counter(INTEGER);
DROP TABLE IF EXISTS public.flight_api_counter;
