export type PatientStatus = "active" | "improving" | "healed" | "inactive" | "relapsed";

export interface PatientHistorySnapshotSummary {
  id: string;
  version: number;
  eventType: string;
  createdAt: string;
}

export interface Patient {
  id: string;
  doctorId: string;
  name: string;
  age: number | null;
  gender: string;
  phone: string;
  email: string;
  history: string;
  aiSummary: string;
  status: PatientStatus;
  statusUpdatedAt: string;
  healedAt: string | null;
  latestHistorySnapshot: PatientHistorySnapshotSummary | null;
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
  evidenceScore?: {
    rubricCount: number;
    cumulativeWeight: number;
    maxPossibleWeight: number;
    percentage: number;
    quality: "strong" | "moderate" | "weak" | "insufficient" | string;
  };
  reasoning: string;
  dosage: string;
  followUp: string;
  evidence?: Array<{
    source?: string;
    type?: string;
    text?: string;
  }>;
}

export interface AnalysisResult {
  issues: string;
  differentiationLogic: string;
  remedies: Remedy[];
  evidenceQuality?: "strong" | "moderate" | "weak" | "insufficient" | string;
  _meta?: {
    retrieval?: {
      queryCount?: number;
      rubricCount?: number;
      candidateCount?: number;
      elapsedMs?: number;
    };
  };
}

export interface DashboardData {
  todayAppointments: Appointment[];
  recentPatients: Patient[];
}

export interface StatisticsData {
  totalPatients: number;
  statusCounts: Record<PatientStatus, number>;
  healedCount: number;
  healedPercentage: number;
  recentConsultationCount: number;
  topPrescribedRemedies: Array<{ name: string; count: number }>;
  topPotencies: Array<{ name: string; count: number }>;
  recentHealedPatients: Patient[];
}

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}
