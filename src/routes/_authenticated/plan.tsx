import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { AppShell } from "@/components/AppShell";
import { DAYS, formatWeek, getMyRole, getPlan, getProfile } from "@/lib/coach";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/plan")({
  head: () => ({
    meta: [
      { title: "My training plan — PaceLab" },
      {
        name: "description",
        content:
          "Your week-by-week running plan from your coach: sessions, distances, coach notes and your own session logs.",
      },
      { property: "og:title", content: "My training plan — PaceLab" },
      {
        property: "og:description",
        content: "Weekly running sessions, coach notes and completion logs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanPage,
});

function PlanPage() {
  const { user } = useSession();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const { data: role } = useQuery({
    queryKey: ["role", userId],
    queryFn: () => getMyRole(userId!),
    enabled: !!userId,
  });
  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: !!userId,
  });
  const { data: weeks, isLoading } = useQuery({
    queryKey: ["plan", userId],
    queryFn: () => getPlan(userId!),
    enabled: !!userId,
  });

  const toggle = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("workouts").update({ completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plan", userId] }),
    onError: () => toast.error("Could not update that session"),
  });

  const daysToRace = profile?.goal_race_date
    ? Math.ceil(
        (new Date(profile.goal_race_date + "T00:00:00").getTime() - Date.now()) / 86_400_000,
      )
    : null;

  return (
    <AppShell role={role ?? "athlete"}>
      <div className="track-panel mb-8 overflow-hidden">
        <div className="p-6" style={{ backgroundImage: "var(--gradient-track)" }}>
          <p className="label-caps">Goal race</p>
          <h1 className="mt-1 text-4xl font-bold uppercase">
            {profile?.goal_race ?? "No race set yet"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile?.goal_race_date
              ? `${new Date(profile.goal_race_date + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}${daysToRace !== null && daysToRace >= 0 ? ` · ${daysToRace} days out` : ""}`
              : "Add your goal race on your profile so your coach can plan backwards."}
          </p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading your plan…</p>}
      {!isLoading && (weeks?.length ?? 0) === 0 && (
        <div className="track-panel p-8 text-center">
          <h2 className="text-2xl font-bold uppercase">No plan yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your coach hasn't published a week for you. It will show up here as soon as they do.
          </p>
        </div>
      )}

      <div className="space-y-6">
        {weeks?.map((week) => (
          <section key={week.id} className="track-panel p-6">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-2xl font-bold uppercase">{week.title || "Training week"}</h2>
              <Badge variant="secondary">{formatWeek(week.week_start)}</Badge>
              <span className="ml-auto text-sm text-muted-foreground">
                {week.workouts.filter((w) => w.completed).length}/{week.workouts.length} done
              </span>
            </div>

            {week.coach_notes && (
              <div className="mt-4 rounded-lg border-l-2 border-primary bg-secondary p-4 text-sm">
                <p className="label-caps mb-1">Coach notes</p>
                {week.coach_notes}
              </div>
            )}

            <ul className="mt-5 space-y-3">
              {week.workouts.map((w) => (
                <li key={w.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={w.completed}
                      onCheckedChange={(v) => toggle.mutate({ id: w.id, completed: !!v })}
                      className="mt-1"
                      aria-label={`Mark ${w.title} complete`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="label-caps">{DAYS[w.day_index] ?? "Day"}</span>
                        <h3
                          className={`text-lg font-semibold ${w.completed ? "text-muted-foreground line-through" : ""}`}
                        >
                          {w.title}
                        </h3>
                        <Badge variant="outline">{w.workout_type}</Badge>
                        {w.distance_km != null && (
                          <span className="text-sm text-primary">{w.distance_km} km</span>
                        )}
                      </div>
                      {w.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{w.description}</p>
                      )}
                      <SessionLog workoutId={w.id} initial={w.athlete_log ?? ""} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <WeekNotes weekId={week.id} initial={week.athlete_notes ?? ""} />
          </section>
        ))}
      </div>
    </AppShell>
  );
}

function SessionLog({ workoutId, initial }: { workoutId: string; initial: string }) {
  const [open, setOpen] = useState(Boolean(initial));
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("workouts")
      .update({ athlete_log: value.slice(0, 1000) })
      .eq("id", workoutId);
    setSaving(false);
    if (error) toast.error("Could not save your log");
    else toast.success("Session log saved");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 text-sm text-primary underline-offset-4 hover:underline"
      >
        + How did it go?
      </button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <Textarea
        value={value}
        maxLength={1000}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Felt strong, 4:45/km average, legs a bit heavy on the last rep…"
        rows={2}
      />
      <Button size="sm" variant="secondary" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save log"}
      </Button>
    </div>
  );
}

function WeekNotes({ weekId, initial }: { weekId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("training_weeks")
      .update({ athlete_notes: value.slice(0, 2000) })
      .eq("id", weekId);
    setSaving(false);
    if (error) toast.error("Could not send your note");
    else toast.success("Note sent to your coach");
  }

  return (
    <div className="mt-5 space-y-2">
      <p className="label-caps">Note to coach</p>
      <Textarea
        value={value}
        maxLength={2000}
        rows={3}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Anything your coach should know about this week?"
      />
      <Button size="sm" onClick={save} disabled={saving}>
        {saving ? "Sending…" : "Send to coach"}
      </Button>
    </div>
  );
}
