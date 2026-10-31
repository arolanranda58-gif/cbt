import { Peserta, SoalUjian, PengaturanApp } from '../types';
import { DEFAULT_PESERTA, DEFAULT_SOAL, DEFAULT_SETTINGS } from '../data/defaultData';

const STORAGE_KEYS = {
  PESERTA: 'cbt_ujian_peserta_v1',
  SOAL: 'cbt_ujian_soal_v1',
  SETTINGS: 'cbt_ujian_settings_v1',
};

export const getStoredPeserta = (): Peserta[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PESERTA);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(DEFAULT_PESERTA));
      return DEFAULT_PESERTA;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load peserta from storage', err);
    return DEFAULT_PESERTA;
  }
};

export const saveStoredPeserta = (data: Peserta[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save peserta to storage', err);
  }
};

export const getStoredSoal = (): SoalUjian[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SOAL);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SOAL, JSON.stringify(DEFAULT_SOAL));
      return DEFAULT_SOAL;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load soal from storage', err);
    return DEFAULT_SOAL;
  }
};

export const saveStoredSoal = (data: SoalUjian[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SOAL, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save soal to storage', err);
  }
};

export const getStoredSettings = (): PengaturanApp => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (err) {
    console.error('Failed to load settings from storage', err);
    return DEFAULT_SETTINGS;
  }
};

export const saveStoredSettings = (data: PengaturanApp): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save settings to storage', err);
  }
};

export const resetAllToDefault = (): { peserta: Peserta[]; soal: SoalUjian[]; settings: PengaturanApp } => {
  localStorage.setItem(STORAGE_KEYS.PESERTA, JSON.stringify(DEFAULT_PESERTA));
  localStorage.setItem(STORAGE_KEYS.SOAL, JSON.stringify(DEFAULT_SOAL));
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
  return {
    peserta: DEFAULT_PESERTA,
    soal: DEFAULT_SOAL,
    settings: DEFAULT_SETTINGS,
  };
};

export const downloadCSV = (filename: string, rows: (string | number)[][]): void => {
  const processRow = (row: (string | number)[]) => {
    return row
      .map((val) => {
        let str = String(val ?? '');
        if (str.search(/("|,|\n)/g) >= 0) {
          str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      })
      .join(',');
  };

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + rows.map(processRow).join('\r\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
