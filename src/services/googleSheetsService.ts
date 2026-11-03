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
  for (const r of table.rows) {
    if (!r || !r.c) continue;
    const rowValues = r.c.map((cell: any) => {
      if (cell === null || cell === undefined) return '';
      return cell.f !== undefined && cell.f !== null ? String(cell.f) : cell.v !== undefined && cell.v !== null ? String(cell.v) : '';
    });
    rows.push(rowValues);
  }

  return rows;
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
  // Helper to fetch a sheet by name or default
  const fetchSheetRows = async (sheetName?: string): Promise<string[][]> => {
    const url = sheetName
      ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
      : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Gagal membaca sheet ${sheetName || 'default'} (HTTP ${res.status})`);
    }
    const text = await res.text();
    return parseGvizResponse(text);
  };

  // Try fetching "Data Peserta", or default sheet
  let pesertaRows: string[][] = [];
  try {
    pesertaRows = await fetchSheetRows('Data Peserta');
  } catch {
    pesertaRows = await fetchSheetRows(); // Fallback to default/first tab
  }

  // Try fetching "Data Soal"
  let soalRows: string[][] = [];
  try {
    soalRows = await fetchSheetRows('Data Soal');
  } catch {
    // If Data Soal not found as separate tab, ignore
  }

  // Try fetching "Pengaturan"
  let settingsRows: string[][] = [];
  try {
    settingsRows = await fetchSheetRows('Pengaturan');
  } catch {
    // Optional
  }

  const parsedPeserta: Peserta[] = [];
  const parsedSoal: SoalUjian[] = [];
  const parsedSettings: Partial<PengaturanApp> = {};

  // Parse Peserta
  pesertaRows.forEach((row, idx) => {
    // Check if header row
    const firstCell = String(row[0] || '').toLowerCase();
    const secondCell = String(row[1] || '').toLowerCase();
    if (firstCell === 'nomor' || secondCell === 'nisn' || secondCell === 'no') return;

    // We need at least NISN and Nama
    const nomor = row[0] || String(idx + 1);
    const nisn = String(row[1] || '').trim();
    const nama = String(row[2] || '').trim();

    if (!nisn && !nama) return;

    parsedPeserta.push({
      id: `p-sheet-${idx + 1}-${nisn || idx}`,
      nomor,
      nisn: nisn || `NISN-${idx + 1}`,
      nama: nama || `Peserta ${idx + 1}`,
      tingkat: String(row[3] || '10').trim(),
      kelas: String(row[4] || 'Ruang 01').trim(),
      status: String(row[5] || 'Aktif').trim() === 'Tidak Aktif' ? 'Tidak Aktif' : 'Aktif',
      catatanPelanggaran: row[6] ? String(row[6]).split(';').map((s) => s.trim()) : [],
    });
  });

  // Parse Soal
  soalRows.forEach((row, idx) => {
    const mapel = String(row[2] || '').trim();
    const link = String(row[3] || '').trim();
    if (!mapel && !link) return;
    if (mapel.toLowerCase() === 'mata pelajaran' || link.toLowerCase() === 'link soal') return;

    parsedSoal.push({
      id: `s-sheet-${idx + 1}`,
      nomor: row[0] || String(idx + 1),
      tingkat: String(row[1] || '10').trim(),
      mataPelajaran: mapel || `Mata Pelajaran ${idx + 1}`,
      link: link || '',
      token: String(row[4] || 'UJIAN25').trim().toUpperCase(),
      waktuMenit: Number(row[5]) || 60,
    });
  });

  // Parse Settings
  settingsRows.forEach((row) => {
    const key = String(row[0] || '').trim();
    const val = String(row[1] || '').trim();
    if (!key || val === undefined) return;
    if (key === 'title') parsedSettings.title = val;
    if (key === 'subtitle') parsedSettings.subtitle = val;
    if (key === 'schoolName') parsedSettings.schoolName = val;
    if (key === 'logoUrl') parsedSettings.logoUrl = val;
    if (key === 'enableAntiCheat') parsedSettings.enableAntiCheat = val === 'true';
    if (key === 'blockShortcuts') parsedSettings.blockShortcuts = val === 'true';
    if (key === 'blockRightClick') parsedSettings.blockRightClick = val === 'true';
    if (key === 'fullScreenEnforced') parsedSettings.fullScreenEnforced = val === 'true';
    if (key === 'blockNotifications') parsedSettings.blockNotifications = val === 'true';
  });

  return {
    peserta: parsedPeserta,
    soal: parsedSoal,
    settings: parsedSettings,
    title: 'Google Spreadsheet (Tautan Berbagi)',
    source: 'gviz',
  };
};

/**
 * Fetch data from existing Google Spreadsheet
 * Supports both Google Sheets API v4 (if accessToken available)
 * and Google Visualization fallback (if sheet is shared / public).
 */
export const fetchSpreadsheetData = async (
  accessToken: string | null,
  spreadsheetId: string
): Promise<{
  peserta: Peserta[];
  soal: SoalUjian[];
  settings?: Partial<PengaturanApp>;
  title?: string;
  source: 'oauth' | 'gviz';
}> => {
  // If we have an OAuth token, try the official Google Sheets API v4 first
  if (accessToken) {
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties.title`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (metaRes.ok) {
        const meta = await metaRes.json();
        const sheetNames: string[] = (meta.sheets || []).map((s: any) => s.properties?.title as string);

        // Find best match for sheet names
        const pesertaSheet =
          sheetNames.find((s) => /peserta|siswa/i.test(s)) || sheetNames[0] || 'Data Peserta';
        const soalSheet = sheetNames.find((s) => /soal|mapel|bank/i.test(s));
        const pengaturanSheet = sheetNames.find((s) => /pengaturan|setting/i.test(s));

        const rangesToFetch: string[] = [`'${pesertaSheet}'!A1:G1000`];
        if (soalSheet) rangesToFetch.push(`'${soalSheet}'!A1:F500`);
        if (pengaturanSheet) rangesToFetch.push(`'${pengaturanSheet}'!A1:B50`);

        const batchRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesToFetch
            .map((r) => `ranges=${encodeURIComponent(r)}`)
            .join('&')}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );

        if (batchRes.ok) {
          const batchData = await batchRes.json();
          const valueRanges = batchData.valueRanges || [];

          const parsedPeserta: Peserta[] = [];
          const parsedSoal: SoalUjian[] = [];
          const parsedSettings: Partial<PengaturanApp> = {};

          valueRanges.forEach((vr: any) => {
            const rangeName: string = vr.range || '';
            const allRows: string[][] = vr.values || [];
            if (allRows.length === 0) return;

            // Skip header if row 0 looks like header
            const rows =
              allRows[0] &&
              (String(allRows[0][0]).toLowerCase().includes('nomor') ||
                String(allRows[0][1]).toLowerCase().includes('nisn') ||
                String(allRows[0][2]).toLowerCase().includes('mata') ||
                String(allRows[0][0]).toLowerCase().includes('kunci'))
                ? allRows.slice(1)
                : allRows;

            if (rangeName.includes(pesertaSheet) || (!soalSheet && rangeName.includes(sheetNames[0]))) {
              rows.forEach((row, idx) => {
                if (!row[1] && !row[2]) return;
                parsedPeserta.push({
                  id: `p-sheet-${idx + 1}-${row[1] || idx}`,
                  nomor: row[0] || String(idx + 1),
                  nisn: String(row[1] || '').trim(),
                  nama: String(row[2] || '').trim(),
                  tingkat: String(row[3] || '10').trim(),
                  kelas: String(row[4] || 'Ruang 01').trim(),
                  status: String(row[5] || 'Aktif').trim() === 'Tidak Aktif' ? 'Tidak Aktif' : 'Aktif',
                  catatanPelanggaran: row[6] ? String(row[6]).split(';').map((s) => s.trim()) : [],
                });
              });
            } else if (soalSheet && rangeName.includes(soalSheet)) {
              rows.forEach((row, idx) => {
                if (!row[2] && !row[3]) return;
                parsedSoal.push({
                  id: `s-sheet-${idx + 1}`,
                  nomor: row[0] || String(idx + 1),
                  tingkat: String(row[1] || '10').trim(),
                  mataPelajaran: String(row[2] || '').trim(),
                  link: String(row[3] || '').trim(),
                  token: String(row[4] || 'UJIAN25').trim().toUpperCase(),
                  waktuMenit: Number(row[5]) || 60,
                });
              });
            } else if (pengaturanSheet && rangeName.includes(pengaturanSheet)) {
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
                if (key === 'blockNotifications') parsedSettings.blockNotifications = val === 'true';
              });
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
    } catch (e) {
      console.warn('Google Sheets API v4 fetch failed, falling back to public gviz reader:', e);
    }
  }

  // Fallback: Google Visualization API (requires spreadsheet link sharing enabled)
  try {
    return await fetchViaGviz(spreadsheetId);
  } catch (gvizErr: any) {
    throw new Error(
      'Gagal membaca Google Spreadsheet. Pastikan ID/link spreadsheet benar, dan jika tidak login dengan Google, pastikan Spreadsheet di-share ke "Siapa saja yang memiliki link dapat melihat" (Anyone with link can view).'
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
