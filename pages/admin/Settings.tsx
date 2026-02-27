import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storageService';
import { SchoolSettings } from '../../types';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SchoolSettings>({
    schoolName: '',
    loginTitle: '',
    academicYear: '',
    semester: '',
    adminPassword: '',
    teacherIpaPassword: '',
    teacherIpsPassword: '',
    teacherMtkPassword: '',
    teacherLiterasiPassword: '',
    teacherNumerasiPassword: ''
  });
  
  const [saved, setSaved] = useState(false);
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    // Sync first to get latest settings ID from cloud
    storage.sync().then(() => {
        setSettings(storage.settings.get());
        setApiUrl(storage.getApiUrl());
    });
  }, []);

  const handleChange = (field: keyof SchoolSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    storage.settings.save(settings);
    storage.setApiUrl(apiUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleResetData = () => {
       if(!confirm("Apakah Anda yakin ingin mereset semua data aplikasi ke kondisi awal (Data Contoh)? Data yang ada saat ini akan hilang.")) return;
       
       storage.resetData();
       alert("Data berhasil direset. Halaman akan dimuat ulang.");
       window.location.reload();
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Pengaturan Aplikasi</h2>
        {saved && <span className="text-green-600 font-bold animate-pulse">Perubahan Tersimpan!</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identitas Sekolah */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 text-gray-700 border-b pb-2">Identitas Aplikasi</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nama Sekolah</label>
              <input 
                type="text" 
                value={settings.schoolName}
                onChange={e => handleChange('schoolName', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Judul Login</label>
              <input 
                type="text" 
                value={settings.loginTitle}
                onChange={e => handleChange('loginTitle', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md p-2"
              />
            </div>
             <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tahun Pelajaran</label>
                <input 
                  type="text" 
                  value={settings.academicYear}
                  onChange={e => handleChange('academicYear', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Semester</label>
                <input 
                  type="text" 
                  value={settings.semester}
                  onChange={e => handleChange('semester', e.target.value)}
                  className="mt-1 w-full border border-gray-300 rounded-md p-2"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Keamanan */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-bold mb-4 text-red-600 border-b pb-2">Keamanan & Password</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Password Admin</label>
              <input 
                type="text" 
                value={settings.adminPassword}
                onChange={e => handleChange('adminPassword', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md p-2 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password Guru OSN IPA</label>
              <input 
                type="text" 
                value={settings.teacherIpaPassword}
                onChange={e => handleChange('teacherIpaPassword', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md p-2 font-mono"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700">Password Guru OSN IPS</label>
              <input 
                type="text" 
                value={settings.teacherIpsPassword}
                onChange={e => handleChange('teacherIpsPassword', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md p-2 font-mono"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700">Password Guru OSN Matematika</label>
              <input 
                type="text" 
                value={settings.teacherMtkPassword}
                onChange={e => handleChange('teacherMtkPassword', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md p-2 font-mono"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700">Password Guru Literasi</label>
              <input 
                type="text" 
                value={settings.teacherLiterasiPassword}
                onChange={e => handleChange('teacherLiterasiPassword', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md p-2 font-mono"
              />
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700">Password Guru Numerasi</label>
              <input 
                type="text" 
                value={settings.teacherNumerasiPassword}
                onChange={e => handleChange('teacherNumerasiPassword', e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-md p-2 font-mono"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Database Tools */}
      <div className="bg-blue-50 p-6 rounded-lg shadow border border-blue-200">
          <h3 className="text-lg font-bold mb-2 text-blue-700">Koneksi Cloud (Google Sheets)</h3>
          <p className="text-sm text-blue-600 mb-4">
              Hubungkan aplikasi dengan Google Sheets menggunakan Google Apps Script untuk penyimpanan online.
          </p>
          
          <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Google Apps Script Web App URL</label>
              <input 
                type="text" 
                placeholder="https://script.google.com/macros/s/..."
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full border border-gray-300 rounded-md p-2 text-sm font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                  Pastikan script dideploy sebagai "Web App" dengan akses "Anyone".
              </p>
          </div>

          <button 
            onClick={async () => {
                const success = await storage.sync();
                if (success) alert("Sinkronisasi Berhasil! Data telah dimuat dari Cloud.");
                else alert("Gagal sinkronisasi. Periksa URL atau koneksi internet.");
                window.location.reload();
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded shadow flex items-center gap-2"
          >
              ☁️ Sinkronisasi Sekarang
          </button>
      </div>

      <div className="bg-red-50 p-6 rounded-lg shadow border border-red-200">
          <h3 className="text-lg font-bold mb-2 text-red-700">Zona Bahaya</h3>
          <p className="text-sm text-red-600 mb-4">Aksi di bawah ini akan menghapus semua data yang tersimpan di browser ini dan mengembalikannya ke data awal (default).</p>
          <button 
            onClick={handleResetData}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded shadow flex items-center gap-2"
          >
              ⚠️ Reset Aplikasi ke Data Awal
          </button>
      </div>

      <div className="flex justify-end sticky bottom-0 bg-white/90 backdrop-blur p-4 border-t z-10">
        <button 
          onClick={handleSave} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-transform transform active:scale-95 flex items-center gap-2"
        >
          <span>💾</span> Simpan Pengaturan
        </button>
      </div>
    </div>
  );
};

export default Settings;
