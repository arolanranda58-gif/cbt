import React, { useState, useEffect, useRef } from 'react';
import { Peserta, SoalUjian, PengaturanApp } from '../types';
import { SAMPLE_CBT_QUESTIONS } from '../data/defaultData';
import confetti from 'canvas-confetti';
import {
  Clock,
  Flag,
  Shield,
  ShieldAlert,
  Maximize2,
  Minimize2,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Award,
  CheckCircle2,
  BellOff,
  LogOut
} from 'lucide-react';

/**
 * Helper function to safely handle Google Form score URLs without generating 404 errors.
 * NOTE: Google Forms does NOT support a static '/viewscore' path without a submission token.
 * Accessing https://docs.google.com/forms/d/e/.../viewscore directly causes HTTP 404:
 * "This docs.google.com page can't be found".
 * The actual score page is generated dynamically by Google Form as:
 * https://docs.google.com/forms/d/e/.../viewscore?viewscore=AE0z...
 */
export const getGoogleFormViewScoreUrl = (link?: string): string => {
  if (!link) return '';
  const trimmed = link.trim();
  
  // If the link explicitly has a viewscore token query param, it is a valid view score link
  if (trimmed.includes('viewscore=') || (trimmed.includes('/viewscore?') && !trimmed.endsWith('/viewscore'))) {
    return trimmed;
  }
  
  // If someone passed a raw naked '/viewscore' without parameters, it will 404,
  // so fallback to the base viewform link to prevent 404 error
  if (trimmed.endsWith('/viewscore')) {
    return trimmed.replace(/\/viewscore$/, '/viewform');
  }

  // If it's a standard form link, do NOT append /viewscore because it will 404.
  // Return empty string indicating that the student must view score via Google Form's
  // response confirmation button or genuine token link.
  return '';
};

/**
 * Returns a guaranteed valid, non-404 URL for opening the Google Form.
 */
export const getSafeFormOpenUrl = (link?: string): string => {
  if (!link) return '';
  const trimmed = link.trim();
  if (trimmed.endsWith('/viewscore')) {
    return trimmed.replace(/\/viewscore$/, '/viewform');
  }
  return trimmed;
};

export const hasValidViewScoreToken = (link?: string): boolean => {
  if (!link) return false;
  return link.includes('viewscore=');
};

interface ExamScreenProps {
  student: Peserta;
  soal: SoalUjian;
  settings: PengaturanApp;
  onFinishExam: (scoreUrl?: string) => void;
  onStudentDeactivate?: (studentId: string) => void;
  onViolation: (reason: string) => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({
  student,
  soal,
  settings,
  onFinishExam,
  onStudentDeactivate,
  onViolation,
}) => {
  const totalSeconds = Math.max(60, soal.waktuMenit * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [isScoreViewAllowed, setIsScoreViewAllowed] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'iframe' | 'simulator'>('iframe');
  const [isExamCompleted, setIsExamCompleted] = useState(false);
  
  // Interactive CBT simulator state (for built-in questions)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: number]: string }>({});
  const [flagged, setFlagged] = useState<{ [questionId: number]: boolean }>({});
  const [iframeKey, setIframeKey] = useState(0);

  // Calculate score for built-in CBT questions
  const simulatorResult = React.useMemo(() => {
    let correct = 0;
    SAMPLE_CBT_QUESTIONS.forEach((q) => {
      if (answers[q.id] === q.kunci) {
        correct++;
      }
    });
    const total = SAMPLE_CBT_QUESTIONS.length;
    const scoreVal = Math.round((correct / total) * 100);
    return { correct, total, scoreVal };
  }, [answers]);

  const isExamActiveRef = useRef(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isMouseOverIframeRef = useRef(false);
  const showConfirmFinishRef = useRef(false);
  const isScoreViewAllowedRef = useRef(false);
  const lastIframeClickTimeRef = useRef(0);
  const blurTimeoutRef = useRef<any>(null);

  useEffect(() => {
    showConfirmFinishRef.current = showConfirmFinish;
  }, [showConfirmFinish]);

  // Format Google Form URL to include embedded=true for optimal iframe presentation
  const formattedEmbedUrl = React.useMemo(() => {
    const raw = soal.link?.trim() || '';
    if (raw.includes('docs.google.com/forms') && !raw.includes('embedded=true')) {
      const sep = raw.includes('?') ? '&' : '?';
      return `${raw}${sep}embedded=true`;
    }
    return raw;
  }, [soal.link]);

  // Notification Blocker: Blokir semua notifikasi browser & web push saat ujian berlangsung
  useEffect(() => {
    if (settings.blockNotifications === false) return;

    // Simpan implementasi asli Notification
    const OriginalNotification = (window as any).Notification;
    let originalServiceWorkerShow: any = null;

    try {
      // Buat dummy Notification yang menolak permission & tidak memunculkan notifikasi/suara apapun
      class SafeBlockedNotification {
        static permission: NotificationPermission = 'denied';
        static requestPermission(): Promise<NotificationPermission> {
          return Promise.resolve('denied');
        }
        static maxActions = 0;
        onclick = null;
        onclose = null;
        onerror = null;
        onshow = null;
        close() {}
        constructor(title: string) {
          console.log('[CBT Shield] Notifikasi browser diblokir selama ujian:', title);
        }
      }

      (window as any).Notification = SafeBlockedNotification;

      // Blokir ServiceWorker showNotification jika ada service worker yang terdaftar
      if (typeof ServiceWorkerRegistration !== 'undefined' && ServiceWorkerRegistration.prototype) {
        originalServiceWorkerShow = ServiceWorkerRegistration.prototype.showNotification;
        ServiceWorkerRegistration.prototype.showNotification = function () {
          console.log('[CBT Shield] Push notification service worker diblokir selama ujian');
          return Promise.resolve();
        };
      }
    } catch (e) {
      console.warn('[CBT Shield] Gagal menimpa Notification API:', e);
    }

    // Kunci document.title agar tidak berubah menjadi notifikasi (seperti "(1) Pesan Baru")
    const originalDocTitle = document.title;
    const examDocTitle = `${soal.mataPelajaran} - Ujian Sedang Berlangsung`;
    document.title = examDocTitle;
    const titleWatcher = setInterval(() => {
      if (document.title !== examDocTitle) {
        document.title = examDocTitle;
      }
    }, 1500);

    return () => {
      clearInterval(titleWatcher);
      document.title = originalDocTitle;
      try {
        if (OriginalNotification) {
          (window as any).Notification = OriginalNotification;
        }
        if (originalServiceWorkerShow && typeof ServiceWorkerRegistration !== 'undefined') {
          ServiceWorkerRegistration.prototype.showNotification = originalServiceWorkerShow;
        }
      } catch (_) {}
    };
  }, [settings.blockNotifications, soal.mataPelajaran]);

  // Enter Full Screen Helper
  const requestFullScreen = () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if ((elem as any).webkitRequestFullscreen) {
        (elem as any).webkitRequestFullscreen();
      } else if ((elem as any).msRequestFullscreen) {
        (elem as any).msRequestFullscreen();
      }
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen request blocked or not allowed:', err);
    }
  };

  // Exit Full Screen Helper
  const exitFullScreen = () => {
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    } catch (err) {
      console.warn('Exit fullscreen error:', err);
    }
  };

  // Trigger violation
  const handleTriggerViolation = (reason: string) => {
    if (!isExamActiveRef.current) return;
    isExamActiveRef.current = false;
    exitFullScreen();
    onViolation(reason);
  };

  // Fullscreen and Security Anti-Cheat Event Listeners
  useEffect(() => {
    requestFullScreen();

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (
        !isFull &&
        settings.fullScreenEnforced &&
        isExamActiveRef.current &&
        !isScoreViewAllowedRef.current &&
        !showConfirmFinishRef.current
      ) {
        handleTriggerViolation('Meninggalkan mode layar penuh (Fullscreen ditutup)!');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (settings.blockRightClick && isExamActiveRef.current) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isExamActiveRef.current || !settings.blockShortcuts) return;

      // Allow normal Tab key for form field navigation. Only block Alt+Tab, Alt+F4
      if (e.altKey && (e.key === 'Tab' || e.key === 'F4')) {
        e.preventDefault();
        handleTriggerViolation('Kombinasi tombol pintas Alt+Tab terdeteksi!');
        return;
      }

      // Block F12 (Developer tools)
      if (e.key === 'F12') {
        e.preventDefault();
        handleTriggerViolation('Tombol Developer Tools (F12) terdeteksi!');
        return;
      }

      // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Inspect Element)
      if (
        e.ctrlKey &&
        e.shiftKey &&
        ['i', 'j', 'c'].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        handleTriggerViolation('Kombinasi Inspect Element terdeteksi!');
        return;
      }

      // Block Ctrl+U (View Page Source)
      if (e.ctrlKey && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        handleTriggerViolation('Kombinasi Lihat Sumber Halaman (Ctrl+U) terdeteksi!');
        return;
      }
    };

    // Event Anti-Curang: Window Blur & Kehilangan Fokus Jendela
    const handleBlur = () => {
      if (!settings.enableAntiCheat || !isExamActiveRef.current) return;
      if (isScoreViewAllowedRef.current || showConfirmFinishRef.current) return;

      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }

      // Gunakan jeda singkat (120ms) untuk memastikan fokus kursor
      blurTimeoutRef.current = setTimeout(() => {
        if (!isExamActiveRef.current) return;
        if (showConfirmFinishRef.current || isScoreViewAllowedRef.current) return;

        // Cek apakah aksi dipicu oleh klik pada Google Form baru-baru ini
        // (misalnya saat siswa mengklik tombol "Lihat skor / View score" di akhir Google Form)
        const isRecentIframeClick = Date.now() - lastIframeClickTimeRef.current < 5000;
        if (isRecentIframeClick && (isMouseOverIframeRef.current || document.hidden)) {
          // Tombol Lihat Skor pada Google Form membuka tab/popup baru:
          // Izinkan dan jangan anggap pelanggaran!
          isScoreViewAllowedRef.current = true;
          setIsScoreViewAllowed(true);
          setShowScoreModal(true);
          return;
        }

        // 1. Jika tab tersembunyi / diminimalkan
        if (document.hidden) {
          handleTriggerViolation('Pelanggaran: Anda meninggalkan jendela ujian (Window Blur / Pindah Tab)!');
          return;
        }

        // 2. Periksa apakah fokus berpindah ke dalam Google Form (elemen iframe)
        const activeEl = document.activeElement;
        const isInteractingWithGoogleForm =
          activeEl === iframeRef.current ||
          activeEl?.tagName === 'IFRAME' ||
          (isMouseOverIframeRef.current && !document.hidden);

        if (isInteractingWithGoogleForm) {
          // Siswa sedang mengklik atau menjawab di dalam lembar soal Google Form
          return;
        }

        // 2b. Periksa apakah jendela browser masih atau sudah kembali memiliki fokus
        // (misal notifikasi sistem/OS melintas sesaat tanpa siswa berpindah jendela)
        if (typeof document.hasFocus === 'function' && document.hasFocus()) {
          return;
        }

        // 3. Jendela browser kehilangan fokus (mengklik aplikasi lain, taskbar, layar monitor kedua, dsb)
        handleTriggerViolation('Pelanggaran: Jendela ujian kehilangan fokus (Window Blur terdeteksi)!');
      }, 150);
    };

    // Deteksi Berpindah Tab / Layar
    const handleVisibilityChange = () => {
      if (!settings.enableAntiCheat || !isExamActiveRef.current) return;
      if (isScoreViewAllowedRef.current || showConfirmFinishRef.current) return;

      if (document.hidden) {
        // Cek apakah tab baru terbuka karena klik tombol di dalam Google Form (Lihat skor / View score)
        const isRecentIframeClick = Date.now() - lastIframeClickTimeRef.current < 5000;
        if (isRecentIframeClick || isScoreViewAllowedRef.current) {
          isScoreViewAllowedRef.current = true;
          setIsScoreViewAllowed(true);
          setShowScoreModal(true);
          return;
        }

        handleTriggerViolation('Pelanggaran: Anda berpindah tab / membuka layar lain saat ujian!');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings]);

  // Timer countdown
  // Timer countdown
  useEffect(() => {
    if (isExamCompleted) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishConfirmed();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [soal.link, isExamCompleted]);

  const handleFinishConfirmed = () => {
    isScoreViewAllowedRef.current = true;
    isExamActiveRef.current = false;
    setIsScoreViewAllowed(true);
    setIsExamCompleted(true);
    setShowConfirmFinish(false);
    setShowScoreModal(false);

    // Otomatis ubah status siswa menjadi 'Tidak Aktif' saat ujian diselesaikan
    if (onStudentDeactivate) {
      onStudentDeactivate(student.id);
    }

    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 }
      });
    } catch (_) {}
  };

  const handleFinalExit = () => {
    const scoreUrl = getGoogleFormViewScoreUrl(soal.link);
    onFinishExam(scoreUrl);
  };

  // Format time as HH:MM:SS
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = Math.max(0, Math.min(100, (remainingSeconds / totalSeconds) * 100));

  // Determine timer color
  const timerColorClass =
    remainingSeconds < 300
      ? 'text-rose-600 bg-rose-50 border-rose-200'
      : remainingSeconds < 900
      ? 'text-amber-600 bg-amber-50 border-amber-200'
      : 'text-slate-800 bg-slate-50 border-slate-200';

  const currentQ = SAMPLE_CBT_QUESTIONS[currentQuestionIdx];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 select-none overflow-hidden">
      {/* Top Header Exam Bar */}
      <header className={`px-4 py-2.5 flex items-center justify-between shrink-0 shadow-md z-30 transition-colors ${
        isExamCompleted ? 'bg-emerald-950/95 border-b border-emerald-700/80' : 'bg-slate-800/95 border-b border-slate-700/80'
      }`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isExamCompleted ? 'bg-emerald-400' : 'bg-emerald-500 animate-pulse'}`} />
            <h1 className="font-bold text-sm sm:text-base text-white truncate max-w-[200px] sm:max-w-md">
              {isExamCompleted ? `Hasil & Skor: ${soal.mataPelajaran}` : soal.mataPelajaran}
            </h1>
          </div>
          <span className="hidden md:inline-block text-xs bg-slate-700 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-600">
            {student.nama} ({student.kelas})
          </span>
          {isExamCompleted && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-900/80 px-2.5 py-0.5 rounded-full border border-emerald-600/50 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sesi Ujian Selesai</span>
            </div>
          )}
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mode Switcher (Google Form vs Simulasi Lembar Jawaban) */}
          <div className="hidden sm:flex bg-slate-700/80 p-0.5 rounded-lg border border-slate-600 text-xs">
            <button
              onClick={() => setActiveTab('iframe')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                activeTab === 'iframe'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Google Form
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-2.5 py-1 rounded-md font-medium transition ${
                activeTab === 'simulator'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Lembar CBT Interaktif
            </button>
          </div>

          {!isExamCompleted && (
            <>
              {/* Countdown Clock Display */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border font-mono font-bold text-sm sm:text-base ${timerColorClass}`}
              >
                <Clock className="w-4 h-4 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
                <span>{formatTime(remainingSeconds)}</span>
              </div>

              {/* Fullscreen toggle button */}
              <button
                onClick={isFullscreen ? exitFullScreen : requestFullScreen}
                title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}
                className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Selesai Ujian Button */}
              <button
                onClick={() => setShowConfirmFinish(true)}
                className="py-1.5 px-3 sm:px-4 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-bold rounded-full text-xs sm:text-sm shadow-md transition flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Flag className="w-3.5 h-3.5 fill-current" />
                <span>Selesai Ujian</span>
              </button>
            </>
          )}

          {isExamCompleted && (
            <button
              onClick={handleFinalExit}
              className="py-2 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold rounded-full text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
              <span>Selesai & Keluar ke Login</span>
            </button>
          )}
        </div>
      </header>

      {/* Progress Bar under header */}
      <div className="w-full bg-slate-700 h-1.5 shrink-0 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            isExamCompleted
              ? 'bg-emerald-400'
              : remainingSeconds < 300
              ? 'bg-rose-500'
              : remainingSeconds < 900
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${isExamCompleted ? 100 : progressPercent}%` }}
        />
      </div>

      {/* Main Exam Area */}
      <main className="flex-1 w-full bg-slate-950 relative overflow-hidden flex flex-col">
        {activeTab === 'iframe' ? (
          <div className="flex-1 w-full h-full flex flex-col bg-white text-slate-900 relative">
            {/* Top Celebration Banner when exam completed */}
            {isExamCompleted && (
              <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white px-4 py-3.5 shadow-lg border-b-2 border-emerald-400 shrink-0 z-20">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                  <div className="flex items-start md:items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 shadow-inner">
                      <Award className="w-6 h-6 text-amber-300 animate-bounce" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-sm sm:text-base tracking-wide">
                          🎉 Ujian Selesai! Lihat Skor Anda Pada Lembar Formulir di Bawah
                        </h3>
                        <span className="text-[10px] bg-amber-400 text-slate-950 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Hasil Tersedia
                        </span>
                      </div>
                      <p className="text-xs text-emerald-100 mt-1 leading-relaxed">
                        👉 <strong>Cara Melihat Nilai:</strong> Jika Anda sudah menekan tombol <em>'Kirim'</em>, klik tombol resmi <strong>'Lihat skor'</strong> (berwarna ungu/biru) yang tampil di lembar formulir Google Form di bawah ini.
                      </p>
                      <p className="text-[11px] text-amber-200 mt-0.5">
                        (Catatan: Jika Anda belum menekan 'Kirim', silakan gulir ke paling bawah formulir di bawah ini dan klik tombol <strong>'Kirim'</strong> terlebih dahulu).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      type="button"
                      onClick={handleFinalExit}
                      className="py-2 px-4 bg-white hover:bg-emerald-50 text-emerald-900 font-extrabold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-emerald-700" />
                      <span>Selesai & Keluar</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Top helper banner for embedded link (when still working) */}
            {!isExamCompleted && (
              <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="truncate">
                    Lembar Soal: <strong className="font-mono text-blue-700">{soal.link}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIframeKey((k) => k + 1)}
                    title="Muat ulang lembar soal jika terjadi kendala jaringan"
                    className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-semibold flex items-center gap-1 transition text-[11px] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3 text-slate-500" />
                    <span>Muat Ulang Form</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('simulator')}
                    className="text-blue-600 hover:text-blue-800 font-semibold underline shrink-0 ml-1 cursor-pointer"
                  >
                    Gunakan Lembar Interaktif jika form tidak tampil
                  </button>
                </div>
              </div>
            )}

            {/* Iframe Container with active interaction and score-view detection */}
            <div
              className="flex-1 w-full h-full relative"
              onMouseEnter={() => {
                isMouseOverIframeRef.current = true;
              }}
              onMouseLeave={() => {
                isMouseOverIframeRef.current = false;
              }}
              onPointerDown={() => {
                isMouseOverIframeRef.current = true;
                lastIframeClickTimeRef.current = Date.now();
              }}
              onMouseDown={() => {
                isMouseOverIframeRef.current = true;
                lastIframeClickTimeRef.current = Date.now();
              }}
              onTouchStart={() => {
                isMouseOverIframeRef.current = true;
                lastIframeClickTimeRef.current = Date.now();
              }}
            >
              <iframe
                ref={iframeRef}
                key={iframeKey}
                id="soalIframe"
                src={formattedEmbedUrl}
                title="Soal Ujian Online"
                className="w-full h-full border-0 absolute inset-0 bg-white"
                allow="camera; microphone; fullscreen; clipboard-read; clipboard-write; autoplay"
              />
            </div>
          </div>
        ) : isExamCompleted ? (
          /* Interactive CBT Test Result Summary */
          <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-900 overflow-y-auto">
            <div className="max-w-xl w-full bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-700 shadow-2xl text-center animate-in zoom-in-95 duration-200">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Award className="w-10 h-10 text-amber-400" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-800/60 inline-block mb-2">
                Hasil Ujian Berbasis Komputer
              </span>
              <h2 className="text-2xl font-black text-white mb-1">
                {soal.mataPelajaran}
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mb-6">
                Peserta: <strong>{student.nama}</strong> ({student.kelas}) • NISN: {student.nisn}
              </p>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-3.5 bg-slate-750 rounded-2xl border border-slate-700">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase">Nilai Akhir</span>
                  <span className="text-2xl sm:text-3xl font-black text-amber-400">{simulatorResult.scoreVal}</span>
                </div>
                <div className="p-3.5 bg-slate-750 rounded-2xl border border-slate-700">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase">Benar</span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400">{simulatorResult.correct}</span>
                </div>
                <div className="p-3.5 bg-slate-750 rounded-2xl border border-slate-700">
                  <span className="block text-[11px] font-bold text-slate-400 uppercase">Salah</span>
                  <span className="text-2xl sm:text-3xl font-black text-rose-400">{simulatorResult.total - simulatorResult.correct}</span>
                </div>
              </div>

              <div className={`p-3 rounded-xl border text-xs font-bold mb-6 ${
                simulatorResult.scoreVal >= 75
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-amber-950/60 border-amber-800 text-amber-300'
              }`}>
                {simulatorResult.scoreVal >= 75
                  ? '🎉 SELAMAT! Anda dinyatakan LULUS (Memenuhi KKM 75)'
                  : '⚠️ PERHATIAN: Nilai Anda berada di bawah KKM (75). Hubungi Pengawas Ujian.'}
              </div>

              <button
                type="button"
                onClick={handleFinalExit}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-sm shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Selesai & Keluar ke Halaman Awal</span>
              </button>
            </div>
          </div>
        ) : (
          /* Interactive CBT Test Simulator */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-900 text-slate-100">
            {/* Question Panel */}
            <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto">
              <div className="max-w-3xl mx-auto w-full bg-slate-800/90 rounded-2xl p-6 border border-slate-700/80 shadow-lg flex-1 flex flex-col">
                <div className="flex items-center justify-between pb-4 border-b border-slate-700 mb-5">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-600/30 text-blue-400 border border-blue-500/40 rounded-lg text-sm font-bold">
                      Soal No. {currentQuestionIdx + 1}
                    </span>
                    <span className="text-xs text-slate-400">
                      dari {SAMPLE_CBT_QUESTIONS.length} soal
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setFlagged((prev) => ({
                        ...prev,
                        [currentQ.id]: !prev[currentQ.id],
                      }))
                    }
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition ${
                      flagged[currentQ.id]
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-slate-700 text-slate-300 border-slate-600 hover:bg-slate-600'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>{flagged[currentQ.id] ? 'Ragu-ragu (Ditandai)' : 'Tandai Ragu'}</span>
                  </button>
                </div>

                {/* Question Text */}
                <div className="text-base sm:text-lg font-medium text-slate-100 mb-6 leading-relaxed">
                  {currentQ.pertanyaan}
                </div>

                {/* Multiple Choice Options */}
                <div className="space-y-3 flex-1">
                  {Object.entries(currentQ.pilihan).map(([key, label]) => {
                    const isSelected = answers[currentQ.id] === key;
                    return (
                      <label
                        key={key}
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [currentQ.id]: key,
                          }))
                        }
                        className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500'
                            : 'bg-slate-750/70 border-slate-700 hover:bg-slate-700/60 text-slate-300'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-700 text-slate-300 border border-slate-600'
                          }`}
                        >
                          {key}
                        </div>
                        <div className="text-sm sm:text-base pt-0.5">{label}</div>
                      </label>
                    );
                  })}
                </div>

                {/* Bottom Navigation */}
                <div className="flex items-center justify-between pt-6 mt-6 border-t border-slate-700">
                  <button
                    disabled={currentQuestionIdx === 0}
                    onClick={() => setCurrentQuestionIdx((p) => p - 1)}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold flex items-center gap-1.5 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Sebelumnya
                  </button>

                  <span className="text-xs text-slate-400">
                    Terjawab: {answeredCount}/{SAMPLE_CBT_QUESTIONS.length}
                  </span>

                  <button
                    disabled={currentQuestionIdx === SAMPLE_CBT_QUESTIONS.length - 1}
                    onClick={() => setCurrentQuestionIdx((p) => p + 1)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-semibold flex items-center gap-1.5 transition text-white"
                  >
                    Selanjutnya
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Questions Number Grid Sidebar */}
            <div className="w-full md:w-64 bg-slate-800/80 border-t md:border-t-0 md:border-l border-slate-700 p-4 shrink-0 flex flex-col">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
                Navigasi Nomor Soal
              </h3>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {SAMPLE_CBT_QUESTIONS.map((q, idx) => {
                  const isCurrent = idx === currentQuestionIdx;
                  const isAns = answers[q.id];
                  const isFlag = flagged[q.id];

                  let bgClass = 'bg-slate-700 text-slate-300 border-slate-600';
                  if (isCurrent) {
                    bgClass = 'ring-2 ring-blue-400 font-bold';
                  }
                  if (isFlag) {
                    bgClass += ' bg-amber-600/30 text-amber-300 border-amber-500';
                  } else if (isAns) {
                    bgClass += ' bg-emerald-600/40 text-emerald-300 border-emerald-500';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIdx(idx)}
                      className={`h-10 rounded-lg border text-sm font-semibold flex flex-col items-center justify-center relative transition ${bgClass}`}
                    >
                      {idx + 1}
                      {isAns && (
                        <span className="text-[10px] font-mono leading-none opacity-80">
                          {isAns}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-auto pt-4 border-t border-slate-700/80 text-[11px] space-y-1.5 text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-600/60 border border-emerald-500" />
                  <span>Sudah Terjawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-amber-600/60 border border-amber-500" />
                  <span>Ragu-ragu</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-slate-700 border border-slate-600" />
                  <span>Belum Terjawab</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CONFIRM FINISH EXAM MODAL */}
      {showConfirmFinish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Flag className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Konfirmasi Selesai Ujian</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Apakah Anda yakin ingin menyelesaikan ujian <strong>{soal.mataPelajaran}</strong>?
                Waktu pengerjaan akan dihentikan dan status peserta Anda otomatis diubah menjadi <strong>Tidak Aktif</strong>.
              </p>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 text-left mb-6 space-y-2 border border-slate-200">
                <div>• Nama Siswa: <strong>{student.nama}</strong> ({student.kelas})</div>
                <div>• Sisa Waktu: <strong>{formatTime(remainingSeconds)}</strong></div>
                <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200 text-blue-900 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-blue-950">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Petunjuk Akhir:</span>
                  </div>
                  <div>
                    Pastikan Anda telah menekan tombol <strong>'Kirim'</strong> pada Google Form sebelum menyelesaikan sesi ini.
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmFinish(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition cursor-pointer"
                >
                  Kembali Mengerjakan
                </button>
                <button
                  type="button"
                  onClick={handleFinishConfirmed}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl text-sm shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Ya, Selesai Ujian</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HASIL & SKOR GOOGLE FORM */}
      {showScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1.5">
                Panduan Melihat Skor Google Form
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
                Skor nilai Google Form dihasilkan oleh sistem Google setelah formulir berhasil dikirim.
              </p>

              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-slate-700 text-left mb-5 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold">
                  <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Langkah Melihat Skor Tanpa Mengulang Form Baru:</span>
                </div>
                <div>
                  <strong>1. Tekan Tombol Kirim di Form:</strong> Gulir ke bagian paling bawah formulir Google Form di layar ini, lalu klik tombol <strong>'Kirim'</strong>.
                </div>
                <div>
                  <strong>2. Klik 'Lihat skor':</strong> Setelah terkirim, Google Form menampilkan konfirmasi <em>'Tanggapan Anda telah dicatat'</em> dan tombol resmi <strong>'Lihat skor'</strong>.
                </div>
                <div>
                  <strong>3. Nilai Anda Ditampilkan:</strong> Mengklik tombol <em>'Lihat skor'</em> di formulir diizinkan sepenuhnya dan tidak akan dianggap pelanggaran.
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowScoreModal(false);
                    handleFinishConfirmed();
                  }}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Selesaikan Ujian Sekarang</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowScoreModal(false)}
                    className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    Kembali Mengerjakan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
