"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, FileText, Loader2, Mic, Save, Square, Upload } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { showError } from "@/hooks/use-toast-error";
import { api } from "@/lib/api/endpoints";
import type { AnalysisResult, Remedy } from "@/lib/api/types";
import { cn } from "@/lib/utils";

export function ConsultationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState(searchParams.get("patientId") || "");
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedSymptoms, setExtractedSymptoms] = useState("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const patientsQuery = useQuery({ queryKey: ["patients"], queryFn: () => api.listPatients() });
  const consultationsQuery = useQuery({
    queryKey: ["patient-consultations", selectedPatient],
    queryFn: () => api.listConsultations(selectedPatient),
    enabled: Boolean(selectedPatient),
  });

  useEffect(() => {
    const patientId = searchParams.get("patientId") || "";
    if (patientId) setSelectedPatient(patientId);
  }, [searchParams]);

  const saveMutation = useMutation({
    mutationFn: (remedy: Remedy) =>
      api.createConsultation({
        patientId: selectedPatient,
        date: new Date().toISOString(),
        symptoms: extractedSymptoms,
        repertorization: JSON.stringify(analysisResult),
        prescribedRemedy: remedy.remedy,
        potency: remedy.dosage,
        notes: `Issues: ${analysisResult?.issues}\n\nReasoning: ${remedy.reasoning}\nFollow-up: ${remedy.followUp}`,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["patient-consultations", selectedPatient] });
      await queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Consultation saved successfully");
      router.push("/patients");
    },
    onError: (error) => showError(error),
  });

  const appendSymptoms = (text: string) => {
    setExtractedSymptoms((previous) => previous + (previous ? "\n\n" : "") + text);
  };

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await handleAudioProcessing(audioBlob);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      showError(error, "Could not access microphone");
    }
  };

  const handleStopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    setIsRecording(false);
  };

  const handleAudioProcessing = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const base64data = await blobToBase64(blob);
      const result = await api.processAudio(base64data, blob.type || "audio/webm");
      appendSymptoms(result.text);
      toast.success("Audio processed successfully");
    } catch (error) {
      showError(error, "Failed to process audio");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const base64data = await blobToBase64(file);
      const result = await api.processImage(base64data, file.type);
      appendSymptoms(result.text);
      toast.success("Image processed successfully");
    } catch (error) {
      showError(error, "Failed to process image");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractFromText = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      const result = await api.extractSymptoms(inputText);
      appendSymptoms(result.text);
      setInputText("");
      toast.success("Symptoms extracted");
    } catch (error) {
      showError(error, "Failed to extract symptoms");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRepertorize = async () => {
    if (!extractedSymptoms.trim()) {
      toast.error("Please extract symptoms first");
      return;
    }
    setIsProcessing(true);
    try {
      const result = await api.suggestRemedies(extractedSymptoms, selectedPatient, consultationsQuery.data || []);
      setAnalysisResult(result);
      toast.success("Repertorization complete");
    } catch (error) {
      showError(error, "Failed to repertorize");
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedPatientName = patientsQuery.data?.find((patient) => patient.id === selectedPatient)?.name;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Case Taking</h1>
            <p className="mt-1 text-slate-500">Record symptoms and get AI-powered remedy suggestions.</p>
          </div>
          <div className="w-full sm:w-72">
            <Select value={selectedPatient} onValueChange={(value) => setSelectedPatient(value ?? "")}>
              <SelectTrigger className="w-full bg-white">
                <SelectValue placeholder={selectedPatientName || "Select Patient"} />
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
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="flex flex-col border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-white pb-4">
              <CardTitle className="text-lg">Input Symptoms</CardTitle>
              <CardDescription>Use voice, text, or upload reports.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 bg-white p-6">
              <Tabs defaultValue="voice" className="w-full">
                <TabsList className="mb-6 grid w-full grid-cols-3">
                  <TabsTrigger value="voice">
                    <Mic />
                    Voice
                  </TabsTrigger>
                  <TabsTrigger value="text">
                    <FileText />
                    Text
                  </TabsTrigger>
                  <TabsTrigger value="image">
                    <Upload />
                    Image
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="voice" className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    {isRecording ? <div className="absolute -inset-4 animate-ping rounded-full bg-red-100 opacity-75" /> : null}
                    <button
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      className={cn(
                        "relative z-10 flex size-24 items-center justify-center rounded-full shadow-lg transition-all",
                        isRecording ? "bg-red-500 hover:bg-red-600" : "bg-teal-600 hover:bg-teal-700",
                      )}
                    >
                      {isRecording ? <Square className="fill-current text-white" /> : <Mic className="text-white" />}
                    </button>
                  </div>
                  <p className="mt-6 font-medium text-slate-500">{isRecording ? "Recording... Tap to stop" : "Tap to start dictating symptoms"}</p>
                </TabsContent>

                <TabsContent value="text" className="flex flex-col gap-4">
                  <Textarea
                    placeholder="Type patient symptoms here..."
                    className="min-h-[200px] resize-none"
                    value={inputText}
                    onChange={(event) => setInputText(event.target.value)}
                  />
                  <Button className="w-full bg-teal-600 text-white hover:bg-teal-700" onClick={handleExtractFromText} disabled={!inputText.trim() || isProcessing}>
                    {isProcessing ? <Loader2 className="animate-spin" /> : null}
                    Extract Symptoms
                  </Button>
                </TabsContent>

                <TabsContent value="image" className="flex flex-col gap-4">
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 p-12 text-center transition-colors hover:bg-slate-50">
                    <Upload className="mb-4 text-slate-400" />
                    <p className="mb-2 text-sm text-slate-600">Upload lab reports or images of physical symptoms</p>
                    <Label htmlFor="image-upload" className="cursor-pointer font-medium text-teal-600 hover:underline">
                      Browse Files
                    </Label>
                    <Input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isProcessing} />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="flex-1 border-slate-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-white pb-4">
                <CardTitle className="text-lg">Extracted Symptoms</CardTitle>
                <Button size="sm" onClick={handleRepertorize} disabled={!extractedSymptoms.trim() || isProcessing} className="bg-slate-900 text-white hover:bg-slate-800">
                  {isProcessing ? <Loader2 className="animate-spin" /> : <Activity />}
                  Repertorize
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Textarea
                  className="min-h-[200px] resize-none rounded-none border-0 p-6 focus-visible:ring-0"
                  placeholder="Extracted symptoms will appear here. You can edit them before repertorization."
                  value={extractedSymptoms}
                  onChange={(event) => setExtractedSymptoms(event.target.value)}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {analysisResult?.remedies?.length ? (
          <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="text-teal-600" />
                    Case Analysis & Diagnosis
                  </CardTitle>
                  {analysisResult.evidenceQuality ? <EvidenceQualityBadge quality={analysisResult.evidenceQuality} /> : null}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <p className="whitespace-pre-wrap text-slate-700">{analysisResult.issues}</p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-white">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="text-teal-600" />
                  Suggested Remedies
                </CardTitle>
                <CardDescription>Based on case analysis and repertorization</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                  {analysisResult.remedies.map((remedy) => (
                    <div
                      key={`${remedy.rank}-${remedy.remedy}`}
                      className={cn(
                        "flex flex-col rounded-xl border bg-white p-5 transition-colors",
                        remedy.rank === "PRIMARY" ? "border-teal-500 shadow-md ring-1 ring-teal-500" : "border-slate-200 hover:border-teal-300",
                      )}
                    >
                      <div className="mb-4 flex flex-col">
                        <div className="mb-1 flex items-center justify-between">
                          <span
                            className={cn(
                              "rounded-full px-2 py-1 text-xs font-bold",
                              remedy.rank === "PRIMARY"
                                ? "bg-teal-100 text-teal-800"
                                : remedy.rank === "ALTERNATIVE"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-slate-100 text-slate-800",
                            )}
                          >
                            {remedy.rank}
                          </span>
                          {remedy.matchPercentage ? <span className="text-sm font-bold text-slate-500">{remedy.matchPercentage}% Match</span> : null}
                        </div>
                        <h3 className="mt-2 text-xl font-bold text-slate-900">{remedy.remedy}</h3>
                        {remedy.evidenceScore ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <EvidenceQualityBadge quality={remedy.evidenceScore.quality} compact />
                            <span>
                              {remedy.evidenceScore.rubricCount} rubrics, weight {remedy.evidenceScore.cumulativeWeight}/
                              {remedy.evidenceScore.maxPossibleWeight}
                            </span>
                          </div>
                        ) : null}
                      </div>
                      <div className="mb-6 flex flex-1 flex-col gap-4">
                        <Field label="Reasoning" value={remedy.reasoning} />
                        <div className="rounded-lg bg-slate-50 p-3">
                          <Field label="Dosage" value={remedy.dosage} strong />
                        </div>
                        <Field label="Follow-up" value={remedy.followUp} />
                      </div>
                      <Button
                        variant={remedy.rank === "PRIMARY" ? "default" : "outline"}
                        className={cn("w-full", remedy.rank === "PRIMARY" ? "bg-teal-600 text-white hover:bg-teal-700" : "border-teal-200 text-teal-700 hover:bg-teal-50")}
                        onClick={() => {
                          if (!selectedPatient) {
                            toast.error("Please select a patient");
                            return;
                          }
                          saveMutation.mutate(remedy);
                        }}
                        disabled={saveMutation.isPending}
                      >
                        <Save />
                        Prescribe & Save
                      </Button>
                    </div>
                  ))}
                </div>

                {analysisResult.differentiationLogic ? (
                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-900">
                      <Activity className="text-amber-500" />
                      Differentiation Logic (Why Not)
                    </h4>
                    <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-amber-900">{analysisResult.differentiationLogic}</p>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <p className={cn("mt-1 text-sm leading-relaxed", strong ? "font-medium text-slate-900" : "text-slate-700")}>{value}</p>
    </div>
  );
}

function EvidenceQualityBadge({ quality, compact = false }: { quality: string; compact?: boolean }) {
  const normalized = quality.toLowerCase();
  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize",
        compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        normalized === "strong"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : normalized === "moderate"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : normalized === "weak"
              ? "border-orange-200 bg-orange-50 text-orange-700"
              : "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      Evidence: {quality}
    </Badge>
  );
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onloadend = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(blob);
  });
}
