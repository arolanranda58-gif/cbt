import React, { useState } from 'react';
import { Peserta, SoalUjian, PengaturanApp } from '../types';
import { AdminDashboard } from './AdminDashboard';
import { AdminPeserta } from './AdminPeserta';
import { AdminSoal } from './AdminSoal';
import { AdminPengaturan } from './AdminPengaturan';
import { GoogleSheetsManager } from './GoogleSheetsManager';
import { User } from 'firebase/auth';
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Eye,
  School,
  ShieldCheck,
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';

interface AdminShellProps {
  currentUser: User | null;
  onUserChanged: (user: User | null) => void;
  pesertaList: Peserta[];
  soalList: SoalUjian[];
  settings: PengaturanApp;
  onLogout: () => void;
  onPreviewStudentMode: () => void;
  onAddPeserta: (peserta: Peserta) => void;
  onUpdatePeserta: (peserta: Peserta) => void;
  onDeletePeserta: (id: string) => void;
  onToggleStatusPeserta: (id: string) => void;
  onUnlockStudent: (id: string) => void;
  onUnlockAll: () => void;
  onAddSoal: (soal: SoalUjian) => void;
  onUpdateSoal: (soal: SoalUjian) => void;
  onDeleteSoal: (id: string) => void;
  onSaveSettings: (settings: PengaturanApp) => void;
  onResetDefault: () => void;
  onDataLoadedFromSheet: (peserta: Peserta[], soal: SoalUjian[], newSettings?: Partial<PengaturanApp>) => void;
  lastSyncTime?: string;
  isSyncing?: boolean;
  onTriggerSync?: () => void;
}

type AdminView = 'dashboard' | 'peserta' | 'soal' | 'spreadsheet' | 'pengaturan';

