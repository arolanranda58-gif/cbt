import { Peserta, SoalUjian, PengaturanApp } from '../types';

export const DEFAULT_SETTINGS: PengaturanApp = {
  title: 'Ujian Online CBT',
  subtitle: 'Sistem Ujian Berbasis Komputer & Handphone Terintegrasi',
  schoolName: 'SMA / SMK Negeri Digital Indonesia',
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Logo_of_Ministry_of_Education_and_Culture_of_Republic_of_Indonesia.svg',
  adminUsername: 'admin',
  adminPassword: 'admin123',
  enableAntiCheat: true,
  maxViolationsAllowed: 0, // Langsung nonaktifkan status siswa seperti logika asli
  blockShortcuts: true,
  blockRightClick: true,
  fullScreenEnforced: true,
};

export const DEFAULT_PESERTA: Peserta[] = [
  {
    id: 'p-1',
    nomor: '001',
    nisn: '0081234567',
    nama: 'Ahmad Rizki Pratama',
    tingkat: '10',
    kelas: 'Ruang 01 (X-MIPA 1)',
    status: 'Aktif',
    pelanggaranCount: 0,
    catatanPelanggaran: []
  },
  {
    id: 'p-2',
    nomor: '002',
    nisn: '0081234568',
    nama: 'Siti Nur Aisyah',
    tingkat: '10',
    kelas: 'Ruang 01 (X-MIPA 1)',
    status: 'Aktif',
    pelanggaranCount: 0,
    catatanPelanggaran: []
  },
  {
    id: 'p-3',
    nomor: '003',
    nisn: '0081234569',
    nama: 'Budi Darmawan',
    tingkat: '10',
    kelas: 'Ruang 02 (X-IPS 1)',
    status: 'Aktif',
    pelanggaranCount: 0,
    catatanPelanggaran: []
  },
  {
    id: 'p-4',
    nomor: '004',
    nisn: '0072345670',
    nama: 'Dewi Lestari Putri',
    tingkat: '11',
    kelas: 'Ruang 03 (XI-MIPA 2)',
    status: 'Aktif',
    pelanggaranCount: 0,
    catatanPelanggaran: []
  },
  {
    id: 'p-5',
    nomor: '005',
    nisn: '0072345671',
    nama: 'Fajar Hidayat',
    tingkat: '11',
    kelas: 'Ruang 03 (XI-MIPA 2)',
    status: 'Aktif',
    pelanggaranCount: 0,
    catatanPelanggaran: []
  },
  {
    id: 'p-6',
    nomor: '006',
    nisn: '0072345672',
    nama: 'Gita Maharani',
    tingkat: '11',
    kelas: 'Ruang 04 (XI-IPS 1)',
    status: 'Tidak Aktif',
    pelanggaranCount: 1,
    catatanPelanggaran: ['Terdeteksi keluar dari aplikasi ujian (Alt+Tab / berpindah tab)']
  },
  {
    id: 'p-7',
    nomor: '007',
    nisn: '0063456780',
    nama: 'Muhammad Farhan',
    tingkat: '12',
    kelas: 'Ruang 05 (XII-MIPA 1)',
    status: 'Aktif',
    pelanggaranCount: 0,
    catatanPelanggaran: []
  },
  {
    id: 'p-8',
    nomor: '008',
    nisn: '0063456781',
    nama: 'Nabila Zahra Khairunnisa',
    tingkat: '12',
    kelas: 'Ruang 05 (XII-MIPA 1)',
    status: 'Aktif',
    pelanggaranCount: 0,
    catatanPelanggaran: []
  },
  {
    id: 'p-9',
    nomor: '009',
    nisn: '0063456782',
    nama: 'Rian Saputra',
    tingkat: '12',
    kelas: 'Ruang 06 (XII-IPS 2)',
    status: 'Aktif',
    pelanggaranCount: 0,
    catatanPelanggaran: []
  }
];

