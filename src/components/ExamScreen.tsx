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
  ChevronLeft
} from 'lucide-react';

interface ExamScreenProps {
  student: Peserta;
  soal: SoalUjian;
  settings: PengaturanApp;
  onFinishExam: () => void;
  onViolation: (reason: string) => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({
  student,
  soal,
  settings,
  onFinishExam,
  onViolation,
}) => {
  const totalSeconds = Math.max(60, soal.waktuMenit * 60);
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState(false);
  const [activeTab, setActiveTab] = useState<'iframe' | 'simulator'>('iframe');
  
  // Interactive CBT simulator state (for built-in questions)
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [answers, setAnswers] = useState<{ [questionId: number]: string }>({});
  const [flagged, setFlagged] = useState<{ [questionId: number]: boolean }>({});

  const isExamActiveRef = useRef(true);

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
      if (!isFull && settings.fullScreenEnforced && isExamActiveRef.current) {
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

      // Disallowed shortcuts: Alt+Tab, F12, Ctrl+C, Ctrl+V, Ctrl+U, Ctrl+Shift+I, Esc
      if (
        e.key === 'Tab' ||
        e.altKey ||
        e.metaKey ||
        (e.ctrlKey && ['c', 'v', 'u', 'p', 's', 'a'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'C' || e.key === 'c'))
      ) {
        e.preventDefault();
        handleTriggerViolation('Kombinasi tombol keyboard terlarang terdeteksi (' + e.key + ')!');
      }
    };

    const handleBlur = () => {
      if (settings.enableAntiCheat && isExamActiveRef.current) {
        handleTriggerViolation('Anda meninggalkan jendela ujian atau berpindah ke aplikasi lain!');
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && settings.enableAntiCheat && isExamActiveRef.current) {
        handleTriggerViolation('Anda berpindah tab / membuka layar lain saat ujian!');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [settings]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          isExamActiveRef.current = false;
          exitFullScreen();
          onFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleFinishConfirmed = () => {
    isExamActiveRef.current = false;
    exitFullScreen();
    setShowConfirmFinish(false);

    try {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (_) {}

    onFinishExam();
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
      <header className="bg-slate-800/95 border-b border-slate-700/80 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-md z-30">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="font-bold text-sm sm:text-base text-white truncate max-w-[200px] sm:max-w-md">
              {soal.mataPelajaran}
            </h1>
          </div>
          <span className="hidden md:inline-block text-xs bg-slate-700 text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-600">
            {student.nama} ({student.kelas})
          </span>
          <div className="hidden lg:flex items-center gap-1 text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/40">
            <Shield className="w-3.5 h-3.5" />
            <span>Anti-Cheat Aktif</span>
          </div>
        </div>

        {/* Center/Right Timer & Action */}
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
              Link Soal (Web)
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
        </div>
      </header>

      {/* Progress Bar under header */}
      <div className="w-full bg-slate-700 h-1.5 shrink-0 overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${
            remainingSeconds < 300
              ? 'bg-rose-500'
              : remainingSeconds < 900
              ? 'bg-amber-500'
              : 'bg-emerald-500'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Main Exam Area */}
      <main className="flex-1 w-full bg-slate-950 relative overflow-hidden flex flex-col">
        {activeTab === 'iframe' ? (
          <div className="flex-1 w-full h-full flex flex-col bg-white text-slate-900 relative">
            {/* Top helper banner for embedded link */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-1.5 text-xs text-slate-600 flex items-center justify-between">
              <span className="truncate">
                URL Soal: <strong className="font-mono text-blue-700">{soal.link}</strong>
              </span>
              <button
                onClick={() => setActiveTab('simulator')}
                className="text-blue-600 hover:text-blue-800 font-semibold underline shrink-0 ml-2"
              >
                Gunakan Lembar CBT Interaktif jika link tidak termuat
              </button>
            </div>

            <div className="flex-1 w-full h-full relative">
              <iframe
                id="soalIframe"
                src={soal.link}
                title="Soal Ujian Online"
                className="w-full h-full border-0 absolute inset-0 bg-white"
                allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
              />
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
                <HelpCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Akhiri Sesi Ujian?</h3>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Apakah Anda yakin ingin menyelesaikan ujian <strong>{soal.mataPelajaran}</strong>?
                Pastikan Anda telah memeriksa semua jawaban sebelum mengakhiri.
              </p>

              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 text-left mb-6 space-y-1">
                <div>• Nama Siswa: <strong>{student.nama}</strong></div>
                <div>• Sisa Waktu: <strong>{formatTime(remainingSeconds)}</strong></div>
                <div>• Status Ujian: Akan diselesaikan dan dikirim ke sistem proktor.</div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmFinish(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition"
                >
                  Kembali Mengerjakan
                </button>
                <button
                  type="button"
                  onClick={handleFinishConfirmed}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl text-sm shadow-md transition"
                >
                  Ya, Selesai Ujian
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
