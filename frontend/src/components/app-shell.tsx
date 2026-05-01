"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, BookOpen, Calendar, LogOut, Menu, PlusCircle, Users, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showError } from "@/hooks/use-toast-error";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: Activity, label: "Dashboard" },
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-teal-100 text-teal-600">
            <Activity />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900">VitalForce AI</h1>
          <p className="mb-8 text-slate-500">Secure doctor access with backend-managed authentication.</p>
          <Tabs value={authMode} onValueChange={setAuthMode} className="gap-4 text-left">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign In</TabsTrigger>
              <TabsTrigger value="register">Create Account</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form className="space-y-4" onSubmit={handleAuthSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={authForm.email}
                    onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="doctor@example.com"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={authForm.password}
                    onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                </div>
                <Button className="w-full bg-teal-600 text-white hover:bg-teal-700" disabled={isSubmittingAuth} type="submit">
                  {isSubmittingAuth ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form className="space-y-4" onSubmit={handleAuthSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="register-name">Full Name</Label>
                  <Input
                    id="register-name"
                    value={authForm.name}
                    onChange={(event) => setAuthForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Dr. Aisha Khan"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={authForm.email}
                    onChange={(event) => setAuthForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="doctor@example.com"
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={authForm.password}
                    onChange={(event) => setAuthForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Minimum 8 characters"
                    autoComplete="new-password"
                  />
                </div>
                <Button className="w-full bg-teal-600 text-white hover:bg-teal-700" disabled={isSubmittingAuth} type="submit">
                  {isSubmittingAuth ? "Creating Account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
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
          <div className="mb-2 flex items-center gap-3 px-3 py-2">
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
          </div>
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
