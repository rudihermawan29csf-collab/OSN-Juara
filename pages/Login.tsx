import React, { useState, useEffect } from 'react';
import { UserRole, Student, SchoolSettings } from '../types';
import { storage } from '../services/storageService';

interface LoginProps {
  onLogin: (role: UserRole, username: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  // Initialize directly to ensure data is available on first render
  const [settings, setSettings] = useState<SchoolSettings>(storage.settings.get());
  
  // State for Admin
  const [password, setPassword] = useState('');

  // State for Teacher
  const [teacherCategory, setTeacherCategory] = useState<'OSN IPA' | 'OSN IPS' | 'OSN Matematika'>('OSN IPA');

  // State for Student
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  useEffect(() => {
    // Initial fetch
    setSettings(storage.settings.get());

    if (role === UserRole.STUDENT) {
      loadStudents();
    } else {
      setPassword('');
    }
  }, [role]);

  const loadStudents = () => {
      const data = storage.students.getAll();
      setStudents(data);
      const uniqueClasses = Array.from(new Set(data.map(s => s.class))).sort();
      setClasses(uniqueClasses);
      // Jangan reset selectedClass jika user sedang memilih
      if (!selectedClass) setSelectedClass('');
      if (!selectedStudentId) setSelectedStudentId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Refresh settings one last time before checking password
    const currentSettings = storage.settings.get();

    if (role === UserRole.ADMIN) {
      if (password === currentSettings.adminPassword) {
        onLogin(role, 'Administrator');
      } else {
        alert('Password Administrator Salah!');
      }
    } 
    else if (role === UserRole.TEACHER) {
      const pass = password.trim();
      if (teacherCategory === 'OSN IPA') {
        if (pass === currentSettings.teacherIpaPassword) {
            onLogin(role, 'Guru OSN IPA');
        } else {
            alert('Password Guru OSN IPA salah!');
        }
      } else if (teacherCategory === 'OSN IPS') {
        if (pass === currentSettings.teacherIpsPassword) {
            onLogin(role, 'Guru OSN IPS');
        } else {
            alert('Password Guru OSN IPS salah!');
        }
      } else if (teacherCategory === 'OSN Matematika') {
        if (pass === currentSettings.teacherMtkPassword) {
            onLogin(role, 'Guru OSN Matematika');
        } else {
            alert('Password Guru OSN Matematika salah!');
        }
      }
    } 
    else if (role === UserRole.STUDENT) {
      if (selectedStudentId) {
        const student = students.find(s => s.id === selectedStudentId);
        if (student) {
          onLogin(role, student.name);
        }
      } else {
        alert('Mohon pilih nama siswa.');
      }
    }
  };

  const filteredStudents = selectedClass 
    ? students.filter(s => s.class === selectedClass) 
    : [];

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 font-sans"
      style={{ 
        backgroundImage: `url('https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2670&auto=format&fit=crop')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      <div className="absolute inset-0 bg-indigo-900/20 backdrop-blur-[2px]"></div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/10 backdrop-filter backdrop-blur-xl border border-white/20 rounded-[2rem] shadow-2xl overflow-hidden p-8 text-center ring-1 ring-white/10">
            
            <div className="flex justify-center mb-6">
                <div className="w-24 h-24 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md shadow-lg border border-white/20 p-3">
                   <img 
                       src="https://image2url.com/r2/default/images/1769001049680-d981c280-6340-4989-8563-7b08134c189a.png" 
                       alt="Logo Sekolah" 
                       className="w-full h-full object-contain drop-shadow-md"
                   />
                </div>
            </div>

            <h1 className="text-3xl font-extrabold text-white mb-1 drop-shadow-lg tracking-tight">
                {settings.loginTitle || "OSN Juara"}
            </h1>
            <p className="text-purple-100 font-medium text-sm mb-8 drop-shadow-md tracking-wide opacity-90">
                {settings.schoolName || "Sekolah"} • {settings.academicYear} {settings.semester}
            </p>

            <div className="bg-indigo-900/30 p-1 rounded-xl flex mb-6 backdrop-blur-md border border-white/10">
                {[UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN].map((r) => (
                    <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all duration-300 ${
                        role === r
                        ? 'bg-white text-gray-900 shadow-md scale-100'
                        : 'text-white/70 hover:bg-white/10 hover:text-white scale-95'
                    }`}
                    >
                    {r === UserRole.STUDENT ? 'Siswa' : r === UserRole.TEACHER ? 'Guru' : 'Admin'}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-left">
                {role === UserRole.STUDENT ? (
                    <>
                    <div className="space-y-1 group">
                        <div className="flex justify-between items-end">
                            <label className="text-white text-[10px] font-bold ml-1 uppercase tracking-wider opacity-90">Kelas</label>
                        </div>
                        <div className="relative">
                            <select
                                value={selectedClass}
                                onChange={(e) => {
                                    setSelectedClass(e.target.value);
                                    setSelectedStudentId('');
                                }}
                                className="w-full px-4 py-3 bg-indigo-900/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-white/50 focus:bg-indigo-900/50 outline-none text-white placeholder-white/50 backdrop-blur-sm transition-all appearance-none cursor-pointer hover:bg-indigo-900/50 font-medium"
                                required
                            >
                                <option value="" className="text-gray-900 bg-white">Pilih Kelas</option>
                                {classes.map(c => <option key={c} value={c} className="text-gray-900 bg-white">{c}</option>)}
                            </select>
                            <div className="absolute right-4 top-3.5 pointer-events-none text-white/80">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1 group">
                        <label className="text-white text-[10px] font-bold ml-1 uppercase tracking-wider opacity-90">Nama Siswa</label>
                        <div className="relative">
                            <select
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                className="w-full px-4 py-3 bg-indigo-900/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-white/50 focus:bg-indigo-900/50 outline-none text-white placeholder-white/50 backdrop-blur-sm transition-all disabled:opacity-50 appearance-none cursor-pointer hover:bg-indigo-900/50 font-medium"
                                disabled={!selectedClass}
                                required
                            >
                                <option value="" className="text-gray-900 bg-white">
                                    {students.length === 0 ? "Data Kosong (Klik Refresh)" : "Pilih Nama"}
                                </option>
                                {filteredStudents.map(s => (
                                    <option key={s.id} value={s.id} className="text-gray-900 bg-white">{s.name} ({s.nis})</option>
                                ))}
                            </select>
                             <div className="absolute right-4 top-3.5 pointer-events-none text-white/80">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    </>
                ) : (
                    <>
                    {role === UserRole.TEACHER && (
                        <div className="space-y-1 group">
                             <label className="text-white text-[10px] font-bold ml-1 uppercase tracking-wider opacity-90">Kategori / Mata Pelajaran</label>
                             <div className="relative">
                                <select
                                    value={teacherCategory}
                                    onChange={(e) => setTeacherCategory(e.target.value as 'OSN IPA' | 'OSN IPS' | 'OSN Matematika')}
                                    className="w-full px-4 py-3 bg-indigo-900/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-white/50 focus:bg-indigo-900/50 outline-none text-white placeholder-white/50 backdrop-blur-sm transition-all appearance-none cursor-pointer hover:bg-indigo-900/50 font-medium"
                                >
                                    <option value="OSN IPA" className="text-gray-900 bg-white">Guru OSN IPA</option>
                                    <option value="OSN IPS" className="text-gray-900 bg-white">Guru OSN IPS</option>
                                    <option value="OSN Matematika" className="text-gray-900 bg-white">Guru OSN Matematika</option>
                                </select>
                                <div className="absolute right-4 top-3.5 pointer-events-none text-white/80">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {role === UserRole.ADMIN && (
                        <div className="space-y-1 group">
                            <label className="text-white text-[10px] font-bold ml-1 uppercase tracking-wider opacity-90">Username</label>
                            <input
                                type="text"
                                value="admin"
                                readOnly
                                className="w-full px-4 py-3 bg-white/10 border border-white/10 rounded-xl text-white/50 cursor-not-allowed text-center font-mono tracking-wider font-bold"
                            />
                        </div>
                    )}

                    <div className="space-y-1 group">
                        <label className="text-white text-[10px] font-bold ml-1 uppercase tracking-wider opacity-90">Password</label>
                        <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 bg-indigo-900/30 border border-white/10 rounded-xl focus:ring-2 focus:ring-white/50 focus:bg-indigo-900/50 outline-none text-white placeholder-white/50 backdrop-blur-sm transition-all font-medium"
                        placeholder="••••••••"
                        required
                        />
                    </div>
                    </>
                )}

                <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-900/30 backdrop-blur-sm transform hover:scale-[1.02] active:scale-[0.98] transition-all mt-6 border border-white/20"
                >
                    Masuk Aplikasi
                </button>
            </form>
            
            <div className="mt-8 flex items-center justify-center gap-2 text-white/40 text-[10px] font-light uppercase tracking-widest">
                <span>Secured by OSN Juara System</span>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;