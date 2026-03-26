import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUserOrNull, createSupabaseServerClient } from "@/lib/supabase/server";
import { THEME_COOKIE_NAME, type ThemeMode } from "@/lib/theme";
import { getNavbarDisplayLabel } from "@/lib/auth-display-name";
import { isAdminUser } from "@/lib/admin";
import { AiCreateClientAssistant } from "@/components/ai/AiCreateClientAssistant";
import { WelcomeUserMenu } from "@/components/auth/WelcomeUserMenu";
import { FeedbackFloatingButton } from "@/components/feedback/FeedbackFloatingButton";
import { MobileNav } from "@/components/nav/MobileNav";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { ActiveTimerNavWithSuspense } from "@/components/timer/ActiveTimerNavWithSuspense";
import { getActiveTimerForUser } from "@/lib/active-timer";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getUserOrNull();
  if (!user) redirect("/login");

  const cookieTheme = cookies().get(THEME_COOKIE_NAME)?.value;
  const serverTheme: ThemeMode = cookieTheme === "dark" ? "dark" : "light";

  const displayName = getNavbarDisplayLabel(user);
  const admin = isAdminUser(user.email);

  const supabase = createSupabaseServerClient();
  const [initialTimer, clientsRes, projectsRes] = await Promise.all([
    getActiveTimerForUser(user.id),
    supabase
      .from("clients")
      .select("id,name,email,company")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase
      .from("projects")
      .select("id,name,client_id")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="relative z-50 border-b border-zinc-800/70 bg-zinc-950/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm font-semibold text-sky-300 transition-colors hover:text-sky-200"
            >
              Lead Finance
            </Link>
            <nav className="hidden gap-3 md:flex">
              <NavItem href="/dashboard">Dashboard</NavItem>
              <NavItem href="/clients">Clients</NavItem>
              <NavItem href="/projects">Projects</NavItem>
              <NavDropdown title="Finance">
                <NavItem href="/income">Income</NavItem>
                <NavItem href="/expenses">Expenses</NavItem>
                <NavItem href="/hours">Hours</NavItem>
              </NavDropdown>
              <NavDropdown title="Business">
                <NavItem href="/business/general-expenses">
                  General expenses
                </NavItem>
                <NavItem href="/business/mileage">Mileage</NavItem>
              </NavDropdown>
              {admin ? <NavItem href="/feedback">Feedback</NavItem> : null}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle serverTheme={serverTheme} />
            <ActiveTimerNavWithSuspense
              initialTimer={initialTimer}
              clients={
                (clientsRes.data ?? []) as {
                  id: string;
                  name: string;
                  email: string | null;
                  company: string | null;
                }[]
              }
              projects={
                (projectsRes.data ?? []) as {
                  id: string;
                  name: string;
                  client_id: string;
                }[]
              }
            />
            <MobileNav displayName={displayName} showAdminFeedback={admin} />
            <WelcomeUserMenu displayName={displayName} />
          </div>
        </div>
      </header>
      <main className="relative z-0 mx-auto min-w-0 max-w-6xl px-4 py-6">{children}</main>
      <AiCreateClientAssistant />
      <FeedbackFloatingButton />
    </div>
  );
}

function NavItem({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-2 py-1 text-sm text-zinc-200 hover:bg-zinc-900 hover:text-white"
    >
      {children}
    </Link>
  );
}

function NavDropdown({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="group relative">
      <div className="rounded-md px-2 py-1 text-sm text-zinc-200 hover:bg-zinc-900 hover:text-white">
        {title} <span className="text-zinc-500">▾</span>
      </div>
      <div className="pointer-events-none absolute left-0 top-full z-20 pt-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
        <div className="w-56 rounded-md border border-zinc-800 bg-zinc-950 p-2 shadow-lg">
          <div className="flex flex-col gap-1">{children}</div>
        </div>
      </div>
    </div>
  );
}