export const AdminShell: React.FC<AdminShellProps> = ({
  currentUser,
  onUserChanged,
  pesertaList,
  soalList,
  settings,
  onLogout,
  onPreviewStudentMode,
  onAddPeserta,
  onUpdatePeserta,
  onDeletePeserta,
  onToggleStatusPeserta,
  onUnlockStudent,
  onUnlockAll,
  onAddSoal,
  onUpdateSoal,
  onDeleteSoal,
  onSaveSettings,
  onResetDefault,
  onDataLoadedFromSheet,
  lastSyncTime,
  isSyncing,
  onTriggerSync,
}) => {
  const [currentView, setCurrentView] = useState<AdminView>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'peserta', label: 'Data Peserta', icon: Users, badge: pesertaList.filter(p => p.status === 'Tidak Aktif').length > 0 ? pesertaList.filter(p => p.status === 'Tidak Aktif').length : undefined },
    { id: 'soal', label: 'Data Soal', icon: FileText, badge: soalList.length },
    { id: 'spreadsheet', label: 'Google Spreadsheet', icon: FileSpreadsheet, isSpreadsheet: true },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
  ] as const;

  const viewTitles: Record<AdminView, string> = {
    dashboard: 'Dashboard Proktor Ujian',
    peserta: 'Manajemen Data Peserta',
    soal: 'Manajemen Bank Soal & Token',
    spreadsheet: 'Database Google Spreadsheet',
    pengaturan: 'Pengaturan Sistem & Anti-Curang',
  };

  return (
    <div className="h-screen w-screen flex bg-slate-100 overflow-hidden text-slate-800">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-xs animate-in fade-in"
        />
      )}

      {/* Sidebar (Blue Theme matching original script) */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-gradient-to-b from-blue-700 via-blue-600 to-indigo-800 text-white flex flex-col p-4 shadow-xl transition-transform duration-250 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-blue-200 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand */}
        <div className="flex flex-col items-center text-center mt-2 mb-6 pb-4 border-b border-blue-500/40">
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mb-2.5 backdrop-blur-xs border border-white/20">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-bold text-lg leading-tight tracking-tight">Admin Ujian Online</h2>
          <p className="text-[11px] text-blue-200 mt-0.5 line-clamp-1">{settings.schoolName}</p>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-blue-900/80 text-white shadow-xs border border-blue-400/30'
                    : 'text-blue-100 hover:bg-blue-600/70 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-blue-200'}`} />
                  <span>{item.label}</span>
                </div>
                {item.id === 'peserta' && item.badge && typeof item.badge === 'number' && item.badge > 0 ? (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                ) : null}
                {item.id === 'spreadsheet' && settings.googleSpreadsheetId ? (
                  <span className="bg-emerald-400 text-emerald-950 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                    Live
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="pt-4 mt-auto border-t border-blue-500/40 space-y-2">
          <button
            onClick={onPreviewStudentMode}
            className="w-full py-2 px-3 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
          >
            <Eye className="w-3.5 h-3.5" />
            Mode Siswa (Uji Coba)
          </button>
          <button
            onClick={onLogout}
            className="w-full py-2 px-3 bg-white text-blue-700 hover:bg-blue-50 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-blue-700" />
            Logout Proktor
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-xs z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
              {viewTitles[currentView]}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Google Spreadsheet Quick Status Indicator in Topbar */}
            {settings.googleSpreadsheetId ? (
              <button
                onClick={() => setCurrentView('spreadsheet')}
                title={`Google Spreadsheet Terhubung (Auto-Sync Aktif - Terakhir: ${lastSyncTime || 'Baru saja'})`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs font-semibold transition cursor-pointer"
              >
                <span className={`w-2 h-2 rounded-full bg-emerald-500 ${isSyncing ? 'animate-ping' : 'animate-pulse'}`} />
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="hidden sm:inline">Auto-Sync Aktif</span>
                <span className="sm:hidden">Auto-Sync</span>
                {lastSyncTime && (
                  <span className="text-[10px] text-emerald-600/80 font-mono hidden md:inline">
                    ({lastSyncTime})
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={() => setCurrentView('spreadsheet')}
                title="Database masih lokal. Klik untuk menghubungkan Google Spreadsheet"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 text-xs font-semibold transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>Hubungkan Google Spreadsheet</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                P
              </div>
              <span className="text-xs sm:text-sm font-semibold text-slate-700 hidden md:inline">
                Halo, {settings.adminUsername || 'Admin'}
              </span>
            </div>
          </div>
        </header>

        {/* View Router */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {currentView === 'dashboard' && (
              <AdminDashboard
                pesertaList={pesertaList}
                soalList={soalList}
                onUnlockStudent={onUnlockStudent}
                onUnlockAll={onUnlockAll}
                onNavigateToPeserta={() => setCurrentView('peserta')}
                onNavigateToSoal={() => setCurrentView('soal')}
              />
            )}

            {currentView === 'peserta' && (
              <AdminPeserta
                pesertaList={pesertaList}
                onAddPeserta={onAddPeserta}
                onUpdatePeserta={onUpdatePeserta}
                onDeletePeserta={onDeletePeserta}
                onToggleStatus={onToggleStatusPeserta}
                onUnlockAll={onUnlockAll}
                isSyncing={isSyncing}
                lastSyncTime={lastSyncTime}
                onTriggerSync={onTriggerSync}
                googleSpreadsheetId={settings.googleSpreadsheetId}
              />
            )}

            {currentView === 'soal' && (
              <AdminSoal
                soalList={soalList}
                onAddSoal={onAddSoal}
                onUpdateSoal={onUpdateSoal}
                onDeleteSoal={onDeleteSoal}
              />
            )}

            {currentView === 'spreadsheet' && (
              <GoogleSheetsManager
                currentUser={currentUser}
                onUserChanged={onUserChanged}
                settings={settings}
                onUpdateSettings={onSaveSettings}
                pesertaList={pesertaList}
                soalList={soalList}
                onDataLoadedFromSheet={onDataLoadedFromSheet}
                lastSyncTime={lastSyncTime}
                isSyncing={isSyncing}
                onTriggerSync={onTriggerSync}
              />
            )}

            {currentView === 'pengaturan' && (
              <AdminPengaturan
                settings={settings}
                onSaveSettings={onSaveSettings}
                onResetDefault={onResetDefault}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
