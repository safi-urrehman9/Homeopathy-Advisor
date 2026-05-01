"use client";

import { apiRequest, jsonBody } from "@/lib/api/client";
import type { AnalysisResult, Appointment, Consultation, DashboardData, Patient } from "@/lib/api/types";

export const api = {
  dashboard: () => apiRequest<DashboardData>("/dashboard"),

  listPatients: (query?: string) => {
    const search = query ? `?q=${encodeURIComponent(query)}` : "";
    return apiRequest<Patient[]>(`/patients${search}`);
  },
  createPatient: (payload: Partial<Patient> & { name: string }) =>
    apiRequest<Patient>("/patients", { method: "POST", body: jsonBody(payload) }),
  updatePatient: (id: string, payload: Partial<Patient>) =>
    apiRequest<Patient>(`/patients/${id}`, { method: "PATCH", body: jsonBody(payload) }),
  deletePatient: (id: string) => apiRequest<void>(`/patients/${id}`, { method: "DELETE" }),

  listConsultations: (patientId: string) => apiRequest<Consultation[]>(`/patients/${patientId}/consultations`),
  createConsultation: (payload: {
    patientId: string;
    date: string;
    symptoms: string;
    repertorization: string;
    prescribedRemedy: string;
    potency: string;
    notes: string;
  }) => apiRequest<Consultation>("/consultations", { method: "POST", body: jsonBody(payload) }),

  listAppointments: (start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    const query = params.toString();
    return apiRequest<Appointment[]>(`/appointments${query ? `?${query}` : ""}`);
  },
  createAppointment: (payload: { patientId: string; date: string; notes: string }) =>
    apiRequest<Appointment>("/appointments", { method: "POST", body: jsonBody(payload) }),
  deleteAppointment: (id: string) => apiRequest<void>(`/appointments/${id}`, { method: "DELETE" }),

  extractSymptoms: (text: string) =>
    apiRequest<{ text: string }>("/ai/extract-symptoms", { method: "POST", body: jsonBody({ text }) }),
  suggestRemedies: (symptoms: string, pastConsultations: Consultation[]) =>
    apiRequest<AnalysisResult>("/ai/suggest-remedies", {
      method: "POST",
      body: jsonBody({ symptoms, pastConsultations }),
    }),
  searchMateriaMedica: (query: string) =>
    apiRequest<{ text: string }>("/ai/materia-medica", { method: "POST", body: jsonBody({ query }) }),
  processAudio: (base64Audio: string, mimeType: string) =>
    apiRequest<{ text: string }>("/ai/process-audio", {
      method: "POST",
      body: jsonBody({ base64Audio, mimeType }),
    }),
  processImage: (base64Image: string, mimeType: string) =>
    apiRequest<{ text: string }>("/ai/process-image", {
      method: "POST",
      body: jsonBody({ base64Image, mimeType }),
    }),
};
