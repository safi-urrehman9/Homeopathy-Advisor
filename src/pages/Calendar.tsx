import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { format, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { Clock, Trash2 } from 'lucide-react';

export function CalendarView() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newApt, setNewApt] = useState({ patientId: '', time: '09:00', notes: '' });

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch appointments
    const qAppt = query(
      collection(db, 'appointments'),
      where('doctorId', '==', auth.currentUser.uid),
      orderBy('date', 'asc')
    );

    const unsubAppt = onSnapshot(qAppt, (snapshot) => {
      setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'appointments'));

    // Fetch patients for dropdown
    const qPat = query(
      collection(db, 'patients'),
      where('doctorId', '==', auth.currentUser.uid)
    );

    const unsubPat = onSnapshot(qPat, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'patients'));

    return () => {
      unsubAppt();
      unsubPat();
    };
  }, []);

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !date || !newApt.patientId) return;

    const patient = patients.find(p => p.id === newApt.patientId);
    
    // Combine date and time
    const [hours, minutes] = newApt.time.split(':');
    const aptDate = new Date(date);
    aptDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    try {
      await addDoc(collection(db, 'appointments'), {
        doctorId: auth.currentUser.uid,
        patientId: newApt.patientId,
        patientName: patient?.name || 'Unknown',
        date: aptDate.toISOString(),
        status: 'scheduled',
        notes: newApt.notes,
        createdAt: new Date().toISOString()
      });
      setIsAddDialogOpen(false);
      setNewApt({ patientId: '', time: '09:00', notes: '' });
      toast.success('Appointment scheduled');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'appointments');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Cancel this appointment?')) return;
    try {
      await deleteDoc(doc(db, 'appointments', id));
      toast.success('Appointment cancelled');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `appointments/${id}`);
    }
  };

  const selectedDateAppointments = appointments.filter(apt => 
    date && isSameDay(new Date(apt.date), date)
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Calendar</h1>
            <p className="text-slate-500 mt-1">Schedule and manage patient appointments.</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                New Appointment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Appointment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddAppointment} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Patient *</Label>
                  <Select value={newApt.patientId} onValueChange={v => setNewApt({...newApt, patientId: v})} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <div className="p-2 border rounded-md bg-slate-50 text-slate-700">
                      {date ? format(date, 'PPP') : 'Select a date'}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Time *</Label>
                    <Input type="time" required value={newApt.time} onChange={e => setNewApt({...newApt, time: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={newApt.notes} onChange={e => setNewApt({...newApt, notes: e.target.value})} placeholder="Reason for visit..." />
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">Schedule</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 shadow-sm border-slate-200 h-fit">
            <CardContent className="p-4 flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md"
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 shadow-sm border-slate-200">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg">
                {date ? format(date, 'EEEE, MMMM d, yyyy') : 'Select a date'}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {selectedDateAppointments.length === 0 ? (
                <div className="p-12 text-center text-slate-500">
                  <p>No appointments scheduled for this day.</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {selectedDateAppointments.map((apt) => (
                    <li key={apt.id} className="p-4 hover:bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl bg-teal-50 flex flex-col items-center justify-center text-teal-700">
                          <span className="text-lg font-bold">{format(new Date(apt.date), 'HH:mm')}</span>
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 text-lg">{apt.patientName}</p>
                          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" /> {apt.status}
                          </p>
                          {apt.notes && <p className="text-sm text-slate-600 mt-1 italic">{apt.notes}</p>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(apt.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
