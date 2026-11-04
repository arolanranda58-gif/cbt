import { Peserta, SoalUjian, PengaturanApp } from '../types';

export interface SpreadsheetMetadata {
  id: string;
  url: string;
  title: string;
  lastSyncedAt?: string;
  readOnly?: boolean;
}

export const parseSpreadsheetId = (input: string): string => {
  const clean = input.trim();
  // Matches https://docs.google.com/spreadsheets/d/{ID}/... or /u/0/d/{ID}
  const match = clean.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // If user pasted bare ID
  return clean.replace(/^[\w.-]*=/, '').replace(/[/?#].*$/, '');
};

/**
 * Ensures that required sheet tab titles exist in the Google Spreadsheet.
 * If any tab is missing, creates it via batchUpdate addSheet.
 */
export const ensureSheetTabsExist = async (
  accessToken: string,
  spreadsheetId: string,
  requiredTabs: string[]
): Promise<string[]> => {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!metaRes.ok) {
      return [];
    }

    const meta = await metaRes.json();
    const existingTitles: string[] = (meta.sheets || []).map(
      (s: any) => s.properties?.title as string
    );

    const missingTabs = requiredTabs.filter((tab) => !existingTitles.includes(tab));

    if (missingTabs.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: missingTabs.map((title) => ({
              addSheet: {
                properties: { title },
              },
            })),
          }),
        }
      );
      return [...existingTitles, ...missingTabs];
    }

    return existingTitles;
  } catch (err) {
    console.warn('Could not verify sheet tabs existence:', err);
    return [];
  }
};

/**
 * Create a new Google Spreadsheet to serve as the CBT database
 */
export const createSpreadsheetDatabase = async (
  accessToken: string,
  schoolName: string,
  pesertaList: Peserta[],
  soalList: SoalUjian[],
  settings: PengaturanApp
): Promise<SpreadsheetMetadata> => {
  const title = `Database CBT Ujian Online - ${schoolName || 'Sekolah'}`;

  // 1. Create spreadsheet structure with 4 worksheets
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
    ['adminUsername', settings.adminUsername || 'admin'],
    ['adminPassword', settings.adminPassword || 'admin123'],
    ['title', settings.title],
    ['subtitle', settings.subtitle],
    ['schoolName', settings.schoolName],
    ['logoUrl', settings.logoUrl],
    ['enableAntiCheat', String(settings.enableAntiCheat)],
    ['blockShortcuts', String(settings.blockShortcuts)],
    ['blockRightClick', String(settings.blockRightClick)],
    ['fullScreenEnforced', String(settings.fullScreenEnforced)],
    ['blockNotifications', String(settings.blockNotifications ?? true)],
  ];

  const logValues = [
    ['Waktu (Timestamp)', 'NISN', 'Nama Peserta', 'Mata Pelajaran', 'Aktivitas / Status', 'Keterangan'],
  ];

  // 3. Batch update initial values safely
  try {
    const batchRes = await fetch(
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
    if (!batchRes.ok) {
      const errText = await batchRes.text().catch(() => '');
      console.warn('Initial values batchUpdate non-fatal warning:', errText);
    }
  } catch (batchErr) {
    console.warn('Initial values batchUpdate non-fatal warning:', batchErr);
  }

  // 4. Share spreadsheet with link (Anyone with link can view) so background sync always works without login
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (permErr) {
    console.warn('Could not set public permission on spreadsheet:', permErr);
  }

  return {
    id: spreadsheetId,
    url: spreadsheetUrl,
    title,
    lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
    readOnly: false,
  };
};

/**
 * Parse Google Visualization API JSON response
 */
