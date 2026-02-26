import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storageService';
import { Exam, Packet, Student } from '../../types';

interface StudentExamListProps {
    username: string;
    onStartExam: (examId: string) => void;
}

const StudentExamList: React.FC<StudentExamListProps> = ({ username, onStartExam }) => {
  const [scheduleItems, setScheduleItems] = useState<Array<{ 
      exam: Exam, 
      packet?: Packet, 
      isLocked: boolean,
      isCompleted: boolean,
      score?: number,
      status: 'locked' | 'open' | 'completed' | 'failed'
  }>>([]);
  
  const [student, setStudent] = useState<Student | null>(null);

  useEffect(() => {
    const allStudents = storage.students.getAll();
    const me = allStudents.find(s => s.name === username);
    setStudent(me || null);
    
    if (me) {
        const now = new Date();
        const allExams = storage.exams.getAll();
        const allPackets = storage.packets.getAll();
        const allResults = storage.results.getAll();

        // Filter relevant schedules
        const relevantExams = allExams.filter(e => {
            const isTargetClass = (e.classTarget || '').split(',').includes(me.class) || e.classTarget === 'All';
            const isActive = e.isActive;
            // Only include exams that have a packet (since we removed materials)
            return isTargetClass && isActive && e.packetId;
        });

        // Sort by Order
        relevantExams.sort((a,b) => (a.order || 0) - (b.order || 0));

        let previousCompleted = true; // First item is always unlocked if active

        const processed = relevantExams.map(exam => {
            // Check completion status
            let isCompleted = false;
            let score = undefined;
            let status: 'locked' | 'open' | 'completed' | 'failed' = 'locked';

            // Check Exam Completion
            if (exam.packetId) {
                const attempts = allResults.filter(r => r.examId === exam.id && r.studentName === me.name);
                attempts.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
                
                if (attempts.length > 0) {
                    score = attempts[0].score;
                    const minScore = exam.minScore || 70;
                    if (score >= minScore) {
                        isCompleted = true;
                        status = 'completed';
                    } else {
                        isCompleted = false;
                        status = 'failed';
                    }
                }
            }

            // Determine Lock Status
            // If previous was not completed, this one is locked
            if (!previousCompleted) {
                status = 'locked';
            } else if (status === 'locked') {
                // If previous completed and this is not 'completed' or 'failed', it's open
                status = 'open';
            }

            // Update previousCompleted for next iteration
            previousCompleted = isCompleted;

            return {
                exam,
                packet: allPackets.find(p => p.id === exam.packetId),
                isLocked: status === 'locked',
                isCompleted,
                score,
                status
            };
        });

        setScheduleItems(processed);
    }
  }, [username]);

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
       <div className="text-center mb-10">
            <h2 className="text-3xl font-extrabold text-gray-800">Daftar Ujian</h2>
            <p className="text-gray-500 mt-2">Selesaikan ujian secara berurutan</p>
       </div>

       <div className="relative">
           {/* Vertical Line */}
           <div className="absolute left-8 top-0 bottom-0 w-1 bg-gray-200 rounded-full"></div>

           <div className="space-y-8">
               {scheduleItems.map((item, index) => (
                   <div key={item.exam.id} className={`relative pl-24 transition-all duration-500 ${item.isLocked ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                       {/* Timeline Dot */}
                       <div className={`absolute left-4 top-6 w-9 h-9 rounded-full border-4 z-10 flex items-center justify-center font-bold text-sm bg-white ${
                           item.status === 'completed' ? 'border-green-500 text-green-600' :
                           item.status === 'failed' ? 'border-red-500 text-red-600' :
                           item.status === 'open' ? 'border-blue-500 text-blue-600 animate-pulse' :
                           'border-gray-300 text-gray-400'
                       }`}>
                           {item.status === 'completed' ? '✓' : index + 1}
                       </div>

                       {/* Card */}
                       <div className={`bg-white rounded-2xl p-6 shadow-lg border-l-4 ${
                           item.status === 'completed' ? 'border-green-500' :
                           item.status === 'failed' ? 'border-red-500' :
                           item.status === 'open' ? 'border-blue-500' :
                           'border-gray-300'
                       }`}>
                           <div className="flex justify-between items-start">
                               <div>
                                   <h3 className="text-xl font-bold text-gray-800">{item.exam.title}</h3>
                                   <div className="text-sm text-gray-500 mt-1">
                                       {item.packet && <span>📝 {item.packet.name} ({item.packet.totalQuestions} Soal)</span>}
                                   </div>
                               </div>
                               <div className="text-right">
                                   <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                                       item.status === 'completed' ? 'bg-green-100 text-green-700' :
                                       item.status === 'failed' ? 'bg-red-100 text-red-700' :
                                       item.status === 'open' ? 'bg-blue-100 text-blue-700' :
                                       'bg-gray-100 text-gray-500'
                                   }`}>
                                       {item.status === 'completed' ? 'Selesai' :
                                        item.status === 'failed' ? 'Belum Lulus' :
                                        item.status === 'open' ? 'Tersedia' : 'Terkunci'}
                                   </span>
                               </div>
                           </div>

                           {/* Requirements / Status Info */}
                           <div className="mt-4 bg-gray-50 p-3 rounded-lg text-sm text-gray-600 flex flex-wrap gap-4">
                               {item.packet && (
                                   <div className="flex items-center gap-2">
                                       <span>🎯 KKM: {item.exam.minScore || 70}</span>
                                       {item.score !== undefined && (
                                           <span className={`font-bold ${item.score >= (item.exam.minScore || 70) ? 'text-green-600' : 'text-red-600'}`}>
                                               (Nilai Anda: {item.score})
                                           </span>
                                       )}
                                   </div>
                               )}
                           </div>

                           {/* Actions */}
                           {!item.isLocked && (
                               <div className="mt-6 flex gap-3">
                                   {item.packet && (
                                       <button 
                                           onClick={() => onStartExam(item.exam.id)}
                                           className={`px-6 py-2 rounded-lg font-bold text-white shadow transition-transform hover:-translate-y-0.5 ${
                                               item.status === 'completed' && !item.exam.allowRetry ? 'bg-gray-400 cursor-not-allowed' :
                                               'bg-blue-600 hover:bg-blue-700'
                                           }`}
                                           disabled={item.status === 'completed' && !item.exam.allowRetry}
                                       >
                                           {item.status === 'completed' ? (item.exam.allowRetry ? 'Ulangi Ujian' : 'Selesai') : 'Mulai Ujian'}
                                       </button>
                                   )}
                               </div>
                           )}
                       </div>
                   </div>
               ))}
           </div>
       </div>
    </div>
  );
};

export default StudentExamList;