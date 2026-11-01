import React, { useState } from 'react';
import { Peserta, SoalUjian, PengaturanApp } from '../types';
import {
  GraduationCap,
  LogOut,
  Clock,
  BookOpen,
  School,
  IdCard,
  User,
  ShieldCheck,
  Play,
  KeyRound,
  AlertTriangle,
  ChevronDown,
  Info
} from 'lucide-react';

interface StudentPanelProps {
  student: Peserta;
  soal: SoalUjian;
  settings: PengaturanApp;
  onStartExam: () => void;
  onLogout: () => void;
}

export const StudentPanel: React.FC<StudentPanelProps> = ({
  student,
  soal,
  settings,
  onStartExam,
  onLogout,
}) => {
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleOpenTokenModal = () => {
    setTokenInput('');
    setTokenError(null);
    setShowTokenModal(true);
  };

  const handleVerifyToken = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim();
    if (!cleanToken) {
      setTokenError('Masukkan token ujian terlebih dahulu.');
      return;
    }

    if (cleanToken.toUpperCase() !== soal.token.toUpperCase()) {
      setTokenError('Token yang Anda masukkan SALAH! Silakan tanyakan kepada Pengawas Ujian.');
      return;
    }

    // Success!
    setShowTokenModal(false);
    onStartExam();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/40 to-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-blue-600 text-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg leading-tight">Panel Ujian Siswa</h1>
                {settings.googleSpreadsheetId && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/30 border border-emerald-300/40 rounded-full text-[10px] font-semibold text-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    Database: Google Spreadsheet
                  </span>
                )}
              </div>
              <p className="text-xs text-blue-100 hidden sm:block">{settings.schoolName}</p>
            </div>
          </div>

          {/* Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-blue-700/60 hover:bg-blue-700 border border-blue-500/50 transition cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-blue-900 flex items-center justify-center font-bold text-sm text-blue-200">
                {student.nama.charAt(0)}
              </div>
              <span className="text-sm font-medium hidden sm:inline max-w-[150px] truncate">
                {student.nama}
              </span>
              <ChevronDown className="w-4 h-4 text-blue-200" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-40 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-500">Masuk sebagai peserta:</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{student.nama}</p>
                  <p className="text-xs text-blue-600 font-mono mt-0.5">NISN: {student.nisn}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Logout / Keluar
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {/* Card Identitas Peserta */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8">
          <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <IdCard className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                Data Identitas Peserta Ujian
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Periksa kesesuaian data identitas dan mata pelajaran sebelum memulai
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-slate-50 hover:bg-slate-100/70 p-4 rounded-xl border border-slate-200/60 transition">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Nama Peserta
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-900 break-words flex items-center gap-2">
                <User className="w-4 h-4 text-blue-500 shrink-0" />
                {student.nama}
              </span>
            </div>

            <div className="bg-slate-50 hover:bg-slate-100/70 p-4 rounded-xl border border-slate-200/60 transition">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Nomor Peserta / NISN
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-900 font-mono flex items-center gap-2">
                <IdCard className="w-4 h-4 text-indigo-500 shrink-0" />
                {student.nisn}
              </span>
            </div>

            <div className="bg-slate-50 hover:bg-slate-100/70 p-4 rounded-xl border border-slate-200/60 transition">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Tingkat / Kelas
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-900">
                Kelas {student.tingkat}
              </span>
            </div>

            <div className="bg-slate-50 hover:bg-slate-100/70 p-4 rounded-xl border border-slate-200/60 transition">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Ruangan / Rombel
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <School className="w-4 h-4 text-emerald-500 shrink-0" />
                {student.kelas}
              </span>
            </div>

            <div className="bg-slate-50 hover:bg-slate-100/70 p-4 rounded-xl border border-slate-200/60 transition sm:col-span-2 lg:col-span-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Mata Pelajaran
              </span>
              <span className="text-sm sm:text-base font-bold text-blue-700 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600 shrink-0" />
                {soal.mataPelajaran}
              </span>
            </div>

            <div className="bg-slate-50 hover:bg-slate-100/70 p-4 rounded-xl border border-slate-200/60 transition sm:col-span-2 lg:col-span-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                Alokasi Waktu
              </span>
              <span className="text-sm sm:text-base font-bold text-emerald-700 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                {soal.waktuMenit} Menit
              </span>
            </div>
          </div>

          {/* Security & Anti-Cheat Rules Box */}
          <div className="mt-6 p-4 sm:p-5 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-xs sm:text-sm">
            <div className="flex items-center gap-2 font-bold text-amber-950 mb-2">
              <ShieldCheck className="w-5 h-5 text-amber-600" />
              <span>Petunjuk & Tata Tertib Sistem Ujian Online:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-800/90 pl-1">
              <li>Ujian akan secara otomatis berjalan dalam mode <strong>Layar Penuh (Full Screen)</strong>.</li>
              <li><strong>DILARANG</strong> berpindah tab browser, membuka aplikasi lain, atau meminimalkan layar.</li>
              <li>Sistem pengawas otomatis mendeteksi perpindahan layar dan akan <strong>MENGUNCI (Menonaktifkan)</strong> akun peserta jika terjadi pelanggaran.</li>
              <li>Tombol shortcut seperti <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">Alt+Tab</code>, <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">Ctrl+C</code>, <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">F12</code> dan klik kanan dinonaktifkan.</li>
              <li><strong>Blokir Notifikasi & Bebas Gangguan:</strong> Sistem memblokir notifikasi masuk secara otomatis. Disarankan menyalakan mode <em>Jangan Ganggu / Focus Mode</em> di HP/Laptop Anda agar tidak ada pop-up pesan masuk yang mengalihkan layar.</li>
              <li>Pastikan koneksi internet stabil sebelum menekan tombol Mulai Ujian.</li>
            </ul>
          </div>

          {/* Start Exam Button */}
          <div className="mt-8 text-center flex flex-col items-center">
            <button
              onClick={handleOpenTokenModal}
              className="py-3.5 px-8 sm:px-12 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-base sm:text-lg flex items-center gap-2.5 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              Mulai Mengerjakan Ujian
            </button>
            <p className="text-xs text-slate-400 mt-2">
              Anda akan diminta memasukkan Token Ujian yang diberikan oleh Pengawas
            </p>
          </div>
        </div>
      </main>

      {/* TOKEN MODAL */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100">
            <div className="bg-blue-600 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-blue-200" />
                <h3 className="font-bold text-base sm:text-lg">Masukkan Token Ujian</h3>
              </div>
              <button
                onClick={() => setShowTokenModal(false)}
                className="text-blue-200 hover:text-white text-lg font-bold w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-700 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleVerifyToken} className="p-6">
              <p className="text-xs sm:text-sm text-slate-600 mb-4">
                Mata Pelajaran: <strong>{soal.mataPelajaran}</strong> ({soal.waktuMenit} menit). Silakan masukkan token 5-8 karakter yang aktif.
              </p>

              {tokenError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>{tokenError}</div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Token Ujian
                </label>
                <input
                  type="text"
                  autoFocus
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value.toUpperCase());
                    setTokenError(null);
                  }}
                  placeholder="Contoh: UJIAN2025"
                  className="w-full text-center tracking-widest uppercase font-mono font-bold text-xl py-3 px-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                />
              </div>

              {/* Token Hint for testing convenience */}
              <div className="mb-6 p-2.5 bg-blue-50/80 rounded-lg border border-blue-100 flex items-center justify-between text-xs text-blue-800">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>Token Ujian untuk mapel ini:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTokenInput(soal.token)}
                  className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-700 hover:bg-blue-100 transition cursor-pointer"
                >
                  {soal.token}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowTokenModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Mulai Sekarang
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
