-- Fix: trigger rejestracji wstawiał 1 kredyt zamiast 5
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, credits_remaining, subscription_tier)
  VALUES (NEW.id, 5, 'free')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
