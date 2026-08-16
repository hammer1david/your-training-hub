import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PaceLab — Running coaching, week by week" },
      {
        name: "description",
        content:
          "PaceLab gives every athlete a login to their own training plan. The coach publishes each week, athletes tick off sessions and log how they felt.",
      },
      { property: "og:title", content: "PaceLab — Running coaching, week by week" },
      {
        property: "og:description",
        content:
          "One place for your coach's weekly plan, your session logs and your goal race countdown.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { user } = useSession();

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center px-4 py-5">
        <span className="font-display text-xl font-bold uppercase tracking-widest">
          Pace<span className="text-primary">Lab</span>
        </span>
        <div className="ml-auto">
          {user ? (
            <Button asChild size="sm">
              <Link to="/plan">Go to my plan</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="secondary">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <p className="label-caps">Coach-led run training</p>
        <h1 className="mt-3 max-w-3xl text-6xl font-bold uppercase leading-[0.95] sm:text-7xl">
          Your week,
          <br />
          <span className="text-primary">written by your coach.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Athletes log in to see exactly what to run, tick sessions off as they go and tell the
          coach how it felt. The coach updates the plan any time — it lands instantly.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to={user ? "/plan" : "/auth"}>{user ? "Open my plan" : "Create your account"}</Link>
          </Button>
          <Button asChild size="lg" variant="secondary">
            <Link to="/auth">I'm the coach</Link>
          </Button>
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "Weekly plans",
              body: "Structured sessions day by day, plus a coach note for the week's focus.",
            },
            {
              title: "Session logs",
              body: "Tick a run complete and add how it went — pace, effort, niggles.",
            },
            {
              title: "Race-ready profile",
              body: "Goal race, weekly volume and personal bests, always in front of the coach.",
            },
          ].map((f) => (
            <div key={f.title} className="track-panel p-6">
              <h2 className="text-xl font-bold uppercase">{f.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
