import React from 'react';
import { Peserta, SoalUjian } from '../types';
import {
  Users,
  UserCheck,
  UserX,
  BookOpen,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface AdminDashboardProps {
  pesertaList: Peserta[];
  soalList: SoalUjian[];
  onUnlockStudent: (studentId: string) => void;
  onUnlockAll: () => void;
  onNavigateToPeserta: () => void;
  onNavigateToSoal: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  pesertaList,
  soalList,
  onUnlockStudent,
  onUnlockAll,
  onNavigateToPeserta,
  onNavigateToSoal,
}) => {
  const totalPeserta = pesertaList.length;
  const aktifPeserta = pesertaList.filter((p) => p.status === 'Aktif').length;
  const tidakAktifPeserta = pesertaList.filter((p) => p.status === 'Tidak Aktif').length;
  const lockedStudents = pesertaList.filter((p) => p.status === 'Tidak Aktif');

  // Breakdown by level
  const levelCounts = pesertaList.reduce((acc, curr) => {
    acc[curr.tingkat] = (acc[curr.tingkat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Peserta */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Peserta
            </span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900">{totalPeserta}</div>
          <p className="text-xs text-slate-500 mt-1">Terdaftar di sistem CBT</p>
        </div>

        {/* Peserta Aktif */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Peserta Aktif
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600">{aktifPeserta}</div>
          <p className="text-xs text-emerald-700/80 mt-1">Dapat login & memulai ujian</p>
        </div>

        {/* Peserta Tidak Aktif / Terkunci */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Peserta Terkunci
            </span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-rose-600">{tidakAktifPeserta}</div>
          <p className="text-xs text-rose-700/80 mt-1">Melanggar atau dinonaktifkan</p>
        </div>

        {/* Total Bank Soal */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Mata Pelajaran
            </span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-indigo-600">{soalList.length}</div>
          <p className="text-xs text-slate-500 mt-1">Paket soal ujian tersedia</p>
        </div>
      </div>

      {/* Action Banner for Locked Students */}
      {tidakAktifPeserta > 0 && (
        <div className="bg-gradient-to-r from-rose-500 to-orange-500 rounded-2xl p-5 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-xs shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg">
                Terdapat {tidakAktifPeserta} Peserta Berstatus Terkunci
              </h3>
              <p className="text-xs sm:text-sm text-rose-100">
                Siswa tidak dapat login sebelum statusnya diaktifkan kembali oleh Proktor.
              </p>
            </div>
          </div>
          <button
            onClick={onUnlockAll}
            className="w-full sm:w-auto py-2.5 px-5 bg-white text-rose-600 font-bold rounded-xl text-sm shadow hover:bg-rose-50 transition flex items-center justify-center gap-2 shrink-0 cursor-pointer"
          >
            <Unlock className="w-4 h-4" />
            Buka Kunci Semua Peserta
          </button>
        </div>
      )}

      {/* Grid: Locked Students List & Level Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Locked Students Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Daftar Peserta Terkunci (Perlu Tindakan)
              </h3>
              <p className="text-xs text-slate-500">
                Klik tombol "Aktifkan" untuk mengizinkan siswa login kembali
              </p>
            </div>
            <button
              onClick={onNavigateToPeserta}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              Lihat Semua
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {lockedStudents.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-700 text-sm">Tidak ada peserta yang terkunci</p>
              <p className="text-xs text-slate-500 mt-0.5">Semua peserta saat ini berstatus aktif.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {lockedStudents.map((s) => (
                <div
                  key={s.id}
                  className="p-3.5 bg-rose-50/60 border border-rose-200/70 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{s.nama}</span>
                      <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-rose-200 text-rose-700">
                        {s.nisn}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      Kelas {s.tingkat} • {s.kelas}
                    </div>
                    {s.catatanPelanggaran && s.catatanPelanggaran.length > 0 && (
                      <div className="text-[11px] text-rose-600 mt-1 bg-white/70 px-2 py-1 rounded inline-block">
                        ⚠️ {s.catatanPelanggaran[s.catatanPelanggaran.length - 1]}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onUnlockStudent(s.id)}
                    className="w-full sm:w-auto py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition shrink-0 cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    Aktifkan Kembali
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Level Distribution & Quick Links */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80">
            <h3 className="font-bold text-base text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Distribusi Peserta per Tingkat
            </h3>
            <div className="space-y-3">
              {Object.entries(levelCounts).map(([tingkat, count]) => {
                const percent = Math.round((count / (totalPeserta || 1)) * 100);
                return (
                  <div key={tingkat}>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-700">Kelas {tingkat}</span>
                      <span className="text-slate-500">
                        {count} siswa ({percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Bank Soal Preview */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Mata Pelajaran Aktif</h3>
              <button
                onClick={onNavigateToSoal}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                Kelola Soal
              </button>
            </div>
            <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
              {soalList.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs"
                >
                  <span className="font-medium text-slate-800 truncate max-w-[150px]">
                    {s.mataPelajaran}
                  </span>
                  <span className="font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">
                    {s.token}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
