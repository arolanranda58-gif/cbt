import React, { useState, useMemo } from 'react';
import { Peserta } from '../types';
import { downloadCSV } from '../utils/storage';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Download,
  Upload,
  Edit2,
  Trash2,
  Unlock,
  Lock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

interface AdminPesertaProps {
  pesertaList: Peserta[];
  onAddPeserta: (peserta: Peserta) => void;
  onUpdatePeserta: (peserta: Peserta) => void;
  onDeletePeserta: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onUnlockAll: () => void;
}

export const AdminPeserta: React.FC<AdminPesertaProps> = ({
  pesertaList,
  onAddPeserta,
  onUpdatePeserta,
  onDeletePeserta,
  onToggleStatus,
  onUnlockAll,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTingkat, setFilterTingkat] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPeserta, setSelectedPeserta] = useState<Peserta | null>(null);

  // Form State
  const [formNomor, setFormNomor] = useState('');
  const [formNisn, setFormNisn] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formTingkat, setFormTingkat] = useState('10');
  const [formKelas, setFormKelas] = useState('');
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Tidak Aktif'>('Aktif');
  const [formError, setFormError] = useState<string | null>(null);

  // Filtered Peserta
  const filteredPeserta = useMemo(() => {
    return pesertaList.filter((p) => {
      const matchSearch =
        p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nisn.includes(searchTerm) ||
        p.kelas.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTingkat = filterTingkat === 'Semua' || p.tingkat === filterTingkat;
      const matchStatus = filterStatus === 'Semua' || p.status === filterStatus;
      return matchSearch && matchTingkat && matchStatus;
    });
  }, [pesertaList, searchTerm, filterTingkat, filterStatus]);

  const handleOpenAddModal = () => {
    setFormNomor(String(pesertaList.length + 1).padStart(3, '0'));
    setFormNisn('');
    setFormNama('');
    setFormTingkat('10');
    setFormKelas('Ruang 01');
    setFormStatus('Aktif');
    setFormError(null);
    setShowAddModal(true);
  };

  const handleOpenEditModal = (p: Peserta) => {
    setSelectedPeserta(p);
    setFormNomor(p.nomor);
    setFormNisn(p.nisn);
    setFormNama(p.nama);
    setFormTingkat(p.tingkat);
    setFormKelas(p.kelas);
    setFormStatus(p.status);
    setFormError(null);
    setShowEditModal(true);
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNisn.trim() || !formNama.trim() || !formKelas.trim()) {
      setFormError('Harap lengkapi semua kolom yang wajib diisi.');
      return;
    }

    // Check duplicate NISN
    if (pesertaList.some((p) => p.nisn.trim() === formNisn.trim())) {
      setFormError('Nomor NISN ini sudah terdaftar!');
      return;
    }

    const newPeserta: Peserta = {
      id: `p-${Date.now()}`,
      nomor: formNomor.trim() || String(pesertaList.length + 1),
      nisn: formNisn.trim(),
      nama: formNama.trim(),
      tingkat: formTingkat,
      kelas: formKelas.trim(),
      status: formStatus,
      pelanggaranCount: 0,
      catatanPelanggaran: [],
    };

    onAddPeserta(newPeserta);
    setShowAddModal(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeserta) return;
    if (!formNisn.trim() || !formNama.trim() || !formKelas.trim()) {
      setFormError('Harap lengkapi semua kolom.');
      return;
    }

    // Check duplicate NISN (excluding current student)
    if (
      pesertaList.some(
        (p) => p.id !== selectedPeserta.id && p.nisn.trim() === formNisn.trim()
      )
    ) {
      setFormError('Nomor NISN ini sudah digunakan oleh peserta lain!');
      return;
    }

    const updated: Peserta = {
      ...selectedPeserta,
      nomor: formNomor.trim(),
      nisn: formNisn.trim(),
      nama: formNama.trim(),
      tingkat: formTingkat,
      kelas: formKelas.trim(),
      status: formStatus,
    };

    onUpdatePeserta(updated);
    setShowEditModal(false);
  };

  const handleExportCSV = () => {
    const headers = ['Nomor', 'NISN', 'Nama Peserta', 'Tingkat', 'Kelas/Ruangan', 'Status'];
    const rows = pesertaList.map((p) => [
      p.nomor,
      p.nisn,
      p.nama,
      p.tingkat,
      p.kelas,
      p.status,
    ]);
    downloadCSV('Data_Peserta_Ujian_CBT.csv', [headers, ...rows]);
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Manajemen Data Peserta Ujian</span>
          </h2>
          <p className="text-xs text-slate-500">
            Total {pesertaList.length} peserta terdaftar • {filteredPeserta.length} ditampilkan
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onUnlockAll}
            className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Unlock className="w-4 h-4 text-amber-600" />
            Aktifkan Semua
          </button>
          <button
            onClick={handleExportCSV}
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Ekspor CSV
          </button>
          <button
            onClick={handleOpenAddModal}
            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs hover:shadow transition flex items-center gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Tambah Peserta
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200/80 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan nama, NISN, atau kelas..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Tingkat:</span>
            <select
              value={filterTingkat}
              onChange={(e) => setFilterTingkat(e.target.value)}
              className="bg-transparent font-semibold focus:outline-none"
            >
              <option value="Semua">Semua</option>
              <option value="10">Kelas 10</option>
              <option value="11">Kelas 11</option>
              <option value="12">Kelas 12</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 shrink-0">
            <span>Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent font-semibold focus:outline-none"
            >
              <option value="Semua">Semua</option>
              <option value="Aktif">Aktif</option>
              <option value="Tidak Aktif">Tidak Aktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* Peserta Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th className="py-3 px-4">NISN / No Peserta</th>
                <th className="py-3 px-4">Nama Peserta</th>
                <th className="py-3 px-4">Tingkat</th>
                <th className="py-3 px-4">Ruangan / Kelas</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPeserta.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada data peserta yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredPeserta.map((p, index) => {
                  const isAktif = p.status === 'Aktif';
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 text-center text-slate-400 font-mono text-xs">
                        {p.nomor || index + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {p.nisn}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {p.nama}
                        {p.catatanPelanggaran && p.catatanPelanggaran.length > 0 && (
                          <div className="text-[10px] text-rose-600 mt-0.5 truncate max-w-xs">
                            ⚠️ {p.catatanPelanggaran[p.catatanPelanggaran.length - 1]}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-xs">
                          Kelas {p.tingkat}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {p.kelas}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => onToggleStatus(p.id)}
                          title={`Klik untuk mengubah status menjadi ${isAktif ? 'Tidak Aktif' : 'Aktif'}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition ${
                            isAktif
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {isAktif ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3 text-rose-600" />
                              <span>Terkunci</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            title="Edit Data Peserta"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Yakin ingin menghapus peserta ${p.nama}?`)) {
                                onDeletePeserta(p.id);
                              }
                            }}
                            title="Hapus Peserta"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD PESERTA MODAL (Matches original modalTambahPeserta structure) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Tambah Data Peserta</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-blue-200 hover:text-white font-bold"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NISN / Nomor Peserta <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 0081234567"
                  value={formNisn}
                  onChange={(e) => setFormNisn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Peserta <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Masukkan nama lengkap"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formTingkat}
                    onChange={(e) => setFormTingkat(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="10">Kelas 10</option>
                    <option value="11">Kelas 11</option>
                    <option value="12">Kelas 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ruangan / Kelas <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ruang 01 (X-1)"
                    value={formKelas}
                    onChange={(e) => setFormKelas(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PESERTA MODAL */}
      {showEditModal && selectedPeserta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="bg-blue-600 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">Edit Data Peserta</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-blue-200 hover:text-white font-bold"
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NISN / Nomor Peserta
                </label>
                <input
                  type="text"
                  required
                  value={formNisn}
                  onChange={(e) => setFormNisn(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Lengkap Peserta
                </label>
                <input
                  type="text"
                  required
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tingkat
                  </label>
                  <select
                    value={formTingkat}
                    onChange={(e) => setFormTingkat(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="10">Kelas 10</option>
                    <option value="11">Kelas 11</option>
                    <option value="12">Kelas 12</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ruangan / Kelas
                  </label>
                  <input
                    type="text"
                    required
                    value={formKelas}
                    onChange={(e) => setFormKelas(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Aktif">Aktif</option>
                  <option value="Tidak Aktif">Tidak Aktif</option>
                </select>
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
                >
                  Perbarui Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
