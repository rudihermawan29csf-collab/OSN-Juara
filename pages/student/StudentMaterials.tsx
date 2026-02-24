import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storageService';
import { Material } from '../../types';

const StudentMaterials: React.FC = () => {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        setMaterials(storage.materials.getAll());
    }, []);

    const filteredMaterials = filter === 'All' 
        ? materials 
        : materials.filter(m => m.category === filter);

    const renderThumbnail = (material: Material) => {
        const type = material.type || 'embed';
        const content = material.content || material.embedCode || '';

        if (type === 'image') {
            return <img src={content} alt={material.title} className="w-full h-full object-cover" />;
        } else if (type === 'link') {
            return (
                <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-500">
                    <span className="text-6xl">🔗</span>
                </div>
            );
        } else {
            // Embed - Try to show a preview or just an icon
            return (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none opacity-50 scale-[0.5] origin-top-left w-[200%] h-[200%]" dangerouslySetInnerHTML={{ __html: content }} />
                    <span className="text-6xl z-10 opacity-50">▶️</span>
                </div>
            );
        }
    };

    const renderContent = (material: Material) => {
        const type = material.type || 'embed';
        const content = material.content || material.embedCode || '';

        if (type === 'image') {
            return <img src={content} alt={material.title} className="max-w-full max-h-full object-contain" />;
        } else if (type === 'link') {
            return (
                <div className="flex flex-col items-center justify-center h-full gap-6 text-white">
                    <span className="text-8xl">🔗</span>
                    <a href={content} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-8 py-4 rounded-xl text-xl font-bold hover:bg-blue-700 transition-all shadow-lg">
                        Buka Tautan Materi
                    </a>
                    <p className="text-gray-400">Klik tombol di atas untuk membuka materi di tab baru.</p>
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
                        className="w-full h-full border-0 bg-white rounded-lg"
                        title="Material Content"
                        sandbox="allow-scripts allow-same-origin"
                    />
                );
            }

            return (
                <div 
                    className="w-full h-full bg-white rounded shadow-lg overflow-y-auto relative [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0" 
                    dangerouslySetInnerHTML={{ __html: content }} 
                />
            );
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Materi Belajar</h1>
                    <p className="text-gray-500 text-sm">Pelajari materi untuk persiapan OSN</p>
                </div>
                <select 
                    className="border p-2 rounded bg-white shadow-sm"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                >
                    <option value="All">Semua Materi</option>
                    <option value="OSN IPA">OSN IPA</option>
                    <option value="OSN IPS">OSN IPS</option>
                    <option value="OSN Matematika">OSN Matematika</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMaterials.length === 0 && (
                    <div className="col-span-full text-center py-10 text-gray-400 bg-white rounded-xl shadow-sm p-10">
                        <span className="text-4xl block mb-2">📚</span>
                        Belum ada materi tersedia untuk kategori ini.
                    </div>
                )}
                {filteredMaterials.map(m => (
                    <div 
                        key={m.id} 
                        onClick={() => setSelectedMaterial(m)}
                        className="bg-white rounded-xl shadow-sm border overflow-hidden cursor-pointer hover:shadow-md transition-all group flex flex-col h-full"
                    >
                        <div className="aspect-video bg-gray-100 relative overflow-hidden">
                             {renderThumbnail(m)}
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10 flex items-center justify-center">
                                 <span className="bg-white/90 text-gray-800 px-3 py-1 rounded-full text-sm font-bold opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                                     Buka Materi
                                 </span>
                             </div>
                             <div className="absolute top-2 right-2">
                                <span className={`text-[10px] px-2 py-1 rounded text-white font-bold uppercase shadow-sm ${
                                    m.category === 'OSN IPA' ? 'bg-green-600' : 
                                    m.category === 'OSN IPS' ? 'bg-orange-500' : 'bg-blue-600'
                                }`}>
                                    {m.category}
                                </span>
                             </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded">
                                    {m.type === 'link' ? 'LINK' : m.type === 'image' ? 'GAMBAR' : 'VIDEO/EMBED'}
                                </span>
                            </div>
                            <h3 className="font-bold text-lg line-clamp-2 text-gray-800 group-hover:text-blue-600 transition-colors mb-2">{m.title}</h3>
                            <p className="text-xs text-gray-400 mt-auto">{new Date(m.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
            </div>

            {selectedMaterial && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMaterial(null)}>
                    <div className="bg-transparent w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 flex justify-between items-center text-white mb-2">
                            <div>
                                <h3 className="font-bold text-2xl">{selectedMaterial.title}</h3>
                                <div className="flex gap-2 mt-1">
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase ${
                                        selectedMaterial.category === 'OSN IPA' ? 'bg-green-600' : 
                                        selectedMaterial.category === 'OSN IPS' ? 'bg-orange-500' : 'bg-blue-600'
                                    }`}>
                                        {selectedMaterial.category}
                                    </span>
                                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white/80">
                                        {new Date(selectedMaterial.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedMaterial(null)} className="text-white/70 hover:text-white text-4xl font-bold bg-white/10 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:bg-white/20">&times;</button>
                        </div>
                        <div className="flex-1 flex items-center justify-center overflow-hidden rounded-xl bg-black/50 backdrop-blur-sm border border-white/10 p-4">
                            {renderContent(selectedMaterial)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentMaterials;
