import React, { useState, useEffect } from 'react';
import { UserRole } from './types';
import { storage } from './services/storageService';
import Login from './pages/Login';
import Layout from './components/Layout';
import StudentData from './pages/admin/StudentData';
import QuestionBank from './pages/admin/QuestionBank';
import ExamSchedule from './pages/admin/ExamSchedule';
import Analysis from './pages/admin/Analysis';
import Settings from './pages/admin/Settings';
import Monitoring from './pages/admin/Monitoring';
import Materials from './pages/admin/Materials';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentExamList from './pages/student/StudentExamList';
import StudentResults from './pages/student/StudentResults';
import StudentMaterials from './pages/student/StudentMaterials';
import ExamInterface from './pages/student/ExamInterface';

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [username, setUsername] = useState<string>('');
  const [userCategory, setUserCategory] = useState<string>(''); // Store selected category for student
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [activeExamId, setActiveExamId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string>('Menyiapkan Aplikasi...');

  // INITIAL DATA SYNC
  useEffect(() => {
    const initApp = async () => {
        setSyncStatus('Memuat data...');
        // In offline mode, this just ensures mock data is loaded if empty
        await storage.sync();
        setSyncStatus('Siap.');
        setTimeout(() => setIsLoading(false), 500); 
    };

    initApp();
  }, []);

  const handleLogin = (selectedRole: UserRole, user: string, category?: string) => {
    setRole(selectedRole);
    setUsername(user);
    if (category) setUserCategory(category);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setRole(null);
    setUsername('');
    setUserCategory('');
    setActiveExamId(null);
  };

  const renderContent = () => {
    // Pass username to ExamInterface so results are saved correctly
    if (activeExamId && role === UserRole.STUDENT) {
        return <ExamInterface examId={activeExamId} username={username} onFinish={() => { setActiveExamId(null); setCurrentPage('dashboard'); }} />;
    }

    if (role === UserRole.STUDENT) {
        // Student Routes
        switch(currentPage) {
            case 'dashboard': return <StudentDashboard username={username} sessionCategory={userCategory} />;
            case 'exam_list': return <StudentExamList username={username} onStartExam={setActiveExamId} />;
            case 'materials': return <StudentMaterials username={username} />;
            case 'results': return <StudentResults username={username} />;
            default: return <StudentDashboard username={username} sessionCategory={userCategory} />;
        }
    }

    // Admin & Teacher Routes
    switch (currentPage) {
      case 'dashboard':
        // Calculate Real Stats
        let allStudents = storage.students.getAll();
        let allExams = storage.exams.getAll();
        let allPackets = storage.packets.getAll();

        // Teacher Filter Logic
        if (role === UserRole.TEACHER) {
            const teacherCategory = username.includes('OSN IPA') ? 'OSN IPA' : 
                                    username.includes('OSN IPS') ? 'OSN IPS' : 
                                    username.includes('OSN Matematika') ? 'OSN Matematika' : null;
            
            if (teacherCategory) {
                // Filter Students: Only those who have the subject in their list
                allStudents = allStudents.filter(s => s.osnSubjects && s.osnSubjects.includes(teacherCategory));
                
                // Filter Exams
                allExams = allExams.filter(e => e.category === teacherCategory);

                // Filter Packets
                allPackets = allPackets.filter(p => p.category === teacherCategory);
            }
        }

        const studentCount = allStudents.length;
        const activeExamsCount = allExams.filter(e => e.isActive).length;
        
        // Count packets by category (for display)
        // If teacher, these will be filtered already, so only their category will show up or we can just show total
        const ipaCount = allPackets.filter(p => p.category === 'OSN IPA').length;
        const ipsCount = allPackets.filter(p => p.category === 'OSN IPS').length;
        const mtkCount = allPackets.filter(p => p.category === 'OSN Matematika').length;
        const litCount = allPackets.filter(p => p.category === 'Literasi').length;
        const numCount = allPackets.filter(p => p.category === 'Numerasi').length;

        // Count materials by category
        const allMaterials = storage.materials.getAll();
        const matIpaCount = allMaterials.filter(m => m.category === 'OSN IPA').length;
        const matIpsCount = allMaterials.filter(m => m.category === 'OSN IPS').length;
        const matMtkCount = allMaterials.filter(m => m.category === 'OSN Matematika').length;
        const matLitCount = allMaterials.filter(m => m.category === 'Literasi').length;
        const matNumCount = allMaterials.filter(m => m.category === 'Numerasi').length;

        return (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-2xl font-bold text-gray-800 drop-shadow-sm mb-6">
                Dashboard Overview {role === UserRole.TEACHER && <span className="text-sm font-normal text-gray-500">(Mode Guru: {username})</span>}
            </h2>
            
            {studentCount === 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                    <div className="flex">
                        <div className="flex-shrink-0">⚠️</div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                Data masih kosong. 
                                <br/>
                                Pergi ke menu <b>Pengaturan</b> untuk mereset data ke default (Data Contoh).
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1: Total Siswa */}
                <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/50 flex items-center justify-between hover:transform hover:scale-[1.02] transition-all duration-300 group">
                <div>
                    <h3 className="text-gray-500 font-bold uppercase text-xs tracking-wider">Total Siswa</h3>
                    <p className="text-4xl font-extrabold mt-2 text-gray-800 group-hover:text-blue-600 transition-colors">{studentCount}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Data siswa terdaftar</p>
                </div>
                <div className="w-16 h-16 bg-blue-100/50 rounded-2xl flex items-center justify-center text-4xl shadow-inner text-blue-600">👥</div>
                </div>

                {/* Card 2: Ujian Aktif */}
                <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/50 flex items-center justify-between hover:transform hover:scale-[1.02] transition-all duration-300 group">
                <div>
                    <h3 className="text-gray-500 font-bold uppercase text-xs tracking-wider">Ujian Aktif</h3>
                    <p className="text-4xl font-extrabold mt-2 text-gray-800 group-hover:text-green-600 transition-colors">{activeExamsCount}</p>
                    <p className="text-xs text-gray-500 mt-1 font-medium">Sesuai jadwal ujian</p>
                </div>
                <div className="w-16 h-16 bg-green-100/50 rounded-2xl flex items-center justify-center text-4xl shadow-inner text-green-600">📅</div>
                </div>

                {/* Card 3: Paket Soal (OSN) */}
                <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/50 hover:transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-gray-500 font-bold uppercase text-xs tracking-wider">Paket Soal</h3>
                    <div className="text-2xl opacity-50">📚</div>
                </div>
                <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
                    <div className="flex-1 min-w-[60px] bg-green-100/60 p-2 rounded-xl border border-green-200/50 text-center shadow-sm">
                        <span className="block text-xl font-bold text-green-700">{ipaCount}</span>
                        <span className="text-[9px] text-green-900/60 uppercase font-bold tracking-wider">IPA</span>
                    </div>
                    <div className="flex-1 min-w-[60px] bg-orange-100/60 p-2 rounded-xl border border-orange-200/50 text-center shadow-sm">
                        <span className="block text-xl font-bold text-orange-700">{ipsCount}</span>
                        <span className="text-[9px] text-orange-900/60 uppercase font-bold tracking-wider">IPS</span>
                    </div>
                    <div className="flex-1 min-w-[60px] bg-blue-100/60 p-2 rounded-xl border border-blue-200/50 text-center shadow-sm">
                        <span className="block text-xl font-bold text-blue-700">{mtkCount}</span>
                        <span className="text-[9px] text-blue-900/60 uppercase font-bold tracking-wider">MTK</span>
                    </div>
                    <div className="flex-1 min-w-[60px] bg-purple-100/60 p-2 rounded-xl border border-purple-200/50 text-center shadow-sm">
                        <span className="block text-xl font-bold text-purple-700">{litCount}</span>
                        <span className="text-[9px] text-purple-900/60 uppercase font-bold tracking-wider">LIT</span>
                    </div>
                    <div className="flex-1 min-w-[60px] bg-teal-100/60 p-2 rounded-xl border border-teal-200/50 text-center shadow-sm">
                        <span className="block text-xl font-bold text-teal-700">{numCount}</span>
                        <span className="text-[9px] text-teal-900/60 uppercase font-bold tracking-wider">NUM</span>
                    </div>
                </div>
                </div>

                {/* Card 4: Materi Belajar */}
                <div className="bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-xl border border-white/50 hover:transform hover:scale-[1.02] transition-all duration-300">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-gray-500 font-bold uppercase text-xs tracking-wider">Materi Belajar</h3>
                    <div className="text-2xl opacity-50">📖</div>
                </div>
                <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
                    <div className="flex-1 min-w-[60px] bg-green-50 p-2 rounded-xl border border-green-100 text-center shadow-sm">
                        <span className="block text-xl font-bold text-green-700">{matIpaCount}</span>
                        <span className="text-[9px] text-green-900/60 uppercase font-bold tracking-wider">IPA</span>
                    </div>
                    <div className="flex-1 min-w-[60px] bg-orange-50 p-2 rounded-xl border border-orange-100 text-center shadow-sm">
                        <span className="block text-xl font-bold text-orange-700">{matIpsCount}</span>
                        <span className="text-[9px] text-orange-900/60 uppercase font-bold tracking-wider">IPS</span>
                    </div>
                    <div className="flex-1 min-w-[60px] bg-blue-50 p-2 rounded-xl border border-blue-100 text-center shadow-sm">
                        <span className="block text-xl font-bold text-blue-700">{matMtkCount}</span>
                        <span className="text-[9px] text-blue-900/60 uppercase font-bold tracking-wider">MTK</span>
                    </div>
                    <div className="flex-1 min-w-[60px] bg-purple-50 p-2 rounded-xl border border-purple-100 text-center shadow-sm">
                        <span className="block text-xl font-bold text-purple-700">{matLitCount}</span>
                        <span className="text-[9px] text-purple-900/60 uppercase font-bold tracking-wider">LIT</span>
                    </div>
                    <div className="flex-1 min-w-[60px] bg-teal-50 p-2 rounded-xl border border-teal-100 text-center shadow-sm">
                        <span className="block text-xl font-bold text-teal-700">{matNumCount}</span>
                        <span className="text-[9px] text-teal-900/60 uppercase font-bold tracking-wider">NUM</span>
                    </div>
                </div>
                </div>
            </div>
          </div>
        );
      case 'students':
        return role === UserRole.ADMIN ? <StudentData /> : <div>Access Denied</div>;
      case 'bank_soal':
        return <QuestionBank userRole={role} username={username} />;
      case 'materials':
        return <Materials userRole={role} username={username} />;
      case 'schedule':
        return <ExamSchedule userRole={role} username={username} />;
      case 'analysis':
        return <Analysis userRole={role} username={username} />;
      case 'settings':
        return role === UserRole.ADMIN ? <Settings /> : <div>Access Denied</div>;
      case 'monitoring':
        return <Monitoring userRole={role} username={username} />;
      default:
        return <div>Page not found</div>;
    }
  };

  if (isLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <h2 className="text-lg font-semibold text-gray-700">Memuat Aplikasi...</h2>
              <p className="text-sm text-gray-500 mt-2">{syncStatus}</p>
          </div>
      );
  }

  if (!role) {
    return <Login onLogin={handleLogin} />;
  }

  // If taking exam, render without layout wrapper to maximize screen
  if (activeExamId && role === UserRole.STUDENT) {
      return renderContent();
  }

  return (
    <Layout 
      role={role} 
      user={{ name: username }} 
      onLogout={handleLogout}
      currentPage={currentPage}
      onNavigate={setCurrentPage}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;