import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { AppShell } from "@/components/AppShell";
import {
  DAYS,
  WORKOUT_TYPES,
  formatWeek,
  getMyRole,
  getPlan,
  listAthletes,
  mondayOf,
  type Profile,
} from "@/lib/coach";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "Squad dashboard — PaceLab coaching" },
      {
        name: "description",
        content:
          "Coach view: pick an athlete, publish their training week, add sessions and read their feedback.",
      },
      { property: "og:title", content: "Squad dashboard — PaceLab coaching" },
      {
        property: "og:description",
        content: "Build and update weekly running plans for every athlete in your squad.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoachPage,
});

function CoachPage() {
  const { user } = useSession();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);

  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["role", userId],
    queryFn: () => getMyRole(userId!),
    enabled: !!userId,
  });
  const isCoach = role === "coach";

  const { data: athletes } = useQuery({
    queryKey: ["athletes"],
    queryFn: listAthletes,
    enabled: isCoach,
  });

  useEffect(() => {
    if (!selected && athletes && athletes.length > 0) setSelected(athletes[0]!.id);
  }, [athletes, selected]);

  const { data: weeks } = useQuery({
    queryKey: ["plan", selected],
    queryFn: () => getPlan(selected!),
    enabled: isCoach && !!selected,
  });

  const athlete = athletes?.find((a) => a.id === selected) ?? null;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["plan", selected] });

  async function addWeek() {
    if (!selected) return;
    const { error } = await supabase.from("training_weeks").insert({
      athlete_id: selected,
      week_start: mondayOf(new Date()),
      title: "New training week",
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Week created");
      refresh();
    }
  }

  if (!roleLoading && !isCoach) {
    return (
      <AppShell role="athlete">
        <div className="track-panel p-8 text-center">
          <h1 className="text-2xl font-bold uppercase">Coaches only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is for the coach. Head to your own plan instead.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell role="coach">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">Coach view</p>
          <h1 className="text-3xl font-bold uppercase">The squad</h1>
        </div>
        <Button onClick={addWeek} disabled={!selected}>
          + New week for {athlete?.full_name || "athlete"}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="track-panel h-fit p-3">
          {(athletes?.length ?? 0) === 0 && (
            <p className="p-3 text-sm text-muted-foreground">
              No athletes yet. Ask them to create an account.
            </p>
          )}
          <ul className="space-y-1">
            {athletes?.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setSelected(a.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                    a.id === selected
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-secondary"
                  }`}
                >
                  <span className="block font-semibold">{a.full_name || "Unnamed athlete"}</span>
                  <span className="block text-xs opacity-80">{a.goal_race ?? "No goal race"}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="space-y-6">
          {athlete && <AthleteCard athlete={athlete} />}

          {(weeks?.length ?? 0) === 0 && athlete && (
            <div className="track-panel p-6 text-sm text-muted-foreground">
              No weeks published for {athlete.full_name || "this athlete"} yet.
            </div>
          )}

          {weeks?.map((week) => (
            <WeekEditor key={week.id} week={week} onChange={refresh} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

function AthleteCard({ athlete }: { athlete: Profile }) {
  return (
    <div className="track-panel p-6" style={{ backgroundImage: "var(--gradient-track)" }}>
      <h2 className="text-2xl font-bold uppercase">{athlete.full_name || "Unnamed athlete"}</h2>
      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <Stat label="Goal race" value={athlete.goal_race ?? "—"} />
        <Stat
          label="Race date"
          value={
            athlete.goal_race_date
              ? new Date(athlete.goal_race_date + "T00:00:00").toLocaleDateString()
              : "—"
          }
        />
        <Stat
          label="Weekly volume"
          value={athlete.weekly_mileage_km ? `${athlete.weekly_mileage_km} km` : "—"}
        />
        <Stat label="5K / 10K" value={`${athlete.pb_5k ?? "—"} / ${athlete.pb_10k ?? "—"}`} />
        <Stat
          label="Half / Marathon"
          value={`${athlete.pb_half ?? "—"} / ${athlete.pb_marathon ?? "—"}`}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="label-caps">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

type WeekWithWorkouts = Awaited<ReturnType<typeof getPlan>>[number];

function WeekEditor({ week, onChange }: { week: WeekWithWorkouts; onChange: () => void }) {
  const [title, setTitle] = useState(week.title);
  const [weekStart, setWeekStart] = useState(week.week_start);
  const [notes, setNotes] = useState(week.coach_notes ?? "");
  const [saving, setSaving] = useState(false);

  const [day, setDay] = useState("0");
  const [wTitle, setWTitle] = useState("");
  const [wType, setWType] = useState("easy");
  const [wDistance, setWDistance] = useState("");
  const [wDesc, setWDesc] = useState("");

  async function saveWeek() {
    setSaving(true);
    const { error } = await supabase
      .from("training_weeks")
      .update({
        title: title.slice(0, 120),
        week_start: weekStart,
        coach_notes: notes.slice(0, 2000) || null,
      })
      .eq("id", week.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Week updated");
      onChange();
    }
  }

  async function deleteWeek() {
    const { error } = await supabase.from("training_weeks").delete().eq("id", week.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Week deleted");
      onChange();
    }
  }

  async function addWorkout() {
    if (!wTitle.trim()) {
      toast.error("Give the session a name");
      return;
    }
    const { error } = await supabase.from("workouts").insert({
      week_id: week.id,
      athlete_id: week.athlete_id,
      day_index: Number(day),
      title: wTitle.trim().slice(0, 120),
      workout_type: wType,
      distance_km: wDistance ? Number(wDistance) : null,
      description: wDesc.trim().slice(0, 1000) || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setWTitle("");
    setWDistance("");
    setWDesc("");
    onChange();
  }

  async function removeWorkout(id: string) {
    const { error } = await supabase.from("workouts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else onChange();
  }

  return (
    <section className="track-panel p-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <div className="space-y-1.5">
          <Label>Week title</Label>
          <Input value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Week starting</Label>
          <Input type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} />
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{formatWeek(week.week_start)}</p>

      <div className="mt-4 space-y-1.5">
        <Label>Coach notes</Label>
        <Textarea
          rows={3}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Focus of the week, pacing guidance, recovery reminders…"
        />
      </div>

      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={saveWeek} disabled={saving}>
          {saving ? "Saving…" : "Save week"}
        </Button>
        <Button size="sm" variant="ghost" onClick={deleteWeek}>
          Delete week
        </Button>
      </div>

      {week.athlete_notes && (
        <div className="mt-4 rounded-lg border-l-2 border-accent bg-secondary p-4 text-sm">
          <p className="label-caps mb-1">Athlete feedback</p>
          {week.athlete_notes}
        </div>
      )}

      <ul className="mt-5 space-y-2">
        {week.workouts.map((w) => (
          <li
            key={w.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3"
          >
            <span className="label-caps w-10">{DAYS[w.day_index] ?? "—"}</span>
            <span className="font-semibold">{w.title}</span>
            <Badge variant="outline">{w.workout_type}</Badge>
            {w.distance_km != null && (
              <span className="text-sm text-primary">{w.distance_km} km</span>
            )}
            {w.completed && <Badge>done</Badge>}
            {w.athlete_log && (
              <span className="w-full text-sm text-muted-foreground">“{w.athlete_log}”</span>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto"
              onClick={() => removeWorkout(w.id)}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>

      <div className="mt-5 rounded-lg border border-dashed border-border p-4">
        <p className="label-caps mb-3">Add session</p>
        <div className="grid gap-3 sm:grid-cols-[110px_1fr_150px_110px]">
          <Select value={day} onValueChange={setDay}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DAYS.map((d, i) => (
                <SelectItem key={d} value={String(i)}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={wTitle}
            maxLength={120}
            placeholder="6 x 1000m @ 10K pace"
            onChange={(e) => setWTitle(e.target.value)}
          />
          <Select value={wType} onValueChange={setWType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORKOUT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={wDistance}
            placeholder="km"
            onChange={(e) => setWDistance(e.target.value)}
          />
        </div>
        <Textarea
          className="mt-3"
          rows={2}
          maxLength={1000}
          value={wDesc}
          placeholder="Warm up 15min, 90s float recovery, cool down 10min"
          onChange={(e) => setWDesc(e.target.value)}
        />
        <Button size="sm" className="mt-3" onClick={addWorkout}>
          Add session
        </Button>
      </div>
    </section>
  );
}
