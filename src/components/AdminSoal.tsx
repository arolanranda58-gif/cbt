import React, { useState } from 'react';
import { SoalUjian } from '../types';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Clock,
  KeyRound,
  Sparkles,
  AlertTriangle
} from 'lucide-react';

interface AdminSoalProps {
  soalList: SoalUjian[];
  onAddSoal: (soal: SoalUjian) => void;
  onUpdateSoal: (soal: SoalUjian) => void;
  onDeleteSoal: (id: string) => void;
}

export const AdminSoal: React.FC<AdminSoalProps> = ({
  soalList,
  onAddSoal,
  onUpdateSoal,
  onDeleteSoal,
}) => {
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSoal, setSelectedSoal] = useState<SoalUjian | null>(null);

  // Form State (matches modalTambahSoal)
  const [formNomor, setFormNomor] = useState('');
  const [formTingkat, setFormTingkat] = useState('10');
  const [formMata, setFormMata] = useState('');
  const [formLink, setFormLink] = useState('');
  const [formToken, setFormToken] = useState('');
  const [formWaktu, setFormWaktu] = useState(60);
  const [formError, setFormError] = useState<string | null>(null);

  const generateRandomToken = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 6; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormToken(res);
  };

  const handleCopyToken = (token: string, id: string) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenId(id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  const handleOpenAdd = () => {
    setFormNomor(String(soalList.length + 1));
    setFormTingkat('10');
    setFormMata('');
    setFormLink('https://forms.gle/contoh-ujian');
    generateRandomToken();
    setFormWaktu(60);
    setFormError(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (s: SoalUjian) => {
    setSelectedSoal(s);
    setFormNomor(s.nomor);
    setFormTingkat(s.tingkat);
    setFormMata(s.mataPelajaran);
    setFormLink(s.link);
    setFormToken(s.token);
    setFormWaktu(s.waktuMenit);
    setFormError(null);
    setShowEditModal(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMata.trim() || !formLink.trim() || !formToken.trim()) {
      setFormError('Harap lengkapi semua data soal.');
      return;
    }

    const newSoal: SoalUjian = {
      id: `s-${Date.now()}`,
      nomor: formNomor.trim() || String(soalList.length + 1),
      tingkat: formTingkat,
      mataPelajaran: formMata.trim(),
      link: formLink.trim(),
      token: formToken.trim().toUpperCase(),
      waktuMenit: Number(formWaktu) || 60,
      totalSoal: 30,
    };

    onAddSoal(newSoal);
    setShowAddModal(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSoal) return;
    if (!formMata.trim() || !formLink.trim() || !formToken.trim()) {
      setFormError('Harap lengkapi semua data.');
      return;
    }

    const updated: SoalUjian = {
      ...selectedSoal,
      nomor: formNomor.trim(),
      tingkat: formTingkat,
      mataPelajaran: formMata.trim(),
      link: formLink.trim(),
      token: formToken.trim().toUpperCase(),
      waktuMenit: Number(formWaktu) || 60,
    };

    onUpdateSoal(updated);
    setShowEditModal(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>Bank Data Soal & Jadwal Ujian</span>
          </h2>
          <p className="text-xs text-slate-500">
            Kelola tautan soal (Google Forms / CBT), token pengaman ujian, dan alokasi waktu
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          Tambah Soal Ujian
        </button>
      </div>

      {/* Table of Soal */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">Tingkat</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Token Ujian</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Tautan Link Soal</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {soalList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    Belum ada data soal ujian. Klik "Tambah Soal Ujian" untuk menambahkan.
                  </td>
                </tr>
              ) : (
                soalList.map((s, index) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">
                      {s.nomor || index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-semibold text-xs border border-indigo-200/60">
                        Kelas {s.tingkat}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {s.mataPelajaran}
                    </td>
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        <span className="font-mono font-bold text-blue-700 tracking-wider">
                          {s.token}
                        </span>
                        <button
                          onClick={() => handleCopyToken(s.token, s.id)}
                          title="Salin Token"
                          className="text-slate-400 hover:text-blue-600 transition"
                        >
                          {copiedTokenId === s.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.waktuMenit} Menit</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 max-w-xs">
                        <span className="font-mono text-xs text-slate-500 truncate">
                          {s.link}
                        </span>
                        <a
                          href={s.link}
                          target="_blank"
                          rel="noreferrer"
                          title="Buka link di tab baru"
                          className="text-blue-600 hover:text-blue-800 shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          title="Edit Soal"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus soal ujian ${s.mataPelajaran}?`)) {
                              onDeleteSoal(s.id);
                            }
                          }}
                          title="Hapus Soal"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD SOAL MODAL (matches modalTambahSoal) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Tambah Data Soal Ujian</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-indigo-200 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-5 space-y-3.5">
              {formError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>{formError}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Urut
                </label>
                <input
                  type="text"
                  value={formNomor}
                  onChange={(e) => setFormNomor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tingkat / Kelas <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formTingkat}
                  onChange={(e) => setFormTingkat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="10">Kelas 10</option>
                  <option value="11">Kelas 11</option>
                  <option value="12">Kelas 12</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mata Pelajaran <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Matematika Peminatan"
                  value={formMata}
                  onChange={(e) => setFormMata(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link Soal (Google Forms / CBT URL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://docs.google.com/forms/..."
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Token Ujian <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateRandomToken}
                      className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      <Sparkles className="w-2.5 h-2.5" /> Acak
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: UJIAN25"
                    value={formToken}
                    onChange={(e) => setFormToken(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Waktu (Menit) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={360}
                    value={formWaktu}
                    onChange={(e) => setFormWaktu(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
                >
                  Simpan Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SOAL MODAL */}
      {showEditModal && selectedSoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-indigo-600 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Edit Data Soal Ujian</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-indigo-200 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-3.5">
              {formError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>{formError}</div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Urut
                </label>
                <input
                  type="text"
                  value={formNomor}
                  onChange={(e) => setFormNomor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tingkat / Kelas
                </label>
                <select
                  value={formTingkat}
                  onChange={(e) => setFormTingkat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="10">Kelas 10</option>
                  <option value="11">Kelas 11</option>
                  <option value="12">Kelas 12</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mata Pelajaran
                </label>
                <input
                  type="text"
                  required
                  value={formMata}
                  onChange={(e) => setFormMata(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Link Soal (Google Forms / CBT URL)
                </label>
                <input
                  type="url"
                  required
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Token Ujian
                  </label>
                  <input
                    type="text"
                    required
                    value={formToken}
                    onChange={(e) => setFormToken(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Waktu (Menit)
                  </label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={360}
                    value={formWaktu}
                    onChange={(e) => setFormWaktu(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
                >
                  Perbarui Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
