import { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Activity, Users, Calendar, BookOpen, LogOut, Menu, X, PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';

export function Layout({ children, user }: { children: ReactNode, user: any }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
  };

  const navItems = [
    { to: '/', icon: Activity, label: 'Dashboard' },
    { to: '/patients', icon: Users, label: 'Patients' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/materia-medica', icon: BookOpen, label: 'Materia Medica' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2 text-teal-600 font-bold text-xl">
          <Activity className="h-6 w-6" />
          VitalForce AI
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-500">
          {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-10 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out flex flex-col
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        <div className="p-6 hidden md:flex items-center gap-2 text-teal-600 font-bold text-2xl border-b border-slate-100">
          <Activity className="h-8 w-8" />
          VitalForce AI
        </div>

        <div className="p-4">
          <Button 
            className="w-full bg-teal-600 hover:bg-teal-700 text-white gap-2"
            onClick={() => {
              navigate('/consultation');
              setIsMobileMenuOpen(false);
            }}
          >
            <PlusCircle className="h-4 w-4" />
            New Consultation
          </Button>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors
                ${isActive 
                  ? 'bg-teal-50 text-teal-700' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <img src={user?.photoURL || 'https://ui-avatars.com/api/?name=' + user?.email} alt="User" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.displayName || 'Doctor'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {children}
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-0 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
