"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, BarChart3, BookOpen, Calendar, CheckCircle2, LogOut, Menu, PlusCircle, ShieldCheck, Users, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showError } from "@/hooks/use-toast-error";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Activity, label: "Dashboard" },
  { href: "/statistics", icon: BarChart3, label: "Statistics" },
  { href: "/patients", icon: Users, label: "Patients" },
  { href: "/calendar", icon: Calendar, label: "Calendar" },
  { href: "/materia-medica", icon: BookOpen, label: "Materia Medica" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isReady, login, logout, register } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingAuth(true);

    try {
      if (authMode === "register") {
        await register(authForm);
      } else {
        await login({ email: authForm.email, password: authForm.password });
      }
    } catch (error) {
      showError(error, authMode === "register" ? "Account creation failed" : "Sign in failed");
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading VitalForce AI...
      </div>
    );
  }

  if (!user) {
    const isRegistering = authMode === "register";

    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.16),_transparent_32rem),linear-gradient(135deg,_#f8fafc_0%,_#eef7f6_48%,_#f8fafc_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
          <section className="hidden max-w-2xl lg:block">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-teal-200 bg-white/70 px-4 py-2 text-sm font-semibold text-teal-800 shadow-sm shadow-teal-900/5 backdrop-blur">
              <Activity className="size-4" />
              VitalForce AI
            </div>
            <h1 className="max-w-xl text-5xl font-semibold leading-tight tracking-tight text-slate-950">
              A calmer clinical workspace for homeopathic practice.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-600">
              Sign in to manage patients, consultations, appointments, and AI-assisted remedy workflows from one focused dashboard.
            </p>
            <div className="mt-10 grid max-w-xl grid-cols-2 gap-4">
              {[
                "Backend-managed doctor sessions",
                "Patient records and visit history",
                "AI consultation capture",
                "Calendar-aware clinic flow",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-white/70 bg-white/65 p-4 shadow-sm shadow-slate-900/5 backdrop-blur">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-teal-600" />
                  <span className="text-sm font-medium leading-6 text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="w-full">
            <div className="mx-auto w-full max-w-[440px] rounded-[1.75rem] border border-white/80 bg-white/90 p-6 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-8">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                  <Activity className="size-7" />
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">VitalForce AI</h2>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
                  Secure access for doctors managing clinical work.
                </p>
              </div>

              <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setAuthMode("login")}
                  className={cn(
                    "h-10 rounded-lg text-sm font-semibold transition-all",
                    !isRegistering ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("register")}
                  className={cn(
                    "h-10 rounded-lg text-sm font-semibold transition-all",
                    isRegistering ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  Create Account
                </button>
              </div>

              <form className="space-y-5" onSubmit={handleAuthSubmit}>
                {isRegistering ? (
                  <div className="space-y-2">
                    <Label htmlFor="auth-name" className="text-sm font-semibold text-slate-800">
                      Full Name
                    </Label>
                    <Input
                      id="auth-name"
                      value={authForm.name}
                      onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Dr. Aisha Khan"
                      autoComplete="name"
                      className="h-11 rounded-xl border-slate-200 bg-white px-3 text-base shadow-sm placeholder:text-slate-400 focus-visible:border-teal-600 focus-visible:ring-teal-600/15 md:text-sm"
                    />
                  </div>
                ) : null}

                <div className="space-y-2">
                  <Label htmlFor="auth-email" className="text-sm font-semibold text-slate-800">
                    Email
                  </Label>
                  <Input
                    id="auth-email"
                    type="email"
                    value={authForm.email}
                    onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="doctor@example.com"
                    autoComplete="email"
                    className="h-11 rounded-xl border-slate-200 bg-white px-3 text-base shadow-sm placeholder:text-slate-400 focus-visible:border-teal-600 focus-visible:ring-teal-600/15 md:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="auth-password" className="text-sm font-semibold text-slate-800">
                    Password
                  </Label>
                  <Input
                    id="auth-password"
                    type="password"
                    value={authForm.password}
                    onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder={isRegistering ? "Minimum 8 characters" : "Enter your password"}
                    autoComplete={isRegistering ? "new-password" : "current-password"}
                    className="h-11 rounded-xl border-slate-200 bg-white px-3 text-base shadow-sm placeholder:text-slate-400 focus-visible:border-teal-600 focus-visible:ring-teal-600/15 md:text-sm"
                  />
                </div>

                <Button
                  className="h-11 w-full rounded-xl bg-teal-700 text-base font-semibold text-white shadow-lg shadow-teal-900/15 hover:bg-teal-800 md:text-sm"
                  disabled={isSubmittingAuth}
                  type="submit"
                >
                  {isSubmittingAuth ? (isRegistering ? "Creating Account..." : "Signing In...") : isRegistering ? "Create Account" : "Sign In"}
                </Button>
              </form>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
                <ShieldCheck className="size-4 text-teal-700" />
                Protected by encrypted token authentication
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-slate-500 lg:hidden">
              Patient records, consultations, appointments, and AI-assisted workflows in one clinical workspace.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white p-4 md:hidden">
        <div className="flex items-center gap-2 text-xl font-bold text-teal-600">
          <Activity />
          VitalForce AI
        </div>
        <button className="text-slate-500" onClick={() => setIsMobileMenuOpen((open) => !open)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-10 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:relative md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="hidden items-center gap-2 border-b border-slate-100 p-6 text-2xl font-bold text-teal-600 md:flex">
          <Activity />
          VitalForce AI
        </div>
        <div className="p-4">
          <Button
            className="w-full gap-2 bg-teal-600 text-white hover:bg-teal-700"
            onClick={() => {
              router.push("/consultation");
              setIsMobileMenuOpen(false);
            }}
          >
            <PlusCircle />
            New Consultation
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto px-4 py-2">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 font-medium transition-colors",
                    isActive ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <item.icon />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="border-t border-slate-100 p-4">
          <Link
            href="/profile"
            onClick={() => setIsMobileMenuOpen(false)}
            className={cn(
              "mb-2 flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-slate-50",
              pathname === "/profile" ? "bg-teal-50 text-teal-700" : "text-slate-700",
            )}
          >
            <Image
              src={user.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || "Doctor")}`}
              alt="User"
              width={32}
              height={32}
              className="rounded-full"
              unoptimized
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900">{user.name || "Doctor"}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
            </div>
          </Link>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">{children}</main>
      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-0 bg-black/20 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      ) : null}
    </div>
  );
}
