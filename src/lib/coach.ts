import { supabase } from "@/integrations/supabase/client";

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  goal_race: string | null;
  goal_race_date: string | null;
  weekly_mileage_km: number | null;
  pb_5k: string | null;
  pb_10k: string | null;
  pb_half: string | null;
  pb_marathon: string | null;
};

export type Workout = {
  id: string;
  week_id: string;
  athlete_id: string;
  day_index: number;
  title: string;
  description: string | null;
  workout_type: string;
  distance_km: number | null;
  completed: boolean;
  athlete_log: string | null;
};

export type TrainingWeek = {
  id: string;
  athlete_id: string;
  week_start: string;
  title: string;
  coach_notes: string | null;
  athlete_notes: string | null;
};

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const WORKOUT_TYPES = [
  "easy",
  "long",
  "intervals",
  "tempo",
  "recovery",
  "strength",
  "race",
  "rest",
];

export async function getMyRole(userId: string): Promise<"coach" | "athlete"> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  return data?.some((r) => r.role === "coach") ? "coach" : "athlete";
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function listAthletes() {
  const { data: roles, error: rolesError } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .eq("role", "athlete");
  if (rolesError) throw rolesError;
  const ids = (roles ?? []).map((r) => r.user_id);
  if (ids.length === 0) return [] as Profile[];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", ids)
    .order("full_name");
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function getPlan(athleteId: string) {
  const { data: weeks, error } = await supabase
    .from("training_weeks")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("week_start", { ascending: false });
  if (error) throw error;
  const weekList = (weeks ?? []) as TrainingWeek[];
  if (weekList.length === 0) return [] as Array<TrainingWeek & { workouts: Workout[] }>;
  const { data: workouts, error: wErr } = await supabase
    .from("workouts")
    .select("*")
    .in(
      "week_id",
      weekList.map((w) => w.id),
    )
    .order("day_index");
  if (wErr) throw wErr;
  return weekList.map((w) => ({
    ...w,
    workouts: ((workouts ?? []) as Workout[]).filter((x) => x.week_id === w.id),
  }));
}

export function mondayOf(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export function formatWeek(weekStart: string) {
  const start = new Date(weekStart + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}
