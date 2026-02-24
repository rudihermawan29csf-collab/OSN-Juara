import React, { useState } from 'react';
import { UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  role: UserRole;
  user: { name: string };
  onLogout: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, role, user, onLogout, currentPage, onNavigate }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const getMenuItems = () => {
    if (role === UserRole.STUDENT) {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
        { id: 'exam_list', label: 'Ujian', icon: '📝' },
        { id: 'materials', label: 'Materi', icon: '📖' },
        { id: 'results', label: 'Hasil', icon: '📊' },
      ];
    }
    // Admin and Teacher share most items
    const items = [
      { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { id: 'bank_soal', label: 'Bank Soal', icon: '📚' },
      { id: 'materials', label: 'Bank Materi', icon: '📖' },
      { id: 'schedule', label: 'Jadwal Ujian', icon: '📅' },
      { id: 'monitoring', label: 'Monitoring', icon: '👀' }, 
      { id: 'analysis', label: 'Analisis', icon: '📈' },
    ];
    if (role === UserRole.ADMIN) {
      items.splice(1, 0, { id: 'students', label: 'Data Siswa', icon: '👥' });
      items.push({ id: 'settings', label: 'Pengaturan', icon: '⚙️' });
    }
    return items;
  };

  return (
    <div 
        className="min-h-screen font-sans flex text-gray-800 bg-fixed bg-cover bg-center"
        style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2864&auto=format&fit=crop')`,
        }}
    >
      {/* Overlay to ensure text readability if needed, though glass cards handle this */}
      <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] pointer-events-none z-0"></div>

      {/* Sidebar - Desktop (Hidden on Mobile for Students, Visible for others) */}
      <aside 
        className={`${role === UserRole.STUDENT ? 'hidden md:flex' : 'flex'} ${isCollapsed ? 'w-20' : 'w-64'} h-screen sticky top-0 z-40 transition-all duration-300 flex-col
        bg-black/40 backdrop-filter backdrop-blur-xl border-r border-white/10 shadow-2xl text-white`}
      >
        <div className={`p-6 border-b border-white/10 flex items-center h-20 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
              <div>
                <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">OSN Juara</h1>
                <p className="text-[10px] text-gray-300 mt-0.5 font-medium tracking-wider">Olimpiade Sains Nasional</p>
              </div>
          )}
          {isCollapsed && <span className="font-bold text-xl text-white">OSN</span>}
        </div>
        
        {/* Toggle Button */}
        <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`absolute -right-3 top-8 bg-blue-600/90 text-white rounded-full p-1 shadow-lg hover:bg-blue-500 z-50 border border-white/20 transition-transform hover:scale-110 ${role === UserRole.STUDENT ? 'hidden md:block' : ''}`}
        >
            {isCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
            )}
        </button>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {getMenuItems().map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                currentPage === item.id
                  ? 'bg-white/20 text-white shadow-lg border border-white/10 backdrop-blur-md'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
              } ${isCollapsed ? 'justify-center px-2' : ''}`}
              title={isCollapsed ? item.label : ''}
            >
              <span className="text-xl drop-shadow-md">{item.icon}</span>
              {!isCollapsed && <span className="font-medium tracking-wide">{item.label}</span>}
            </button>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-md">
          <div className={`flex items-center gap-3 mb-4 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-inner border border-white/20">
              {user.name.charAt(0)}
            </div>
            {!isCollapsed && (
                <div className="overflow-hidden">
                <p className="text-sm font-bold truncate text-white">{user.name}</p>
                <p className="text-[10px] text-gray-300 uppercase tracking-widest">{role}</p>
                </div>
            )}
          </div>
          <button
            onClick={onLogout}
            className={`w-full bg-red-500/80 hover:bg-red-600/90 text-white text-sm py-2 rounded-lg shadow-lg border border-red-400/30 transition-all ${isCollapsed ? 'text-xs' : ''}`}
          >
            {isCollapsed ? 'Exit' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation (Only for Students) */}
      {role === UserRole.STUDENT && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 z-50 flex justify-around items-center p-2 pb-safe">
            {getMenuItems().slice(0, 4).map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 ${
                  currentPage === item.id
                    ? 'text-blue-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span className="text-xl mb-1">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
            <button
              onClick={onLogout}
              className="flex flex-col items-center justify-center p-2 text-red-400 hover:text-red-300"
            >
              <span className="text-xl mb-1">🚪</span>
              <span className="text-[10px] font-medium">Keluar</span>
            </button>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 flex flex-col h-screen overflow-hidden relative z-10 ${role === UserRole.STUDENT ? 'pb-16 md:pb-0' : ''}`}>
        
        {/* Header - macOS Light Glass Style */}
        <header className="h-20 flex-shrink-0 flex justify-between items-center px-8
            bg-white/60 backdrop-filter backdrop-blur-xl border-b border-white/20 shadow-sm z-20">
          
          <h2 className="text-2xl font-bold text-gray-800 capitalize tracking-tight drop-shadow-sm">
            {currentPage.replace('_', ' ')}
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="px-4 py-1.5 rounded-full bg-white/50 border border-white/40 shadow-sm text-sm font-medium text-gray-600 backdrop-blur-md">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
            {/* Inner Container to hold content */}
            <div className="max-w-7xl mx-auto pb-10">
                {children}
            </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
