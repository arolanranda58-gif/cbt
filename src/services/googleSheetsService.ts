import { Peserta, SoalUjian, PengaturanApp } from '../types';

export interface SpreadsheetMetadata {
  id: string;
  url: string;
  title: string;
  lastSyncedAt?: string;
}

export const parseSpreadsheetId = (input: string): string => {
  const clean = input.trim();
  // Matches https://docs.google.com/spreadsheets/d/{ID}/...
  const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return clean;
};

// Create a new Google Spreadsheet to serve as the CBT database
export const createSpreadsheetDatabase = async (
  accessToken: string,
  schoolName: string,
  pesertaList: Peserta[],
  soalList: SoalUjian[],
  settings: PengaturanApp
): Promise<SpreadsheetMetadata> => {
  const title = `Database CBT Ujian Online - ${schoolName || 'Sekolah'}`;

  // 1. Create spreadsheet structure
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        { properties: { title: 'Data Peserta' } },
        { properties: { title: 'Data Soal' } },
        { properties: { title: 'Pengaturan' } },
        { properties: { title: 'Log Ujian & Pelanggaran' } },
      ],
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(
      errData.error?.message || `Gagal membuat Google Spreadsheet (Status ${createRes.status})`
    );
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Prepare values for each sheet
  const pesertaValues = [
    ['Nomor', 'NISN', 'Nama Peserta', 'Tingkat', 'Ruangan/Kelas', 'Status', 'Catatan Pelanggaran'],
    ...pesertaList.map((p) => [
      p.nomor,
      p.nisn,
      p.nama,
      p.tingkat,
      p.kelas,
      p.status,
      (p.catatanPelanggaran || []).join('; '),
    ]),
  ];

  const soalValues = [
    ['Nomor', 'Tingkat', 'Mata Pelajaran', 'Link Soal', 'Token', 'Waktu (Menit)'],
    ...soalList.map((s) => [
      s.nomor,
      s.tingkat,
      s.mataPelajaran,
      s.link,
      s.token,
      s.waktuMenit,
    ]),
  ];

  const pengaturanValues = [
    ['Kunci Pengaturan', 'Nilai'],
    ['title', settings.title],
    ['subtitle', settings.subtitle],
    ['schoolName', settings.schoolName],
    ['logoUrl', settings.logoUrl],
    ['enableAntiCheat', String(settings.enableAntiCheat)],
    ['blockShortcuts', String(settings.blockShortcuts)],
    ['blockRightClick', String(settings.blockRightClick)],
    ['fullScreenEnforced', String(settings.fullScreenEnforced)],
  ];

  const logValues = [
    ['Waktu (Timestamp)', 'NISN', 'Nama Peserta', 'Mata Pelajaran', 'Aktivitas / Status', 'Keterangan'],
  ];

  // 3. Batch update values
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: "'Data Peserta'!A1", values: pesertaValues },
          { range: "'Data Soal'!A1", values: soalValues },
          { range: "'Pengaturan'!A1", values: pengaturanValues },
          { range: "'Log Ujian & Pelanggaran'!A1", values: logValues },
        ],
      }),
    }
  );

  return {
    id: spreadsheetId,
    url: spreadsheetUrl,
    title,
    lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
  };
};