const parseGvizResponse = (rawText: string): string[][] => {
  const jsonMatch = rawText.match(/google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
  if (!jsonMatch || !jsonMatch[1]) {
    throw new Error('Format data Google Visualization tidak valid');
  }

  const parsed = JSON.parse(jsonMatch[1]);
  if (parsed.status === 'error') {
    throw new Error(parsed.errors?.[0]?.message || 'Gagal membaca sheet melalui Google Visualization');
  }

  const table = parsed.table;
  if (!table || !table.rows) return [];

  const rows: string[][] = [];

  // If table.cols has explicit labels (headers), prepend as row 0
  if (table.cols && table.cols.some((c: any) => c && c.label && c.label.trim() !== '')) {
    rows.push(table.cols.map((c: any) => String(c?.label || '').trim()));
  }

  for (const r of table.rows) {
    if (!r || !r.c) continue;
    const rowValues = r.c.map((cell: any) => {
      if (cell === null || cell === undefined) return '';
      return cell.f !== undefined && cell.f !== null
        ? String(cell.f)
        : cell.v !== undefined && cell.v !== null
        ? String(cell.v)
        : '';
    });
    rows.push(rowValues);
  }

  return rows;
};

/**
 * Intelligent & dynamic parser for Peserta rows.
 * Automatically discovers column headers (NISN, Nama, Kelas, Status, etc.)
 * even if columns are arranged in any order or custom header labels are used.
 */
export const parsePesertaFromRows = (allRows: string[][]): Peserta[] => {
  if (!allRows || allRows.length === 0) return [];

  let headerRowIndex = -1;
  const colIndex = {
    nomor: -1,
    nisn: -1,
    nama: -1,
    tingkat: -1,
    kelas: -1,
    status: -1,
    catatan: -1,
  };

  // Inspect the first 5 rows to locate the header row
  for (let r = 0; r < Math.min(allRows.length, 5); r++) {
    const row = allRows[r];
    if (!row) continue;
    const lowerRow = row.map((cell) => String(cell || '').trim().toLowerCase());

    const hasNisn = lowerRow.some((c) => /nisn|no\.?\s*peserta|nomor\s*peserta|username|id\s*(?:siswa|peserta)|kode\s*peserta|no\s*ujian/i.test(c));
    const hasNama = lowerRow.some((c) => /nama/i.test(c) && !c.includes('sekolah'));

    if (hasNisn || hasNama) {
      headerRowIndex = r;
      lowerRow.forEach((c, idx) => {
        if (/^(no|nomor|no\.)$/i.test(c)) colIndex.nomor = idx;
        else if (/nisn|nis\b|no\.?\s*peserta|nomor\s*peserta|username|id\s*(?:siswa|peserta)|kode\s*peserta|no\s*ujian|nomor\s*ujian/i.test(c)) colIndex.nisn = idx;
        else if (/nama/i.test(c) && !c.includes('sekolah')) colIndex.nama = idx;
        else if (/tingkat|tingkatan|grade|jenjang/i.test(c)) colIndex.tingkat = idx;
        else if (/kelas|ruang|ruangan|rombel|romongan/i.test(c)) {
          if (colIndex.kelas === -1) colIndex.kelas = idx;
        }
        else if (/status|keaktifan|kondisi/i.test(c)) colIndex.status = idx;
        else if (/catatan|pelanggaran|keterangan/i.test(c)) colIndex.catatan = idx;
      });
      break;
    }
  }

  // Fallback defaults if no explicit header row was identified
  if (headerRowIndex === -1) {
    const firstRow = allRows[0] || [];
    if (/^\d{4,}$/.test(String(firstRow[0] || '').trim())) {
      colIndex.nomor = -1;
      colIndex.nisn = 0;
      colIndex.nama = 1;
      colIndex.tingkat = 2;
      colIndex.kelas = 3;
      colIndex.status = 4;
    } else {
      colIndex.nomor = 0;
      colIndex.nisn = 1;
      colIndex.nama = 2;
      colIndex.tingkat = 3;
      colIndex.kelas = 4;
      colIndex.status = 5;
      colIndex.catatan = 6;
    }
  } else {
    // Fill in sensible fallbacks for missing columns without clobbering assigned columns
    if (colIndex.nisn === -1) {
      if (colIndex.nomor !== -1 && colIndex.nama !== 1) colIndex.nisn = 1;
      else if (colIndex.nomor === -1 && colIndex.nama !== 0) colIndex.nisn = 0;
    }
    if (colIndex.nama === -1) {
      if (colIndex.nisn === 0) colIndex.nama = 1;
      else if (colIndex.nomor === 0) colIndex.nama = colIndex.nisn === 1 ? 2 : 1;
      else colIndex.nama = 0;
    }
    if (colIndex.kelas === -1) {
      colIndex.kelas = colIndex.tingkat !== -1 ? colIndex.tingkat : 4;
    }
  }

  const dataRows = allRows.slice(headerRowIndex + 1);
  const result: Peserta[] = [];

  dataRows.forEach((row, idx) => {
    if (!row || row.length === 0) return;
    const rawNomor = colIndex.nomor >= 0 && row[colIndex.nomor] ? String(row[colIndex.nomor]).trim() : String(idx + 1);
    let rawNisn = colIndex.nisn >= 0 ? String(row[colIndex.nisn] || '').trim() : '';
    const rawNama = colIndex.nama >= 0 ? String(row[colIndex.nama] || '').trim() : '';
    if (!rawNisn && !rawNama) return;

    // Skip accidental repeated header rows
    if (/^(nisn|nama|nomor|no)$/i.test(rawNisn) && /^(nama|nisn|kelas)$/i.test(rawNama)) return;

    // If NISN was not explicit in this row, fallback to rawNomor or NISN-{idx+1}
    if (!rawNisn) {
      rawNisn = rawNomor || `NISN-${idx + 1}`;
    }
    const rawKelas = colIndex.kelas >= 0 && row[colIndex.kelas] ? String(row[colIndex.kelas]).trim() : 'Ruang 01';
    let rawTingkat = colIndex.tingkat >= 0 && row[colIndex.tingkat] ? String(row[colIndex.tingkat]).trim() : '';
    
    // Auto-detect tingkat from kelas if tingkat column is missing (supports SD 1-6, SMP 7-9, SMA 10-12)
    if (!rawTingkat && rawKelas) {
      const matchGrade = rawKelas.match(/(?:kelas\s*)?(\b(?:1[0-2]|[1-9]|X|XI|XII)\b)/i);
      if (matchGrade) {
        rawTingkat = matchGrade[1].toUpperCase();
      }
    }
    if (!rawTingkat) rawTingkat = '10';

    const rawStatus = colIndex.status >= 0 && row[colIndex.status] ? String(row[colIndex.status]).trim() : 'Aktif';
    const rawCatatan = colIndex.catatan >= 0 && row[colIndex.catatan] ? String(row[colIndex.catatan]).trim() : '';

    // Robust case-insensitive status evaluation
    const isInactive = /^(tidak\s*aktif|non\s*aktif|nonaktif|inactive|off|false|blokir|terkunci|0)$/i.test(rawStatus);

    result.push({
      id: `p-sheet-${idx + 1}-${rawNisn || idx}`,
      nomor: rawNomor,
      nisn: rawNisn || `NISN-${idx + 1}`,
      nama: rawNama || `Peserta ${idx + 1}`,
      tingkat: rawTingkat,
      kelas: rawKelas,
      status: isInactive ? 'Tidak Aktif' : 'Aktif',
      pelanggaranCount: 0,
      catatanPelanggaran: rawCatatan
        ? rawCatatan
            .split(';')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    });
  });

  return result;
};

/**
 * Intelligent & dynamic parser for Soal Ujian rows.
 */
export const parseSoalFromRows = (allRows: string[][]): SoalUjian[] => {
  if (!allRows || allRows.length === 0) return [];

  let headerRowIndex = -1;
  const colIndex = {
    nomor: -1,
    tingkat: -1,
    mataPelajaran: -1,
    link: -1,
    token: -1,
    waktuMenit: -1,
  };

  for (let r = 0; r < Math.min(allRows.length, 5); r++) {
    const row = allRows[r];
    if (!row) continue;
    const lowerRow = row.map((cell) => String(cell || '').trim().toLowerCase());

    const hasMapel = lowerRow.some((c) => /mata\s*pelajaran|mapel|subject|judul|nama\s*ujian/i.test(c));
    const hasLink = lowerRow.some((c) => /link\s*soal|link|url|tautan|form/i.test(c));

    if (hasMapel || hasLink) {
      headerRowIndex = r;
      lowerRow.forEach((c, idx) => {
        if (/^(no|nomor|no\.)$/i.test(c)) colIndex.nomor = idx;
        else if (/tingkat|kelas|grade/i.test(c)) colIndex.tingkat = idx;
        else if (/mata\s*pelajaran|mapel|subject|judul|nama\s*ujian/i.test(c)) colIndex.mataPelajaran = idx;
        else if (/link|url|tautan|form|soal/i.test(c)) colIndex.link = idx;
        else if (/token|kode|passcode/i.test(c)) colIndex.token = idx;
        else if (/waktu|durasi|menit|time/i.test(c)) colIndex.waktuMenit = idx;
      });
      break;
    }
  }

  if (headerRowIndex === -1) {
    colIndex.nomor = 0;
    colIndex.tingkat = 1;
    colIndex.mataPelajaran = 2;
    colIndex.link = 3;
    colIndex.token = 4;
    colIndex.waktuMenit = 5;
  } else {
    if (colIndex.mataPelajaran === -1) colIndex.mataPelajaran = 2;
    if (colIndex.link === -1) colIndex.link = 3;
    if (colIndex.token === -1) colIndex.token = 4;
    if (colIndex.waktuMenit === -1) colIndex.waktuMenit = 5;
    if (colIndex.tingkat === -1) colIndex.tingkat = 1;
    if (colIndex.nomor === -1) colIndex.nomor = 0;
  }

  const dataRows = allRows.slice(headerRowIndex + 1);
  const result: SoalUjian[] = [];

  dataRows.forEach((row, idx) => {
    if (!row || row.length === 0) return;
    const mapel = colIndex.mataPelajaran >= 0 ? String(row[colIndex.mataPelajaran] || '').trim() : '';
    const link = colIndex.link >= 0 ? String(row[colIndex.link] || '').trim() : '';
    if (!mapel && !link) return;

    // Discard header repeat or participant row falsely interpreted as soal
    if (/^(mata\s*pelajaran|link\s*soal|mapel|nomor|nisn)$/i.test(mapel)) return;

    const rawNomor = colIndex.nomor >= 0 && row[colIndex.nomor] ? String(row[colIndex.nomor]).trim() : String(idx + 1);
    const rawTingkat = colIndex.tingkat >= 0 && row[colIndex.tingkat] ? String(row[colIndex.tingkat]).trim() : '10';
    const rawToken = colIndex.token >= 0 && row[colIndex.token] ? String(row[colIndex.token]).trim().toUpperCase() : 'UJIAN25';
    const rawWaktu = colIndex.waktuMenit >= 0 ? Number(row[colIndex.waktuMenit]) || 60 : 60;

    result.push({
      id: `s-sheet-${idx + 1}`,
      nomor: rawNomor,
      tingkat: rawTingkat || '10',
      mataPelajaran: mapel || `Mata Pelajaran ${idx + 1}`,
      link: link || '',
      token: rawToken || 'UJIAN25',
      waktuMenit: rawWaktu || 60,
    });
  });

  return result;
};

/**
 * Intelligent parser for Settings rows.
 * Supports key-value rows (Column A = key, Column B = value).
 */
export const parseSettingsFromRows = (allRows: string[][]): Partial<PengaturanApp> => {
  if (!allRows || allRows.length === 0) return {};
  const parsedSettings: Partial<PengaturanApp> = {};

  const applyPair = (rawKey: string, rawVal: any) => {
    if (!rawKey || rawVal === undefined || rawVal === null) return;
    const val = String(rawVal).trim();
    const key = String(rawKey).toLowerCase().replace(/[-_\s]/g, '');

    if (key === 'title' || key === 'judul') parsedSettings.title = val;
    else if (key === 'subtitle' || key === 'subjudul') parsedSettings.subtitle = val;
    else if (key === 'schoolname' || key === 'namasekolah' || key === 'sekolah') parsedSettings.schoolName = val;
    else if (key === 'logourl' || key === 'logo') parsedSettings.logoUrl = val;
    else if (
      key === 'adminusername' ||
      key === 'usernameadmin' ||
      key === 'username' ||
      key === 'useradmin' ||
      key === 'user'
    ) {
      if (val) parsedSettings.adminUsername = val;
    } else if (
      key === 'adminpassword' ||
      key === 'passwordadmin' ||
      key === 'password' ||
      key === 'katasandi' ||
      key === 'passadmin' ||
      key === 'pass'
    ) {
      if (val) parsedSettings.adminPassword = val;
    } else if (key === 'enableanticheat' || key === 'anticheat') parsedSettings.enableAntiCheat = /true|aktif|1|ya/i.test(val);
    else if (key === 'blockshortcuts') parsedSettings.blockShortcuts = /true|aktif|1|ya/i.test(val);
    else if (key === 'blockrightclick') parsedSettings.blockRightClick = /true|aktif|1|ya/i.test(val);
    else if (key === 'fullscreenenforced') parsedSettings.fullScreenEnforced = /true|aktif|1|ya/i.test(val);
    else if (key === 'blocknotifications') parsedSettings.blockNotifications = /true|aktif|1|ya/i.test(val);
  };

  allRows.forEach((row) => {
    if (row && row.length >= 2) {
      applyPair(row[0], row[1]);
    }
  });

  return parsedSettings;
};

/**
 * Fetch spreadsheet data via Google Visualization API (public / shared sheets)
 * Works when spreadsheet is shared to "Anyone with the link can view".
 */
const fetchViaGviz = async (
  spreadsheetId: string
): Promise<{
  peserta: Peserta[];
  soal: SoalUjian[];
  settings?: Partial<PengaturanApp>;
  title?: string;
  source: 'gviz';
}> => {
  const fetchSheetRows = async (sheetName?: string): Promise<string[][]> => {
    const cacheBuster = `_t=${Date.now()}`;
    const tqParam = `tq=${encodeURIComponent('select *')}`;
    const url = sheetName
      ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&${tqParam}&sheet=${encodeURIComponent(sheetName)}&${cacheBuster}`
      : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&${tqParam}&${cacheBuster}`;

    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
        Pragma: 'no-cache',
      },
    });

    if (!res.ok) {
      throw new Error(`Gagal membaca sheet ${sheetName || 'default'} (HTTP ${res.status})`);
    }
    const text = await res.text();
    return parseGvizResponse(text);
  };

  // 1. Fetch Peserta sheet
  const pesertaCandidateNames = [
    'Data Peserta',
    'DATA PESERTA',
    'data peserta',
    'Peserta',
    'PESERTA',
    'Data Siswa',
    'DATA SISWA',
    'data siswa',
    'Siswa',
    'SISWA',
    'Daftar Peserta',
    'Daftar Siswa',
    'Peserta Ujian',
    'Sheet1',
    'Sheet 1',
    undefined,
  ];
  let parsedPeserta: Peserta[] = [];
  for (const name of pesertaCandidateNames) {
    try {
      const rows = await fetchSheetRows(name);
      const parsed = parsePesertaFromRows(rows);
      if (parsed.length > 0) {
        parsedPeserta = parsed;
        break;
      }
    } catch {}
  }

  // 2. Fetch Soal sheet (must validate that rows actually contain soal, not peserta)
  const soalCandidateNames = [
    'Data Soal',
    'DATA SOAL',
    'data soal',
    'Soal',
    'SOAL',
    'Bank Soal',
    'BANK SOAL',
    'Daftar Soal',
    'Soal Ujian',
    'Sheet2',
    'Sheet 2',
  ];
  let parsedSoal: SoalUjian[] = [];
  for (const name of soalCandidateNames) {
    try {
      const rows = await fetchSheetRows(name);
      const parsed = parseSoalFromRows(rows);
      // Validate that these rows are not accidentally the peserta rows
      const hasExamData = rows.some((r) =>
        r.some((c) => /https?:\/\/|forms\.gle|docs\.google\.com\/forms|ujian|mapel/i.test(String(c)))
      );
      if (parsed.length > 0 && hasExamData) {
        parsedSoal = parsed;
        break;
      }
    } catch {}
  }

  // 3. Fetch Pengaturan sheet
  const settingsCandidateNames = [
    'Pengaturan',
    'PENGATURAN',
    'pengaturan',
    'Setting',
    'Settings',
    'SETTING',
    'Config',
    'Sheet3',
    'Sheet 3',
  ];
  let parsedSettings: Partial<PengaturanApp> = {};
  for (const name of settingsCandidateNames) {
    try {
      const rows = await fetchSheetRows(name);
      const parsed = parseSettingsFromRows(rows);
      if (Object.keys(parsed).length > 0) {
        parsedSettings = parsed;
        break;
      }
    } catch {}
  }

  return {
    peserta: parsedPeserta,
    soal: parsedSoal,
    settings: parsedSettings,
    title: 'Google Spreadsheet (Tautan Berbagi)',
    source: 'gviz',
  };
};

