import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storageService';
import { Result, Exam, Packet, Question, QuestionType } from '../../types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';

interface StudentResultsProps {
    username: string;
}

interface ResultDetail extends Result {
    category: string;
    totalQuestions: number;
    packetId: string;
}

interface AnswerAnalysis {
    questionNo: number;
    isCorrect: boolean;
    type: string;
    studentAnswer: string;
    correctAnswer: string;
    questionText: string;
    options: string[];
    discussion: string;
}

const StudentResults: React.FC<StudentResultsProps> = ({ username }) => {
    const [results, setResults] = useState<ResultDetail[]>([]);
    const [selectedResult, setSelectedResult] = useState<ResultDetail | null>(null);
    const [analysis, setAnalysis] = useState<AnswerAnalysis[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // FILTERS
    const [filterCategory, setFilterCategory] = useState<'all' | 'OSN IPA' | 'OSN IPS' | 'OSN Matematika'>('all');
    const [filterScore, setFilterScore] = useState<'all' | 'under70' | 'above70'>('all');

    useEffect(() => {
        const allStudents = storage.students.getAll();
        const me = allStudents.find(s => s.name === username);

        if (me) {
            const allResults = storage.results.getAll();
            const allExams = storage.exams.getAll();
            const allPackets = storage.packets.getAll();

            const myResults = allResults
                .filter(r => r.studentName === me.name)
                .map(r => {
                    const exam = allExams.find(e => e.id === r.examId);
                    const packet = allPackets.find(p => p.id === exam?.packetId);
                    return {
                        ...r,
                        category: packet?.category || 'Umum',
                        totalQuestions: packet?.totalQuestions || 0,
                        packetId: exam?.packetId || ''
                    };
                })
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            setResults(myResults);
        }
    }, [username]);

    const handleViewDetails = (result: ResultDetail) => {
        const questions = storage.questions.getByPacketId(result.packetId);
        const studentAnswers = JSON.parse(result.answers);

        const analyzed: AnswerAnalysis[] = questions.sort((a,b) => a.number - b.number).map(q => {
            const ans = studentAnswers[q.id];
            let isCorrect = false;
            let displayAns = '-';
            let displayKey = '-';
            let options: string[] = [];

            try {
                if (q.options) {
                    options = JSON.parse(q.options);
                }
            } catch (e) {
                options = [];
            }

            if (q.type === QuestionType.MULTIPLE_CHOICE) {
                isCorrect = ans === q.correctAnswerIndex;
                displayAns = ans !== undefined ? String.fromCharCode(65 + ans) : 'Kosong';
                displayKey = String.fromCharCode(65 + q.correctAnswerIndex);
            } 
            else if (q.type === QuestionType.TRUE_FALSE) {
                 try {
                     const pairs = JSON.parse(q.matchingPairs || '[]'); 
                     if (Array.isArray(ans) && ans.length === pairs.length) {
                         isCorrect = pairs.every((item: any, idx: number) => item.right === ans[idx]);
                     }
                     displayAns = isCorrect ? 'Benar Semua' : 'Ada Salah';
                     displayKey = 'Sesuai Kunci';
                 } catch(e) {}
            }
            else if (q.type === QuestionType.COMPLEX_MULTIPLE_CHOICE) {
                const correctIndices = JSON.parse(q.correctAnswerIndices || '[]');
                if (Array.isArray(ans) && 
                    ans.length === correctIndices.length && 
                    ans.every((val: number) => correctIndices.includes(val))) {
                    isCorrect = true;
                }
                displayAns = Array.isArray(ans) ? ans.map((i: number) => String.fromCharCode(65+i)).join(', ') : '-';
                displayKey = correctIndices.map((i: number) => String.fromCharCode(65+i)).join(', ');
            }

            return {
                questionNo: q.number,
                isCorrect,
                type: q.type,
                studentAnswer: displayAns,
                correctAnswer: displayKey,
                questionText: q.text,
                options: options,
                discussion: q.discussion || 'Tidak ada pembahasan.'
            };
        });

        setSelectedResult(result);
        setAnalysis(analyzed);
        setIsModalOpen(true);
    };

    // --- FILTERING LOGIC ---
    const filteredResults = results.filter(item => {
        // 1. Filter Category
        const catMatch = filterCategory === 'all' || item.category === filterCategory;
        
        // 2. Filter Score (Pass/Fail)
        const score = Math.round(Number(item.score));
        let scoreMatch = true;
        if (filterScore === 'under70') scoreMatch = score < 70;
        if (filterScore === 'above70') scoreMatch = score >= 70;

        return catMatch && scoreMatch;
    });

    // --- STATISTICS & CHART DATA ---
    const totalExams = results.length;
    const averageScore = totalExams > 0 ? Math.round(results.reduce((acc, curr) => acc + Number(curr.score), 0) / totalExams) : 0;
    const highestScore = totalExams > 0 ? Math.round(Math.max(...results.map(r => Number(r.score)))) : 0;
    const lowestScore = totalExams > 0 ? Math.round(Math.min(...results.map(r => Number(r.score)))) : 0;

    // Line Chart Data (Progress over time)
    const lineChartData = [...results]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .map(r => ({
            name: new Date(r.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            fullDate: new Date(r.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
            title: r.examTitle,
            score: Math.round(Number(r.score)),
            category: r.category
        }));

    // Bar Chart Data (Average per category)
    const categoryStats = ['OSN IPA', 'OSN IPS', 'OSN Matematika'].map(cat => {
        const catResults = results.filter(r => r.category === cat);
        const avg = catResults.length > 0 
            ? Math.round(catResults.reduce((acc, curr) => acc + Number(curr.score), 0) / catResults.length) 
            : 0;
        return {
            name: cat.replace('OSN ', ''),
            score: avg,
            count: catResults.length
        };
    });

    return (
        <div className="space-y-8 animate-fadeIn pb-20">
             {/* HEADER */}
             <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/20 pb-6">
                <div className="flex items-center gap-4">
                    <div className="bg-white/40 p-4 rounded-2xl text-purple-600 shadow-lg backdrop-blur-sm border border-white/40">
                        <span className="text-4xl">📊</span>
                    </div>
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-800 drop-shadow-sm">Analisis & Hasil</h2>
                        <p className="text-gray-600 text-sm mt-1 font-medium bg-white/30 inline-block px-3 py-1 rounded-full">
                            Pantau progres belajar dan riwayat ujianmu.
                        </p>
                    </div>
                </div>
            </div>

            {/* STATISTICS CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
                    <span className="text-3xl mb-2">📝</span>
                    <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Total Ujian</h4>
                    <p className="text-3xl font-extrabold text-gray-800 mt-1">{totalExams}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
                    <span className="text-3xl mb-2">📈</span>
                    <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Rata-rata</h4>
                    <p className={`text-3xl font-extrabold mt-1 ${averageScore >= 70 ? 'text-green-600' : 'text-orange-500'}`}>
                        {averageScore}
                    </p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
                    <span className="text-3xl mb-2">🏆</span>
                    <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Tertinggi</h4>
                    <p className="text-3xl font-extrabold text-blue-600 mt-1">{highestScore}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
                    <span className="text-3xl mb-2">📉</span>
                    <h4 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Terendah</h4>
                    <p className="text-3xl font-extrabold text-red-500 mt-1">{lowestScore}</p>
                </div>
            </div>

            {/* CHARTS SECTION */}
            {results.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Line Chart: Progress */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span>📈</span> Grafik Progres Nilai
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={lineChartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fontSize: 10, fill: '#9ca3af' }} 
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis 
                                        domain={[0, 100]} 
                                        tick={{ fontSize: 10, fill: '#9ca3af' }} 
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                                        formatter={(value: any) => [`${value}`, 'Nilai']}
                                        labelFormatter={(label, payload) => {
                                            if (payload && payload.length > 0) {
                                                const data = payload[0].payload;
                                                return `${data.fullDate} - ${data.title}`;
                                            }
                                            return label;
                                        }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="score" 
                                        stroke="#8b5cf6" 
                                        strokeWidth={3} 
                                        dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bar Chart: Category Performance */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span>📊</span> Rata-rata Mapel
                        </h3>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryStats} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fontSize: 10, fill: '#9ca3af' }} 
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <YAxis 
                                        domain={[0, 100]} 
                                        tick={{ fontSize: 10, fill: '#9ca3af' }} 
                                        axisLine={false}
                                        tickLine={false}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: '#f9fafb' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        formatter={(value: any) => [`${value}`, 'Rata-rata']}
                                    />
                                    <Bar dataKey="score" radius={[6, 6, 0, 0]} barSize={40}>
                                        {categoryStats.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={
                                                entry.name === 'IPA' ? '#16a34a' : 
                                                entry.name === 'IPS' ? '#ea580c' : 
                                                '#2563eb'
                                            } />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* FILTERS & LIST HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4">
                <h3 className="text-xl font-bold text-gray-800">Riwayat Ujian</h3>
                <div className="flex flex-wrap gap-2">
                    <select 
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value as any)}
                        className="px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm font-bold text-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="all">📂 Semua Mapel</option>
                        <option value="OSN IPA">🧬 OSN IPA</option>
                        <option value="OSN IPS">🌍 OSN IPS</option>
                        <option value="OSN Matematika">📐 OSN Matematika</option>
                    </select>

                    <select 
                        value={filterScore}
                        onChange={(e) => setFilterScore(e.target.value as any)}
                        className="px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm font-bold text-gray-700 focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                        <option value="all">🎯 Semua Nilai</option>
                        <option value="above70">✅ Tuntas (≥70)</option>
                        <option value="under70">⚠️ Belum Tuntas (&lt;70)</option>
                    </select>
                </div>
            </div>

            {filteredResults.length === 0 ? (
                 <div className="bg-white/60 backdrop-blur-xl p-16 rounded-3xl shadow-lg text-center border-2 border-dashed border-white/50">
                    <span className="text-6xl block mb-6 opacity-70">📭</span>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">Data Tidak Ditemukan</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                        Belum ada hasil ujian yang sesuai dengan filter yang dipilih.
                    </p>
                 </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredResults.map((res) => {
                        const score = Math.round(Number(res.score));
                        const isPassed = score >= 70;

                        return (
                        <div key={res.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 flex flex-col hover:shadow-xl transition-shadow">
                            <div className={`h-2 w-full ${res.category === 'OSN IPS' ? 'bg-orange-500' : res.category === 'OSN IPA' ? 'bg-green-600' : 'bg-blue-600'}`}></div>
                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded border ${
                                        res.category === 'OSN IPS' ? 'bg-orange-100 text-orange-700 border-orange-200' : 
                                        res.category === 'OSN IPA' ? 'bg-green-100 text-green-700 border-green-200' :
                                        'bg-blue-100 text-blue-700 border-blue-200'
                                    }`}>
                                        {res.category}
                                    </span>
                                    <span className="text-xs text-gray-400 font-mono">{new Date(res.timestamp).toLocaleDateString()}</span>
                                </div>
                                
                                <h3 className="text-lg font-bold text-gray-800 mb-4 line-clamp-2 min-h-[3.5rem]">{res.examTitle}</h3>
                                
                                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                                     <div className="flex flex-col">
                                         <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Nilai Akhir</p>
                                         <p className={`text-4xl font-extrabold ${isPassed ? 'text-green-600' : 'text-red-500'}`}>
                                             {score}
                                         </p>
                                         <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded w-fit mt-1 ${isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                             {isPassed ? 'TUNTAS' : 'BELUM TUNTAS'}
                                         </span>
                                     </div>
                                     <div className="text-right self-end">
                                         <button 
                                            onClick={() => handleViewDetails(res)}
                                            className="bg-gray-800 text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-black shadow transition-transform active:scale-95 flex items-center gap-1"
                                         >
                                             <span>👁️</span> Pembahasan
                                         </button>
                                     </div>
                                </div>
                            </div>
                        </div>
                    )})}
                </div>
            )}

            {/* Analysis Modal */}
            {isModalOpen && selectedResult && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-[800px] max-h-[90vh] flex flex-col shadow-2xl animate-scaleIn">
                        <div className={`p-6 border-b rounded-t-2xl flex justify-between items-center ${
                             Math.round(Number(selectedResult.score)) >= 70 ? 'bg-green-50' : 'bg-red-50'
                        }`}>
                            <div>
                                <h3 className="font-bold text-xl text-gray-800">Pembahasan Soal</h3>
                                <p className="text-sm text-gray-500 line-clamp-1 max-w-xs">{selectedResult.examTitle}</p>
                            </div>
                            <div className="text-right">
                                <span className={`block text-3xl font-extrabold ${
                                    Math.round(Number(selectedResult.score)) >= 70 ? 'text-green-600' : 'text-red-600'
                                }`}>{Math.round(Number(selectedResult.score))}</span>
                                <span className="text-xs font-bold text-gray-400 uppercase">Skor Kamu</span>
                            </div>
                        </div>
                        
                        <div className="p-6 overflow-y-auto bg-white space-y-6">
                            {analysis.map((item) => (
                                <div key={item.questionNo} className={`p-4 rounded-xl border ${item.isCorrect ? 'bg-green-50/30 border-green-100' : 'bg-red-50/30 border-red-100'}`}>
                                    <div className="flex gap-4">
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold shadow-sm border ${item.isCorrect ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                            {item.questionNo}
                                        </div>
                                        <div className="flex-1">
                                            <div className="mb-4 text-sm font-medium text-gray-800" dangerouslySetInnerHTML={{ __html: item.questionText }} />
                                            
                                            {/* Options Display for Multiple Choice */}
                                            {item.type === 'PG' && (
                                                <div className="space-y-2 mb-4">
                                                    {item.options.map((opt, idx) => {
                                                        const optLabel = String.fromCharCode(65 + idx);
                                                        const isStudentAnswer = item.studentAnswer === optLabel;
                                                        const isKey = item.correctAnswer === optLabel;
                                                        
                                                        let optClass = "border-gray-200 bg-white hover:bg-gray-50";
                                                        if (isKey) optClass = "border-green-500 bg-green-100 text-green-900 font-bold";
                                                        else if (isStudentAnswer && !item.isCorrect) optClass = "border-red-500 bg-red-100 text-red-900";
                                                        else if (isStudentAnswer && item.isCorrect) optClass = "border-green-500 bg-green-100 text-green-900 font-bold";

                                                        return (
                                                            <div key={idx} className={`text-xs p-3 rounded-lg border flex gap-3 items-center ${optClass}`}>
                                                                <span className="font-bold w-4">{optLabel}.</span>
                                                                <span className="flex-1" dangerouslySetInnerHTML={{ __html: opt }} />
                                                                {isKey && <span className="ml-auto text-[10px] bg-green-600 text-white px-2 py-0.5 rounded-full font-bold">KUNCI</span>}
                                                                {isStudentAnswer && !isKey && <span className="ml-auto text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold">JAWABANMU</span>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Discussion Section */}
                                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-xs">
                                                <div className="flex items-center gap-2 mb-2 text-blue-800 font-bold uppercase tracking-wider">
                                                    <span>💡</span> Pembahasan
                                                </div>
                                                <div className="text-blue-900/80 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.discussion }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t flex justify-end bg-gray-50 rounded-b-2xl">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold hover:bg-black transition-colors shadow-lg">
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentResults;