import React, { useState, useEffect } from 'react';
import { Peserta, SoalUjian, PengaturanApp } from './types';
import {
  getStoredPeserta,
  saveStoredPeserta,
  getStoredSoal,
  saveStoredSoal,
  getStoredSettings,
  saveStoredSettings,
  resetAllToDefault,
} from './utils/storage';
import { StudentLogin } from './components/StudentLogin';
import { AdminLogin } from './components/AdminLogin';
import { StudentPanel } from './components/StudentPanel';
import { ExamScreen } from './components/ExamScreen';
import { AdminShell } from './components/AdminShell';
import { ViolationModal } from './components/ViolationModal';
import { CheckCircle2, Loader2, Sparkles, LogOut, Check } from 'lucide-react';
import { User } from 'firebase/auth';
import { initAuth, getAccessToken } from './services/firebaseAuth';
import { logEventToSpreadsheet } from './services/googleSheetsService';

type AppScreen = 'login' | 'student_panel' | 'exam_active' | 'admin_panel';

export default function App() {
  const [pesertaList, setPesertaList] = useState<Peserta[]>(() => getStoredPeserta());
  const [soalList, setSoalList] = useState<SoalUjian[]>(() => getStoredSoal());
  const [settings, setSettings] = useState<PengaturanApp>(() => getStoredSettings());
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initialize Firebase Auth listener on load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => setCurrentUser(user),
      () => setCurrentUser(null)
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Navigation & session state
  const [activeScreen, setActiveScreen] = useState<AppScreen>('login');
  const [loginRole, setLoginRole] = useState<'siswa' | 'admin'>('siswa');
  const [currentStudent, setCurrentStudent] = useState<Peserta | null>(null);
  const [currentSoal, setCurrentSoal] = useState<SoalUjian | null>(null);

  // Loading overlay state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Memproses...');

  // Modals
  const [violationReason, setViolationReason] = useState<string | null>(null);
  const [showExamCompletedModal, setShowExamCompletedModal] = useState(false);

  // Web Audio tone generator for alerts
  const playAlertSound = (type: 'violation' | 'success') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'violation') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.4);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.15); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.3); // G5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      }
    } catch (_) {
      // Audio not permitted without interaction
    }
  };

  // Sync state to storage whenever it changes
  useEffect(() => {
    saveStoredPeserta(pesertaList);
  }, [pesertaList]);

  useEffect(() => {
    saveStoredSoal(soalList);
  }, [soalList]);

  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  // Handle student login success
  const handleStudentLoginSuccess = (student: Peserta, selectedSoal: SoalUjian) => {
    setIsLoading(true);
    setLoadingText('Mengautentikasi Peserta...');
    setTimeout(() => {
      setIsLoading(false);
      setCurrentStudent(student);
      setCurrentSoal(selectedSoal);
      setActiveScreen('student_panel');
    }, 400);
  };

  // Handle admin login success
  const handleAdminLoginSuccess = () => {
    setIsLoading(true);
    setLoadingText('Membuka Panel Proktor...');
    setTimeout(() => {
      setIsLoading(false);
      setActiveScreen('admin_panel');
    }, 400);
  };

  // Student starts exam
  const handleStartExam = () => {
    setIsLoading(true);
    setLoadingText('Mempersiapkan Lembar Ujian...');
    setTimeout(() => {
      setIsLoading(false);
      setActiveScreen('exam_active');
    }, 500);
  };

  // Anti-Cheat Violation Trigger
  const handleExamViolation = (reason: string) => {
    playAlertSound('violation');
    if (currentStudent) {
      const nowStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const note = `${reason} (Pukul ${nowStr})`;

      // Deactivate student in list
      setPesertaList((prev) =>
        prev.map((p) => {
          if (p.id === currentStudent.id || p.nisn === currentStudent.nisn) {
            return {
              ...p,
              status: 'Tidak Aktif',
              pelanggaranCount: (p.pelanggaranCount || 0) + 1,
              catatanPelanggaran: [...(p.catatanPelanggaran || []), note],
            };
          }
          return p;
        })
      );

      // Log violation directly to Google Spreadsheet if connected
      if (settings.googleSpreadsheetId) {
        getAccessToken()
          .then((token) => {
            if (token && settings.googleSpreadsheetId && currentStudent) {
              logEventToSpreadsheet(token, settings.googleSpreadsheetId, {
                nisn: currentStudent.nisn,
                nama: currentStudent.nama,
                mataPelajaran: currentSoal?.mataPelajaran || '-',
                status: 'Diskualifikasi / Terkunci',
                keterangan: note,
              });
            }
          })
          .catch(() => {});
      }
    }

    setViolationReason(reason);
  };

  // Dismiss violation modal and return to login
  const handleAcknowledgeViolation = () => {
    setViolationReason(null);
    setCurrentStudent(null);
    setCurrentSoal(null);
    setActiveScreen('login');
    setLoginRole('siswa');
  };

  // Exam Finish Normal
  const handleExamFinish = () => {
    playAlertSound('success');
    setShowExamCompletedModal(true);

    if (currentStudent && currentSoal && settings.googleSpreadsheetId) {
      getAccessToken()
        .then((token) => {
          if (token && settings.googleSpreadsheetId && currentStudent && currentSoal) {
            logEventToSpreadsheet(token, settings.googleSpreadsheetId, {
              nisn: currentStudent.nisn,
              nama: currentStudent.nama,
              mataPelajaran: currentSoal.mataPelajaran,
              status: 'Selesai',
              keterangan: 'Pengerjaan ujian selesai tepat waktu dan tersimpan',
            });
          }
        })
        .catch(() => {});
    }
  };

  const handleFinishModalClose = () => {
    setShowExamCompletedModal(false);
    setCurrentStudent(null);
    setCurrentSoal(null);
    setActiveScreen('login');
    setLoginRole('siswa');
  };

  // Logout from student panel
  const handleStudentLogout = () => {
    setCurrentStudent(null);
    setCurrentSoal(null);
    setActiveScreen('login');
    setLoginRole('siswa');
  };

  // Logout from admin panel
  const handleAdminLogout = () => {
    setActiveScreen('login');
    setLoginRole('siswa');
  };

  // Admin Data Management handlers
  const handleAddPeserta = (p: Peserta) => {
    setPesertaList((prev) => [p, ...prev]);
  };

  const handleUpdatePeserta = (p: Peserta) => {
    setPesertaList((prev) => prev.map((item) => (item.id === p.id ? p : item)));
  };

  const handleDeletePeserta = (id: string) => {
    setPesertaList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleToggleStatusPeserta = (id: string) => {
    setPesertaList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === 'Aktif' ? 'Tidak Aktif' : 'Aktif';
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const handleUnlockStudent = (id: string) => {
    setPesertaList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'Aktif' } : item))
    );
  };

  const handleUnlockAll = () => {
    setPesertaList((prev) => prev.map((item) => ({ ...item, status: 'Aktif' })));
  };

  const handleAddSoal = (s: SoalUjian) => {
    setSoalList((prev) => [s, ...prev]);
  };

  const handleUpdateSoal = (s: SoalUjian) => {
    setSoalList((prev) => prev.map((item) => (item.id === s.id ? s : item)));
  };

  const handleDeleteSoal = (id: string) => {
    setSoalList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveSettings = (newSettings: PengaturanApp) => {
    setSettings(newSettings);
  };

  const handleResetDefault = () => {
    const res = resetAllToDefault();
    setPesertaList(res.peserta);
    setSoalList(res.soal);
    setSettings(res.settings);
  };

  const handleDataLoadedFromSheet = (
    newPeserta: Peserta[],
    newSoal: SoalUjian[],
    newSettings?: Partial<PengaturanApp>
  ) => {
    if (newPeserta.length > 0) setPesertaList(newPeserta);
    if (newSoal.length > 0) setSoalList(newSoal);
    if (newSettings) setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 select-none antialiased">
      {/* Global Processing Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[9999] bg-white/70 backdrop-blur-xs flex items-center justify-center animate-in fade-in duration-150">
          <div className="bg-white px-6 py-5 rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <span className="text-sm font-semibold text-slate-800">{loadingText}</span>
          </div>
        </div>
      )}

      {/* Screen Router */}
      {activeScreen === 'login' && (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-slate-100">
          {loginRole === 'siswa' ? (
            <StudentLogin
              pesertaList={pesertaList}
              soalList={soalList}
              settings={settings}
              onLoginSuccess={handleStudentLoginSuccess}
              onSwitchToAdmin={() => setLoginRole('admin')}
            />
          ) : (
            <AdminLogin
              settings={settings}
              onLoginSuccess={handleAdminLoginSuccess}
              onSwitchToStudent={() => setLoginRole('siswa')}
            />
          )}
        </div>
      )}

      {activeScreen === 'student_panel' && currentStudent && currentSoal && (
        <StudentPanel
          student={currentStudent}
          soal={currentSoal}
          settings={settings}
          onStartExam={handleStartExam}
          onLogout={handleStudentLogout}
        />
      )}

      {activeScreen === 'exam_active' && currentStudent && currentSoal && (
        <ExamScreen
          student={currentStudent}
          soal={currentSoal}
          settings={settings}
          onFinishExam={handleExamFinish}
          onViolation={handleExamViolation}
        />
      )}

      {activeScreen === 'admin_panel' && (
        <AdminShell
          currentUser={currentUser}
          onUserChanged={setCurrentUser}
          pesertaList={pesertaList}
          soalList={soalList}
          settings={settings}
          onLogout={handleAdminLogout}
          onPreviewStudentMode={() => {
            setActiveScreen('login');
            setLoginRole('siswa');
          }}
          onAddPeserta={handleAddPeserta}
          onUpdatePeserta={handleUpdatePeserta}
          onDeletePeserta={handleDeletePeserta}
          onToggleStatusPeserta={handleToggleStatusPeserta}
          onUnlockStudent={handleUnlockStudent}
          onUnlockAll={handleUnlockAll}
          onAddSoal={handleAddSoal}
          onUpdateSoal={handleUpdateSoal}
          onDeleteSoal={handleDeleteSoal}
          onSaveSettings={handleSaveSettings}
          onResetDefault={handleResetDefault}
          onDataLoadedFromSheet={handleDataLoadedFromSheet}
        />
      )}

      {/* VIOLATION MODAL */}
      {violationReason && (
        <ViolationModal
          reason={violationReason}
          studentName={currentStudent?.nama}
          onAcknowledge={handleAcknowledgeViolation}
        />
      )}

      {/* EXAM FINISH SUCCESS MODAL */}
      {showExamCompletedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 text-center p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Ujian Selesai!</h3>
            <p className="text-sm text-slate-600 mb-6 leading-relaxed">
              Terima kasih <strong>{currentStudent?.nama}</strong>. Lembar jawaban ujian{' '}
              <strong>{currentSoal?.mataPelajaran}</strong> telah berhasil dikumpulkan.
            </p>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 text-left space-y-2 mb-6">
              <div className="flex justify-between">
                <span>Nomor Peserta:</span>
                <span className="font-mono font-bold">{currentStudent?.nisn}</span>
              </div>
              <div className="flex justify-between">
                <span>Kelas:</span>
                <span className="font-semibold">{currentStudent?.kelas}</span>
              </div>
              <div className="flex justify-between">
                <span>Status Penyelesaian:</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Berhasil Tersimpan
                </span>
              </div>
            </div>

            <button
              onClick={handleFinishModalClose}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Kembali ke Halaman Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
