import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Search, Plus, User, Phone, Mail, Calendar, Trash2, Activity } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function Patients() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', age: '', gender: '', phone: '', email: '', history: '' });

  const [selectedPatientDetails, setSelectedPatientDetails] = useState<any | null>(null);
  const [patientConsultations, setPatientConsultations] = useState<any[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'patients'),
      where('doctorId', '==', auth.currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'patients'));

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedPatientDetails) {
      setPatientConsultations([]);
      return;
    }
    const qCons = query(
      collection(db, 'consultations'), 
      where('patientId', '==', selectedPatientDetails.id),
      orderBy('createdAt', 'desc')
    );
    const unsubCons = onSnapshot(qCons, (snapshot) => {
      setPatientConsultations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'consultations'));
    return () => unsubCons();
  }, [selectedPatientDetails]);

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    try {
      await addDoc(collection(db, 'patients'), {
        doctorId: auth.currentUser.uid,
        name: newPatient.name,
        age: newPatient.age ? parseInt(newPatient.age) : null,
        gender: newPatient.gender,
        phone: newPatient.phone,
        email: newPatient.email,
        history: newPatient.history,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setIsAddDialogOpen(false);
      setNewPatient({ name: '', age: '', gender: '', phone: '', email: '', history: '' });
      toast.success('Patient added successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'patients');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this patient?')) return;
    try {
      await deleteDoc(doc(db, 'patients', id));
      toast.success('Patient deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `patients/${id}`);
    }
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.phone && p.phone.includes(searchQuery))
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Patients</h1>
            <p className="text-slate-500 mt-1">Manage your patient records and history.</p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2">
                <Plus className="h-4 w-4" /> Add Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Patient</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddPatient} className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" required value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <Input id="age" type="number" value={newPatient.age} onChange={e => setNewPatient({...newPatient, age: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Input id="gender" value={newPatient.gender} onChange={e => setNewPatient({...newPatient, gender: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={newPatient.email} onChange={e => setNewPatient({...newPatient, email: e.target.value})} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="history">Medical History</Label>
                    <Input id="history" value={newPatient.history} onChange={e => setNewPatient({...newPatient, history: e.target.value})} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">Save Patient</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search patients by name or phone..." 
                className="pl-10 bg-slate-50 border-slate-200"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                      No patients found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-medium text-sm">
                            {patient.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{patient.name}</p>
                            <p className="text-xs text-slate-500">{patient.age ? `${patient.age} yrs` : ''} {patient.gender}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-slate-600 space-y-1">
                          {patient.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {patient.phone}</div>}
                          {patient.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /> {patient.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {format(new Date(patient.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" className="text-slate-600 hover:bg-slate-50" onClick={() => setSelectedPatientDetails(patient)}>
                            <User className="h-4 w-4 mr-1" /> Details
                          </Button>
                          <Button variant="outline" size="sm" className="text-teal-600 border-teal-200 hover:bg-teal-50" onClick={() => navigate(`/consultation?patientId=${patient.id}`)}>
                            <Activity className="h-4 w-4 mr-1" /> Follow-up
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(patient.id)}>
                            <Trash2 className="h-4 w-4" />
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

      {/* Patient Details Dialog */}
      <Dialog open={!!selectedPatientDetails} onOpenChange={(open) => !open && setSelectedPatientDetails(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-teal-700 flex items-center gap-2">
              <User className="h-6 w-6" />
              {selectedPatientDetails?.name}'s History
            </DialogTitle>
          </DialogHeader>
          
          {selectedPatientDetails && (
            <div className="space-y-6 mt-4">
              {/* Patient Info Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 bg-slate-50 p-5 rounded-xl border border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Age/Gender</p>
                  <p className="text-sm font-medium text-slate-900">{selectedPatientDetails.age ? `${selectedPatientDetails.age} yrs, ` : ''}{selectedPatientDetails.gender}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Phone</p>
                  <p className="text-sm font-medium text-slate-900">{selectedPatientDetails.phone || 'N/A'}</p>
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Email</p>
                  <p className="text-sm font-medium text-slate-900 truncate" title={selectedPatientDetails.email || 'N/A'}>{selectedPatientDetails.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Registered</p>
                  <p className="text-sm font-medium text-slate-900">{format(new Date(selectedPatientDetails.createdAt), 'MMM d, yyyy')}</p>
                </div>
                {selectedPatientDetails.history && (
                  <div className="col-span-1 sm:col-span-2 lg:col-span-4 mt-2">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Initial History</p>
                    <p className="text-sm text-slate-700">{selectedPatientDetails.history}</p>
                  </div>
                )}
              </div>

              {/* Consultations Timeline */}
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5 text-teal-600" /> Consultations ({patientConsultations.length})
                </h3>
                
                {patientConsultations.length === 0 ? (
                  <p className="text-slate-500 text-sm italic">No consultations recorded yet.</p>
                ) : (
                  <div className="space-y-4">
                    {patientConsultations.map((consultation, idx) => (
                      <Card key={consultation.id} className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 py-3">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-sm font-bold text-slate-700 flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(consultation.createdAt), 'MMMM d, yyyy - h:mm a')}
                            </CardTitle>
                            {consultation.prescribedRemedy && (
                              <span className="px-2.5 py-1 bg-teal-100 text-teal-800 text-xs font-bold rounded-full">
                                {consultation.prescribedRemedy} {consultation.potency && `(${consultation.potency})`}
                              </span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Symptoms Recorded</p>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{consultation.symptoms}</p>
                          </div>
                          
                          {consultation.notes && (
                            <div className="bg-teal-50/50 p-3 rounded-lg border border-teal-100">
                              <p className="text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1">Diagnosis & Notes</p>
                              <p className="text-sm text-teal-900 whitespace-pre-wrap">{consultation.notes}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
