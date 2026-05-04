"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Activity, Calendar, Mail, Phone, Plus, Search, Trash2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { showError } from "@/hooks/use-toast-error";
import { api } from "@/lib/api/endpoints";
import type { Patient, PatientStatus } from "@/lib/api/types";

const emptyPatient = { name: "", age: "", gender: "", phone: "", email: "", history: "" };
const patientStatuses: PatientStatus[] = ["active", "improving", "healed", "inactive", "relapsed"];
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

export function PatientsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState(emptyPatient);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const patientsQuery = useQuery({ queryKey: ["patients"], queryFn: () => api.listPatients() });
  const consultationsQuery = useQuery({
    queryKey: ["patient-consultations", selectedPatient?.id],
    queryFn: () => api.listConsultations(selectedPatient?.id || ""),
    enabled: Boolean(selectedPatient?.id),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      api.createPatient({
        name: newPatient.name,
        age: newPatient.age ? Number(newPatient.age) : null,
        gender: newPatient.gender,
        phone: newPatient.phone,
        email: newPatient.email,
        history: newPatient.history,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
      setIsAddDialogOpen(false);
      setNewPatient(emptyPatient);
      toast.success("Patient added successfully");
    },
    onError: (error) => showError(error),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deletePatient,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient deleted");
    },
    onError: (error) => showError(error),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PatientStatus }) => api.updatePatient(id, { status }),
    onSuccess: async (patient) => {
      setSelectedPatient(patient);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["patients"] }),
        queryClient.invalidateQueries({ queryKey: ["statistics"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      toast.success("Patient status updated");
    },
    onError: (error) => showError(error),
  });

  const filteredPatients = useMemo(() => {
    const needle = searchQuery.toLowerCase();
    return (patientsQuery.data || []).filter(
      (patient) => patient.name.toLowerCase().includes(needle) || patient.phone.includes(searchQuery),
    );
  }, [patientsQuery.data, searchQuery]);

  const handleAddPatient = (event: React.FormEvent) => {
    event.preventDefault();
    createMutation.mutate(undefined);
  };

  const handleDelete = (patient: Patient) => {
    if (confirm(`Delete ${patient.name}?`)) {
      deleteMutation.mutate(patient.id);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Patients</h1>
            <p className="mt-1 text-slate-500">Manage your patient records and history.</p>
          </div>
          <Button className="gap-2 bg-teal-600 text-white hover:bg-teal-700" onClick={() => setIsAddDialogOpen(true)}>
            <Plus />
            Add Patient
          </Button>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search patients by name or phone..."
                className="border-slate-200 bg-slate-50 pl-10"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                      No patients found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 items-center justify-center rounded-full bg-teal-100 text-sm font-medium text-teal-700">
                            {patient.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{patient.name}</p>
                            <p className="text-xs text-slate-500">
                              {patient.age ? `${patient.age} yrs` : ""} {patient.gender}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={patient.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm text-slate-600">
                          {patient.phone ? (
                            <div className="flex items-center gap-1">
                              <Phone />
                              {patient.phone}
                            </div>
                          ) : null}
                          {patient.email ? (
                            <div className="flex items-center gap-1">
                              <Mail />
                              {patient.email}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{format(new Date(patient.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setSelectedPatient(patient)}>
                            <User />
                            Details
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-teal-200 text-teal-700 hover:bg-teal-50"
                            onClick={() => router.push(`/consultation?patientId=${patient.id}`)}
                          >
                            <Activity />
                            Follow-up
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-50 hover:text-red-700" onClick={() => handleDelete(patient)}>
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Patient</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddPatient} className="flex flex-col gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 flex flex-col gap-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" required value={newPatient.name} onChange={(event) => setNewPatient({ ...newPatient, name: event.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" value={newPatient.age} onChange={(event) => setNewPatient({ ...newPatient, age: event.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="gender">Gender</Label>
                <Input id="gender" value={newPatient.gender} onChange={(event) => setNewPatient({ ...newPatient, gender: event.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={newPatient.phone} onChange={(event) => setNewPatient({ ...newPatient, phone: event.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={newPatient.email} onChange={(event) => setNewPatient({ ...newPatient, email: event.target.value })} />
              </div>
              <div className="col-span-2 flex flex-col gap-2">
                <Label htmlFor="history">Medical History</Label>
                <Input id="history" value={newPatient.history} onChange={(event) => setNewPatient({ ...newPatient, history: event.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-teal-600 text-white hover:bg-teal-700" disabled={createMutation.isPending}>
                Save Patient
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedPatient)} onOpenChange={(open) => !open && setSelectedPatient(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-bold text-teal-700">
              <User />
              {selectedPatient?.name}&apos;s History
            </DialogTitle>
          </DialogHeader>
          {selectedPatient ? (
            <div className="mt-4 flex flex-col gap-6">
              <div className="grid grid-cols-1 gap-6 rounded-xl border border-slate-100 bg-slate-50 p-5 sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Age/Gender" value={`${selectedPatient.age ? `${selectedPatient.age} yrs, ` : ""}${selectedPatient.gender}`} />
                <Info label="Phone" value={selectedPatient.phone || "N/A"} />
                <Info label="Email" value={selectedPatient.email || "N/A"} />
                <Info label="Registered" value={format(new Date(selectedPatient.createdAt), "MMM d, yyyy")} />
                <div className="overflow-hidden">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                  <select
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-900 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20"
                    value={selectedPatient.status}
                    disabled={updateStatusMutation.isPending}
                    onChange={(event) =>
                      updateStatusMutation.mutate({
                        id: selectedPatient.id,
                        status: event.target.value as PatientStatus,
                      })
                    }
                  >
                    {patientStatuses.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedPatient.healedAt ? (
                  <Info label="Healed" value={format(new Date(selectedPatient.healedAt), "MMM d, yyyy")} />
                ) : null}
                {selectedPatient.latestHistorySnapshot ? (
                  <div className="col-span-1 sm:col-span-2 lg:col-span-4 rounded-lg border border-emerald-100 bg-emerald-50/60 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">History Snapshot</p>
                    <p className="mt-1 text-sm text-emerald-900">
                      Version {selectedPatient.latestHistorySnapshot.version} saved on{" "}
                      {format(new Date(selectedPatient.latestHistorySnapshot.createdAt), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                ) : null}
                {selectedPatient.history ? (
                  <div className="col-span-1 sm:col-span-2 lg:col-span-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Initial History</p>
                    <p className="text-sm text-slate-700">{selectedPatient.history}</p>
                  </div>
                ) : null}
              </div>

              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Activity className="text-teal-600" />
                  Consultations ({consultationsQuery.data?.length || 0})
                </h3>
                {!consultationsQuery.data?.length ? (
                  <p className="text-sm italic text-slate-500">No consultations recorded yet.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {consultationsQuery.data.map((consultation) => (
                      <Card key={consultation.id} className="border-slate-200 shadow-sm">
                        <CardHeader className="border-b border-slate-100 bg-slate-50 py-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-700">
                              <Calendar />
                              {format(new Date(consultation.createdAt), "MMMM d, yyyy - h:mm a")}
                            </CardTitle>
                            {consultation.prescribedRemedy ? (
                              <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-800">
                                {consultation.prescribedRemedy} {consultation.potency ? `(${consultation.potency})` : ""}
                              </span>
                            ) : null}
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-4 p-4">
                          <div>
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Symptoms Recorded</p>
                            <p className="whitespace-pre-wrap text-sm text-slate-700">{consultation.symptoms}</p>
                          </div>
                          {consultation.notes ? (
                            <div className="rounded-lg border border-teal-100 bg-teal-50/50 p-3">
                              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-teal-800">Diagnosis & Notes</p>
                              <p className="whitespace-pre-wrap text-sm text-teal-900">{consultation.notes}</p>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: PatientStatus }) {
  return <Badge className={statusStyles[status]}>{statusLabels[status]}</Badge>;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="overflow-hidden">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="truncate text-sm font-medium text-slate-900" title={value}>
        {value}
      </p>
    </div>
  );
}
