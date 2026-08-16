import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/set-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create your password — PaceLab" },
      {
        name: "description",
        content:
          "Set the password for your PaceLab athlete account and start following the training plan your coach built for you.",
      },
      { property: "og:title", content: "Create your password — PaceLab" },
      {
        property: "og:description",
        content: "Finish setting up your PaceLab athlete account by choosing a password.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasLink, setHasLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    // The email link carries the tokens; supabase-js exchanges them on load.
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setHasLink(Boolean(data.session));
      setReady(true);
    };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        setHasLink(true);
        setReady(true);
      }
    });
    const t = setTimeout(check, 400);
    return () => {
      active = false;
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password saved — welcome to PaceLab");
      navigate({ to: "/plan", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="track-panel w-full max-w-md p-8">
        <p className="label-caps">PaceLab</p>
        <h1 className="mt-1 text-3xl font-bold uppercase">Create your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose the password you'll use to sign in and follow your training plan.
        </p>

        {ready && !hasLink ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-lg bg-secondary p-4 text-sm">
              This link has expired or was already used. Request a new one from the sign-in page.
            </p>
            <Button className="w-full" onClick={() => navigate({ to: "/auth" })}>
              Back to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pw">New password</Label>
              <Input
                id="pw"
                type="password"
                value={password}
                maxLength={128}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pw2">Confirm password</Label>
              <Input
                id="pw2"
                type="password"
                value={confirm}
                maxLength={128}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={busy || !ready}>
              {busy ? "Saving…" : "Save password and continue"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
