# VitalForce AI - Documentation

## Overview
VitalForce AI is a comprehensive homeopathic advisor application designed for doctors. It leverages AI (Google Gemini) to assist in case taking, symptom extraction, repertorization, and remedy suggestions. It also includes patient management and appointment scheduling.

## Core Functionalities

### 1. Dashboard
- **Overview**: Provides a quick glance at the day's schedule and recent patients.
- **Quick Actions**: Start a new consultation directly from the dashboard.
- **Materia Medica Search**: A quick search bar to look up remedies and rubrics using the Gemini AI.

### 2. Patient Management
- **Patient List**: View all registered patients with their basic details.
- **Add Patient**: Register new patients with their age, gender, contact info, and initial medical history.
- **Patient Details & History**: Click "Details" on any patient to view their complete profile, including a chronological timeline of all past consultations, symptoms recorded, diagnosis, and prescribed remedies.
- **Follow-up**: A quick action button to start a new consultation with the patient pre-selected.

### 3. Case Taking (Consultation)
- **Input Methods**:
  - **Voice Dictation**: Record audio directly in the app. The AI transcribes and extracts symptoms.
  - **Text Input**: Type symptoms manually.
  - **Image/Report Upload**: Upload lab reports or images of physical symptoms for AI analysis.
- **Symptom Extraction**: The Gemini AI processes the input and generates a clean, medically professional list of symptoms/rubrics.
- **Context-Aware Repertorization**: When "Repertorize" is clicked, the AI analyzes the current symptoms. **Crucially, it also analyzes the patient's entire past consultation history (in chronological order)** to understand the timeline, progression of the case, and previous remedies.
- **AI Output**:
  - **Case Analysis & Diagnosis**: A summary of the patient's current issues.
  - **Suggested Remedies**: Top 3 remedies with detailed reasoning (referencing past history if relevant).
  - **Dosage**: Suggested potency and frequency.
  - **Follow-up**: Recommendation on when to check in next.
- **Save Consultation**: Prescribe a remedy and save the entire consultation record to the patient's history.

### 4. Calendar & Appointments
- **Scheduling**: Schedule new appointments for patients.
- **Daily View**: View all appointments for a selected date.

### 5. Materia Medica
- **Semantic Search**: Ask complex questions about remedies, symptoms, or rubrics, and the AI will provide detailed answers based on homeopathic literature.

## Technical Architecture
- **Frontend**: React 19, Vite, Tailwind CSS, shadcn/ui components.
- **Backend/Database**: Firebase Firestore (NoSQL database).
- **Authentication**: Firebase Authentication (Google Sign-In).
- **AI Integration**: `@google/genai` SDK using `gemini-3-flash-preview` for text/analysis, `gemini-3.1-flash-image-preview` for images, and `gemini-3.1-flash-live-preview` for audio processing.

## Data Flow (Consultation)
1. Doctor selects a patient.
2. App fetches all past consultations for that patient from Firestore.
3. Doctor inputs new symptoms (Voice/Text/Image).
4. AI extracts clean symptoms.
5. Doctor clicks Repertorize.
6. App sends current symptoms + chronological past consultations to Gemini AI.
7. AI returns structured JSON (Issues, Remedies, Reasoning, Dosage, Follow-up).
8. Doctor reviews, selects a remedy, and saves.
9. App writes the new consultation record to Firestore.
