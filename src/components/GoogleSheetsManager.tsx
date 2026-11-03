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
  HelpCircle,
  Table,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Copy,
  Check,
  Loader2,
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
  const [processingStatusText, setProcessingStatusText] = useState('Memproses...');
  const [inputUrl, setInputUrl] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showFormatGuide, setShowFormatGuide] = useState(false);
  const [hasCopiedFormat, setHasCopiedFormat] = useState(false);

  // Confirmation Modals State (Required for destructive/overwriting operations per guidelines)
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
          message: `Berhasil terhubung ke akun Google: ${res.user.email}. Anda kini dapat membuat file di Drive dan menyinkronkan data secara penuh.`,
        });
      }
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: err.message || 'Gagal masuk dengan akun Google. Silakan periksa pengaturan browser Anda.',
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
      type: 'info',
      message: 'Berhasil keluar dari akun Google.',
    });
  };

  // Trigger Confirmation Dialogs
  // If not authenticated or token expired, automatically prompt Google Sign-In first so the button ALWAYS works!
  const requestCreateNew = async () => {
    setFeedback(null);
    let token = await getAccessToken();

    if (!currentUser || !token) {
      setIsProcessing(true);
      setProcessingStatusText('Menghubungkan akun Google...');
      try {
        setFeedback({
          type: 'info',
          message: 'Membuka jendela otentikasi Google untuk izin membuat database di Google Drive Anda...',
        });
        const res = await googleSignIn();
        if (res) {
          onUserChanged(res.user);
          onUpdateSettings({
            ...settings,
            googleAccountEmail: res.user.email || undefined,
          });
          token = res.accessToken;
        } else {
          setIsProcessing(false);
          return;
        }
      } catch (err: any) {
        setIsProcessing(false);
        setFeedback({
          type: 'error',
          message: err.message || 'Gagal masuk dengan akun Google. Periksa izin popup peramban Anda atau gunakan opsi buka sheets.new.',
        });
        return;
      } finally {
        setIsProcessing(false);
      }
    }

    setConfirmModal({
      isOpen: true,
      title: 'Buat Database Google Spreadsheet Baru?',
      description: `Sistem akan membuat file spreadsheet baru berjudul "Database CBT Ujian Online - ${settings.schoolName || 'Sekolah'}" di Google Drive Anda (${currentUser?.email || 'Akun Google'}) lengkap dengan 4 lembar kerja (Data Peserta: ${pesertaList.length} siswa, Data Soal: ${soalList.length} mapel, Pengaturan, dan Log Pelanggaran).`,
      actionType: 'create',
    });
  };

  const requestSyncToSheet = async () => {
    setFeedback(null);
    let token = await getAccessToken();

    if (!currentUser || !token) {
      setIsProcessing(true);
      setProcessingStatusText('Menghubungkan akun Google...');
      try {
        setFeedback({
          type: 'info',
          message: 'Membuka otentikasi Google untuk izin menyimpan data ke Google Spreadsheet...',
        });
        const res = await googleSignIn();
        if (res) {
          onUserChanged(res.user);
          onUpdateSettings({
            ...settings,
            googleAccountEmail: res.user.email || undefined,
          });
          token = res.accessToken;
        } else {
          setIsProcessing(false);
          return;
        }
      } catch (err: any) {
        setIsProcessing(false);
        setFeedback({
          type: 'error',
          message: err.message || 'Gagal masuk dengan Google untuk menyimpan data.',
        });
        return;
      } finally {
        setIsProcessing(false);
      }
    }

    setConfirmModal({
      isOpen: true,
      title: 'Sinkronkan / Timpa Data ke Google Spreadsheet?',
      description: `Data pada spreadsheet "${settings.googleSpreadsheetTitle || 'CBT'}" akan diperbarui dengan data aplikasi saat ini (${pesertaList.length} peserta, ${soalList.length} soal ujian). Pastikan Anda ingin menimpa data pada spreadsheet tersebut.`,
      actionType: 'sync_to_sheet',
    });
  };

  const requestPullFromSheet = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Tarik Data dari Google Spreadsheet?',
      description: `Data peserta dan bank soal di aplikasi ini akan diperbarui sesuai isi tabel di Google Spreadsheet "${settings.googleSpreadsheetTitle || 'CBT'}".`,
      actionType: 'pull_from_sheet',
    });
  };

  const requestDisconnect = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Putuskan Koneksi Google Spreadsheet?',
      description: 'Aplikasi akan kembali menggunakan database browser lokal. Data di Google Spreadsheet Anda tetap tersimpan dan tidak akan terhapus.',
      actionType: 'disconnect',
    });
  };

  // Copy column format template to clipboard
  const handleCopyFormatTemplate = () => {
    const templateText = `--- FORMAT LEMBAR 1: Data Peserta ---
Nomor\tNISN\tNama Peserta\tTingkat\tRuangan/Kelas\tStatus\tCatatan Pelanggaran
1\t2024001\tAhmad Fadli Pratama\t10\tRuang 01\tAktif\t
2\t2024002\tBudi Santoso\t10\tRuang 01\tAktif\t

--- FORMAT LEMBAR 2: Data Soal ---
Nomor\tTingkat\tMata Pelajaran\tLink Soal\tToken\tWaktu (Menit)
1\t10\tMatematika Wajib\thttps://docs.google.com/forms/d/e/.../viewform\tMTK2025\t60
2\t10\tBahasa Indonesia\thttps://docs.google.com/forms/d/e/.../viewform\tBIN2025\t60

--- FORMAT LEMBAR 3: Pengaturan ---
Kunci Pengaturan\tNilai
adminUsername\tadmin
adminPassword\tadmin123
title\tCBT Ujian Online
schoolName\t${settings.schoolName || 'Sekolah'}
enableAntiCheat\ttrue

--- FORMAT LEMBAR 4: Log Ujian & Pelanggaran ---
Waktu (Timestamp)\tNISN\tNama Peserta\tMata Pelajaran\tAktivitas / Status\tKeterangan`;

    navigator.clipboard.writeText(templateText).then(() => {
      setHasCopiedFormat(true);
      setTimeout(() => setHasCopiedFormat(false), 3000);
    });
  };

  // Execute Confirmed Operation
  const handleExecuteConfirmedAction = async () => {
    const action = confirmModal.actionType;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    setIsProcessing(true);
    setProcessingStatusText(
      action === 'create'
        ? 'Membuat spreadsheet di Google Drive...'
        : action === 'sync_to_sheet'
        ? 'Menyimpan data ke spreadsheet...'
        : action === 'pull_from_sheet'
        ? 'Mengambil data spreadsheet...'
        : 'Memproses...'
    );
    setFeedback(null);

    try {
      let token = await getAccessToken();

      if (action === 'create') {
        if (!token) {
          const res = await googleSignIn();
          if (!res?.accessToken) {
            throw new Error('Sesi Google belum aktif. Silakan masuk dengan Google.');
          }
          token = res.accessToken;
          onUserChanged(res.user);
        }

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
          message: `Berhasil membuat dan menghubungkan database Google Spreadsheet baru: "${meta.title}". File tersimpan di Google Drive Anda.`,
        });
      } else if (action === 'sync_to_sheet') {
        if (!settings.googleSpreadsheetId) {
          throw new Error('Belum ada spreadsheet yang terhubung.');
        }
        if (!token) {
          const res = await googleSignIn();
          if (!res?.accessToken) {
            throw new Error('Silakan masuk dengan Google untuk memberikan izin menyimpan ke spreadsheet.');
          }
          token = res.accessToken;
          onUserChanged(res.user);
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
          type: 'info',
          message: 'Koneksi ke Google Spreadsheet berhasil diputuskan. Aplikasi beralih ke penyimpanan lokal.',
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
      setProcessingStatusText('Memproses...');
    }
  };

  // Connect existing spreadsheet via input (works with or without login)
  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = parseSpreadsheetId(inputUrl);
    if (!cleanId) {
      setFeedback({ type: 'error', message: 'Masukkan URL atau ID Google Spreadsheet yang valid.' });
      return;
    }

    setIsProcessing(true);
    setProcessingStatusText('Menghubungkan ke spreadsheet...');
    setFeedback(null);
    try {
      const token = await getAccessToken();
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
      const authNotice = currentUser
        ? 'Terhubung penuh (Mode Baca & Tulis).'
        : 'Terhubung dalam Mode Baca. Anda dapat masuk dengan akun Google kapan saja jika ingin mengirim data atau mencatat log live ke spreadsheet.';

      setFeedback({
        type: 'success',
        message: `Berhasil terhubung ke "${data.title || 'Google Spreadsheet'}"! Memuat ${data.peserta.length} peserta dan ${data.soal.length} soal. ${authNotice}`,
      });
    } catch (err: any) {
      console.error(err);
      setFeedback({
        type: 'error',
        message: err.message || 'Gagal menghubungkan Google Spreadsheet. Pastikan URL/ID benar dan spreadsheet dapat diakses.',
      });
    } finally {
      setIsProcessing(false);
      setProcessingStatusText('Memproses...');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-10">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <span>Integrasi Google Spreadsheet sebagai Database CBT</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gunakan Google Spreadsheet untuk sinkronisasi data peserta ujian, bank soal, dan log pelanggaran secara otomatis
          </p>
        </div>

        {/* Status Badge */}
        {settings.googleSpreadsheetId ? (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Database: Google Spreadsheet Aktif</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
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
              : feedback.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : feedback.type === 'info' ? (
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 leading-relaxed font-medium">{feedback.message}</div>
        </div>
      )}

      {/* Step 1: Google Account Authentication */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>Autentikasi Akun Google Proktor / Guru</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Memberikan izin aplikasi untuk membuat file di Google Drive dan menyinkronkan data langsung ke spreadsheet Anda.
            </p>
          </div>

          {currentUser && (
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[11px] font-semibold shrink-0">
              Terotentikasi
            </span>
          )}
        </div>

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
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                  {(currentUser.displayName || currentUser.email || 'G').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <div className="font-bold text-sm text-slate-900">
                  {currentUser.displayName || 'Akun Google Proktor'}
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
          <div className="space-y-3">
            <button
              onClick={handleSignIn}
              disabled={isSigningIn || isProcessing}
              className="inline-flex items-center gap-3 px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl border border-slate-300 shadow-xs hover:shadow transition disabled:opacity-50 cursor-pointer"
            >
              {isSigningIn ? (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              ) : (
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
              )}
              <span>{isSigningIn ? 'Menghubungkan Akun...' : 'Sign in with Google'}</span>
            </button>
            <p className="text-[11px] text-slate-500">
              Catatan: Jika peramban memunculkan pesan izin popup, klik <strong>Izinkan Popup</strong>. Anda juga dapat langsung menghubungkan spreadsheet yang sudah ada di Langkah 2 tanpa login jika file tersebut dibagikan (Anyone with the link).
            </p>
          </div>
        )}
      </div>

      {/* Step 2: Manage or Connect Spreadsheet */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200/80">
        <h3 className="font-bold text-base text-slate-900 mb-2 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center font-bold">
            2
          </span>
          <span>Status & Manajemen Database Google Spreadsheet</span>
        </h3>

        {settings.googleSpreadsheetId ? (
          <div className="space-y-4 mt-3">
            {/* Active Spreadsheet Details Card */}
            <div className="p-5 bg-gradient-to-r from-emerald-50/90 via-teal-50/60 to-blue-50/80 border border-emerald-200 rounded-2xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-emerald-600 text-white rounded-xl flex items-center justify-center shrink-0 shadow-xs">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">
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
                    <span>Buka Spreadsheet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-emerald-200/60 text-xs text-slate-600">
                <div className="p-2 bg-white/70 rounded-lg border border-emerald-100">
                  <span className="block text-[11px] text-slate-400">Data Peserta:</span>
                  <strong className="text-slate-800">{pesertaList.length} Siswa</strong>
                </div>
                <div className="p-2 bg-white/70 rounded-lg border border-emerald-100">
                  <span className="block text-[11px] text-slate-400">Data Soal:</span>
                  <strong className="text-slate-800">{soalList.length} Mata Pelajaran</strong>
                </div>
                <div className="p-2 bg-white/70 rounded-lg border border-emerald-100">
                  <span className="block text-[11px] text-slate-400">Pengaturan & Log:</span>
                  <strong className="text-emerald-700">Aktif & Sinkron</strong>
                </div>
                <div className="p-2 bg-white/70 rounded-lg border border-emerald-100">
                  <span className="block text-[11px] text-slate-400">Terakhir Sinkron:</span>
                  <strong className="text-slate-800">{settings.googleSpreadsheetLastSynced || 'Baru saja'}</strong>
                </div>
              </div>
            </div>

            {/* Sync Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={requestPullFromSheet}
                disabled={isProcessing}
                className="py-2.5 px-4 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <DownloadCloud className="w-4 h-4 text-blue-600" />
                <span>Tarik Data dari Spreadsheet</span>
              </button>

              <button
                onClick={requestSyncToSheet}
                disabled={isProcessing}
                className="py-2.5 px-4 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <UploadCloud className="w-4 h-4 text-emerald-600" />
                <span>Kirim & Simpan ke Spreadsheet</span>
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
          <div className="space-y-5 mt-3">
            {/* Option A: Create New Automatically (One-click Google Drive integration) */}
            <div className="p-5 bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-blue-50/60 border border-emerald-200 rounded-2xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                      Opsi 1: Buat Database Spreadsheet Baru
                    </h4>
                    <p className="text-xs text-slate-500">
                      Otomatis membuat 4 lembar kerja: <em>Data Peserta</em>, <em>Data Soal</em>, <em>Pengaturan</em>, dan <em>Log Pelanggaran</em>.
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold shrink-0">
                  Rekomendasi
                </span>
              </div>

              {/* Action Buttons for Option 1 */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {/* Primary Button: Automatically creates in Google Drive */}
                <button
                  type="button"
                  onClick={requestCreateNew}
                  disabled={isProcessing}
                  className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm hover:shadow transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>{processingStatusText}</span>
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4 text-white" />
                      <span>Buat Spreadsheet Baru di Drive</span>
                    </>
                  )}
                </button>

                {/* Secondary Fallback Button: opens sheets.new directly */}
                <a
                  href="https://sheets.new"
                  target="_blank"
                  rel="noreferrer"
                  className="py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl text-xs sm:text-sm border border-slate-300 shadow-2xs hover:shadow-xs transition flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4 text-slate-500" />
                  <span>Buka Lembar Baru di Google (sheets.new)</span>
                </a>

                {/* Tertiary Tool: Copy format headers to clipboard */}
                <button
                  type="button"
                  onClick={handleCopyFormatTemplate}
                  className="py-2.5 px-3.5 bg-white hover:bg-slate-50 text-slate-600 font-medium rounded-xl text-xs border border-slate-300 transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {hasCopiedFormat ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Format Kolom Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Salin Struktur Format Kolom</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>
                  Tombol ini otomatis meminta izin akun Google Anda dan langsung membuat file spreadsheet di Drive tanpa repot mengatur kolom secara manual.
                </span>
              </div>
            </div>

            {/* Option B: Connect Existing Spreadsheet (Works with URL / ID) */}
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
              <h4 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-blue-600" />
                <span>Opsi 2: Hubungkan Google Spreadsheet yang Sudah Ada</span>
              </h4>
              <p className="text-xs text-slate-500 mb-3">
                Tempelkan URL Google Spreadsheet atau Spreadsheet ID Anda. Jika spreadsheet dibagikan (Anyone with the link), sistem dapat langsung menarik data peserta dan soal tanpa perlu login.
              </p>

              <form onSubmit={handleConnectExisting} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Contoh: https://docs.google.com/spreadsheets/d/1BxiMVs.../edit atau ID Spreadsheet"
                  className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono shadow-2xs"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !inputUrl.trim()}
                  className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold rounded-xl text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:cursor-not-allowed"
                >
                  <Link2 className="w-4 h-4" />
                  <span>{isProcessing ? 'Menghubungkan...' : 'Hubungkan Spreadsheet'}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Format Guide Accordion */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <button
          onClick={() => setShowFormatGuide(!showFormatGuide)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Table className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-sm text-slate-900">
              Panduan Format Kolom Google Spreadsheet CBT
            </span>
          </div>
          {showFormatGuide ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showFormatGuide && (
          <div className="p-5 pt-0 border-t border-slate-100 space-y-4 text-xs text-slate-600">
            <p className="leading-relaxed">
              Jika Anda membuat file spreadsheet sendiri secara manual, pastikan nama lembar kerja (tab) dan judul kolom mengikuti format berikut:
            </p>

            {/* Sheet 1: Data Peserta */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Lembar 1: "Data Peserta"</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Kolom baris 1: <code>Nomor | NISN | Nama Peserta | Tingkat | Ruangan/Kelas | Status | Catatan Pelanggaran</code>
              </p>
              <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 font-mono overflow-x-auto">
                1 | 2024001 | Ahmad Fadli | 10 | Ruang 01 | Aktif | -
              </div>
            </div>

            {/* Sheet 2: Data Soal */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Lembar 2: "Data Soal"</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Kolom baris 1: <code>Nomor | Tingkat | Mata Pelajaran | Link Soal | Token | Waktu (Menit)</code>
              </p>
              <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 font-mono overflow-x-auto">
                1 | 10 | Matematika Wajib | https://docs.google.com/forms/d/e/.../viewform | MTK2025 | 60
              </div>
            </div>

            {/* Sheet 3: Pengaturan */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  <span>Lembar 3: "Pengaturan" (Termasuk Username & Password Admin)</span>
                </div>
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                  Login Proktor
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Kolom baris 1: <code>Kunci Pengaturan | Nilai</code>. Anda dapat mengubah login Admin langsung melalui baris berikut di Google Spreadsheet:
              </p>
              <div className="text-[11px] text-slate-700 bg-white p-2.5 rounded border border-slate-200 font-mono space-y-1 overflow-x-auto">
                <div className="text-purple-700 font-semibold">adminUsername | {settings.adminUsername || 'admin'}</div>
                <div className="text-purple-700 font-semibold">adminPassword | {settings.adminPassword || 'admin123'}</div>
                <div className="text-slate-500">title | {settings.title}</div>
                <div className="text-slate-500">schoolName | {settings.schoolName}</div>
                <div className="text-slate-500">enableAntiCheat | true</div>
              </div>
            </div>

            {/* Sheet 4: Log Ujian & Pelanggaran */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Lembar 4: "Log Ujian & Pelanggaran"</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Kolom baris 1: <code>Waktu (Timestamp) | NISN | Nama Peserta | Mata Pelajaran | Aktivitas / Status | Keterangan</code>
              </p>
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
            <strong>Data Peserta & Bank Soal</strong>: Guru dan Proktor dapat menginput atau mengedit daftar peserta dan link ujian Google Form langsung di Google Spreadsheet. Klik tombol <em>Tarik Data dari Spreadsheet</em> untuk memperbarui CBT kapan saja.
          </li>
          <li>
            <strong>Pencegahan Kecurangan Otomatis</strong>: Saat siswa melakukan pelanggaran (seperti pindah tab atau keluar layar penuh), status siswa otomatis diubah menjadi <em>Tidak Aktif</em> dan tercatat ke sheet <em>Log Ujian & Pelanggaran</em>.
          </li>
          <li>
            <strong>Kolaborasi Pengawas Ruangan</strong>: Rekan proktor dan wali kelas dapat memantau status ujian siswa secara langsung di Google Sheets dari perangkat masing-masing tanpa harus menginstal software tambahan.
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteConfirmedAction}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>Lanjutkan</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