export const DEFAULT_SOAL: SoalUjian[] = [
  {
    id: 's-1',
    nomor: '1',
    tingkat: '10',
    mataPelajaran: 'Matematika Umum',
    link: 'https://forms.gle/sample-math-10',
    token: 'MTK10',
    waktuMenit: 60,
    keterangan: 'Penilaian Sumatif Tengah Semester Ganjil',
    totalSoal: 25
  },
  {
    id: 's-2',
    nomor: '2',
    tingkat: '10',
    mataPelajaran: 'Bahasa Indonesia',
    link: 'https://forms.gle/sample-indo-10',
    token: 'BINA10',
    waktuMenit: 90,
    keterangan: 'Penilaian Akhir Semester Ganjil',
    totalSoal: 30
  },
  {
    id: 's-3',
    nomor: '3',
    tingkat: '11',
    mataPelajaran: 'Fisika & Biologi (IPA)',
    link: 'https://forms.gle/sample-ipa-11',
    token: 'IPA11',
    waktuMenit: 90,
    keterangan: 'Ujian Penilaian Bersama Tingkat XI',
    totalSoal: 40
  },
  {
    id: 's-4',
    nomor: '4',
    tingkat: '11',
    mataPelajaran: 'Bahasa Inggris',
    link: 'https://forms.gle/sample-inggris-11',
    token: 'ENG11',
    waktuMenit: 60,
    keterangan: 'Midterm Assessment',
    totalSoal: 25
  },
  {
    id: 's-5',
    nomor: '5',
    tingkat: '12',
    mataPelajaran: 'Matematika Peminatan',
    link: 'https://forms.gle/sample-mtk-12',
    token: 'UJIAN2025',
    waktuMenit: 120,
    keterangan: 'Simulasi Ujian Sekolah Akhir Tingkat 12',
    totalSoal: 40
  },
  {
    id: 's-6',
    nomor: '6',
    tingkat: '12',
    mataPelajaran: 'Pendidikan Agama & Budi Pekerti',
    link: 'https://forms.gle/sample-agama-12',
    token: 'AGM12',
    waktuMenit: 60,
    keterangan: 'Ujian Sekolah Berstandar Nasional',
    totalSoal: 30
  }
];

// Interactive simulated questions for testing CBT when link is external or offline
export interface SimulatedQuestion {
  id: number;
  pertanyaan: string;
  pilihan: { [key: string]: string };
  kunci: string;
}

export const SAMPLE_CBT_QUESTIONS: SimulatedQuestion[] = [
  {
    id: 1,
    pertanyaan: 'Diketahui sebuah fungsi f(x) = 3x² - 5x + 2. Nilai f(3) adalah...',
    pilihan: {
      A: '14',
      B: '16',
      C: '18',
      D: '20',
      E: '24'
    },
    kunci: 'A'
  },
  {
    id: 2,
    pertanyaan: 'Kalimat berikut yang menggunakan tanda baca koma secara tepat menurut PUEBI adalah...',
    pilihan: {
      A: 'Saya membeli buku, pensil dan penggaris.',
      B: 'Karena hari hujan, kami tidak dapat berolahraga di lapangan terbuka.',
      C: 'Ibu mengatakan, bahwa kita harus rajin belajar.',
      D: 'Ia sangat pandai, tetapi malas.',
      E: 'Budi tidak masuk sekolah, karena sedang sakit demam.'
    },
    kunci: 'B'
  },
  {
    id: 3,
    pertanyaan: 'Organel sel yang berfungsi sebagai tempat respirasi seluler dan penghasil energi utama (ATP) adalah...',
    pilihan: {
      A: 'Ribosom',
      B: 'Badan Golgi',
      C: 'Mitokondria',
      D: 'Retikulum Endoplasma',
      E: 'Lisosom'
    },
    kunci: 'C'
  },
  {
    id: 4,
    pertanyaan: 'Sebuah mobil bergerak dengan kecepatan konstan 72 km/jam. Jarak yang ditempuh mobil tersebut dalam waktu 15 detik adalah...',
    pilihan: {
      A: '150 meter',
      B: '200 meter',
      C: '300 meter',
      D: '450 meter',
      E: '600 meter'
    },
    kunci: 'C'
  },
  {
    id: 5,
    pertanyaan: 'Nilai-nilai Pancasila yang terkandung dalam pembukaan UUD 1945 alinea ke-4 mencerminkan dasar falsafah...',
    pilihan: {
      A: 'Kebangsaan dan kedaulatan rakyat',
      B: 'Liberalisme berkeadilan sosial',
      C: 'Kekeluargaan tanpa kepemimpinan',
      D: 'Sentralisasi kekuasaan',
      E: 'Otonomi individualistis'
    },
    kunci: 'A'
  }
];
