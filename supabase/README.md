# Supabase — workflow migracji

## Setup (raz)

```bash
# 1. Zaloguj się do Supabase CLI
supabase login
# → otworzy przeglądarkę, zaloguj się kontem Supabase

# 2. Połącz lokalny projekt z projektem w chmurze
# Project ID znajdziesz w: Supabase Dashboard → Settings → General → Reference ID
supabase link --project-ref TWOJE_PROJECT_ID

# 3. Pobierz aktualne zmienne środowiskowe
supabase secrets list
```

## Codzienny workflow

### Nowa zmiana w schemacie DB

```bash
# Utwórz nową migrację (opisowa nazwa)
supabase migration new dodaj_kolumne_do_trips

# → tworzy plik supabase/migrations/TIMESTAMP_dodaj_kolumne_do_trips.sql
# Edytuj ten plik i wpisz SQL

# Wdróż na produkcję
supabase db push
```

### Podejrzyj co jest w produkcji

```bash
# Pull aktualnego schematu z chmury (jeśli ktoś coś zmienił przez Dashboard)
supabase db pull
```

### Lokalne testowanie (opcjonalne)

```bash
# Uruchom lokalny Supabase (wymaga Docker)
supabase start

# Zastosuj migracje lokalnie
supabase db reset

# Zatrzymaj
supabase stop
```

## Struktura

```
supabase/
├── config.toml          ← konfiguracja projektu
├── schema.sql           ← pełny schemat (dokumentacja, nie używany przez CLI)
└── migrations/
    └── TIMESTAMP_*.sql  ← każda zmiana to osobny plik, w kolejności
```

## Ważne

- Nigdy nie edytuj istniejących plików migracji — tylko dodawaj nowe
- `supabase db push` działa jak `git push` — wysyła niezastosowane migracje
- Service Role Key (do webhooka Stripe) znajdziesz w: Dashboard → Settings → API
