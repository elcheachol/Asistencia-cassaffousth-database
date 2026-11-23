import React, { useState, useMemo } from 'react';
import {
  History,
  Calendar,
  School,
  BookOpen,
  Trash2,
  Edit3,
  Search,
} from 'lucide-react';
import { AttendanceSheet, UserProfile } from '../types';
import {
  getAllAttendanceSheets,
  getCourses,
  getSubjects,
  deleteAttendanceSheet,
} from '../services/storage';
import { normalizeSearchText } from '../utils/textUtils';

interface AttendanceHistoryViewProps {
  currentUser: UserProfile;
  onEditSheet: (sheet: AttendanceSheet) => void;
}

export const AttendanceHistoryView: React.FC<AttendanceHistoryViewProps> = ({
  currentUser,
  onEditSheet,
}) => {
  const [sheets, setSheets] = useState<AttendanceSheet[]>(() => getAllAttendanceSheets());
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const courses = useMemo(() => getCourses(), []);
  const subjects = useMemo(() => getSubjects(), []);

  const refreshSheets = () => {
    setSheets(getAllAttendanceSheets());
  };

  const filteredSheets = useMemo(() => {
    return sheets.filter(sheet => {
      if (courseFilter !== 'all' && sheet.courseId !== courseFilter) return false;
      if (searchTerm.trim()) {
        const cleanTerm = normalizeSearchText(searchTerm);
        const matchesDate = sheet.date.includes(searchTerm.trim());
        const matchesUser = normalizeSearchText(sheet.takenByUserName).includes(cleanTerm);
        if (!matchesDate && !matchesUser) return false;
      }
      return true;
    });
  }, [sheets, courseFilter, searchTerm]);

  const handleDelete = async (sheetId: string) => {
    if (confirm('¿Desea anular este registro de asistencia?')) {
      setErrorMsg(null);
      try {
        await deleteAttendanceSheet(sheetId);
        refreshSheets();
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'No se pudo eliminar la planilla.'
        );
      }
    }
  };

  return (
    <div className="space-y-5">
      {/* Institutional Top Header */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg overflow-hidden shadow-2xs">
        <div className="h-1 w-full flex">
          <div className="w-3/4 bg-[#0F294A]" />
          <div className="w-1/4 bg-[#B91C1C]" />
        </div>
        <div className="p-4 sm:p-5 flex items-center gap-3">
          <img
            src="/assets/aistudio/cassa-sn-fondo_ebfb5d01.png"
            alt="Escudo I.P.E.T. N° 247"
            referrerPolicy="no-referrer"
            className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
          />
          <div>
            <div className="text-xs font-semibold text-[#B91C1C] mb-0.5">
              I.P.E.T. N° 247 · Libro Diario de Asistencias
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-school-serif text-[#0F294A] tracking-tight">
              Historial de Planillas Registradas
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
              Histórico de partes de asistencia asentados en el sistema por fecha, curso y cátedra.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-md text-xs text-rose-900 font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-64">
            <select
              value={courseFilter}
              onChange={e => setCourseFilter(e.target.value)}
              className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md px-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0F294A]"
            >
              <option value="all">Todos los Cursos</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.specialty ? `- ${c.specialty}` : ''} ({c.turn})
                </option>
              ))}
            </select>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por fecha (YYYY-MM-DD) o docente..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md pl-8 pr-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
            />
          </div>
        </div>

        <div className="text-xs text-slate-600 font-medium self-end md:self-center">
          Registros guardados:{' '}
          <span className="font-school-mono font-bold text-[#0F294A]">{filteredSheets.length}</span>
        </div>
      </div>

      {/* Sheets List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredSheets.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white border border-[#D5DCE6] rounded-lg italic text-xs">
            No se encontraron registros de asistencias para los criterios indicados.
          </div>
        ) : (
          filteredSheets.map(sheet => {
            const course = courses.find(c => c.id === sheet.courseId);
            const subject = subjects.find(s => s.id === sheet.subjectId);

            let pres = 0;
            let aus = 0;
            let just = 0;
            let tard = 0;

            sheet.entries.forEach(e => {
              if (e.status === 'presente') pres++;
              else if (e.status === 'ausente') aus++;
              else if (e.status === 'justificado') just++;
              else if (e.status === 'tardanza') tard++;
            });

            const total = sheet.entries.length;
            const rate = total > 0 ? Math.round(((pres + just) / total) * 100) : 100;

            return (
              <div
                key={sheet.id}
                className="bg-white border border-[#D5DCE6] hover:border-[#0F294A] rounded-lg p-4 shadow-2xs flex flex-col justify-between transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="inline-flex items-center gap-1.5 font-school-mono font-semibold text-[#0F294A]">
                      <Calendar className="w-3.5 h-3.5 text-[#B91C1C]" />
                      {sheet.date}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Turno {sheet.turn}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold font-school-serif text-slate-900">
                    {course ? course.name : 'Curso'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mb-1.5">
                    {course?.specialty || 'Ciclo Básico'}
                  </p>

                  <div className="text-xs text-[#0F294A] font-semibold flex items-center gap-1.5 mb-3">
                    <BookOpen className="w-3.5 h-3.5 text-[#B91C1C] shrink-0" />
                    <span className="truncate">{subject ? subject.name : 'Asistencia General'}</span>
                  </div>

                  {/* Clean Tabular Summary Strip */}
                  <div className="grid grid-cols-4 border border-[#E4E9F0] divide-x divide-[#E4E9F0] rounded bg-[#F8FAFC] text-center py-1.5 mb-2.5 text-xs">
                    <div>
                      <div className="font-school-mono font-bold text-emerald-700">{pres}</div>
                      <div className="text-[9px] text-slate-600 font-semibold uppercase">P</div>
                    </div>
                    <div>
                      <div className="font-school-mono font-bold text-[#B91C1C]">{aus}</div>
                      <div className="text-[9px] text-slate-600 font-semibold uppercase">A</div>
                    </div>
                    <div>
                      <div className="font-school-mono font-bold text-[#0F294A]">{just}</div>
                      <div className="text-[9px] text-slate-600 font-semibold uppercase">J</div>
                    </div>
                    <div>
                      <div className="font-school-mono font-bold text-amber-700">{tard}</div>
                      <div className="text-[9px] text-slate-600 font-semibold uppercase">T</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-600">
                    Docente: <strong className="text-slate-900">{sheet.takenByUserName}</strong> · {sheet.takenByRole}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#E4E9F0] flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Asistencia:{' '}
                    <span className="font-school-mono font-bold text-[#0F294A]">{rate}%</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditSheet(sheet)}
                      className="bg-white hover:bg-[#0F294A] text-[#0F294A] hover:text-white border border-[#D5DCE6] hover:border-[#0F294A] px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Ver / Editar</span>
                    </button>

                    {((currentUser.role === 'preceptor' && sheet.subjectId === 'sub-general') ||
                      (currentUser.role === 'profesor' && sheet.takenByUserId === currentUser.id)) && (
                      <button
                        type="button"
                        onClick={() => handleDelete(sheet.id)}
                        title="Eliminar registro"
                        className="text-slate-400 hover:text-[#B91C1C] p-1 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
