import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { AppShell } from "@/components/AppShell";
import { getMyRole, getProfile } from "@/lib/coach";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Athlete profile — PaceLab" },
      {
        name: "description",
        content:
          "Keep your goal race, weekly mileage and personal bests up to date so your coach can build the right plan.",
      },
      { property: "og:title", content: "Athlete profile — PaceLab" },
      {
        property: "og:description",
        content: "Goal race, weekly mileage and personal bests for your coach.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().trim().min(1, "Name is required").max(80),
  avatar_url: z.string().trim().url("Avatar must be a valid URL").max(500).or(z.literal("")),
  goal_race: z.string().trim().max(120),
  goal_race_date: z.string().max(10),
  weekly_mileage_km: z.string().max(6),
  pb_5k: z.string().trim().max(12),
  pb_10k: z.string().trim().max(12),
  pb_half: z.string().trim().max(12),
  pb_marathon: z.string().trim().max(12),
});

const EMPTY = {
  full_name: "",
  avatar_url: "",
  goal_race: "",
  goal_race_date: "",
  weekly_mileage_km: "",
  pb_5k: "",
  pb_10k: "",
  pb_half: "",
  pb_marathon: "",
};

function ProfilePage() {
  const { user } = useSession();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      avatar_url: profile.avatar_url ?? "",
      goal_race: profile.goal_race ?? "",
      goal_race_date: profile.goal_race_date ?? "",
      weekly_mileage_km: profile.weekly_mileage_km?.toString() ?? "",
      pb_5k: profile.pb_5k ?? "",
      pb_10k: profile.pb_10k ?? "",
      pb_half: profile.pb_half ?? "",
      pb_marathon: profile.pb_marathon ?? "",
    });
  }, [profile]);

  function set(key: keyof typeof EMPTY, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    const v = parsed.data;
    setSaving(true);
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      full_name: v.full_name,
      avatar_url: v.avatar_url || null,
      goal_race: v.goal_race || null,
      goal_race_date: v.goal_race_date || null,
      weekly_mileage_km: v.weekly_mileage_km ? Number(v.weekly_mileage_km) : null,
      pb_5k: v.pb_5k || null,
      pb_10k: v.pb_10k || null,
      pb_half: v.pb_half || null,
      pb_marathon: v.pb_marathon || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Could not save your profile");
      return;
    }
    toast.success("Profile updated");
    queryClient.invalidateQueries({ queryKey: ["profile", userId] });
  }

  return (
    <AppShell role={role ?? "athlete"}>
      <div className="mb-8 flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={form.avatar_url || undefined} alt={form.full_name} />
          <AvatarFallback>{(form.full_name || "R").slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <p className="label-caps">Athlete profile</p>
          <h1 className="text-3xl font-bold uppercase">{form.full_name || "Your profile"}</h1>
        </div>
      </div>

      <form onSubmit={save} className="track-panel space-y-6 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" value={form.full_name} onChange={(v) => set("full_name", v)} />
          <Field
            label="Avatar image URL"
            value={form.avatar_url}
            onChange={(v) => set("avatar_url", v)}
            placeholder="https://…"
          />
          <Field
            label="Goal race"
            value={form.goal_race}
            onChange={(v) => set("goal_race", v)}
            placeholder="Vienna City Marathon"
          />
          <Field
            label="Race date"
            type="date"
            value={form.goal_race_date}
            onChange={(v) => set("goal_race_date", v)}
          />
          <Field
            label="Weekly mileage (km)"
            type="number"
            value={form.weekly_mileage_km}
            onChange={(v) => set("weekly_mileage_km", v)}
            placeholder="60"
          />
        </div>

        <div>
          <p className="label-caps mb-3">Personal bests</p>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="5K" value={form.pb_5k} onChange={(v) => set("pb_5k", v)} placeholder="19:42" />
            <Field label="10K" value={form.pb_10k} onChange={(v) => set("pb_10k", v)} placeholder="41:10" />
            <Field
              label="Half"
              value={form.pb_half}
              onChange={(v) => set("pb_half", v)}
              placeholder="1:32:05"
            />
            <Field
              label="Marathon"
              value={form.pb_marathon}
              onChange={(v) => set("pb_marathon", v)}
              placeholder="3:18:44"
            />
          </div>
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </AppShell>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
