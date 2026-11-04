import React, { useState } from 'react';
import { PengaturanApp } from '../types';
import { ShieldCheck, UserCheck, Lock, User, Eye, EyeOff, Sparkles, School } from 'lucide-react';

interface AdminLoginProps {
  settings: PengaturanApp;
  onLoginSuccess: () => void;
  onSwitchToStudent: () => void;
  onRefreshSpreadsheet?: () => Promise<{ peserta: any[]; soal: any[] } | null>;
  isSyncingSpreadsheet?: boolean;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  settings,
  onLoginSuccess,
  onSwitchToStudent,
  onRefreshSpreadsheet,
  isSyncingSpreadsheet,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCheckingSync, setIsCheckingSync] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMsg('Masukkan username dan password admin');
      return;
    }

    if (
      cleanUser === settings.adminUsername &&
      cleanPass === settings.adminPassword
    ) {
      onLoginSuccess();
      return;
    }

    // If initial check fails, try syncing fresh credentials from Google Spreadsheet if connected
    if (settings.googleSpreadsheetId && onRefreshSpreadsheet) {
      setIsCheckingSync(true);
      try {
        await onRefreshSpreadsheet();
        // Check updated settings from local storage
        const latestRaw = localStorage.getItem('cbt_ujian_settings_v1');
        if (latestRaw) {
          const latestSettings = JSON.parse(latestRaw);
          if (
            cleanUser === latestSettings.adminUsername &&
            cleanPass === latestSettings.adminPassword
          ) {
            setIsCheckingSync(false);
            onLoginSuccess();
            return;
          }
        }
      } catch (err) {
        console.warn('Sync attempt on admin login failed:', err);
      } finally {
        setIsCheckingSync(false);
      }
    }

    const isDefault = settings.adminUsername === 'admin' && settings.adminPassword === 'admin123';
    setErrorMsg(
      isDefault
        ? 'Username atau Password Admin salah! (Bawaan: admin / admin123)'
        : settings.googleSpreadsheetId
        ? 'Username atau Password Admin salah! Pastikan sesuai dengan baris adminUsername dan adminPassword pada lembar Pengaturan di Google Spreadsheet.'
        : 'Username atau Password Admin salah! Periksa kembali username dan password yang telah diatur.'
    );
  };

  const handleFillDemo = () => {
    setUsername(settings.adminUsername || 'admin');
    setPassword(settings.adminPassword || 'admin123');
    setErrorMsg(null);
  };

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transition-all">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 text-white text-center relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-14 h-14 bg-indigo-600/30 border border-indigo-400/30 rounded-2xl flex items-center justify-center mb-3 text-indigo-300">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Login Proktor / Admin</h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-1">
            Panel Pengawas, Manajemen Peserta & Bank Soal CBT
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-medium text-slate-200">
            <School className="w-3.5 h-3.5" />
            <span>{settings.schoolName}</span>
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {/* Role Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={onSwitchToStudent}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-2 transition"
          >
            <UserCheck className="w-4 h-4" />
            Login Siswa
          </button>
          <button
            type="button"
            className="flex-1 py-2 rounded-lg text-sm font-semibold bg-white text-indigo-700 shadow-sm flex items-center justify-center gap-2 transition"
          >
            <ShieldCheck className="w-4 h-4" />
            Login Admin / Proktor
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs sm:text-sm flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <div>{errorMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Username Admin
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Masukkan username"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Masukkan password"
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-slate-900 to-indigo-900 hover:from-black hover:to-indigo-950 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            Masuk ke Panel Proktor
          </button>
        </form>

        {/* Quick Demo Autofill */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {settings.googleSpreadsheetId ? (
              <span className="text-emerald-700 font-medium">Tersinkron dengan Spreadsheet</span>
            ) : (
              <>
                Bawaan: <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-semibold">{settings.adminUsername || 'admin'}</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={handleFillDemo}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Isi Kredensial Tersimpan
          </button>
        </div>
      </div>
    </div>
  );
};
