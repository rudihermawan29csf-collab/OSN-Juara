import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storageService';
import { Exam } from '../../types';

interface StudentDashboardProps {
    username: string; // Passed from App to identify student
    sessionCategory?: string; // Passed from Login
}

interface DashboardItem {
    exam: Exam;
    category: string;
    isDone: boolean;
    score?: number;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ username, sessionCategory }) => {
  const [myExams, setMyExams] = useState<DashboardItem[]>([]);
  const [studentName, setStudentName] = useState('');

    const refreshData = () => {
        // Sync data to ensure we have latest exams/questions
        storage.sync().then(() => {
            // 1. Identify Student
            const allStudents = storage.students.getAll();
            const me = allStudents.find(s => s.name === username);
            setStudentName(username);

            if (me) {
                // 2. Get Exams targeted to my class
                const allExams = storage.exams.getAll();
                const allPackets = storage.packets.getAll();
                const allResults = storage.results.getAll();
                
                const targetedExams = allExams.filter(e => {
                    // 1. Check Class Match (Robust with trim)
                    const targetClasses = e.classTarget ? e.classTarget.split(',').map(c => c.trim()) : [];
                    const isClassMatch = targetClasses.includes(me.class) || e.classTarget === 'All';

                    // 2. Check Category Match
                    // Fallback to packet category if exam category is missing
                    const packet = allPackets.find(p => p.id === e.packetId);
                    const examCategory = e.category || packet?.category;

                    // Normalize for comparison
                    const normExamCat = examCategory ? examCategory.trim() : '';
                    
                    // Logic:
                    // 1. General exams (Must be explicitly 'Umum') are visible to ALL students.
                    // 2. Empty category is treated as 'Umum' ONLY if the packet also has no category. 
                    //    But to be safe, if it's empty, we might want to hide it from specialized students? 
                    //    Let's assume empty = General for now, BUT we must be careful.
                    //    User complaint: "Numerasi" exam visible to "OSN IPA".
                    //    This implies the system thinks the exam is General OR the student has Numerasi.
                    
                    // STRICTER CHECK:
                    // If the exam category is NOT 'Umum' and NOT empty, it is Specialized.
                    // If it is Specialized (e.g. 'Numerasi'), it MUST match the student's subject.
                    
                    const isExplicitlyGeneral = normExamCat.toLowerCase() === 'umum';
                    const isEmptyCategory = !normExamCat;
                    
                    // If it's empty, we treat as General. 
                    // But if the user says it's "Numerasi", then normExamCat SHOULD be "Numerasi".
                    // If normExamCat is "Numerasi", isExplicitlyGeneral is false. isEmptyCategory is false.
                    
                    let isSubjectMatch = false;

                    if (sessionCategory) {
                        // Strict Mode via Login Selection
                        if (isExplicitlyGeneral || isEmptyCategory) {
                            isSubjectMatch = true;
                        } else {
                            isSubjectMatch = normExamCat.toLowerCase() === sessionCategory.toLowerCase();
                        }
                    } else {
                        // Fallback Mode via Student Data
                        let studentSubjects: string[] = [];
                        if (Array.isArray(me.osnSubjects)) {
                            studentSubjects = me.osnSubjects;
                        } else if (typeof me.osnSubjects === 'string') {
                            const s = me.osnSubjects as string;
                            if (s.startsWith('[')) {
                                try { studentSubjects = JSON.parse(s); } catch { studentSubjects = s.split(',').map(x => x.trim()); }
                            } else {
                                studentSubjects = s.split(',').map(x => x.trim());
                            }
                        }
                        
                        if (studentSubjects.length === 0) {
                            // Student has no specific subjects -> See everything? Or only General?
                            // Usually "See everything" or "See General". Let's assume General + Empty.
                            isSubjectMatch = isExplicitlyGeneral || isEmptyCategory;
                        } else {
                            // Student has specific subjects (e.g. OSN IPA)
                            if (isExplicitlyGeneral) {
                                isSubjectMatch = true;
                            } else if (isEmptyCategory) {
                                // FIX: If category is empty, do NOT show to specialized students.
                                // This prevents "Numerasi" exams (which might have empty category due to data issue)
                                // from showing up for "OSN IPA" students.
                                isSubjectMatch = false;
                            } else {
                                // Exam is Specialized (e.g. Numerasi)
                                // Student must have this subject
                                isSubjectMatch = studentSubjects.some(s => s.trim().toLowerCase() === normExamCat.toLowerCase());
                            }
                        }
                    }

                    return isClassMatch && isSubjectMatch;
                });

                // 3. Map to Dashboard items with Category and Status
                let dashboardData: DashboardItem[] = targetedExams.map(exam => {
                    // FIX: Get all results for this exam, sort by latest timestamp
                    const studentResults = allResults.filter(r => r.examId === exam.id && r.studentName === me.name);
                    
                    // Sort descending by timestamp to ensure we get the latest attempt
                    studentResults.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                    
                    const result = studentResults[0]; // Take the latest result
                    const packet = allPackets.find(p => p.id === exam.packetId);
                    
                    return {
                        exam,
                        category: packet?.category || 'Umum',
                        isDone: !!result,
                        score: result?.score
                    };
                });

                // 4. FILTER: Show only Active Exams OR Completed Exams
                // Hide inactive exams that haven't been taken
                dashboardData = dashboardData.filter(item => item.exam.isActive || item.isDone);

                // Sort: Active pending first, then Done
                dashboardData.sort((a, b) => {
                    if (a.isDone === b.isDone) return 0;
                    return a.isDone ? 1 : -1;
                });

                setMyExams(dashboardData);
            }
        });
    };

    // Call on mount
    useEffect(() => {
        refreshData();
    }, [username, sessionCategory]);

  return (
    <div className="space-y-8 animate-fadeIn">
       {/* Welcome Card - Glass Gradient */}
       <div className="bg-gradient-to-r from-blue-600/90 to-indigo-700/90 backdrop-blur-md p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden border border-white/20">
         <div className="relative z-10 flex justify-between items-start">
            <div>
                <h2 className="text-4xl font-extrabold mb-3 tracking-tight">Selamat Datang, {studentName}! 👋</h2>
                <p className="opacity-90 text-blue-50 font-medium text-lg max-w-2xl">Semoga hasil ujianmu memuaskan. Tetap semangat belajar dan jaga integritas!</p>
                {sessionCategory && <span className="inline-block mt-2 px-3 py-1 bg-white/20 rounded-full text-xs font-bold border border-white/30">Mode: {sessionCategory}</span>}
            </div>
            <button 
                onClick={refreshData}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-bold backdrop-blur-sm transition-all flex items-center gap-2 border border-white/30"
            >
                🔄 Refresh Data
            </button>
         </div>
         {/* Abstract Shape */}
         <div className="absolute -right-10 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
         <div className="absolute right-20 -top-10 w-40 h-40 bg-blue-400/30 rounded-full blur-2xl"></div>
       </div>

       {/* History Table - Glass Container */}
       <div className="bg-white/70 backdrop-filter backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 overflow-hidden">
           <div className="p-6 border-b border-gray-200/50 flex justify-between items-center bg-white/30">
               <h3 className="font-bold text-gray-800 text-xl flex items-center gap-2">
                   <span>📋</span> Ujian Aktif & Riwayat Pengerjaan
               </h3>
               <span className="text-xs bg-white/50 px-3 py-1.5 rounded-full text-gray-600 font-medium border border-white/40 shadow-sm">
                   Filter Otomatis
               </span>
           </div>
           
           <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-100/50 text-gray-600 uppercase text-xs tracking-wider border-b border-gray-200/50">
                        <tr>
                            <th className="p-5 font-bold">Nama Ujian</th>
                            <th className="p-5 font-bold">Kategori</th>
                            <th className="p-5 font-bold">Jadwal Pelaksanaan</th>
                            <th className="p-5 text-center font-bold">Status</th>
                            <th className="p-5 text-center font-bold">Nilai</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50">
                        {myExams.length === 0 ? (
                            <tr><td colSpan={5} className="p-10 text-center text-gray-500 italic">Belum ada ujian aktif atau riwayat pengerjaan.</td></tr>
                        ) : myExams.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white/40 transition-colors group">
                                <td className="p-5">
                                    <div className="font-bold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">{item.exam.title}</div>
                                    <div className="text-xs text-gray-500 mt-1 font-mono bg-gray-100/50 inline-block px-2 py-0.5 rounded">{item.exam.durationMinutes} Menit</div>
                                </td>
                                <td className="p-5">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wide text-white shadow-sm ${
                                        item.category === 'OSN IPA' 
                                        ? 'bg-green-600' 
                                        : item.category === 'OSN IPS' 
                                        ? 'bg-orange-500'
                                        : item.category === 'OSN Matematika'
                                        ? 'bg-blue-600'
                                        : item.category === 'Literasi'
                                        ? 'bg-purple-600'
                                        : item.category === 'Numerasi'
                                        ? 'bg-teal-600'
                                        : 'bg-gray-500'
                                    }`}>
                                        {item.category}
                                    </span>
                                </td>
                                <td className="p-5 text-sm text-gray-600">
                                    <div className="flex flex-col gap-1">
                                        <span className="font-medium">Mulai: {new Date(item.exam.scheduledStart).toLocaleString('id-ID')}</span>
                                        <span className="text-gray-400">Selesai: {new Date(item.exam.scheduledEnd).toLocaleString('id-ID')}</span>
                                    </div>
                                </td>
                                <td className="p-5 text-center">
                                    {item.isDone ? (
                                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-green-100/80 text-green-700 rounded-full text-xs font-bold border border-green-200 shadow-sm backdrop-blur-sm">
                                            ✅ Selesai
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-100/80 text-blue-700 rounded-full text-xs font-bold border border-blue-200 shadow-sm backdrop-blur-sm animate-pulse">
                                            ⚡ Aktif
                                        </span>
                                    )}
                                </td>
                                <td className="p-5 text-center">
                                    {item.isDone ? (
                                        <div className="inline-block px-3 py-1 bg-blue-50/50 rounded-lg border border-blue-100">
                                            <span className="text-2xl font-extrabold text-blue-600">{Math.round(item.score || 0)}</span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-300 font-bold text-xl">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
           </div>
       </div>
    </div>
  );
};

export default StudentDashboard;