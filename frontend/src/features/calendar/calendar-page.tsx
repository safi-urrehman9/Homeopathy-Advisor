"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isSameDay } from "date-fns";
import { Clock, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showError } from "@/hooks/use-toast-error";
import { api } from "@/lib/api/endpoints";

export function CalendarPage() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState({ patientId: "", time: "09:00", notes: "" });

  const appointmentsQuery = useQuery({
    queryKey: ["appointments"],
    queryFn: () => api.listAppointments(),
    refetchInterval: 30_000,
  });
  const patientsQuery = useQuery({ queryKey: ["patients"], queryFn: () => api.listPatients() });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!date) throw new Error("Select a date first.");
      const [hours, minutes] = newAppointment.time.split(":").map(Number);
      const appointmentDate = new Date(date);
      appointmentDate.setHours(hours, minutes, 0, 0);
      return api.createAppointment({
        patientId: newAppointment.patientId,
        date: appointmentDate.toISOString(),
        notes: newAppointment.notes,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setIsAddDialogOpen(false);
      setNewAppointment({ patientId: "", time: "09:00", notes: "" });
      toast.success("Appointment scheduled");
    },
    onError: (error) => showError(error),
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteAppointment,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Appointment cancelled");
    },
    onError: (error) => showError(error),
  });

  const selectedDateAppointments = (appointmentsQuery.data || []).filter(
    (appointment) => date && isSameDay(new Date(appointment.date), date),
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    createMutation.mutate(undefined);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Calendar</h1>
            <p className="mt-1 text-slate-500">Schedule and manage patient appointments.</p>
          </div>
          <Button className="bg-teal-600 text-white hover:bg-teal-700" onClick={() => setIsAddDialogOpen(true)}>
            New Appointment
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="h-fit border-slate-200 shadow-sm lg:col-span-1">
            <CardContent className="flex justify-center p-4">
              <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md" />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm lg:col-span-2">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">{date ? format(date, "EEEE, MMMM d, yyyy") : "Select a date"}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {selectedDateAppointments.length === 0 ? (
                <div className="p-12 text-center text-slate-500">No appointments scheduled for this day.</div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {selectedDateAppointments.map((appointment) => (
                    <li key={appointment.id} className="flex items-center justify-between p-4 hover:bg-slate-50">
                      <div className="flex items-center gap-4">
                        <div className="flex size-16 flex-col items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                          <span className="text-lg font-bold">{format(new Date(appointment.date), "HH:mm")}</span>
                        </div>
                        <div>
                          <p className="text-lg font-medium text-slate-900">{appointment.patientName}</p>
                          <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                            <Clock />
                            {appointment.status}
                          </p>
                          {appointment.notes ? <p className="mt-1 text-sm italic text-slate-600">{appointment.notes}</p> : null}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:bg-red-50 hover:text-red-700"
                        onClick={() => {
                          if (confirm("Cancel this appointment?")) deleteMutation.mutate(appointment.id);
                        }}
                      >
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Appointment</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>Patient *</Label>
              <Select value={newAppointment.patientId} onValueChange={(value) => setNewAppointment({ ...newAppointment, patientId: value ?? "" })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select patient" />
                </SelectTrigger>
                <SelectContent>
                  {patientsQuery.data?.map((patient) => (
                    <SelectItem key={patient.id} value={patient.id}>
                      {patient.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Date</Label>
                <div className="rounded-md border bg-slate-50 p-2 text-slate-700">{date ? format(date, "PPP") : "Select a date"}</div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Time *</Label>
                <Input required type="time" value={newAppointment.time} onChange={(event) => setNewAppointment({ ...newAppointment, time: event.target.value })} />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Notes</Label>
              <Input
                value={newAppointment.notes}
                onChange={(event) => setNewAppointment({ ...newAppointment, notes: event.target.value })}
                placeholder="Reason for visit..."
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="bg-teal-600 text-white hover:bg-teal-700"
                disabled={!newAppointment.patientId || createMutation.isPending}
              >
                Schedule
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