// Fetch data from existing Google Spreadsheet
export const fetchSpreadsheetData = async (
  accessToken: string,
  spreadsheetId: string
): Promise<{
  peserta: Peserta[];
  soal: SoalUjian[];
  settings?: Partial<PengaturanApp>;
  title?: string;
}> => {
  // First, get metadata to check title and sheet names
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!metaRes.ok) {
    const errData = await metaRes.json().catch(() => ({}));
    throw new Error(
      errData.error?.message ||
        `Gagal membaca metadata spreadsheet (Periksa ID Spreadsheet dan izin akses)`
    );
  }

  const meta = await metaRes.json();
  const sheetNames = (meta.sheets || []).map((s: any) => s.properties?.title as string);

  // Read ranges in batch
  const rangesToFetch: string[] = [];
  if (sheetNames.includes('Data Peserta')) rangesToFetch.push("'Data Peserta'!A2:G1000");
  else if (sheetNames[0]) rangesToFetch.push(`'${sheetNames[0]}'!A2:G1000`);

  if (sheetNames.includes('Data Soal')) rangesToFetch.push("'Data Soal'!A2:F500");
  if (sheetNames.includes('Pengaturan')) rangesToFetch.push("'Pengaturan'!A2:B50");

  const batchRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesToFetch
      .map((r) => `ranges=${encodeURIComponent(r)}`)
      .join('&')}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!batchRes.ok) {
    throw new Error('Gagal mengambil isi data tabel dari Google Spreadsheet.');
  }

  const batchData = await batchRes.json();
  const valueRanges = batchData.valueRanges || [];

  const parsedPeserta: Peserta[] = [];
  const parsedSoal: SoalUjian[] = [];
  const parsedSettings: Partial<PengaturanApp> = {};

  valueRanges.forEach((vr: any) => {
    const rangeName: string = vr.range || '';
    const rows: string[][] = vr.values || [];

    if (rangeName.includes('Data Peserta') || rangeName.includes(sheetNames[0])) {
      rows.forEach((row, idx) => {
        if (!row[1] || !row[2]) return; // NISN and Nama required
        parsedPeserta.push({
          id: `p-sheet-${idx + 1}-${row[1]}`,
          nomor: row[0] || String(idx + 1),
          nisn: String(row[1]).trim(),
          nama: String(row[2]).trim(),
          tingkat: String(row[3] || '10').trim(),
          kelas: String(row[4] || 'Ruang 01').trim(),
          status: String(row[5] || 'Aktif').trim() === 'Tidak Aktif' ? 'Tidak Aktif' : 'Aktif',
          catatanPelanggaran: row[6] ? String(row[6]).split(';').map((s) => s.trim()) : [],
        });
      });
    } else if (rangeName.includes('Data Soal')) {
      rows.forEach((row, idx) => {
        if (!row[2] || !row[3]) return; // Mapel and Link required
        parsedSoal.push({
          id: `s-sheet-${idx + 1}`,
          nomor: row[0] || String(idx + 1),
          tingkat: String(row[1] || '10').trim(),
          mataPelajaran: String(row[2]).trim(),
          link: String(row[3]).trim(),
          token: String(row[4] || 'UJIAN25').trim().toUpperCase(),
          waktuMenit: Number(row[5]) || 60,
        });
      });
    } else if (rangeName.includes('Pengaturan')) {
      rows.forEach((row) => {
        const key = row[0];
        const val = row[1];
        if (!key || val === undefined) return;
        if (key === 'title') parsedSettings.title = val;
        if (key === 'subtitle') parsedSettings.subtitle = val;
        if (key === 'schoolName') parsedSettings.schoolName = val;
        if (key === 'logoUrl') parsedSettings.logoUrl = val;
        if (key === 'enableAntiCheat') parsedSettings.enableAntiCheat = val === 'true';
        if (key === 'blockShortcuts') parsedSettings.blockShortcuts = val === 'true';
        if (key === 'blockRightClick') parsedSettings.blockRightClick = val === 'true';
        if (key === 'fullScreenEnforced') parsedSettings.fullScreenEnforced = val === 'true';
      });
    }
  });

  return {
    peserta: parsedPeserta,
    soal: parsedSoal,
    settings: parsedSettings,
    title: meta.properties?.title,
  };
};

// Sync all app data to the connected spreadsheet
export const syncAllDataToSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string,
  pesertaList: Peserta[],
  soalList: SoalUjian[],
  settings: PengaturanApp
): Promise<void> => {
  // Clear old values then write new
  const pesertaValues = [
    ['Nomor', 'NISN', 'Nama Peserta', 'Tingkat', 'Ruangan/Kelas', 'Status', 'Catatan Pelanggaran'],
    ...pesertaList.map((p) => [
      p.nomor,
      p.nisn,
      p.nama,
      p.tingkat,
      p.kelas,
      p.status,
      (p.catatanPelanggaran || []).join('; '),
    ]),
  ];

  const soalValues = [
    ['Nomor', 'Tingkat', 'Mata Pelajaran', 'Link Soal', 'Token', 'Waktu (Menit)'],
    ...soalList.map((s) => [
      s.nomor,
      s.tingkat,
      s.mataPelajaran,
      s.link,
      s.token,
      s.waktuMenit,
    ]),
  ];

  const pengaturanValues = [
    ['Kunci Pengaturan', 'Nilai'],
    ['title', settings.title],
    ['subtitle', settings.subtitle],
    ['schoolName', settings.schoolName],
    ['logoUrl', settings.logoUrl],
    ['enableAntiCheat', String(settings.enableAntiCheat)],
    ['blockShortcuts', String(settings.blockShortcuts)],
    ['blockRightClick', String(settings.blockRightClick)],
    ['fullScreenEnforced', String(settings.fullScreenEnforced)],
  ];

  // Clear existing ranges to avoid dangling rows
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: ["'Data Peserta'!A1:G1000", "'Data Soal'!A1:F500", "'Pengaturan'!A1:B50"],
      }),
    }
  );

  // Write updated data
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          { range: "'Data Peserta'!A1", values: pesertaValues },
          { range: "'Data Soal'!A1", values: soalValues },
          { range: "'Pengaturan'!A1", values: pengaturanValues },
        ],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Gagal menyinkronkan data ke Google Spreadsheet');
  }
};

// Log single exam event/violation directly to Google Spreadsheet
export const logEventToSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string,
  event: {
    nisn: string;
    nama: string;
    mataPelajaran: string;
    status: string;
    keterangan: string;
  }
): Promise<void> => {
  const timestamp = new Date().toLocaleString('id-ID');
  const row = [timestamp, event.nisn, event.nama, event.mataPelajaran, event.status, event.keterangan];

  try {
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Log Ujian & Pelanggaran'!A:F:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [row],
        }),
      }
    );
  } catch (err) {
    console.warn('Failed to append log to spreadsheet', err);
  }
};
