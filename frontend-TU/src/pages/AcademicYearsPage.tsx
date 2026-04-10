import React, { useEffect, useState } from 'react';
import { academicAPI } from '../api/tu-api-endpoints';
import { useTuIdentity } from '../context/TuIdentityContext';

interface AcademicYearRow {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  closure_date: string;
  final_closure_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

function isoToLocalDatetime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localDatetimeToISO(local?: string) {
  if (!local) return undefined;
  const d = new Date(local);
  return d.toISOString();
}

export const AcademicYearsPage: React.FC = () => {
  const { user } = useTuIdentity();
  const [years, setYears] = useState<AcademicYearRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ closure_date: string; final_closure_date: string }>({ closure_date: '', final_closure_date: '' });

  useEffect(() => {
    loadYears();
  }, []);

  const loadYears = async () => {
    setLoading(true);
    try {
      const res = await academicAPI.list();
      if (res.data && Array.isArray(res.data)) setYears(res.data as AcademicYearRow[]);
    } catch (e) {
      console.error('[TU-ACADEMIC] Failed to load academic years', e);
      alert('Không thể tải Academic Years');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (yr: AcademicYearRow) => {
    setEditingId(yr.id);
    setForm({ closure_date: isoToLocalDatetime(yr.closure_date), final_closure_date: isoToLocalDatetime(yr.final_closure_date) });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ closure_date: '', final_closure_date: '' });
  };

  const save = async (id: string) => {
    try {
      const payload: any = {};
      if (form.closure_date) payload.closure_date = localDatetimeToISO(form.closure_date);
      if (form.final_closure_date) payload.final_closure_date = localDatetimeToISO(form.final_closure_date);

      const res = await academicAPI.update(id, payload);
      if (res.data) {
        setYears((prev) => prev.map((p) => (p.id === id ? (res.data as AcademicYearRow) : p)));
        setEditingId(null);
        alert('✅ Đã cập nhật closure dates');
      }
    } catch (e) {
      console.error('[TU-ACADEMIC] Update failed', e);
      alert('❌ Cập nhật thất bại');
    }
  };

  if (loading) return <div className="p-4 sm:p-6 text-slate-300">Đang tải Academic Years...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 w-full">
      <h2 className="text-2xl font-bold text-white mb-4">Academic Years</h2>
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 sm:p-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-slate-400 text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Closure Date</th>
              <th className="p-2">Final Closure Date</th>
              <th className="p-2">Active</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {years.map((yr) => (
              <tr key={yr.id} className="border-t border-slate-700">
                <td className="p-2 align-top text-white">{yr.name}</td>
                <td className="p-2 align-top text-slate-200">
                  {editingId === yr.id ? (
                    <input
                      type="datetime-local"
                      value={form.closure_date}
                      onChange={(e) => setForm({ ...form, closure_date: e.target.value })}
                      className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white w-full"
                    />
                  ) : (
                    new Date(yr.closure_date).toLocaleString()
                  )}
                </td>
                <td className="p-2 align-top text-slate-200">
                  {editingId === yr.id ? (
                    <input
                      type="datetime-local"
                      value={form.final_closure_date}
                      onChange={(e) => setForm({ ...form, final_closure_date: e.target.value })}
                      className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white w-full"
                    />
                  ) : (
                    new Date(yr.final_closure_date).toLocaleString()
                  )}
                </td>
                <td className="p-2 align-top text-slate-200">{yr.is_active ? 'Yes' : 'No'}</td>
                <td className="p-2 align-top">
                  {editingId === yr.id ? (
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => save(yr.id)} className="px-3 py-1 bg-cyan-600 rounded text-white">Save</button>
                      <button onClick={cancelEdit} className="px-3 py-1 bg-slate-700 rounded text-white">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(yr)} className="px-3 py-1 bg-blue-600 rounded text-white">Edit</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AcademicYearsPage;
