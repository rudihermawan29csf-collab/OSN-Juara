import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storageService';
import { Material, UserRole } from '../../types';

interface MaterialsProps {
    userRole: UserRole | null;
    username: string;
}

const Materials: React.FC<MaterialsProps> = ({ userRole, username }) => {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<Partial<Material>>({});
    const [filterCategory, setFilterCategory] = useState('All');
    const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);

    // Determine teacher category
    const teacherCategory = userRole === UserRole.TEACHER 
        ? (username.includes('OSN IPA') ? 'OSN IPA' : 
           username.includes('OSN IPS') ? 'OSN IPS' : 
           username.includes('OSN Matematika') ? 'OSN Matematika' : null)
        : null;

    useEffect(() => {
        loadMaterials();
    }, [userRole, username, filterCategory]);

    const loadMaterials = () => {
        let all = storage.materials.getAll();
        
        if (userRole === UserRole.TEACHER && teacherCategory) {
            all = all.filter(m => m.category === teacherCategory);
        } else if (userRole === UserRole.ADMIN && filterCategory !== 'All') {
            all = all.filter(m => m.category === filterCategory);
        }
        
        setMaterials(all);
    };

    const handleOpenModal = (material?: Material) => {
        if (material) {
            setForm({
                ...material,
                // Ensure type is set (migration fallback)
                type: material.type || 'embed',
                content: material.content || material.embedCode || ''
            });
        } else {
            setForm({
                category: teacherCategory || 'OSN IPA',
                title: '',
                type: 'embed',
                content: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!form.title || !form.category || !form.content) {
            alert("Semua field wajib diisi!");
            return;
        }

        const materialData: any = {
            ...form,
            // Ensure embedCode is populated for backward compatibility if needed, 
            // but primarily use content.
            embedCode: form.type === 'embed' ? form.content : undefined
        };

        if (form.id) {
            storage.materials.update(form.id, materialData);
        } else {
            storage.materials.add(materialData as Material);
        }
        
        setIsModalOpen(false);
        loadMaterials();
    };

    const handleDelete = (id: string) => {
        if (confirm("Hapus materi ini?")) {
            storage.materials.delete(id);
            loadMaterials();
        }
    };

    const renderPreviewContent = (material: Material) => {
        const type = material.type || 'embed'; // Fallback
        const content = material.content || material.embedCode || '';

        if (type === 'image') {
            return <img src={content} alt={material.title} className="w-full h-full object-contain" />;
        } else if (type === 'link') {
            return (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <span className="text-6xl">🔗</span>
                    <a href={content} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xl font-bold">
                        Buka Tautan Materi
                    </a>
                </div>
            );
        } else {
            // Embed or Full HTML
            const isFullHtml = content.trim().toLowerCase().startsWith('<!doctype html') || 
                               content.trim().toLowerCase().startsWith('<html');

            if (isFullHtml) {
                return (
                    <iframe 
                        srcDoc={content} 
                        className="w-full h-full border-0 bg-white"
                        title="Material Preview"
                        sandbox="allow-scripts allow-same-origin"
                    />
                );
            }

            return (
                <div 
                    className="w-full h-full overflow-y-auto [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
                    dangerouslySetInnerHTML={{ __html: content }} 
                />
            );
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Bank Materi Belajar</h1>
                    <p className="text-gray-500 text-sm">Kelola materi pembelajaran untuk siswa</p>
                </div>
                <div className="flex gap-2">
                    {userRole === UserRole.ADMIN && (
                        <select 
                            className="border p-2 rounded"
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
                    <button 
                        onClick={() => handleOpenModal()} 
                        className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 shadow flex items-center gap-2"
                    >
                        + Tambah Materi
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {materials.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-400">
                        Belum ada materi.
                    </div>
                )}
                {materials.map(m => (
                    <div key={m.id} className="bg-white rounded-xl shadow-sm border overflow-hidden flex flex-col p-4">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <span className={`text-[10px] px-2 py-1 rounded text-white font-bold uppercase ${
                                    m.category === 'OSN IPA' ? 'bg-green-600' : 
                                    m.category === 'OSN IPS' ? 'bg-orange-500' : 
                                    m.category === 'OSN Matematika' ? 'bg-blue-600' :
                                    m.category === 'Literasi' ? 'bg-purple-600' :
                                    'bg-teal-600'
                                }`}>
                                    {m.category}
                                </span>
                                <h3 className="font-bold text-lg mt-2 line-clamp-2">{m.title}</h3>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={() => handleOpenModal(m)} className="text-blue-600 hover:bg-blue-100 p-1 rounded">✏️</button>
                                <button onClick={() => handleDelete(m.id)} className="text-red-600 hover:bg-red-100 p-1 rounded">🗑️</button>
                            </div>
                        </div>
                        
                        <div className="mt-auto flex justify-between items-center pt-4 border-t">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                {m.type === 'link' ? '🔗 Link' : m.type === 'image' ? '🖼️ Gambar' : '📹 Embed'} • {new Date(m.createdAt).toLocaleDateString()}
                            </span>
                            <button 
                                onClick={() => setPreviewMaterial(m)}
                                className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-sm font-bold hover:bg-gray-200 flex items-center gap-2"
                            >
                                👁️ Preview
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Preview Modal - Full Screen */}
            {previewMaterial && (
                <div className="fixed inset-0 bg-black z-[100] flex flex-col" onClick={() => setPreviewMaterial(null)}>
                    <div className="bg-white text-gray-800 p-4 flex justify-between items-center shadow-md z-10" onClick={e => e.stopPropagation()}>
                        <div>
                            <h3 className="font-bold text-xl">{previewMaterial.title}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded text-white font-bold uppercase ${
                                previewMaterial.category === 'OSN IPA' ? 'bg-green-600' : 
                                previewMaterial.category === 'OSN IPS' ? 'bg-orange-500' : 
                                previewMaterial.category === 'OSN Matematika' ? 'bg-blue-600' :
                                previewMaterial.category === 'Literasi' ? 'bg-purple-600' :
                                'bg-teal-600'
                            }`}>
                                {previewMaterial.category}
                            </span>
                        </div>
                        <button 
                            onClick={() => setPreviewMaterial(null)} 
                            className="bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 px-4 py-2 rounded-lg font-bold transition-colors"
                        >
                            Tutup Preview ✕
                        </button>
                    </div>
                    <div className="flex-1 bg-gray-900 overflow-hidden relative flex items-center justify-center">
                        <div className="w-full h-full" onClick={e => e.stopPropagation()}>
                            {renderPreviewContent(previewMaterial)}
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-xl w-[600px] shadow-2xl">
                        <h3 className="font-bold text-lg mb-4 border-b pb-2">
                            {form.id ? 'Edit Materi' : 'Tambah Materi Baru'}
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Judul Materi</label>
                                <input 
                                    className="w-full border p-2 rounded" 
                                    value={form.title || ''} 
                                    onChange={e => setForm({...form, title: e.target.value})}
                                    placeholder="Contoh: Pembahasan Soal OSN 2024"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Kategori</label>
                                <select 
                                    className="w-full border p-2 rounded bg-gray-50"
                                    value={form.category || ''}
                                    onChange={e => setForm({...form, category: e.target.value})}
                                    disabled={!!teacherCategory}
                                >
                                    <option value="OSN IPA">OSN IPA</option>
                                    <option value="OSN IPS">OSN IPS</option>
                                    <option value="OSN Matematika">OSN Matematika</option>
                                    <option value="Literasi">Literasi</option>
                                    <option value="Numerasi">Numerasi</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Tipe Materi</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="type" 
                                            value="embed" 
                                            checked={form.type === 'embed'} 
                                            onChange={() => setForm({...form, type: 'embed'})}
                                        />
                                        <span>Embed HTML</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="type" 
                                            value="link" 
                                            checked={form.type === 'link'} 
                                            onChange={() => setForm({...form, type: 'link'})}
                                        />
                                        <span>Link URL</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name="type" 
                                            value="image" 
                                            checked={form.type === 'image'} 
                                            onChange={() => setForm({...form, type: 'image'})}
                                        />
                                        <span>Gambar (URL)</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">
                                    {form.type === 'embed' ? 'Kode Embed HTML' : form.type === 'image' ? 'URL Gambar' : 'Link URL'}
                                </label>
                                <p className="text-xs text-gray-500 mb-1">
                                    {form.type === 'embed' ? 'Masukkan kode iframe dari YouTube, Google Drive, dll.' : 
                                     form.type === 'image' ? 'Masukkan link langsung ke gambar (jpg/png).' : 
                                     'Masukkan link website atau dokumen.'}
                                </p>
                                {form.type === 'embed' ? (
                                    <textarea 
                                        className="w-full border p-2 rounded h-40 font-mono text-xs" 
                                        value={form.content || ''} 
                                        onChange={e => setForm({...form, content: e.target.value})}
                                        placeholder='<iframe src="..." width="100%" height="100%"></iframe>'
                                    />
                                ) : (
                                    <input 
                                        className="w-full border p-2 rounded" 
                                        value={form.content || ''} 
                                        onChange={e => setForm({...form, content: e.target.value})}
                                        placeholder={form.type === 'image' ? 'https://example.com/image.jpg' : 'https://example.com/materi'}
                                    />
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Batal</button>
                            <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 shadow">Simpan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Materials;