/**
 * Fetch data from existing Google Spreadsheet.
 * Prefers Google Sheets API v4 (if accessToken available),
 * and automatically falls back to Google Visualization if unauthenticated or token expires.
 */
export const fetchSpreadsheetData = async (
  accessToken: string | null,
  rawSpreadsheetId: string
): Promise<{
  peserta: Peserta[];
  soal: SoalUjian[];
  settings?: Partial<PengaturanApp>;
  title?: string;
  source: 'oauth' | 'gviz';
}> => {
  const spreadsheetId = parseSpreadsheetId(rawSpreadsheetId);
  if (!spreadsheetId) {
    throw new Error('ID atau URL Google Spreadsheet tidak valid.');
  }

  // 1. If we have an OAuth token, try Google Sheets API v4
  if (accessToken) {
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title&_cb=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
          cache: 'no-store',
        }
      );

      if (metaRes.ok) {
        const meta = await metaRes.json();
        const sheetNames: string[] = (meta.sheets || []).map((s: any) => s.properties?.title as string);

        if (sheetNames.length > 0) {
          const safeEscape = (name: string) => name.replace(/'/g, "''");

          // Identify sheet tabs intelligently
          const pesertaSheet =
            sheetNames.find((s) => /peserta|siswa|student/i.test(s)) || sheetNames[0];
          const soalSheet =
            sheetNames.find((s) => /soal|mapel|bank|ujian|exam/i.test(s)) ||
            (sheetNames.length > 1 && sheetNames[1] !== pesertaSheet ? sheetNames[1] : undefined);
          const pengaturanSheet =
            sheetNames.find((s) => /pengaturan|setting|config|admin/i.test(s)) ||
            (sheetNames.length > 2 && sheetNames[2] !== pesertaSheet && sheetNames[2] !== soalSheet
              ? sheetNames[2]
              : undefined);

          const rangesToFetch: { sheetName: string; range: string; type: 'peserta' | 'soal' | 'pengaturan' }[] = [
            { sheetName: pesertaSheet, range: `'${safeEscape(pesertaSheet)}'!A1:Z1000`, type: 'peserta' },
          ];
          if (soalSheet) {
            rangesToFetch.push({ sheetName: soalSheet, range: `'${safeEscape(soalSheet)}'!A1:Z500`, type: 'soal' });
          }
          if (pengaturanSheet) {
            rangesToFetch.push({
              sheetName: pengaturanSheet,
              range: `'${safeEscape(pengaturanSheet)}'!A1:Z100`,
              type: 'pengaturan',
            });
          }

          let valueRanges: any[] = [];
          const batchRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesToFetch
              .map((r) => `ranges=${encodeURIComponent(r.range)}`)
              .join('&')}&_cb=${Date.now()}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
              },
              cache: 'no-store',
            }
          );

          if (batchRes.ok) {
            const batchData = await batchRes.json();
            valueRanges = batchData.valueRanges || [];
          } else {
            // Fallback: fetch ranges individually
            for (const r of rangesToFetch) {
              try {
                const singleRes = await fetch(
                  `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(r.range)}`,
                  { headers: { Authorization: `Bearer ${accessToken}` } }
                );
                if (singleRes.ok) {
                  const singleData = await singleRes.json();
                  valueRanges.push(singleData);
                }
              } catch {}
            }
          }

          if (valueRanges.length > 0) {
            let parsedPeserta: Peserta[] = [];
            let parsedSoal: SoalUjian[] = [];
            let parsedSettings: Partial<PengaturanApp> = {};

            valueRanges.forEach((vr: any, idx: number) => {
              const allRows: string[][] = vr.values || [];
              if (allRows.length === 0) return;

              const rangeTarget = rangesToFetch[idx] || rangesToFetch.find((r) => (vr.range || '').includes(r.sheetName));
              const type = rangeTarget?.type || (idx === 0 ? 'peserta' : idx === 1 ? 'soal' : 'pengaturan');

              if (type === 'peserta') {
                const peserta = parsePesertaFromRows(allRows);
                if (peserta.length > 0) parsedPeserta = peserta;
              } else if (type === 'soal') {
                const soal = parseSoalFromRows(allRows);
                if (soal.length > 0) parsedSoal = soal;
              } else if (type === 'pengaturan') {
                const settings = parseSettingsFromRows(allRows);
                if (Object.keys(settings).length > 0) parsedSettings = settings;
              }
            });

            return {
              peserta: parsedPeserta,
              soal: parsedSoal,
              settings: parsedSettings,
              title: meta.properties?.title || 'Google Spreadsheet CBT',
              source: 'oauth',
            };
          }
        }
      }
    } catch (e: any) {
      console.warn('Google Sheets API v4 fetch encountered issue, attempting GViz fallback:', e);
    }
  }

  // 2. Fallback: Google Visualization API (requires spreadsheet link sharing enabled)
  try {
    return await fetchViaGviz(spreadsheetId);
  } catch (gvizErr: any) {
    if (accessToken) {
      throw new Error(
        'Gagal membaca Google Spreadsheet. Pastikan ID spreadsheet benar dan akun Google Anda memiliki akses ke file tersebut.'
      );
    }
    throw new Error(
      'Gagal membaca Google Spreadsheet. Spreadsheet ini bersifat pribadi di Google Drive. Silakan klik "Sign in with Google" untuk memberikan izin membaca, atau ubah izin berbagi spreadsheet menjadi "Siapa saja yang memiliki link dapat melihat".'
    );
  }
};

