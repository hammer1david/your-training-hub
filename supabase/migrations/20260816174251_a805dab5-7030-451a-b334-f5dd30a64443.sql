CREATE TYPE public.app_role AS ENUM ('coach', 'athlete');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  goal_race TEXT,
  goal_race_date DATE,
  weekly_mileage_km NUMERIC,
  pb_5k TEXT,
  pb_10k TEXT,
  pb_half TEXT,
  pb_marathon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Coaches read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'coach'));

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Coaches read all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'coach'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.training_weeks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  week_start DATE NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  coach_notes TEXT,
  athlete_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (athlete_id, week_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_weeks TO authenticated;
GRANT ALL ON public.training_weeks TO service_role;
ALTER TABLE public.training_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes read own weeks" ON public.training_weeks FOR SELECT TO authenticated USING (athlete_id = auth.uid());
CREATE POLICY "Athletes update own week notes" ON public.training_weeks FOR UPDATE TO authenticated USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());
CREATE POLICY "Coaches manage weeks" ON public.training_weeks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'coach')) WITH CHECK (public.has_role(auth.uid(), 'coach'));

CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id UUID NOT NULL REFERENCES public.training_weeks ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  day_index SMALLINT NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  workout_type TEXT NOT NULL DEFAULT 'easy',
  distance_km NUMERIC,
  completed BOOLEAN NOT NULL DEFAULT false,
  athlete_log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes read own workouts" ON public.workouts FOR SELECT TO authenticated USING (athlete_id = auth.uid());
CREATE POLICY "Athletes update own workouts" ON public.workouts FOR UPDATE TO authenticated USING (athlete_id = auth.uid()) WITH CHECK (athlete_id = auth.uid());
CREATE POLICY "Coaches manage workouts" ON public.workouts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'coach')) WITH CHECK (public.has_role(auth.uid(), 'coach'));

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_training_weeks_updated_at BEFORE UPDATE ON public.training_weeks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON public.workouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'athlete')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();