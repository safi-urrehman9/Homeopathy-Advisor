export interface Patient {
  id: string;
  doctorId: string;
  name: string;
  age: number | null;
  gender: string;
  phone: string;
  email: string;
  history: string;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorSession {
  id: string;
  email: string;
  name: string;
  photoUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  token: string;
  doctor: DoctorSession;
}

export interface Consultation {
  id: string;
  doctorId: string;
  patientId: string;
  date: string;
  symptoms: string;
  repertorization: string;
  prescribedRemedy: string;
  potency: string;
  notes: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  doctorId: string;
  patientId: string;
  patientName: string;
  date: string;
  status: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Remedy {
  rank: "PRIMARY" | "ALTERNATIVE" | "DIFFERENTIAL" | string;
  remedy: string;
  matchPercentage?: number;
  reasoning: string;
  dosage: string;
  followUp: string;
}

export interface AnalysisResult {
  issues: string;
  differentiationLogic: string;
  remedies: Remedy[];
}

export interface DashboardData {
  todayAppointments: Appointment[];
  recentPatients: Patient[];
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}
