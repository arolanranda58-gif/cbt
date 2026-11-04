import React, { useState, useMemo } from 'react';
import { Peserta, SoalUjian, PengaturanApp } from '../types';
import { UserCheck, ShieldAlert, Award, BookOpen, School, Layers, IdCard, LogIn, Sparkles, CheckCircle2, RefreshCw } from 'lucide-react';

interface StudentLoginProps {
  pesertaList: Peserta[];
  soalList: SoalUjian[];
  settings: PengaturanApp;
  onLoginSuccess: (student: Peserta, selectedSoal: SoalUjian) => void;
  onSwitchToAdmin: () => void;
  onRefreshSpreadsheet?: () => Promise<{ peserta: Peserta[]; soal: SoalUjian[] } | null>;
  isSyncingSpreadsheet?: boolean;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({
  pesertaList,
  soalList,
  settings,
  onLoginSuccess,
  onSwitchToAdmin,
  onRefreshSpreadsheet,
  isSyncingSpreadsheet,
}) => {
  const [nisn, setNisn] = useState('');
  const [tingkat, setTingkat] = useState('');
  const [kelas, setKelas] = useState('');
  const [mataPelajaran, setMataPelajaran] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Available unique Tingkat (Levels)
  const availableTingkat = useMemo(() => {
    const set = new Set<string>();
    pesertaList.forEach((p) => {
      if (p.tingkat) set.add(p.tingkat);
    });
    soalList.forEach((s) => {
      if (s.tingkat) set.add(s.tingkat);
    });
    return Array.from(set).sort((a, b) => Number(a) - Number(b));
  }, [pesertaList, soalList]);

  // Classes for the selected Tingkat
  const availableClasses = useMemo(() => {
    if (!tingkat) return [];
    const set = new Set<string>();
    pesertaList
      .filter((p) => p.tingkat === tingkat)
      .forEach((p) => set.add(p.kelas));
    return Array.from(set).sort();
  }, [pesertaList, tingkat]);

  // Subjects for the selected Tingkat
  const availableSubjects = useMemo(() => {
    if (!tingkat) return [];
    return soalList.filter((s) => s.tingkat === tingkat);
  }, [soalList, tingkat]);

  const handleTingkatChange = (val: string) => {
    setTingkat(val);
    setKelas('');
    setMataPelajaran('');
    setErrorMsg(null);
  };

  const handleQuickFill = (student: Peserta) => {
    setNisn(student.nisn);
    setTingkat(student.tingkat);
    setKelas(student.kelas);
    const matchedSubject = soalList.find((s) => s.tingkat === student.tingkat);
    if (matchedSubject) {
      setMataPelajaran(matchedSubject.mataPelajaran);
    }
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanNisn = nisn.trim();
    if (!cleanNisn) {
      setErrorMsg('Masukkan Nomor Peserta Ujian / NISN');
      return;
    }
    if (!tingkat) {
      setErrorMsg('Pilih Kelas / Tingkat terlebih dahulu');
      return;
    }
    if (!kelas) {
      setErrorMsg('Pilih Ruangan / Rombel kelas terlebih dahulu');
      return;
    }
    if (!mataPelajaran) {
      setErrorMsg('Pilih Mata Pelajaran yang akan diujikan');
      return;
    }

    const matchId = (p: Peserta) =>
      (p.nisn.trim().toLowerCase() === cleanNisn.toLowerCase() ||
        (p.nomor && p.nomor.trim().toLowerCase() === cleanNisn.toLowerCase())) &&
      p.tingkat === tingkat &&
      p.kelas === kelas;

    // Find student in current in-memory list
    let student = pesertaList.find(matchId);

    let activeSoalList = soalList;

    // If not found and spreadsheet is connected, automatically sync from Google Spreadsheet first!
    if (!student && settings.googleSpreadsheetId && onRefreshSpreadsheet) {
      setErrorMsg('Menyinkronkan data terbaru dari Google Spreadsheet...');
      try {
        const freshData = await onRefreshSpreadsheet();
        if (freshData?.peserta && freshData.peserta.length > 0) {
          student = freshData.peserta.find(matchId);
        }
        if (freshData?.soal) {
          activeSoalList = freshData.soal;
        }
      } catch (e) {
        console.warn('Sync on login attempt:', e);
      }
    }

    if (!student) {
      // Check if NISN exists under another class
      const foundAnywhere = pesertaList.find(
        (p) =>
          p.nisn.trim().toLowerCase() === cleanNisn.toLowerCase() ||
          (p.nomor && p.nomor.trim().toLowerCase() === cleanNisn.toLowerCase())
      );
      if (foundAnywhere) {
        setErrorMsg(
          `Nomor Peserta ditemukan pada Kelas ${foundAnywhere.tingkat} - ${foundAnywhere.kelas}. Pastikan pilihan tingkat dan ruangan sesuai.`
        );
      } else {
        setErrorMsg('Nomor Peserta Ujian / NISN tidak terdaftar dalam data peserta!');
      }
      return;
    }

    if (student.status === 'Tidak Aktif') {
      setErrorMsg(
        'Akun peserta berstatus TIDAK AKTIF (ujian telah diselesaikan atau akun dikunci). Silakan hubungi Proktor atau Pengawas Ruangan jika membutuhkan reset ujian.'
      );
      return;
    }

    // Find exam details
    const selectedSoal = activeSoalList.find(
      (s) => s.tingkat === tingkat && s.mataPelajaran === mataPelajaran
    );

    if (!selectedSoal) {
      setErrorMsg('Data soal untuk mata pelajaran ini belum tersedia atau belum dipublikasikan.');
      return;
    }

    setErrorMsg(null);
    onLoginSuccess(student, selectedSoal);
  };

  // 2 Sample active students for quick one-click test
  const demoActiveStudents = pesertaList.filter((p) => p.status === 'Aktif').slice(0, 3);

  return (
    <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transition-all">
      {/* Header with School Branding */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 text-white text-center relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-16 h-16 bg-white p-2 rounded-2xl shadow-md flex items-center justify-center mb-3">
            <img
              src={settings.logoUrl}
              alt="Logo Sekolah"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg';
              }}
            />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">{settings.title}</h2>
          <p className="text-blue-100 text-xs sm:text-sm mt-1 max-w-sm line-clamp-2">
            {settings.subtitle}
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-xs font-medium text-white">
              <School className="w-3.5 h-3.5" />
              <span>{settings.schoolName}</span>
            </div>
            {settings.googleSpreadsheetId && (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/30 backdrop-blur-sm border border-emerald-300/40 rounded-full text-[11px] font-semibold text-emerald-100">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                <span>Google Spreadsheet Live</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 sm:p-8">
        {/* Role Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            className="flex-1 py-2 rounded-lg text-sm font-semibold bg-white text-blue-700 shadow-sm flex items-center justify-center gap-2 transition"
          >
            <UserCheck className="w-4 h-4" />
            Login Siswa
          </button>
          <button
            type="button"
            onClick={onSwitchToAdmin}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-center gap-2 transition"
          >
            <ShieldAlert className="w-4 h-4" />
            Login Admin / Proktor
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-500" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        {/* Student Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nomor Peserta Ujian / NISN
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <IdCard className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={nisn}
                onChange={(e) => {
                  setNisn(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Contoh: 0081234567"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tingkat / Kelas
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Layers className="w-4 h-4" />
                </div>
                <select
                  value={tingkat}
                  onChange={(e) => handleTingkatChange(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                >
                  <option value="">-- Pilih Tingkat --</option>
                  {availableTingkat.map((t) => (
                    <option key={t} value={t}>
                      Kelas {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Ruangan / Rombel
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <School className="w-4 h-4" />
                </div>
                <select
                  value={kelas}
                  disabled={!tingkat}
                  onChange={(e) => {
                    setKelas(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {tingkat ? '-- Pilih Ruangan --' : 'Pilih tingkat dulu'}
                  </option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mata Pelajaran
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <BookOpen className="w-4 h-4" />
              </div>
              <select
                value={mataPelajaran}
                disabled={!tingkat}
                onChange={(e) => {
                  setMataPelajaran(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {tingkat ? '-- Pilih Mata Pelajaran --' : 'Pilih tingkat dulu'}
                </option>
                {availableSubjects.map((s) => (
                  <option key={s.id} value={s.mataPelajaran}>
                    {s.mataPelajaran} ({s.waktuMenit} Menit)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer"
          >
            <LogIn className="w-5 h-5" />
            Masuk ke Panel Ujian
          </button>
        </form>

        {/* Quick Demo Autofill section for testing */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Klik Akun Demo Cepat untuk Uji Coba:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {demoActiveStudents.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleQuickFill(s)}
                className="text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-lg font-medium transition flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                {s.nama.split(' ')[0]} ({s.nisn} - Kls {s.tingkat})
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
