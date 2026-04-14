import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { extractSymptoms, suggestRemedies, processAudio, processImage } from '../lib/gemini';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Mic, Square, Upload, FileText, Activity, Loader2, Save, Play } from 'lucide-react';
import { toast } from 'sonner';

export function Consultation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialPatientId = searchParams.get('patientId') || '';

  const [patients, setPatients] = useState<any[]>([]);
  const [selectedPatient, setSelectedPatient] = useState(initialPatientId);
  const [pastConsultations, setPastConsultations] = useState<any[]>([]);
  
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [extractedSymptoms, setExtractedSymptoms] = useState('');
  const [analysisResult, setAnalysisResult] = useState<{issues: string, remedies: any[]} | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const qPat = query(collection(db, 'patients'), where('doctorId', '==', auth.currentUser.uid));
    const unsubPat = onSnapshot(qPat, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'patients'));
    return () => unsubPat();
  }, []);

  useEffect(() => {
    if (!selectedPatient) {
      setPastConsultations([]);
      return;
    }
    const qCons = query(
      collection(db, 'consultations'), 
      where('patientId', '==', selectedPatient),
      orderBy('createdAt', 'desc')
    );
    const unsubCons = onSnapshot(qCons, (snapshot) => {
      setPastConsultations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'consultations'));
    return () => unsubCons();
  }, [selectedPatient]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioProcessing(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast.error("Could not access microphone");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleAudioProcessing = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        const result = await processAudio(base64data, blob.type || 'audio/webm');
        setExtractedSymptoms(prev => prev + (prev ? '\\n\\n' : '') + result);
        toast.success("Audio processed successfully");
      };
    } catch (error) {
      console.error(error);
      toast.error("Failed to process audio");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        const result = await processImage(base64data, file.type);
        setExtractedSymptoms(prev => prev + (prev ? '\\n\\n' : '') + result);
        toast.success("Image processed successfully");
      };
    } catch (error) {
      console.error(error);
      toast.error("Failed to process image");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtractFromText = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    try {
      const result = await extractSymptoms(inputText);
      setExtractedSymptoms(prev => prev + (prev ? '\\n\\n' : '') + result);
      setInputText('');
      toast.success("Symptoms extracted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to extract symptoms");
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
      const result = await suggestRemedies(extractedSymptoms, pastConsultations);
      setAnalysisResult(result);
      toast.success("Repertorization complete");
    } catch (error) {
      console.error(error);
      toast.error("Failed to repertorize");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveConsultation = async (remedy: any) => {
    if (!auth.currentUser || !selectedPatient) {
      toast.error("Please select a patient");
      return;
    }
    try {
      await addDoc(collection(db, 'consultations'), {
        doctorId: auth.currentUser.uid,
        patientId: selectedPatient,
        date: new Date().toISOString(),
        symptoms: extractedSymptoms,
        repertorization: JSON.stringify(analysisResult),
        prescribedRemedy: remedy.remedy,
        potency: remedy.dosage,
        notes: `Issues: ${analysisResult?.issues}\n\nReasoning: ${remedy.reasoning}\nFollow-up: ${remedy.followUp}`,
        createdAt: new Date().toISOString()
      });
      toast.success("Consultation saved successfully");
      navigate('/patients');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'consultations');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Case Taking</h1>
            <p className="text-slate-500 mt-1">Record symptoms and get AI-powered remedy suggestions.</p>
          </div>
          
          <div className="w-full sm:w-72">
            <Select value={selectedPatient} onValueChange={setSelectedPatient}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Select Patient">
                  {selectedPatient ? patients.find(p => p.id === selectedPatient)?.name : "Select Patient"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {patients.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <Card className="shadow-sm border-slate-200 flex flex-col">
            <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl pb-4">
              <CardTitle className="text-lg">Input Symptoms</CardTitle>
              <CardDescription>Use voice, text, or upload reports.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-1 bg-white">
              <Tabs defaultValue="voice" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="voice"><Mic className="h-4 w-4 mr-2"/> Voice</TabsTrigger>
                  <TabsTrigger value="text"><FileText className="h-4 w-4 mr-2"/> Text</TabsTrigger>
                  <TabsTrigger value="image"><Upload className="h-4 w-4 mr-2"/> Image</TabsTrigger>
                </TabsList>
                
                <TabsContent value="voice" className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    {isRecording && (
                      <div className="absolute -inset-4 bg-red-100 rounded-full animate-ping opacity-75"></div>
                    )}
                    <button
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg
                        ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-teal-600 hover:bg-teal-700'}`}
                    >
                      {isRecording ? <Square className="h-8 w-8 text-white fill-current" /> : <Mic className="h-10 w-10 text-white" />}
                    </button>
                  </div>
                  <p className="mt-6 text-slate-500 font-medium">
                    {isRecording ? 'Recording... Tap to stop' : 'Tap to start dictating symptoms'}
                  </p>
                </TabsContent>
                
                <TabsContent value="text" className="space-y-4">
                  <Textarea 
                    placeholder="Type patient symptoms here..." 
                    className="min-h-[200px] resize-none"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                  />
                  <Button 
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                    onClick={handleExtractFromText}
                    disabled={!inputText.trim() || isProcessing}
                  >
                    {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Extract Symptoms
                  </Button>
                </TabsContent>
                
                <TabsContent value="image" className="space-y-4">
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                    <Upload className="h-10 w-10 text-slate-400 mb-4" />
                    <p className="text-sm text-slate-600 mb-2">Upload lab reports or images of physical symptoms</p>
                    <Label htmlFor="image-upload" className="cursor-pointer text-teal-600 font-medium hover:underline">
                      Browse Files
                    </Label>
                    <Input 
                      id="image-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload}
                      disabled={isProcessing}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Analysis Section */}
          <div className="space-y-6 flex flex-col">
            <Card className="shadow-sm border-slate-200 flex-1">
              <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Extracted Symptoms</CardTitle>
                </div>
                <Button 
                  size="sm" 
                  onClick={handleRepertorize}
                  disabled={!extractedSymptoms.trim() || isProcessing}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Activity className="h-4 w-4 mr-2" />}
                  Repertorize
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Textarea 
                  className="min-h-[200px] border-0 focus-visible:ring-0 rounded-none resize-none p-6"
                  placeholder="Extracted symptoms will appear here. You can edit them before repertorization."
                  value={extractedSymptoms}
                  onChange={(e) => setExtractedSymptoms(e.target.value)}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Results Section */}
        {analysisResult && analysisResult.remedies && analysisResult.remedies.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-teal-600" />
                  Case Analysis & Diagnosis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-slate-700 whitespace-pre-wrap">{analysisResult.issues}</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-teal-600" />
                  Suggested Remedies
                </CardTitle>
                <CardDescription>Based on case analysis and repertorization</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {analysisResult.remedies.map((remedy, idx) => (
                    <div key={idx} className={`border rounded-xl p-5 transition-colors bg-white flex flex-col ${remedy.rank === 'PRIMARY' ? 'border-teal-500 shadow-md ring-1 ring-teal-500' : 'border-slate-200 hover:border-teal-300'}`}>
                      <div className="flex flex-col mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${remedy.rank === 'PRIMARY' ? 'bg-teal-100 text-teal-800' : remedy.rank === 'ALTERNATIVE' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'}`}>
                            {remedy.rank}
                          </span>
                          {remedy.matchPercentage && (
                            <span className="text-sm font-bold text-slate-500">{remedy.matchPercentage}% Match</span>
                          )}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mt-2">{remedy.remedy}</h3>
                      </div>
                      <div className="space-y-4 flex-1 mb-6">
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Reasoning</span>
                          <p className="text-sm text-slate-700 mt-1 leading-relaxed">{remedy.reasoning}</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dosage</span>
                          <p className="text-sm text-slate-900 mt-1 font-medium">{remedy.dosage}</p>
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Follow-up</span>
                          <p className="text-sm text-slate-700 mt-1">{remedy.followUp}</p>
                        </div>
                      </div>
                      <Button 
                        variant={remedy.rank === 'PRIMARY' ? 'default' : 'outline'}
                        className={`w-full ${remedy.rank === 'PRIMARY' ? 'bg-teal-600 hover:bg-teal-700 text-white' : 'border-teal-200 text-teal-700 hover:bg-teal-50'}`}
                        onClick={() => handleSaveConsultation(remedy)}
                      >
                        <Save className="h-4 w-4 mr-2" /> Prescribe & Save
                      </Button>
                    </div>
                  ))}
                </div>

                {analysisResult.differentiationLogic && (
                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Activity className="h-4 w-4 text-amber-500" />
                      Differentiation Logic (Why Not)
                    </h4>
                    <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                      <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">{analysisResult.differentiationLogic}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div>
  );
}
