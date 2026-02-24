import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storageService';
import { Exam, Student, Result, UserRole } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonitorRow {
    no: number;
    studentId: string; // Added studentId
    name: string;
    nis: string;
    nisn: string;
    class: string;
    examTitle: string;
    score: number | string; // Score or 'Mengerjakan'
    status: 'online' | 'offline' | 'done';
    violationCount: number;
}

interface MonitoringProps {
    userRole: UserRole | null;
    username: string;
}

const Monitoring: React.FC<MonitoringProps> = ({ userRole, username }) => {
    const [activeExams, setActiveExams] = useState<Exam[]>([]);
    const [selectedExamId, setSelectedExamId] = useState<string>('');
    const [filterClass, setFilterClass] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('all'); // Filter Status State
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);
    
    // Data Table
    const [rows, setRows] = useState<MonitorRow[]>([]);
    
    // Student Detail Modal
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentHistory, setStudentHistory] = useState<any[]>([]);

    // Determine teacher category
    const teacherCategory = userRole === UserRole.TEACHER 
      ? (username.includes('OSN IPA') ? 'OSN IPA' : 
         username.includes('OSN IPS') ? 'OSN IPS' : 
         username.includes('OSN Matematika') ? 'OSN Matematika' : null)
      : null;

    const [filterCategory, setFilterCategory] = useState<string>('All');

    // Auto-refresh simulation
    useEffect(() => {
        const interval = setInterval(() => {
             refreshData();
        }, 5000);
        return () => clearInterval(interval);
    }, [selectedExamId, filterClass, activeExams, filterStatus]); // Added filterStatus dependency

    useEffect(() => {
        let exams = storage.exams.getAll(); 
        
        // Filter based on teacher category
        if (userRole === UserRole.TEACHER && teacherCategory) {
             exams = exams.filter(e => e.category === teacherCategory);
        } else if (userRole === UserRole.ADMIN && filterCategory !== 'All') {
             exams = exams.filter(e => e.category === filterCategory);
        }

        setActiveExams(exams);
        // Reset selected exam if the current one is not in the filtered list
        if (exams.length > 0) {
            if (!selectedExamId || !exams.find(e => e.id === selectedExamId)) {
                setSelectedExamId(exams[0].id);
            }
        } else {
            setSelectedExamId('');
        }
    }, [userRole, username, teacherCategory, filterCategory]);

    const refreshData = () => {
        // If "All Exams" is selected (empty string or specific value), we aggregate
        let targetExams = activeExams;
        if (selectedExamId && selectedExamId !== 'all') {
            targetExams = activeExams.filter(e => e.id === selectedExamId);
        }

        if (targetExams.length === 0) {
            setRows([]);
            return;
        }

        let allRows: MonitorRow[] = [];

        // Iterate through each exam to build the rows
        targetExams.forEach(exam => {
            let enrolledStudents = storage.students.getAll();
            
            // Filter by Class if selected
            if (filterClass) {
                enrolledStudents = enrolledStudents.filter(s => s.class === filterClass);
            }

            // Get results for this exam
            const examResults = storage.results.getAll().filter(r => r.examId === exam.id);

            const examRows = enrolledStudents.map(s => {
                // Check if student has a result for this exam
                const studentResult = examResults.find(r => r.studentName === s.name);
                
                // Only include if they have a result OR if we are viewing a specific exam (to show who hasn't started)
                // If viewing "All Exams", showing every student for every exam might be too much.
                // Let's only show students who have ATTEMPTED or are ONLINE if viewing "All".
                // But user said "memantau langsung dari beberapa ujian yang diikuiti".
                // If we filter by class, it's fine.
                
                let status: MonitorRow['status'] = 'offline';
                let score: number | string = '-';
                let violations = 0;

                if (studentResult) {
                    status = 'done';
                    score = Math.round(studentResult.score);
                    violations = studentResult.violationCount;
                } else {
                     // Simulation logic
                     const isLive = Math.random() > 0.95; // Lower probability for simulation
                     if (isLive && selectedExamId !== 'all') {
                         status = 'online';
                         score = 'Sedang Mengerjakan';
                         violations = Math.random() > 0.95 ? Math.floor(Math.random() * 3) + 1 : 0;
                     }
                }

                // If viewing ALL exams, skip students who haven't started to reduce noise, unless filtered by class
                if (selectedExamId === 'all' && status === 'offline' && !filterClass) return null;

                return {
                    no: 0,
                    studentId: s.id,
                    name: s.name,
                    nis: s.nis,
                    nisn: s.nisn,
                    class: s.class,
                    examTitle: exam.title,
                    score: score,
                    status: status,
                    violationCount: violations
                };
            }).filter((r): r is MonitorRow => r !== null);
            
            allRows = [...allRows, ...examRows];
        });

        // Filter based on Status
        if (filterStatus === 'done') {
            allRows = allRows.filter(r => r.status === 'done');
        } else if (filterStatus === 'not_done') {
            allRows = allRows.filter(r => r.status !== 'done');
        }

        // Re-assign Numbering
        const finalRows = allRows.map((r, idx) => ({ ...r, no: idx + 1 }));
        setRows(finalRows);
    };

    // Initial load when selection changes
    useEffect(() => {
        refreshData();
    }, [selectedExamId, filterClass, filterStatus]);

    const handleStudentClick = (studentName: string) => {
        const student = storage.students.getAll().find(s => s.name === studentName);
        if (student) {
            // Get all results for this student
            const results = storage.results.getAll().filter(r => r.studentName === studentName);
            
            // Map to history format for chart
            // Sort by timestamp if available, or just by exam title
            const history = results.map(r => ({
                examTitle: r.examTitle,
                score: r.score,
                date: new Date(r.timestamp).toLocaleDateString()
            })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            setStudentHistory(history);
            setSelectedStudent(student);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded shadow flex flex-col md:flex-row justify-between items-center gap-4 border-l-4 border-blue-500">
                <div className="flex flex-col gap-1 w-full md:w-auto">
                    <h2 className="text-xl font-bold whitespace-nowrap">Monitoring Ujian</h2>
                    {teacherCategory && <span className="text-xs text-gray-500">Menampilkan ujian kategori: <b>{teacherCategory}</b></span>}
                </div>
                
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                     {/* Admin Category Filter */}
                     {userRole === UserRole.ADMIN && (
                         <select 
                            className="border p-2 rounded text-sm font-bold bg-white"
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                        >
                            <option value="All">Semua Kategori</option>
                            <option value="OSN IPA">OSN IPA</option>
                            <option value="OSN IPS">OSN IPS</option>
                            <option value="OSN Matematika">OSN Matematika</option>
                        </select>
                     )}

                     {/* Exam Selector */}
                     <select 
                        className="border p-2 rounded w-full md:w-56 text-sm"
                        value={selectedExamId}
                        onChange={e => { setSelectedExamId(e.target.value); setFilterClass(''); }}
                    >
                        <option value="all">Semua Ujian Aktif</option>
                        {activeExams.length === 0 && <option disabled>Tidak ada ujian aktif</option>}
                        {activeExams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                    </select>

                    {/* Class Filter */}
                    <div className="flex items-center gap-2">
                        <select 
                            className="border p-2 rounded text-sm"
                            value={filterClass}
                            onChange={e => setFilterClass(e.target.value)}
                        >
                            <option value="">Semua Kelas</option>
                            {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                        <select 
                            className={`border p-2 rounded text-sm font-bold ${
                                filterStatus === 'done' ? 'bg-green-50 text-green-700 border-green-300' :
                                filterStatus === 'not_done' ? 'bg-red-50 text-red-700 border-red-300' :
                                'bg-white text-gray-700'
                            }`}
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="all">Semua Status</option>
                            <option value="done">✅ Sudah Mengerjakan</option>
                            <option value="not_done">⏳ Belum Mengerjakan</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-800 text-white text-sm uppercase">
                            <tr>
                                <th className="p-3 w-12 text-center">No</th>
                                <th className="p-3">Nama Siswa</th>
                                <th className="p-3">NIS</th>
                                <th className="p-3">NISN</th>
                                <th className="p-3 w-20 text-center">Kelas</th>
                                <th className="p-3">Ujian</th>
                                <th className="p-3">Status Pengerjaan</th>
                                <th className="p-3 text-center">Skor</th>
                                <th className="p-3 text-center">Indikasi Kecurangan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {rows.length === 0 ? (
                                <tr><td colSpan={9} className="p-6 text-center text-gray-500">Tidak ada data siswa sesuai filter.</td></tr>
                            ) : rows.map((row) => (
                                <tr key={row.no} className="hover:bg-gray-50">
                                    <td className="p-3 text-center font-bold text-gray-500">{row.no}</td>
                                    <td className="p-3 font-medium">
                                        <button 
                                            onClick={() => handleStudentClick(row.name)}
                                            className="text-blue-600 hover:underline font-bold text-left"
                                        >
                                            {row.name}
                                        </button>
                                    </td>
                                    <td className="p-3 text-gray-500">{row.nis}</td>
                                    <td className="p-3 text-gray-500">{row.nisn}</td>
                                    <td className="p-3 text-center">
                                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">{row.class}</span>
                                    </td>
                                    <td className="p-3 text-sm text-gray-700">{row.examTitle}</td>
                                    <td className="p-3">
                                        {row.status === 'done' && <span className="text-green-600 font-bold">✅ Selesai</span>}
                                        {row.status === 'online' && <span className="text-blue-600 font-bold animate-pulse">🔵 Sedang Aktif</span>}
                                        {row.status === 'offline' && <span className="text-gray-400">⚫ Belum Login/Offline</span>}
                                    </td>
                                    <td className="p-3 text-center font-bold text-lg">
                                        {typeof row.score === 'number' ? row.score : '-'}
                                    </td>
                                    <td className="p-3 text-center">
                                        {row.violationCount === 0 ? (
                                            <span className="text-green-500 text-xs">Aman</span>
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <span className={`px-3 py-1 rounded-full text-white font-bold text-xs ${
                                                    row.violationCount >= 3 ? 'bg-red-600' : 'bg-orange-500'
                                                }`}>
                                                    {row.violationCount}x Pindah Tab
                                                </span>
                                                {row.violationCount >= 3 && <span className="text-[10px] text-red-600 font-bold mt-1">DISQUALIFIED</span>}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Student Detail Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedStudent(null)}>
                    <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-800">{selectedStudent.name}</h3>
                                <div className="flex gap-4 text-sm text-gray-500 mt-1">
                                    <span>NIS: {selectedStudent.nis}</span>
                                    <span>Kelas: {selectedStudent.class}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-800 text-2xl font-bold">✕</button>
                        </div>
                        
                        <div className="p-6 space-y-8">
                            {/* Chart Section */}
                            <div className="h-80 w-full bg-white p-4 border rounded-xl shadow-sm">
                                <h4 className="font-bold text-gray-700 mb-4">Grafik Perkembangan Nilai</h4>
                                {studentHistory.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={studentHistory}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="examTitle" tick={{fontSize: 10}} interval={0} angle={-15} textAnchor="end" height={60} />
                                            <YAxis domain={[0, 100]} />
                                            <Tooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={3} activeDot={{ r: 8 }} name="Nilai Ujian" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-400">Belum ada data nilai ujian.</div>
                                )}
                            </div>

                            {/* History Table */}
                            <div>
                                <h4 className="font-bold text-gray-700 mb-4">Riwayat Ujian</h4>
                                <div className="overflow-hidden border rounded-lg">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="p-3 border-b">Tanggal</th>
                                                <th className="p-3 border-b">Nama Ujian</th>
                                                <th className="p-3 border-b text-center">Nilai</th>
                                                <th className="p-3 border-b text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {studentHistory.length === 0 ? (
                                                <tr><td colSpan={4} className="p-4 text-center text-gray-500">Belum ada riwayat ujian.</td></tr>
                                            ) : studentHistory.map((h, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                    <td className="p-3">{h.date}</td>
                                                    <td className="p-3 font-medium">{h.examTitle}</td>
                                                    <td className="p-3 text-center font-bold text-blue-600">{h.score}</td>
                                                    <td className="p-3 text-center">
                                                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Selesai</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Monitoring;