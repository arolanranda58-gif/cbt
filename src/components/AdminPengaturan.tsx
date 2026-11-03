import React, { useState } from 'react';
import { PengaturanApp } from '../types';
import {
  Settings,
  Shield,
  Save,
  RotateCcw,
  Key,
  School,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  BellOff
} from 'lucide-react';

interface AdminPengaturanProps {
  settings: PengaturanApp;
  onSaveSettings: (settings: PengaturanApp) => void;
  onResetDefault: () => void;
}

export const AdminPengaturan: React.FC<AdminPengaturanProps> = ({
  settings,
  onSaveSettings,
  onResetDefault,
}) => {
  const [formData, setFormData] = useState<PengaturanApp>({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const LOGO_PRESETS = [
    {
      name: 'Kemendikbud / Tut Wuri',
      url: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg',
    },
    {
      name: 'Kemenag / Madrasah',
      url: 'https://upload.wikimedia.org/wikipedia/commons/2/22/Logo_Kementerian_Agama.png',
    },
    {
      name: 'Garuda Pancasila',
      url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Coat_of_arms_of_Indonesia_Garuda_Pancasila.svg/640px-Coat_of_arms_of_Indonesia_Garuda_Pancasila.svg.png',
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700" />
            <span>Pengaturan Aplikasi & Keamanan CBT</span>
          </h2>
          <p className="text-xs text-slate-500">
            Kustomisasi identitas sekolah, logo, perlindungan anti-curang, dan akun admin
          </p>
        </div>

        {savedSuccess && (
          <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Perubahan Berhasil Disimpan!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identitas Sekolah & Aplikasi */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80">
          <h3 className="font-bold text-base text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <School className="w-4 h-4 text-blue-600" />
            Identitas Sekolah & Aplikasi
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Judul Aplikasi
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Sekolah / Lembaga
              </label>
              <input
                type="text"
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sub-Judul / Keterangan Ujian
              </label>
              <input
                type="text"
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                URL Logo Sekolah
              </label>
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 bg-slate-100 rounded-xl p-1 border border-slate-200 shrink-0 flex items-center justify-center overflow-hidden">
                  <img
                    src={formData.logoUrl}
                    alt="Preview Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              {/* Preset buttons */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="text-[11px] text-slate-400">Pilihan Cepat Logo:</span>
                {LOGO_PRESETS.map((lp) => (
                  <button
                    key={lp.name}
                    type="button"
                    onClick={() => setFormData({ ...formData, logoUrl: lp.url })}
                    className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium transition"
                  >
                    {lp.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Anti-Cheat & Security Policy */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80">
          <h3 className="font-bold text-base text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            Konfigurasi Keamanan & Anti-Curang (CBT Security)
          </h3>

          <div className="space-y-4">
            <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
              <input
                type="checkbox"
                checked={formData.enableAntiCheat}
                onChange={(e) =>
                  setFormData({ ...formData, enableAntiCheat: e.target.checked })
                }
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Aktifkan Deteksi Window Blur & Pindah Tab Layar
                </div>
                <div className="text-xs text-slate-500">
                  Secara aktif memicu pelanggaran saat event window.blur terdeteksi (siswa mengklik aplikasi lain, membuka jendela lain, taskbar, monitor eksternal, atau berpindah tab).
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
              <input
                type="checkbox"
                checked={formData.fullScreenEnforced}
                onChange={(e) =>
                  setFormData({ ...formData, fullScreenEnforced: e.target.checked })
                }
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Wajib Mode Layar Penuh (Enforce Fullscreen)
                </div>
                <div className="text-xs text-slate-500">
                  Menutup mode layar penuh saat ujian berlangsung dianggap sebagai pelanggaran.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
              <input
                type="checkbox"
                checked={formData.blockShortcuts}
                onChange={(e) =>
                  setFormData({ ...formData, blockShortcuts: e.target.checked })
                }
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Blokir Tombol Shortcut Keyboard
                </div>
                <div className="text-xs text-slate-500">
                  Menonaktifkan kombinasi tombol Alt+Tab, Ctrl+C, Ctrl+V, F12, dan Inspect Element.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition">
              <input
                type="checkbox"
                checked={formData.blockRightClick}
                onChange={(e) =>
                  setFormData({ ...formData, blockRightClick: e.target.checked })
                }
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Blokir Klik Kanan (Context Menu)
                </div>
                <div className="text-xs text-slate-500">
                  Mencegah menu klik kanan untuk inspect element atau copy gambar/teks soal.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 cursor-pointer hover:bg-emerald-100/50 transition">
              <input
                type="checkbox"
                checked={formData.blockNotifications ?? true}
                onChange={(e) =>
                  setFormData({ ...formData, blockNotifications: e.target.checked })
                }
                className="mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <div>
                <div className="text-sm font-semibold text-emerald-950 flex items-center gap-1.5">
                  <BellOff className="w-3.5 h-3.5 text-emerald-600" />
                  Blokir Semua Notifikasi Masuk (Mode Jangan Ganggu / DND)
                </div>
                <div className="text-xs text-emerald-800/80">
                  Secara proaktif memblokir web notifications, web push alert browser, dan mengaktifkan perisai bebas gangguan selama siswa mengerjakan soal.
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Kredensial Admin */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80">
          <h3 className="font-bold text-base text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-600" />
            Kredensial Akun Admin / Proktor
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username Admin
              </label>
              <input
                type="text"
                value={formData.adminUsername}
                onChange={(e) =>
                  setFormData({ ...formData, adminUsername: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password Admin
              </label>
              <input
                type="text"
                value={formData.adminPassword}
                onChange={(e) =>
                  setFormData({ ...formData, adminPassword: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-100 flex items-center gap-1.5">
            <span className="font-semibold text-emerald-700">Tips Spreadsheet:</span>
            <span>
              Anda juga dapat mengganti username dan password ini secara langsung di Google Spreadsheet pada lembar <strong>Pengaturan</strong> (baris <code>adminUsername</code> dan <code>adminPassword</code>).
            </span>
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={() => {
              if (confirm('Apakah Anda yakin ingin mereset seluruh data ke pengaturan bawaan awal? Semua perubahan akan dikembalikan ke data awal.')) {
                onResetDefault();
              }
            }}
            className="w-full sm:w-auto py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
            Reset ke Data Bawaan (Factory Reset)
          </button>

          <button
            type="submit"
            className="w-full sm:w-auto py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            Simpan Pengaturan
          </button>
        </div>
      </form>
    </div>
  );
};
