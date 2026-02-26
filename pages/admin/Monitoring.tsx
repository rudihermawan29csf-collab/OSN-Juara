import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storageService';
import { Student, Material, UserRole, Exam, Result } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MonitoringProps {
    userRole: UserRole | null;
    username: string;
}

const Monitoring: React.FC<MonitoringProps> = ({ userRole, username }) => {
    const [activeTab, setActiveTab] = useState<'exams' | 'literacy'>('exams');
    const [students, setStudents] = useState<Student[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [exams, setExams] = useState<Exam[]>([]);
    const [results, setResults] = useState<Result[]>([]);
    const [filterClass, setFilterClass] = useState('All');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    useEffect(() => {
        setStudents(storage.students.getAll());
        setMaterials(storage.materials.getAll());
        setExams(storage.exams.getAll().sort((a, b) => (a.order || 0) - (b.order || 0)));
        setResults(storage.results.getAll());
    }, []);

    // Determine teacher category based on login name
    const teacherCategory = userRole === UserRole.TEACHER 
        ? (username.includes('OSN IPA') ? 'OSN IPA' : 
           username.includes('OSN IPS') ? 'OSN IPS' : 
           username.includes('OSN Matematika') ? 'OSN Matematika' : null)
        : null;

    const filteredStudents = students.filter(s => {
        if (filterClass !== 'All' && s.class !== filterClass) return false;
        
        if (teacherCategory) {
            // Only show students who have this subject
            return s.osnSubjects && s.osnSubjects.includes(teacherCategory);
        }
        return true;
    });

    const uniqueClasses = Array.from(new Set(students.map(s => s.class))).sort();

    // --- Literacy Helpers ---
    const getReadCount = (student: Student) => {
        if (!student.readMaterials) return 0;
        if (teacherCategory) {
            const studentMaterials = student.readMaterials.map(id => materials.find(m => m.id === id)).filter(Boolean) as Material[];
            return studentMaterials.filter(m => m.category === teacherCategory).length;
        }
        return student.readMaterials.length;
    };

    const getTotalMaterialsCount = () => {
        if (teacherCategory) {
            return materials.filter(m => m.category === teacherCategory).length;
        }
        return materials.length;
    };

    const getReadMaterials = (student: Student) => {
        if (!student.readMaterials) return [];
        let read = student.readMaterials.map(id => materials.find(m => m.id === id)).filter(Boolean) as Material[];
        if (teacherCategory) {
            read = read.filter(m => m.category === teacherCategory);
        }
        return read;
    };

    // --- Exam Helpers ---
    const getStudentExamData = (student: Student) => {
        // Filter exams relevant to teacher category if applicable
        let relevantExams = exams;
        if (teacherCategory) {
            relevantExams = exams.filter(e => e.category === teacherCategory);
        }

        // Get results for this student
        const studentResults = results.filter(r => r.studentName === student.name); // Using name as ID might be risky if names are not unique, ideally use ID
        
        // Map results to exams to get chronological scores
        const examProgress = relevantExams.map(exam => {
            // Find best score for this exam (if multiple attempts allowed)
            const attempts = studentResults.filter(r => r.examId === exam.id);
            const bestAttempt = attempts.sort((a, b) => b.score - a.score)[0];
            return {
                examTitle: exam.title,
                score: bestAttempt ? bestAttempt.score : null,
                date: bestAttempt ? bestAttempt.timestamp : null,
                order: exam.order || 0
            };
        }).filter(item => item.score !== null); // Only completed exams

        const completedCount = examProgress.length;
        const totalExams = relevantExams.length;
        
        const scores = examProgress.map(p => p.score as number);
        const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        
        const latestScore = scores.length > 0 ? scores[scores.length - 1] : 0;
        const previousScore = scores.length > 1 ? scores[scores.length - 2] : latestScore;
        
        const trend = latestScore - previousScore;

        return {
            completedCount,
            totalExams,
            averageScore,
            latestScore,
            trend,
            examProgress
        };
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Monitoring Siswa</h2>
                    <p className="text-sm text-gray-500">Pantau progres ujian dan literasi siswa</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('exams')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'exams' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            📊 Ujian
                        </button>
                        <button 
                            onClick={() => setActiveTab('literacy')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'literacy' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            📚 Literasi
                        </button>
                    </div>
                    <select 
                        className="border p-2 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                        value={filterClass}
                        onChange={e => setFilterClass(e.target.value)}
                    >
                        <option value="All">Semua Kelas</option>
                        {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Nama Siswa</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Kelas</th>
                            {activeTab === 'exams' ? (
                                <>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Ujian Selesai</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Rata-rata</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Nilai Terakhir</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Tren</th>
                                </>
                            ) : (
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Progress Materi</th>
                            )}
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan={activeTab === 'exams' ? 7 : 4} className="p-8 text-center text-gray-400 italic">Tidak ada data siswa.</td>
                            </tr>
                        ) : filteredStudents.map(student => {
                            if (activeTab === 'exams') {
                                const data = getStudentExamData(student);
                                return (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800">{student.name}</div>
                                            <div className="text-xs text-gray-400">{student.nis}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">{student.class}</td>
                                        <td className="p-4 text-center">
                                            <span className="font-bold text-gray-700">{data.completedCount}</span>
                                            <span className="text-gray-400 text-xs">/{data.totalExams}</span>
                                        </td>
                                        <td className="p-4 text-center font-bold text-blue-600">
                                            {data.averageScore}
                                        </td>
                                        <td className="p-4 text-center font-bold text-gray-800">
                                            {data.latestScore}
                                        </td>
                                        <td className="p-4 text-center">
                                            {data.completedCount > 0 ? (
                                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                                    data.trend > 0 ? 'bg-green-100 text-green-700' : 
                                                    data.trend < 0 ? 'bg-red-100 text-red-700' : 
                                                    'bg-gray-100 text-gray-600'
                                                }`}>
                                                    {data.trend > 0 ? '▲ +' : data.trend < 0 ? '▼ ' : '• '}{data.trend}
                                                </span>
                                            ) : <span className="text-gray-400">-</span>}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => setSelectedStudent(student)}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors"
                                            >
                                                Detail
                                            </button>
                                        </td>
                                    </tr>
                                );
                            } else {
                                const readCount = getReadCount(student);
                                const totalCount = getTotalMaterialsCount();
                                const percentage = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 0;
                                return (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800">{student.name}</div>
                                            <div className="text-xs text-gray-400">{student.nis}</div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">{student.class}</td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${percentage === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-bold text-gray-600 w-12 text-right">{readCount}/{totalCount}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => setSelectedStudent(student)}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded transition-colors"
                                            >
                                                Detail
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }
                        })}
                    </tbody>
                </table>
            </div>

            {selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedStudent(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50 shrink-0">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">Detail Siswa: {selectedStudent.name}</h3>
                                <p className="text-sm text-gray-500">{selectedStudent.class} • {selectedStudent.nis}</p>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            {activeTab === 'exams' ? (
                                <div className="space-y-6">
                                    <div className="h-64 w-full bg-white p-4 rounded-xl border shadow-sm">
                                        <h4 className="font-bold text-sm text-gray-500 uppercase mb-4">Grafik Perkembangan Nilai</h4>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={getStudentExamData(selectedStudent).examProgress}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                <XAxis dataKey="examTitle" tick={{fontSize: 10}} interval={0} angle={-45} textAnchor="end" height={60} />
                                                <YAxis domain={[0, 100]} />
                                                <Tooltip />
                                                <Legend />
                                                <Line type="monotone" dataKey="score" stroke="#2563eb" strokeWidth={2} activeDot={{ r: 8 }} name="Nilai" />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>

                                    <div>
                                        <h4 className="font-bold text-sm text-gray-500 uppercase mb-4">Riwayat Ujian</h4>
                                        <div className="space-y-2">
                                            {getStudentExamData(selectedStudent).examProgress.length === 0 ? (
                                                <div className="text-center py-8 text-gray-400 italic">Belum ada ujian yang dikerjakan.</div>
                                            ) : getStudentExamData(selectedStudent).examProgress.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                                                    <div>
                                                        <div className="font-bold text-gray-800">{item.examTitle}</div>
                                                        <div className="text-xs text-gray-500">{new Date(item.date!).toLocaleDateString()}</div>
                                                    </div>
                                                    <div className={`font-bold text-lg ${
                                                        (item.score || 0) >= 70 ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                        {item.score}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <h4 className="font-bold text-sm text-gray-500 uppercase mb-4">Materi yang sudah dibaca ({getReadCount(selectedStudent)})</h4>
                                    {getReadMaterials(selectedStudent).length === 0 ? (
                                        <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                                            Belum ada materi yang dibaca.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {getReadMaterials(selectedStudent).map(m => (
                                                <div key={m.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xl">
                                                        {m.type === 'image' ? '🖼️' : m.type === 'link' ? '🔗' : '📺'}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-800">{m.title}</div>
                                                        <div className="flex gap-2 mt-1">
                                                            <span className={`text-[10px] px-2 py-0.5 rounded text-white font-bold uppercase ${
                                                                m.category === 'OSN IPA' ? 'bg-green-600' : 
                                                                m.category === 'OSN IPS' ? 'bg-orange-500' : 'bg-blue-600'
                                                            }`}>
                                                                {m.category}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="ml-auto text-green-500 font-bold">✓</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t bg-gray-50 text-right shrink-0">
                            <button onClick={() => setSelectedStudent(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-bold">Tutup</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Monitoring;
