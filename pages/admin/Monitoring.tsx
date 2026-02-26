import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storageService';
import { Student, Material, UserRole } from '../../types';

interface MonitoringProps {
    userRole: UserRole | null;
    username: string;
}

const Monitoring: React.FC<MonitoringProps> = ({ userRole, username }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [filterClass, setFilterClass] = useState('All');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    useEffect(() => {
        setStudents(storage.students.getAll());
        setMaterials(storage.materials.getAll());
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

    const getReadCount = (student: Student) => {
        if (!student.readMaterials) return 0;
        if (teacherCategory) {
            // Count only materials of this category
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Monitoring Literasi Siswa</h2>
                    <p className="text-sm text-gray-500">Pantau aktivitas siswa dalam membaca materi</p>
                </div>
                <div className="flex gap-4">
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
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Progress Materi</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-400 italic">Tidak ada data siswa.</td>
                            </tr>
                        ) : filteredStudents.map(student => {
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
                        })}
                    </tbody>
                </table>
            </div>

            {selectedStudent && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedStudent(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-lg text-gray-800">Detail Literasi: {selectedStudent.name}</h3>
                                <p className="text-sm text-gray-500">{selectedStudent.class} • {selectedStudent.nis}</p>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-gray-600 font-bold text-xl">&times;</button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
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
                                                    <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                                                        {new Date(m.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="ml-auto text-green-500 font-bold">✓</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t bg-gray-50 text-right">
                            <button onClick={() => setSelectedStudent(null)} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded font-bold">Tutup</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Monitoring;
