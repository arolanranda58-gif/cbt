import React, { useState } from 'react';
import { Peserta, SoalUjian, PengaturanApp } from '../types';
import {
  googleSignIn,
  logoutGoogle,
  getAccessToken,
} from '../services/firebaseAuth';
import {
  createSpreadsheetDatabase,
  fetchSpreadsheetData,
  syncAllDataToSpreadsheet,
  parseSpreadsheetId,
} from '../services/googleSheetsService';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  PlusCircle,
  Link2,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Info,
  ShieldCheck,
  DownloadCloud,
  UploadCloud,
  HelpCircle
} from 'lucide-react';

interface GoogleSheetsManagerProps {
  currentUser: User | null;
  onUserChanged: (user: User | null) => void;
  settings: PengaturanApp;
  onUpdateSettings: (newSettings: PengaturanApp) => void;
  pesertaList: Peserta[];
  soalList: SoalUjian[];
  onDataLoadedFromSheet: (peserta: Peserta[], soal: SoalUjian[], newSettings?: Partial<PengaturanApp>) => void;
}

export const GoogleSheetsManager: React.FC<GoogleSheetsManagerProps> = ({
  currentUser,
  onUserChanged,
  settings,
  onUpdateSettings,
  pesertaList,
  soalList,
  onDataLoadedFromSheet,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Confirmation Modals State (Mandatory for destructive/overwriting operations per guidelines)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    actionType: 'create' | 'sync_to_sheet' | 'pull_from_sheet' | 'disconnect';
  }>({
    isOpen: false,
    title: '',
    description: '',
    actionType: 'create',
  });

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setFeedback(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onUserChanged(res.user);
        onUpdateSettings({
          ...settings,
          googleAccountEmail: res.user.email || undefined,
        });
        setFeedback({
          type: 'success',
          message: `Berhasil terhubung ke akun Google: ${res.user.email}`,
        });
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: err.message || 'Gagal masuk dengan akun Google.',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    onUserChanged(null);
    onUpdateSettings({
      ...settings,
      googleAccountEmail: undefined,
    });
    setFeedback({
      type: 'success',
      message: 'Berhasil keluar dari akun Google.',
    });
  };

  // Trigger Confirmation Dialogs
  const requestCreateNew = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Buat Database Google Spreadsheet Baru?',
      description: `Sistem akan membuat file spreadsheet baru berjudul "Database CBT Ujian Online - ${settings.schoolName}" di Google Drive Anda lengkap dengan lembar Data Peserta (${pesertaList.length} siswa), Data Soal (${soalList.length} mapel), Pengaturan, dan Log Pelanggaran.`,
      actionType: 'create',
    });
  };

  const requestSyncToSheet = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Sinkronkan / Timpa Data ke Google Spreadsheet?',
      description: `Data pada spreadsheet "${settings.googleSpreadsheetTitle || 'CBT'}" akan diperbarui dengan data aplikasi saat ini (${pesertaList.length} peserta, ${soalList.length} soal ujian). Pastikan Anda ingin menimpa data yang ada.`,
      actionType: 'sync_to_sheet',
    });
  };

  const requestPullFromSheet = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Tarik Data dari Google Spreadsheet?',
      description: `Data peserta dan soal di aplikasi ini akan diperbarui sesuai isi tabel di Google Spreadsheet "${settings.googleSpreadsheetTitle || 'CBT'}".`,
      actionType: 'pull_from_sheet',
    });
  };

  const requestDisconnect = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Putuskan Koneksi Google Spreadsheet?',
      description: 'Aplikasi akan kembali menggunakan database lokal (browser). Data di Google Spreadsheet Anda tetap tersimpan dan tidak dihapus.',
      actionType: 'disconnect',
    });
  };

  // Execute Confirmed Operation
  const handleExecuteConfirmedAction = async () => {
    const action = confirmModal.actionType;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    setIsProcessing(true);
    setFeedback(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Sesi Google telah kedaluwarsa. Silakan login ulang dengan Google.');
      }

      if (action === 'create') {
        const meta = await createSpreadsheetDatabase(
          token,
          settings.schoolName,
          pesertaList,
          soalList,
          settings
        );
        onUpdateSettings({
          ...settings,
          googleSpreadsheetId: meta.id,
          googleSpreadsheetUrl: meta.url,
          googleSpreadsheetTitle: meta.title,
          googleSpreadsheetLastSynced: meta.lastSyncedAt,
        });
        setFeedback({
          type: 'success',
          message: `Berhasil membuat dan menghubungkan database Google Spreadsheet baru: "${meta.title}"`,
        });
      } else if (action === 'sync_to_sheet') {
        if (!settings.googleSpreadsheetId) {
          throw new Error('Belum ada spreadsheet yang terhubung.');
        }
        await syncAllDataToSpreadsheet(
          token,
          settings.googleSpreadsheetId,
          pesertaList,
          soalList,
          settings
        );
        const lastSync = new Date().toLocaleTimeString('id-ID');
        onUpdateSettings({
          ...settings,
          googleSpreadsheetLastSynced: lastSync,
        });
        setFeedback({
          type: 'success',
          message: `Data aplikasi (${pesertaList.length} peserta, ${soalList.length} soal) berhasil dikirim dan disinkronkan ke Google Spreadsheet pada ${lastSync}!`,
        });
      } else if (action === 'pull_from_sheet') {
        if (!settings.googleSpreadsheetId) {
          throw new Error('Belum ada spreadsheet yang terhubung.');
        }
        const data = await fetchSpreadsheetData(token, settings.googleSpreadsheetId);
        onDataLoadedFromSheet(data.peserta, data.soal, data.settings);
        const lastSync = new Date().toLocaleTimeString('id-ID');
        onUpdateSettings({
          ...settings,
          googleSpreadsheetTitle: data.title || settings.googleSpreadsheetTitle,
          googleSpreadsheetLastSynced: lastSync,
        });
        setFeedback({
          type: 'success',
          message: `Berhasil memuat ${data.peserta.length} data peserta dan ${data.soal.length} soal dari Google Spreadsheet!`,
        });
      } else if (action === 'disconnect') {
        onUpdateSettings({
          ...settings,
          googleSpreadsheetId: undefined,
          googleSpreadsheetUrl: undefined,
          googleSpreadsheetTitle: undefined,
          googleSpreadsheetLastSynced: undefined,
        });
        setFeedback({
          type: 'success',
          message: 'Koneksi ke Google Spreadsheet berhasil diputuskan.',
        });
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat memproses Google Spreadsheet.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Connect existing spreadsheet via input
  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = parseSpreadsheetId(inputUrl);
    if (!cleanId) {
      setFeedback({ type: 'error', message: 'Masukkan URL atau ID Google Spreadsheet yang valid.' });
      return;
    }

    setIsProcessing(true);
    setFeedback(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('Silakan Masuk dengan Google terlebih dahulu.');
      }
      const data = await fetchSpreadsheetData(token, cleanId);
      const sheetUrl = `https://docs.google.com/spreadsheets/d/${cleanId}/edit`;
      const lastSync = new Date().toLocaleTimeString('id-ID');

      onDataLoadedFromSheet(data.peserta, data.soal, data.settings);
      onUpdateSettings({
        ...settings,
        googleSpreadsheetId: cleanId,
        googleSpreadsheetUrl: sheetUrl,
        googleSpreadsheetTitle: data.title || `Spreadsheet (${cleanId.slice(0, 8)}...)`,
        googleSpreadsheetLastSynced: lastSync,
      });

      setInputUrl('');
      setFeedback({
        type: 'success',
        message: `Berhasil terhubung ke "${data.title || 'Google Spreadsheet'}"! Memuat ${data.peserta.length} peserta dan ${data.soal.length} soal.`,
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: err.message || 'Gagal menghubungkan Google Spreadsheet. Pastikan ID benar dan akun Google Anda memiliki akses.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Integrasi Google Spreadsheet sebagai Database</span>
          </h2>
          <p className="text-xs text-slate-500">
            Jadikan Google Spreadsheet sebagai penyimpanan data live untuk data peserta, bank soal, dan log ujian
          </p>
        </div>

        {/* Status Badge */}
        {settings.googleSpreadsheetId ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Database Aktif: Google Spreadsheet</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold shrink-0">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Database: Penyimpanan Lokal Browser</span>
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 leading-relaxed">{feedback.message}</div>
        </div>
      )}

      {/* Step 1: Sign in with Google (Firebase Auth) */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80">
        <h3 className="font-bold text-base text-slate-900 mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
            1
          </span>
          <span>Autentikasi Akun Google Proktor / Guru</span>
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Hubungkan akun Google Anda untuk memberikan izin aplikasi membaca dan menulis ke Google Spreadsheet & Drive.
        </p>

        {currentUser ? (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-10 h-10 rounded-full border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                  {(currentUser.displayName || currentUser.email || 'G').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-bold text-sm text-slate-900">
                  {currentUser.displayName || 'Akun Google Terhubung'}
                </div>
                <div className="text-xs text-slate-500 font-mono">{currentUser.email}</div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="py-1.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Keluar Akun Google
            </button>
          </div>
        ) : (
          <div>
            {/* Official Google Sign In Button standard style */}
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-300 shadow-xs hover:shadow transition disabled:opacity-50 cursor-pointer"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{isSigningIn ? 'Menghubungkan...' : 'Sign in with Google'}</span>
            </button>
            <p className="text-[11px] text-slate-400 mt-2">
              Menggunakan Firebase Authentication & Google Workspace API untuk integrasi aman.
            </p>
          </div>
        )}
      </div>

      {/* Step 2: Connect or Create Spreadsheet */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80">
        <h3 className="font-bold text-base text-slate-900 mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">
            2
          </span>
          <span>Status & Manajemen File Google Spreadsheet</span>
        </h3>

        {settings.googleSpreadsheetId ? (
          <div className="space-y-4">
            {/* Active Spreadsheet Details Card */}
            <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                      {settings.googleSpreadsheetTitle || 'Database CBT Ujian Online'}
                    </h4>
                    <span className="text-xs text-slate-500 font-mono">
                      ID: {settings.googleSpreadsheetId}
                    </span>
                  </div>
                </div>

                {settings.googleSpreadsheetUrl && (
                  <a
                    href={settings.googleSpreadsheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-1.5 px-3 bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <span>Buka di Google Sheets</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-emerald-200/60 text-xs text-slate-600">
                <div>
                  <span className="block text-[11px] text-slate-400">Lembar 1:</span>
                  <strong>Data Peserta ({pesertaList.length})</strong>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">Lembar 2:</span>
                  <strong>Data Soal ({soalList.length})</strong>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">Lembar 3:</span>
                  <strong>Pengaturan Sistem</strong>
                </div>
                <div>
                  <span className="block text-[11px] text-slate-400">Terakhir Sinkron:</span>
                  <strong>{settings.googleSpreadsheetLastSynced || 'Baru saja'}</strong>
                </div>
              </div>
            </div>

            {/* Sync Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={requestPullFromSheet}
                disabled={isProcessing || !currentUser}
                className="py-2.5 px-4 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <DownloadCloud className="w-4 h-4 text-blue-600" />
                <span>Tarik Data dari Spreadsheet</span>
              </button>

              <button
                onClick={requestSyncToSheet}
                disabled={isProcessing || !currentUser}
                className="py-2.5 px-4 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                <span>Kirim Data ke Spreadsheet</span>
              </button>

              <button
                onClick={requestDisconnect}
                disabled={isProcessing}
                className="py-2.5 px-4 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>Putuskan Spreadsheet</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Option A: Create New Automatically */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  Opsi 1: Buat Spreadsheet Database Baru Otomatis (Direkomendasikan)
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-xl">
                  Sistem akan membuat file Google Spreadsheet baru di akun Google Drive Anda lengkap dengan 4 lembar tabel siap pakai (Data Peserta, Data Soal, Pengaturan, Log Pelanggaran) dan memuat seluruh data saat ini ke dalamnya.
                </p>
              </div>

              <button
                onClick={requestCreateNew}
                disabled={isProcessing || !currentUser}
                className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{isProcessing ? 'Memproses...' : 'Buat Spreadsheet Baru'}</span>
              </button>
            </div>

            {/* Option B: Connect Existing Spreadsheet */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
              <h4 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-blue-600" />
                Opsi 2: Hubungkan Google Spreadsheet yang Sudah Ada
              </h4>
              <p className="text-xs text-slate-500 mb-3">
                Tempelkan URL Google Spreadsheet atau Spreadsheet ID Anda.
              </p>

              <form onSubmit={handleConnectExisting} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit atau ID Spreadsheet"
                  className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !currentUser || !inputUrl.trim()}
                  className="py-2 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Link2 className="w-4 h-4" />
                  <span>Hubungkan</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Information & Architecture Guide Box */}
      <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-5 text-blue-900 text-xs sm:text-sm">
        <h4 className="font-bold flex items-center gap-2 mb-2 text-blue-950">
          <Info className="w-4 h-4 text-blue-600" />
          <span>Cara Kerja Google Spreadsheet sebagai Database CBT:</span>
        </h4>
        <ul className="list-disc list-inside space-y-1.5 text-blue-800/90 pl-1 leading-relaxed">
          <li>
            <strong>Data Peserta</strong>: Guru/Admin dapat mengedit daftar siswa langsung di Google Spreadsheet atau melalui panel admin CBT ini.
          </li>
          <li>
            <strong>Pencegahan Kecurangan Live</strong>: Saat peserta melakukan pelanggaran ujian (seperti pindah tab), sistem secara otomatis mengubah status siswa menjadi <em>Tidak Aktif</em> dan mencatatnya ke lembar <em>Log Ujian & Pelanggaran</em> di Google Spreadsheet.
          </li>
          <li>
            <strong>Kolaborasi Pengawas Ruangan</strong>: Guru dan Proktor dapat memantau pengerjaan siswa secara bersamaan melalui Google Sheets dari laptop atau HP masing-masing tanpa menginstal software tambahan.
          </li>
        </ul>
      </div>

      {/* MANDATORY CONFIRMATION DIALOG (Ensures User Confirmation for Destructive Operations) */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {confirmModal.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
                {confirmModal.description}
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteConfirmedAction}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition cursor-pointer"
                >
                  Lanjutkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
