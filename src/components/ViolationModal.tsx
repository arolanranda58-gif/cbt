import React from 'react';
import { ShieldAlert, AlertOctagon, LogOut, Lock } from 'lucide-react';

interface ViolationModalProps {
  reason: string;
  studentName?: string;
  onAcknowledge: () => void;
}

export const ViolationModal: React.FC<ViolationModalProps> = ({
  reason,
  studentName,
  onAcknowledge,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-rose-200 animate-in zoom-in-95 duration-200">
        <div className="bg-rose-600 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-xs">
            <ShieldAlert className="w-10 h-10 text-white animate-bounce" />
          </div>
          <h2 className="text-xl font-extrabold uppercase tracking-wide">
            Pelanggaran Terdeteksi!
          </h2>
          <p className="text-rose-100 text-xs mt-1">Sistem Pengawasan Keamanan Ujian CBT</p>
        </div>

        <div className="p-6">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl mb-4 text-center">
            <div className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-1">
              Penyebab Diskualifikasi / Terkunci
            </div>
            <div className="text-sm font-semibold text-rose-900 leading-snug">{reason}</div>
          </div>

          <div className="text-xs text-slate-600 space-y-2 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center gap-2 text-rose-700 font-semibold">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Status ujian peserta dinonaktifkan otomatis.</span>
            </div>
            <p>
              {studentName ? <strong>{studentName}</strong> : 'Peserta'}, sesi pengerjaan ujian Anda telah dihentikan oleh sistem keamanan.
            </p>
            <p className="text-slate-500 text-[11px]">
              Silakan segera melapor ke <strong>Proktor / Pengawas Ruangan</strong> untuk meminta reset status dan verifikasi pengerjaan ulang.
            </p>
          </div>

          <button
            onClick={onAcknowledge}
            className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Keluar ke Halaman Login
          </button>
        </div>
      </div>
    </div>
  );
};