/**
 * Sync all app data to the connected spreadsheet
 */
export const syncAllDataToSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string,
  pesertaList: Peserta[],
  soalList: SoalUjian[],
  settings: PengaturanApp
): Promise<void> => {
  // 1. Ensure required tabs exist
  await ensureSheetTabsExist(accessToken, spreadsheetId, [
    'Data Peserta',
    'Data Soal',
    'Pengaturan',
    'Log Ujian & Pelanggaran',
  ]);

  // 2. Prepare values
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
    ['adminUsername', settings.adminUsername || 'admin'],
    ['adminPassword', settings.adminPassword || 'admin123'],
    ['title', settings.title],
    ['subtitle', settings.subtitle],
    ['schoolName', settings.schoolName],
    ['logoUrl', settings.logoUrl],
    ['enableAntiCheat', String(settings.enableAntiCheat)],
    ['blockShortcuts', String(settings.blockShortcuts)],
    ['blockRightClick', String(settings.blockRightClick)],
    ['fullScreenEnforced', String(settings.fullScreenEnforced)],
    ['blockNotifications', String(settings.blockNotifications ?? true)],
  ];

  // 3. Clear existing ranges
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

  // 4. Write updated data
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

  // 5. Ensure anyone with link can view so background sync works without requiring active Google login
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (_) {}
};

/**
 * Make a Google Spreadsheet readable by anyone with the link
 */
export const makeSpreadsheetShareable = async (
  accessToken: string,
  spreadsheetId: string
): Promise<boolean> => {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Log single exam event/violation directly to Google Spreadsheet
 */
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
    // Append to 'Log Ujian & Pelanggaran'
    const res = await fetch(
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

    // If tab doesn't exist, create it and retry once
    if (!res.ok) {
      await ensureSheetTabsExist(accessToken, spreadsheetId, ['Log Ujian & Pelanggaran']);
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Log Ujian & Pelanggaran'!A:F:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [
              ['Waktu (Timestamp)', 'NISN', 'Nama Peserta', 'Mata Pelajaran', 'Aktivitas / Status', 'Keterangan'],
              row,
            ],
          }),
        }
      );
    }
  } catch (err) {
    console.warn('Failed to append log to spreadsheet', err);
  }
};
