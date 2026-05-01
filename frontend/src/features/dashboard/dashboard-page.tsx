"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Activity, Calendar as CalendarIcon, Clock, Mic, Search, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/lib/api/endpoints";

export function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: api.dashboard,
    refetchInterval: 30_000,
  });

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/materia-medica?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Good morning, Dr. {user?.name?.split(" ")[0] || "Doctor"}
            </h1>
            <p className="mt-1 text-slate-500">Here&apos;s what&apos;s happening today.</p>
          </div>
          <form onSubmit={handleSearch} className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search Materia Medica or Repertory..."
              className="rounded-full border-slate-200 bg-white pl-10"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </form>
        </div>

        <Card className="border-none bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-md">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <button
              className="mb-6 flex size-20 items-center justify-center rounded-full bg-white/20 transition-colors hover:bg-white/30"
              onClick={() => router.push("/consultation")}
            >
              <Mic />
            </button>
            <h2 className="mb-2 text-2xl font-semibold">Start New Consultation</h2>
            <p className="max-w-md text-teal-100">
              Tap the microphone to begin voice dictation. The AI will extract symptoms and suggest remedies.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <CalendarIcon className="text-teal-600" />
                  Today&apos;s Appointments
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => router.push("/calendar")}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!data?.todayAppointments.length ? (
                <div className="p-8 text-center text-slate-500">No appointments scheduled for today.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.todayAppointments.map((appointment) => (
                    <li key={appointment.id} className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-teal-50 font-bold text-teal-700">
                          {format(new Date(appointment.date), "HH:mm")}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{appointment.patientName}</p>
                          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                            <Clock />
                            {appointment.status}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => router.push(`/consultation?patientId=${appointment.patientId}`)}>
                        Start
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Users className="text-teal-600" />
                  Recent Patients
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => router.push("/patients")}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!data?.recentPatients.length ? (
                <div className="p-8 text-center text-slate-500">No patients added yet.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recentPatients.map((patient) => (
                    <li
                      key={patient.id}
                      className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-slate-50"
                      onClick={() => router.push(`/consultation?patientId=${patient.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-slate-100 font-medium text-slate-600">
                          {patient.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{patient.name}</p>
                          <p className="text-sm text-slate-500">{patient.phone || patient.email || "No contact info"}</p>
                        </div>
                      </div>
                      <Activity className="text-slate-300" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
