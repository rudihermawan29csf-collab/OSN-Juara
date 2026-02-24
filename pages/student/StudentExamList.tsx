import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storageService';
import { Exam, Packet } from '../../types';

interface StudentExamListProps {
    username: string;
    onStartExam: (examId: string) => void;
}

const StudentExamList: React.FC<StudentExamListProps> = ({ username, onStartExam }) => {
  const [availableExams, setAvailableExams] = useState<Array<{ exam: Exam, packet?: Packet, isTaken: boolean, lastScore?: number, attemptCount: number }>>([]);
  
  // Filters
  const [filterCategory, setFilterCategory] = useState<'all' | 'OSN IPA' | 'OSN IPS' | 'OSN Matematika'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'done'>('all');

  useEffect(() => {
    const allStudents = storage.students.getAll();
    const me = allStudents.find(s => s.name === username);
    
    if (me) {
        const now = new Date();
        const allExams = storage.exams.getAll();
        const allPackets = storage.packets.getAll();
        const allResults = storage.results.getAll();

        const filtered = allExams.filter(e => {
            const isTargetClass = (e.classTarget || '').split(',').includes(me.class);
            const isActive = e.isActive;
            const startDate = new Date(e.scheduledStart);
            const endDate = new Date(e.scheduledEnd);
            const isWithinTime = startDate <= now && endDate >= now;
            
            return isTargetClass && isActive && isWithinTime;
        }).map(exam => {
            // Get all attempts for this exam by this student
            const attempts = allResults.filter(r => r.examId === exam.id && r.studentName === me.name);
            
            // Sort by timestamp desc to get latest
            attempts.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            
            const isTaken = attempts.length > 0;
            const lastScore = isTaken ? attempts[0].score : undefined;
            const attemptCount = attempts.length;

            return {
                exam,
                packet: allPackets.find(p => p.id === exam.packetId),
                isTaken,
                lastScore,
                attemptCount
            };
        });

        setAvailableExams(filtered);
    }
  }, [username]);

  const formatDateRange = (startStr: string, endStr: string) => {
      const start = new Date(startStr);
      const end = new Date(endStr);
      
      const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
      const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };

      if (start.toDateString() === end.toDateString()) {
          return `${start.toLocaleDateString('id-ID', dateOptions)}, ${start.toLocaleTimeString('id-ID', timeOptions)} s.d. ${end.toLocaleTimeString('id-ID', timeOptions)}`;
      }
      return `${start.toLocaleDateString('id-ID', { ...dateOptions, ...timeOptions })} s.d. ${end.toLocaleDateString('id-ID', { ...dateOptions, ...timeOptions })}`;
  };

  // --- FILTERING LOGIC ---
  const filteredList = availableExams.filter(item => {
      // 1. Filter Category
      const catMatch = filterCategory === 'all' || (item.exam.category || item.packet?.category || 'Umum') === filterCategory;
      
      // 2. Filter Status
      let statMatch = true;
      if (filterStatus === 'done') statMatch = item.isTaken;
      if (filterStatus === 'pending') statMatch = !item.isTaken;

      return catMatch && statMatch;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/20 pb-6">
           <div className="flex items-center gap-4">
               <div className="bg-white/40 p-4 rounded-2xl text-blue-600 shadow-lg backdrop-blur-sm border border-white/40">
                    <span className="text-4xl">✍️</span>
               </div>
               <div>
                    <h2 className="text-3xl font-extrabold text-gray-800 drop-shadow-sm">Daftar Ujian Aktif</h2>
                    <p className="text-gray-600 text-sm mt-1 font-medium bg-white/30 inline-block px-3 py-1 rounded-full">
                        Silakan kerjakan ujian di bawah ini.
                    </p>
               </div>
           </div>

           {/* FILTER CONTROLS */}
           <div className="flex flex-wrap gap-2">
                <select 
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value as any)}
                    className="px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="all">📂 Semua Mapel</option>
                    <option value="OSN IPA">🔬 OSN IPA</option>
                    <option value="OSN IPS">🌍 OSN IPS</option>
                    <option value="OSN Matematika">📐 OSN Matematika</option>
                </select>

                <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-4 py-2 rounded-lg border border-gray-200 shadow-sm text-sm font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="all">🔄 Semua Status</option>
                    <option value="pending">⏳ Belum Dikerjakan</option>
                    <option value="done">✅ Sudah Dikerjakan</option>
                </select>
           </div>
       </div>
       
       {filteredList.length === 0 ? (
         <div className="bg-white/60 backdrop-blur-xl p-16 rounded-3xl shadow-lg text-center border-2 border-dashed border-white/50">
            <span className="text-6xl block mb-6 opacity-70">🔍</span>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Tidak ada data</h3>
            <p className="text-gray-600 max-w-md mx-auto">
                Tidak ditemukan ujian yang sesuai dengan filter yang Anda pilih.
            </p>
         </div>
       ) : (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredList.map(({ exam, packet, isTaken, lastScore, attemptCount }) => {
                const score = Math.round(lastScore || 0);
                const isPassed = score >= 70;

                return (
                <div key={exam.id} className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-white/50 flex flex-col group relative transform hover:-translate-y-1">
                    {/* Compact Color Bar */}
                    <div className={`h-1.5 w-full ${packet?.category === 'OSN IPA' ? 'bg-green-600' : packet?.category === 'OSN IPS' ? 'bg-orange-500' : 'bg-blue-600'}`}></div>
                    
                    <div className="p-5 flex-1 flex flex-col relative">
                        {/* Header: Category & Score */}
                        <div className="flex justify-between items-start mb-3">
                             <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                 packet?.category === 'OSN IPA' 
                                 ? 'bg-green-50 text-green-700 border-green-100' 
                                 : packet?.category === 'OSN IPS' 
                                 ? 'bg-orange-50 text-orange-700 border-orange-100'
                                 : 'bg-blue-50 text-blue-700 border-blue-100'
                             }`}>
                                 {packet?.category || 'Umum'}
                             </span>
                             
                             {isTaken && (
                                <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold border ${
                                    isPassed 
                                    ? 'bg-green-50 text-green-700 border-green-100' 
                                    : 'bg-red-50 text-red-700 border-red-100'
                                }`}>
                                    <span>Nilai: {score}</span>
                                    <span className="text-gray-400">|</span>
                                    <span>#{attemptCount}</span>
                                </div>
                             )}
                        </div>

                        {/* Title */}
                        <h4 className="text-lg font-bold text-gray-800 leading-snug group-hover:text-blue-700 transition-colors mb-4 line-clamp-2">
                             {exam.title}
                        </h4>
                        
                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-6 bg-gray-50/50 p-3 rounded-lg border border-gray-100">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Waktu</span>
                                <span className="font-medium truncate" title={formatDateRange(exam.scheduledStart, exam.scheduledEnd)}>
                                    {new Date(exam.scheduledStart).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {new Date(exam.scheduledStart).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Durasi</span>
                                <span className="font-medium">{exam.durationMinutes} Menit</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Soal</span>
                                <span className="font-medium">{packet?.totalQuestions || 0} Butir</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Status</span>
                                <span className={`font-medium ${isTaken ? 'text-green-600' : 'text-gray-600'}`}>
                                    {isTaken ? 'Selesai' : 'Belum'} {exam.allowRetry && isTaken && '(Ulang)'}
                                </span>
                            </div>
                        </div>

                        {/* Action Button */}
                        <button 
                            onClick={() => onStartExam(exam.id)}
                            disabled={isTaken && !exam.allowRetry}
                            className={`mt-auto w-full py-2.5 rounded-lg font-bold text-sm transition-all flex justify-center items-center gap-2 border ${
                                isTaken 
                                ? (exam.allowRetry 
                                    ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200' 
                                    : 'bg-gray-50 text-gray-400 cursor-not-allowed border-gray-100')
                                : 'bg-blue-600 text-white hover:bg-blue-700 border-transparent shadow-sm hover:shadow'
                            }`}
                        >
                            <span>{isTaken ? (exam.allowRetry ? 'Ulangi Ujian' : 'Selesai') : 'Kerjakan'}</span>
                            {(!isTaken || exam.allowRetry) && <span>→</span>}
                        </button>
                    </div>
                </div>
            )})}
         </div>
       )}
    </div>
  );
};

export default StudentExamList;