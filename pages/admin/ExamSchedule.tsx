import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storageService';
import { Exam, Packet, UserRole } from '../../types';

interface ExamScheduleProps {
    userRole: UserRole | null;
    username: string;
}

const ExamSchedule: React.FC<ExamScheduleProps> = ({ userRole, username }) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [packets, setPackets] = useState<Packet[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newExam, setNewExam] = useState<Partial<Exam>>({});
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);

  // Determine teacher category based on login name
  const teacherCategory = userRole === UserRole.TEACHER 
    ? (username.includes('OSN IPA') ? 'OSN IPA' : 
       username.includes('OSN IPS') ? 'OSN IPS' : 
       username.includes('OSN Matematika') ? 'OSN Matematika' : null)
    : null;

  useEffect(() => {
    // 1. Get Packets & Filter based on Teacher Category
    let allPackets = storage.packets.getAll();
    if (userRole === UserRole.TEACHER && teacherCategory) {
        allPackets = allPackets.filter(p => p.category === teacherCategory);
    }
    setPackets(allPackets);

    // 2. Get Exams & Filter based on Teacher Category
    let allExams = storage.exams.getAll();
    if (userRole === UserRole.TEACHER && teacherCategory) {
        allExams = allExams.filter(e => e.category === teacherCategory);
    }
    setExams(allExams);
    
    const students = storage.students.getAll();
    const classes = Array.from(new Set(students.map(s => s.class))).sort();
    setAvailableClasses(classes);
  }, [userRole, username, teacherCategory]);

  // Filter packets for the modal based on selected category (for Admin) or teacher category
  const filteredPackets = packets.filter(p => {
      if (teacherCategory) return p.category === teacherCategory;
      if (newExam.category) return p.category === newExam.category;
      return true;
  });

  useEffect(() => {
      if (newExam.classTarget) {
          setSelectedClasses(newExam.classTarget.split(',').filter(Boolean));
      } else {
          setSelectedClasses([]);
      }
  }, [newExam.id]); // Reset when editing different exam or new

  const handleAddExam = () => {
    if (newExam.title && newExam.packetId && selectedClasses.length > 0) {
      const examData = {
          ...newExam,
          classTarget: 'All', // Default to All since we removed manual selection
          isActive: newExam.id ? newExam.isActive : true,
          questions: '[]'
      };

      if (newExam.id) {
          storage.exams.update(newExam.id, examData);
      } else {
          storage.exams.add(examData as Exam);
      }
      
      // Refresh with filter
      let allExams = storage.exams.getAll();
      if (userRole === UserRole.TEACHER && teacherCategory) {
          allExams = allExams.filter(e => e.category === teacherCategory);
      }
      setExams(allExams);

      setShowModal(false);
      setNewExam({});
      setSelectedClasses([]);
    } else {
        alert("Mohon lengkapi data ujian.");
    }
  };

  const handleDeleteExam = (id: string) => {
      if(confirm("Hapus jadwal ujian ini?")) {
          storage.exams.delete(id);
          
          let allExams = storage.exams.getAll();
          if (userRole === UserRole.TEACHER && teacherCategory) {
              allExams = allExams.filter(e => e.category === teacherCategory);
          }
          setExams(allExams);
      }
  };

  const handleEditExam = (exam: Exam) => {
      setNewExam(exam);
      // Safely handle missing classTarget
      const classes = exam.classTarget ? exam.classTarget.split(',') : [];
      setSelectedClasses(classes.filter(Boolean));
      setShowModal(true);
  };

  const toggleStatus = (id: string, currentStatus: boolean) => {
    storage.exams.update(id, { isActive: !currentStatus });
    
    // Refresh with filter
    let allExams = storage.exams.getAll();
    if (userRole === UserRole.TEACHER && teacherCategory) {
        allExams = allExams.filter(e => e.category === teacherCategory);
    }
    setExams(allExams);
  };

  const handleClassSelection = (cls: string) => {
      if (selectedClasses.includes(cls)) {
          setSelectedClasses(selectedClasses.filter(c => c !== cls));
      } else {
          setSelectedClasses([...selectedClasses, cls]);
      }
  };

  const handleSelectAllClasses = () => {
      if (selectedClasses.length === availableClasses.length) {
          setSelectedClasses([]);
      } else {
          setSelectedClasses([...availableClasses]);
      }
  };

  const getPacketName = (id: string) => packets.find(p => p.id === id)?.name || "Paket Tidak Ditemukan/Akses Ditolak";
  const getPacketCount = (id: string) => packets.find(p => p.id === id)?.totalQuestions || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Jadwal Ujian</h2>
            {teacherCategory && <span className={`text-xs font-bold px-2 py-1 rounded text-white ${teacherCategory === 'OSN IPS' ? 'bg-orange-500' : teacherCategory === 'OSN IPA' ? 'bg-green-600' : 'bg-blue-600'}`}>Mode Guru: {teacherCategory}</span>}
        </div>
        <button 
          onClick={() => { setNewExam({}); setSelectedClasses([]); setShowModal(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 font-bold"
        >
          + Jadwalkan Ujian
        </button>
      </div>

      <div className="grid gap-4">
        {exams.length === 0 && <div className="text-center text-gray-500 py-10">Belum ada jadwal ujian.</div>}
        {exams.map(exam => (
          <div key={exam.id} className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500 flex flex-col md:flex-row justify-between items-start md:items-center group gap-4">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-800">{exam.title}</h3>
              <p className="text-sm font-semibold text-blue-600 mt-1">
                  📦 {getPacketName(exam.packetId)} • {getPacketCount(exam.packetId)} Soal
              </p>
              <div className="text-sm text-gray-500 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <span>🗓️ Mulai: {new Date(exam.scheduledStart).toLocaleString('id-ID')}</span>
                <span>🏁 Selesai: {new Date(exam.scheduledEnd).toLocaleString('id-ID')}</span>
                <span>⏱️ Durasi: {exam.durationMinutes} Menit</span>
              </div>
            </div>
            <div className="flex items-center gap-4 self-end md:self-center">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${exam.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {exam.isActive ? 'Aktif' : 'Non-Aktif'}
              </span>
              <button 
                onClick={() => toggleStatus(exam.id, exam.isActive)}
                className="text-sm underline text-blue-600"
              >
                {exam.isActive ? 'Matikan' : 'Aktifkan'}
              </button>
              <div className="border-l pl-4 flex gap-2">
                  <button onClick={() => handleEditExam(exam)} className="text-gray-500 hover:text-blue-600">✏️</button>
                  <button onClick={() => handleDeleteExam(exam.id)} className="text-gray-500 hover:text-red-600">🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="font-bold text-lg mb-4 text-gray-800 border-b pb-2">{newExam.id ? 'Edit Jadwal' : 'Buat Jadwal Baru'}</h3>
            <div className="space-y-4">
              <div>
                  <label className="text-xs font-bold text-gray-500">Judul Ujian</label>
                  <input 
                    className="w-full border p-2 rounded mt-1" 
                    placeholder="Contoh: Penilaian Harian 1"
                    value={newExam.title || ''}
                    onChange={e => setNewExam({...newExam, title: e.target.value})}
                  />
              </div>

              <div>
                  <label className="text-xs font-bold text-gray-500">Kategori</label>
                  <select 
                    className="w-full border p-2 rounded mt-1 bg-gray-50"
                    value={newExam.category || ''}
                    onChange={e => setNewExam({...newExam, category: e.target.value})}
                    disabled={!!teacherCategory}
                  >
                    <option value="">Pilih Kategori</option>
                    <option value="OSN IPA">OSN IPA</option>
                    <option value="OSN IPS">OSN IPS</option>
                    <option value="OSN Matematika">OSN Matematika</option>
                  </select>
                  {teacherCategory && <p className="text-[10px] text-blue-600 mt-1">* Kategori dikunci untuk akun Guru {teacherCategory}</p>}
              </div>
              
              <div>
                  <label className="text-xs font-bold text-gray-500">Paket Soal</label>
                  <select 
                    className="w-full border p-2 rounded mt-1"
                    value={newExam.packetId || ''}
                    onChange={e => setNewExam({...newExam, packetId: e.target.value})}
                    disabled={!newExam.category && !teacherCategory}
                  >
                    <option value="">Pilih Paket Soal</option>
                    {filteredPackets.map(p => <option key={p.id} value={p.id}>{p.name} ({p.totalQuestions} Soal)</option>)}
                  </select>
                  {filteredPackets.length === 0 && <p className="text-xs text-red-500 mt-1">Tidak ada paket soal yang tersedia untuk kategori ini.</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-bold text-gray-500">Waktu Mulai</label>
                   <input 
                    type="datetime-local" 
                    className="w-full border p-2 rounded mt-1" 
                    value={newExam.scheduledStart ? new Date(newExam.scheduledStart).toISOString().slice(0, 16) : ''}
                    onChange={e => setNewExam({...newExam, scheduledStart: e.target.value})} 
                   />
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-500">Waktu Selesai</label>
                   <input 
                    type="datetime-local" 
                    className="w-full border p-2 rounded mt-1" 
                    value={newExam.scheduledEnd ? new Date(newExam.scheduledEnd).toISOString().slice(0, 16) : ''}
                    onChange={e => setNewExam({...newExam, scheduledEnd: e.target.value})} 
                   />
                </div>
              </div>
              
              <div>
                  <label className="text-xs font-bold text-gray-500">Durasi (Menit)</label>
                  <input 
                    className="w-full border p-2 rounded mt-1" 
                    placeholder="Contoh: 60"
                    type="number"
                    value={newExam.durationMinutes || ''}
                    onChange={e => setNewExam({...newExam, durationMinutes: Number(e.target.value)})}
                  />
                  <div className="mt-2 flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="allowRetry"
                        checked={newExam.allowRetry || false}
                        onChange={e => setNewExam({...newExam, allowRetry: e.target.checked})}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="allowRetry" className="text-sm text-gray-700 cursor-pointer">Bisa Diulang (Siswa dapat mengerjakan ujian berkali-kali)</label>
                  </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2 pt-4 border-t">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Batal</button>
              <button onClick={handleAddExam} className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamSchedule;