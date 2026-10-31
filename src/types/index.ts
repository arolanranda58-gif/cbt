export interface Peserta {
  id: string;
  nomor: string;
  nisn: string;
  nama: string;
  tingkat: string;
  kelas: string; // e.g. "Ruang 01", "X MIPA 1"
  status: 'Aktif' | 'Tidak Aktif';
  pelanggaranCount?: number;
  catatanPelanggaran?: string[];
  waktuSelesai?: string;
}

export interface SoalUjian {
  id: string;
  nomor: string;
  tingkat: string;
  mataPelajaran: string;
  link: string;
  token: string;
  waktuMenit: number;
  keterangan?: string;
  totalSoal?: number;
}

export interface PengaturanApp {
  title: string;
  subtitle: string;
  schoolName: string;
  logoUrl: string;
  adminUsername: string;
  adminPassword: string;
  enableAntiCheat: boolean;
  maxViolationsAllowed: number; // 0 = langsung nonaktifkan pada pelanggaran pertama
  blockShortcuts: boolean;
  blockRightClick: boolean;
  fullScreenEnforced: boolean;
  // Google Spreadsheet as Database
  googleSpreadsheetId?: string;
  googleSpreadsheetUrl?: string;
  googleSpreadsheetTitle?: string;
  googleSpreadsheetLastSynced?: string;
  googleAccountEmail?: string;
}

export interface ExamSessionState {
  student: Peserta;
  soal: SoalUjian;
  remainingSeconds: number;
  totalSeconds: number;
  startTime: number;
  isStarted: boolean;
}
