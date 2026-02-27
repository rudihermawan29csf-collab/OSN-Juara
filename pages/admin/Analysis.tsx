import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storageService';
import { Result, Exam, Question, UserRole } from '../../types';
import { analyzeResults } from '../../services/geminiService';

interface ItemAnalysis {
    questionNo: number;
    questionText: string; // New field
    difficulty: 'Mudah' | 'Sedang' | 'Sukar';
    correctCount: number;
    totalAttempts: number;
    distractors: Record<number, number>; 
}

interface AnalysisProps {
    userRole: UserRole | null;
    username: string;
}

const Analysis: React.FC<AnalysisProps> = ({ userRole, username }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<ItemAnalysis[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Determine teacher category
  const teacherCategory = userRole === UserRole.TEACHER 
      ? (username.includes('OSN IPA') ? 'OSN IPA' : 
         username.includes('OSN IPS') ? 'OSN IPS' : 
         username.includes('OSN Matematika') ? 'OSN Matematika' : null)
      : null;

  useEffect(() => {
    let allExams = storage.exams.getAll();
    
    // Filter based on teacher category
    if (userRole === UserRole.TEACHER && teacherCategory) {
         allExams = allExams.filter(e => e.category === teacherCategory);
    } else if (userRole === UserRole.ADMIN && filterCategory !== 'All') {
         allExams = allExams.filter(e => e.category === filterCategory);
    }

    setExams(allExams);
    // Only reset if selected exam is no longer in the list
    if (allExams.length > 0) {
        if (!selectedExamId || !allExams.find(e => e.id === selectedExamId)) {
            setSelectedExamId(allExams[0].id);
        }
    } else {
        setSelectedExamId('');
    }
  }, [userRole, username, teacherCategory, filterCategory]);

  useEffect(() => {
      if (!selectedExamId) {
          setAnalysisData([]);
          return;
      }
      const exam = exams.find(e => e.id === selectedExamId);
      if (!exam) return;

      const examQuestions = storage.questions.getByPacketId(exam.packetId);
      const results = storage.results.getAll().filter(r => r.examId === selectedExamId);

      setQuestions(examQuestions);

      // Calculate Item Analysis
      const itemStats: ItemAnalysis[] = examQuestions.map(q => {
          let correct = 0;
          let attempts = 0;
          const dist: Record<number, number> = {};

          results.forEach(r => {
              const answers = JSON.parse(r.answers);
              const studentAns = answers[q.id];
              
              if (studentAns !== undefined) {
                  attempts++;
                  if (typeof studentAns === 'number') {
                      dist[studentAns] = (dist[studentAns] || 0) + 1;
                  }
                  
                  if (q.type === 'PG' && studentAns === q.correctAnswerIndex) correct++;
                  else if (q.type === 'PGK' && JSON.stringify(studentAns) === q.correctAnswerIndices) correct++;
              }
          });

          const ratio = attempts > 0 ? correct / attempts : 0;
          let diff: 'Mudah' | 'Sedang' | 'Sukar' = 'Sedang';
          if (ratio > 0.7) diff = 'Mudah';
          else if (ratio < 0.3) diff = 'Sukar';

          return {
              questionNo: q.number,
              questionText: q.text,
              difficulty: diff,
              correctCount: correct,
              totalAttempts: attempts,
              distractors: dist
          };
      });
      
      setAnalysisData(itemStats.sort((a,b) => a.questionNo - b.questionNo));

  }, [selectedExamId, exams]);

  const handleDownloadExcel = () => {
      // Create CSV content
      const headers = ["No Soal,Tingkat Kesukaran,Jml Benar,Jml Peserta,Opsi A,Opsi B,Opsi C,Opsi D,Opsi E"];
      const rows = analysisData.map(item => [
          item.questionNo,
          item.difficulty,
          item.correctCount,
          item.totalAttempts,
          item.distractors[0] || 0,
          item.distractors[1] || 0,
          item.distractors[2] || 0,
          item.distractors[3] || 0,
          item.distractors[4] || 0
      ].join(","));
      
      const csvContent = "data:text/csv;charset=utf-8," + headers.join("\n") + "\n" + rows.join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Analisis_Ujian_${selectedExamId}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
      // Use browser print, but we need to hide other elements
      // We do this by adding a temporary style to hide non-print area
      // In a real SPA, window.print() is the most robust way without heavy libraries like jsPDF
      window.print();
  };

  return (
    <div className="space-y-6">
      <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-analysis, #printable-analysis * {
              visibility: visible;
            }
            #printable-analysis {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            button, select {
                display: none !important;
            }
          }
      `}</style>

      <div className="flex justify-between items-center bg-white p-4 rounded shadow no-print">
         <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
             <div>
                 <h2 className="text-xl font-bold">Analisis Hasil Ujian</h2>
                 {teacherCategory && <span className="text-xs text-gray-500 font-bold">Mode Guru: {teacherCategory}</span>}
             </div>
             {userRole === UserRole.ADMIN && (
                 <select 
                    className="border p-2 rounded w-48 font-bold text-sm"
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                >
                    <option value="All">Semua Kategori</option>
                    <option value="OSN IPA">OSN IPA</option>
                    <option value="OSN IPS">OSN IPS</option>
                    <option value="OSN Matematika">OSN Matematika</option>
                    <option value="Literasi">Literasi</option>
                    <option value="Numerasi">Numerasi</option>
                </select>
             )}
             <select 
                className="border p-2 rounded w-64"
                value={selectedExamId}
                onChange={e => setSelectedExamId(e.target.value)}
             >
                 {exams.length === 0 && <option>Tidak ada data ujian</option>}
                 {exams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
             </select>
         </div>
         <div className="flex gap-2">
             <button onClick={handleDownloadExcel} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-bold text-sm flex items-center gap-2">
                <span>📄</span> Download Excel (CSV)
             </button>
             <button onClick={handleDownloadPDF} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-bold text-sm flex items-center gap-2">
                <span>🖨️</span> Print PDF
             </button>
         </div>
      </div>

      <div id="printable-analysis" className="bg-white p-6 rounded shadow">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="font-bold text-lg text-blue-800">Analisis Butir Soal & Daya Beda</h3>
              <p className="text-sm text-gray-500 print:block hidden">{new Date().toLocaleDateString()}</p>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-gray-100 text-gray-700 uppercase">
                      <tr>
                          <th className="p-3 text-center border w-16">No</th>
                          <th className="p-3 border w-1/3">Soal</th>
                          <th className="p-3 text-center border">Kesukaran</th>
                          <th className="p-3 text-center border">Benar</th>
                          <th className="p-3 text-center border">Total</th>
                          <th className="p-3 text-center border bg-blue-50">A</th>
                          <th className="p-3 text-center border bg-blue-50">B</th>
                          <th className="p-3 text-center border bg-blue-50">C</th>
                          <th className="p-3 text-center border bg-blue-50">D</th>
                      </tr>
                  </thead>
                  <tbody>
                      {analysisData.length === 0 ? (
                          <tr><td colSpan={9} className="p-4 text-center">Belum ada data hasil ujian untuk ujian yang dipilih.</td></tr>
                      ) : analysisData.map(item => (
                          <tr key={item.questionNo} className="hover:bg-gray-50">
                              <td className="p-3 text-center border font-bold">{item.questionNo}</td>
                              <td className="p-3 border text-sm text-gray-600 line-clamp-2 max-w-xs" title={item.questionText}>
                                  {item.questionText.substring(0, 100)}{item.questionText.length > 100 ? '...' : ''}
                              </td>
                              <td className="p-3 text-center border">
                                  <span className={`px-2 py-1 rounded text-xs font-bold text-white print:text-black print:border print:bg-transparent ${
                                      item.difficulty === 'Mudah' ? 'bg-green-500' : 
                                      item.difficulty === 'Sedang' ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}>
                                      {item.difficulty}
                                  </span>
                              </td>
                              <td className="p-3 text-center border">{item.correctCount}</td>
                              <td className="p-3 text-center border">{item.totalAttempts}</td>
                              <td className="p-3 text-center border text-gray-500">{item.distractors[0] || 0}</td>
                              <td className="p-3 text-center border text-gray-500">{item.distractors[1] || 0}</td>
                              <td className="p-3 text-center border text-gray-500">{item.distractors[2] || 0}</td>
                              <td className="p-3 text-center border text-gray-500">{item.distractors[3] || 0}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>

          {/* Weakness Analysis Section */}
          <div className="mt-8 border-t pt-6">
              <h3 className="font-bold text-lg text-red-800 mb-4">Analisis Kelemahan & Rekomendasi Materi</h3>
              <p className="text-sm text-gray-600 mb-4">Daftar soal dengan tingkat kesalahan tinggi (Sukar / Correct &lt; 50%) yang perlu dibahas ulang.</p>
              
              <div className="grid grid-cols-1 gap-4">
                  {analysisData.filter(item => item.difficulty === 'Sukar' || (item.correctCount / (item.totalAttempts || 1)) < 0.5).length === 0 ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded text-green-700">
                          Tidak ada soal yang tergolong sukar. Siswa memahami materi dengan baik.
                      </div>
                  ) : (
                      analysisData.filter(item => item.difficulty === 'Sukar' || (item.correctCount / (item.totalAttempts || 1)) < 0.5).map(item => (
                          <div key={item.questionNo} className="border border-red-200 bg-red-50 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                  <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">No. {item.questionNo}</span>
                                  <span className="text-xs font-bold text-red-600">
                                      Benar: {Math.round((item.correctCount / (item.totalAttempts || 1)) * 100)}%
                                  </span>
                              </div>
                              <p className="text-gray-800 font-medium mb-2">{item.questionText}</p>
                              <div className="bg-white p-3 rounded border border-red-100 text-sm text-gray-600">
                                  <strong>Rekomendasi:</strong> Perlu pendalaman materi terkait topik soal ini.
                                  {/* In future, link to actual material by matching keywords or category */}
                              </div>
                          </div>
                      ))
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default Analysis;