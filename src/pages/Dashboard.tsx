import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { collection as firestoreCollection, query as firestoreQuery, where as firestoreWhere, orderBy as firestoreOrderBy, limit as firestoreLimit, onSnapshot as firestoreOnSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Mic, Search, Calendar as CalendarIcon, Users, Activity, Clock } from 'lucide-react';
import { format, isToday } from 'date-fns';

export function Dashboard() {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [recentPatients, setRecentPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch today's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const qAppt = firestoreQuery(
      firestoreCollection(db, 'appointments'),
      firestoreWhere('doctorId', '==', auth.currentUser.uid),
      firestoreWhere('date', '>=', today.toISOString()),
      firestoreWhere('date', '<', tomorrow.toISOString()),
      firestoreOrderBy('date', 'asc')
    );

    const unsubAppt = firestoreOnSnapshot(qAppt, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'appointments'));

    // Fetch recent patients
    const qPat = firestoreQuery(
      firestoreCollection(db, 'patients'),
      firestoreWhere('doctorId', '==', auth.currentUser.uid),
      firestoreOrderBy('createdAt', 'desc'),
      firestoreLimit(5)
    );

    const unsubPat = firestoreOnSnapshot(qPat, (snapshot) => {
      setRecentPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'patients'));

    return () => {
      unsubAppt();
      unsubPat();
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/materia-medica?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Good morning, Dr. {auth.currentUser?.displayName?.split(' ')[0] || 'Doctor'}</h1>
            <p className="text-slate-500 mt-1">Here's what's happening today.</p>
          </div>
          
          <form onSubmit={handleSearch} className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search Materia Medica or Repertory..." 
              className="pl-10 bg-white border-slate-200 focus-visible:ring-teal-500 rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        {/* Quick Action - Voice Dictation */}
        <Card className="bg-gradient-to-br from-teal-500 to-teal-700 text-white border-none shadow-md">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6 cursor-pointer hover:bg-white/30 transition-colors" onClick={() => navigate('/consultation')}>
              <Mic className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Start New Consultation</h2>
            <p className="text-teal-100 max-w-md">Tap the microphone to begin voice dictation. The AI will automatically extract symptoms and suggest remedies.</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Today's Appointments */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-teal-600" />
                  Today's Appointments
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/calendar')} className="text-teal-600 hover:text-teal-700">View All</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {appointments.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <p>No appointments scheduled for today.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {appointments.map((apt) => (
                    <li key={apt.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-700 font-bold">
                          {format(new Date(apt.date), 'HH:mm')}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{apt.patientName}</p>
                          <p className="text-sm text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {apt.status}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate(`/consultation?patientId=${apt.patientId}`)}>
                        Start
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Recent Patients */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-600" />
                  Recent Patients
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/patients')} className="text-teal-600 hover:text-teal-700">View All</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {recentPatients.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <p>No patients added yet.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentPatients.map((patient) => (
                    <li key={patient.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer" onClick={() => navigate(`/consultation?patientId=${patient.id}`)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-medium">
                          {patient.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{patient.name}</p>
                          <p className="text-sm text-slate-500">{patient.phone || patient.email || 'No contact info'}</p>
                        </div>
                      </div>
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
