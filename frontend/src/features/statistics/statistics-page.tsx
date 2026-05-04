"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Activity, BarChart3, HeartPulse, Pill, Stethoscope, Users } from "lucide-react";
import type { ElementType } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api/endpoints";
import type { PatientStatus } from "@/lib/api/types";

const statusLabels: Record<PatientStatus, string> = {
  active: "Active",
  improving: "Improving",
  healed: "Healed",
  inactive: "Inactive",
  relapsed: "Relapsed",
};

const statusStyles: Record<PatientStatus, string> = {
  active: "bg-slate-100 text-slate-700",
  improving: "bg-sky-100 text-sky-700",
  healed: "bg-emerald-100 text-emerald-700",
  inactive: "bg-zinc-100 text-zinc-700",
  relapsed: "bg-amber-100 text-amber-800",
};

export function StatisticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["statistics"], queryFn: api.statistics });

  const totalPatients = data?.totalPatients || 0;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Statistics</h1>
          <p className="mt-1 text-slate-500">Patient outcomes and prescription patterns across your practice.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard icon={Users} label="Total Patients" value={String(totalPatients)} />
          <MetricCard icon={HeartPulse} label="Healed Patients" value={String(data?.healedCount || 0)} />
          <MetricCard icon={BarChart3} label="Healed Rate" value={`${data?.healedPercentage || 0}%`} />
          <MetricCard icon={Stethoscope} label="Consultations" value={String(data?.recentConsultationCount || 0)} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Activity className="text-teal-600" />
                Patient Status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 p-5">
              {(Object.keys(statusLabels) as PatientStatus[]).map((status) => {
                const count = data?.statusCounts[status] || 0;
                const percentage = totalPatients ? Math.round((count / totalPatients) * 100) : 0;
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Badge className={statusStyles[status]}>{statusLabels[status]}</Badge>
                      <span className="text-sm font-semibold text-slate-700">{count}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-teal-600" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
              {isLoading ? <p className="text-sm text-slate-500">Loading statistics...</p> : null}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Pill className="text-teal-600" />
                Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5 p-5">
              <RankedList title="Top Remedies" items={data?.topPrescribedRemedies || []} />
              <RankedList title="Potencies" items={data?.topPotencies || []} />
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <HeartPulse className="text-teal-600" />
              Recent Healed Patients
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!data?.recentHealedPatients.length ? (
              <div className="p-8 text-center text-sm text-slate-500">No healed patients recorded yet.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentHealedPatients.map((patient) => (
                  <li key={patient.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-semibold text-slate-900">{patient.name}</p>
                      <p className="text-sm text-slate-500">{patient.phone || patient.email || "No contact info"}</p>
                    </div>
                    <span className="text-sm text-slate-500">
                      {patient.healedAt ? format(new Date(patient.healedAt), "MMM d, yyyy") : "Healed"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: ElementType; label: string; value: string }) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-center gap-3 p-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <Icon />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RankedList({ title, items }: { title: string; items: Array<{ name: string; count: number }> }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold text-slate-900">{title}</p>
      {!items.length ? (
        <p className="text-sm text-slate-500">No prescription data yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
              <span className="text-sm font-medium text-slate-700">{item.name}</span>
              <span className="text-sm font-bold text-teal-700">{item.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
