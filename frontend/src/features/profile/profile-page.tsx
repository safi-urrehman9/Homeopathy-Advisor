"use client";

import Image from "next/image";
import { format } from "date-fns";
import { CalendarDays, LogOut, Mail, ShieldCheck, UserRound } from "lucide-react";
import type { ElementType } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";

export function ProfilePage() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Profile</h1>
          <p className="mt-1 text-slate-500">Review your doctor account and active session.</p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <Image
                src={user.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || "Doctor")}`}
                alt="Doctor profile"
                width={72}
                height={72}
                className="rounded-2xl border border-slate-200"
                unoptimized
              />
              <div>
                <p className="text-2xl font-bold text-slate-900">{user.name || "Doctor"}</p>
                <p className="mt-1 text-sm text-slate-500">{user.email}</p>
              </div>
            </div>
            <Button variant="outline" className="gap-2" onClick={logout}>
              <LogOut />
              Sign Out
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <ProfileFact icon={UserRound} label="Account Name" value={user.name || "Doctor"} />
          <ProfileFact icon={Mail} label="Email" value={user.email} />
          <ProfileFact
            icon={CalendarDays}
            label="Created"
            value={user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "N/A"}
          />
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <ShieldCheck className="text-teal-600" />
              Session Security
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-sm leading-6 text-slate-600">
            This profile is read-only in the current version. Authentication is handled through the backend session token stored on this device.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ProfileFact({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <Icon />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="truncate text-sm font-semibold text-slate-900" title={value}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
