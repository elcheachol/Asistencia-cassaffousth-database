import React, { useState, useMemo } from 'react';
import {
  Trash2,
  Edit3,
  Eye,
  Search,
  CheckSquare,
  Square,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { AttendanceSheet, AttendanceStatus, UserProfile } from '../types';
import {
  getAllAttendanceSheets,
  getCourses,
  getStudents,
  getSubjects,
  deleteAttendanceSheet,
  deleteAttendanceSheets,
} from '../services/storage';
import { normalizeSearchText } from '../utils/textUtils';

interface AttendanceHistoryViewProps {
  currentUser: UserProfile;
  onEditSheet: (sheet: AttendanceSheet) => void;
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  presente: 'Presente',
  ausente: 'Ausente',
  justificado: 'Justificado',
  tardanza: 'Tardanza',
};

const ROLE_LABELS: Record<string, string> = {
  administrador: 'Administrador',
  preceptor: 'Preceptoría',
  profesor: 'Profesor / Cátedra',
};

export const AttendanceHistoryView: React.FC<AttendanceHistoryViewProps> = ({
  currentUser,
  onEditSheet,
}) => {
  const isAdmin = currentUser.role === 'administrador';
  const [sheets, setSheets] = useState<AttendanceSheet[]>(() => getAllAttendanceSheets());
  const [courseFilter, setCourseFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkConfirming, setIsBulkConfirming] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [viewingSheet, setViewingSheet] = useState<AttendanceSheet | null>(null);

  const courses = useMemo(() => getCourses(), []);
  const subjects = useMemo(() => getSubjects(), []);
  const students = useMemo(() => getStudents(), []);

  const studentsById = useMemo(
    () => new Map(students.map(st => [st.id, st])),
    [students]
  );

  const refreshSheets = () => {
    setSheets(getAllAttendanceSheets());
  };

  const canManageSheet = (sheet: AttendanceSheet) =>
    isAdmin ||
    (sheet.takenByUserId === currentUser.id &&
      (currentUser.role !== 'preceptor' || sheet.subjectId === 'sub-general'));

  const formatShortDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '';
    const dateObj = new Date(iso);
    if (Number.isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAttendanceTypeLabel = (sheet: AttendanceSheet) =>
    sheet.subjectId === 'sub-general'
      ? 'Asistencia General (Preceptoría)'
      : 'Asistencia por Cátedra / Taller';

  const filteredSheets = useMemo(() => {
    return sheets.filter(sheet => {
      if (!isAdmin) {
        if (sheet.takenByUserId !== currentUser.id) return false;
        if (sheet.takenByRole !== currentUser.role) return false;
      }
      if (courseFilter !== 'all' && sheet.courseId !== courseFilter) return false;
      if (searchTerm.trim()) {
        const cleanTerm = normalizeSearchText(searchTerm);
        const matchesDate =
          sheet.date.includes(searchTerm.trim()) ||
          formatShortDate(sheet.date).includes(searchTerm.trim());
        const subjectName = subjects.find(s => s.id === sheet.subjectId)?.name || '';
        const matchesSubject = normalizeSearchText(subjectName).includes(cleanTerm);
        const matchesUser =
          isAdmin &&
          (normalizeSearchText(sheet.takenByUserName).includes(cleanTerm) ||
            Boolean(
              sheet.lastEditedByUserName &&
                normalizeSearchText(sheet.lastEditedByUserName).includes(cleanTerm)
            ));
        if (!matchesDate && !matchesSubject && !matchesUser) return false;
      }
      return true;
    });
  }, [sheets, courseFilter, searchTerm, isAdmin, currentUser.id, currentUser.role, subjects]);

  const deletableFilteredSheets = useMemo(
    () => filteredSheets.filter(canManageSheet),
    [filteredSheets, isAdmin, currentUser.id, currentUser.role]
  );

  const visibleSelectedIds = useMemo(() => {
    const deletableSet = new Set(deletableFilteredSheets.map(s => s.id));
    return selectedIds.filter(id => deletableSet.has(id));
  }, [selectedIds, deletableFilteredSheets]);

  const allVisibleSelected =
    deletableFilteredSheets.length > 0 &&
    visibleSelectedIds.length === deletableFilteredSheets.length;

  const enterSelectionMode = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsBulkConfirming(false);
    setSelectedIds([]);
    setIsSelectionMode(true);
  };

  const exitSelectionMode = () => {
    if (isBulkDeleting) return;
    setIsSelectionMode(false);
    setSelectedIds([]);
    setIsBulkConfirming(false);
  };

  const toggleSelectSheet = (sheetId: string) => {
    if (isBulkDeleting) return;
    setIsBulkConfirming(false);
    setSelectedIds(prev =>
      prev.includes(sheetId) ? prev.filter(id => id !== sheetId) : [...prev, sheetId]
    );
  };

  const toggleSelectAllVisible = () => {
    if (isBulkDeleting) return;
    setIsBulkConfirming(false);
    if (allVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(deletableFilteredSheets.map(s => s.id));
    }
  };

  const handleBulkDelete = async () => {
    if (visibleSelectedIds.length === 0 || isBulkDeleting) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsBulkDeleting(true);

    try {
      const deletedCount = await deleteAttendanceSheets(visibleSelectedIds);
      refreshSheets();
      setSelectedIds([]);
      setIsBulkConfirming(false);
      setIsSelectionMode(false);
      setSuccessMsg(
        deletedCount === 1
          ? 'Se eliminó 1 planilla de asistencia correctamente.'
          : `Se eliminaron ${deletedCount} planillas de asistencia correctamente.`
      );
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudieron eliminar las planillas seleccionadas.'
      );
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleDelete = async (sheetId: string) => {
    if (confirm('¿Desea anular este registro de asistencia?')) {
      setErrorMsg(null);
      setSuccessMsg(null);
      try {
        await deleteAttendanceSheet(sheetId);
        if (viewingSheet?.id === sheetId) {
          setViewingSheet(null);
        }
        refreshSheets();
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'No se pudo eliminar la planilla.'
        );
      }
    }
  };

  const viewingCourse = viewingSheet
    ? courses.find(c => c.id === viewingSheet.courseId)
    : undefined;
  const viewingSubject = viewingSheet
    ? subjects.find(s => s.id === viewingSheet.subjectId)
    : undefined;

  const sortedViewingEntries = useMemo(() => {
    if (!viewingSheet) return [];
    return [...viewingSheet.entries].sort((a, b) => {
      const stA = studentsById.get(a.studentId);
      const stB = studentsById.get(b.studentId);
      const nameA = stA ? `${stA.lastName}, ${stA.firstName}` : a.studentId;
      const nameB = stB ? `${stB.lastName}, ${stB.firstName}` : b.studentId;
      return nameA.localeCompare(nameB, 'es');
    });
  }, [viewingSheet, studentsById]);

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
              {isAdmin ? 'Historial General de Planillas' : 'Mi Historial de Planillas'}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
              {isAdmin
                ? 'Vista de Administración: consulte, revise en detalle o anule los partes diarios de asistencia del personal.'
                : 'Partes diarios de asistencia registrados por su usuario, ordenados cronológicamente.'}
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-md text-xs text-emerald-950 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded-md text-xs text-rose-900 font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Filter, Search, and Selection Bar */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
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
                placeholder={
                  isAdmin
                    ? 'Buscar por fecha, materia o docente...'
                    : 'Buscar por fecha o materia...'
                }
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md pl-8 pr-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 w-full md:w-auto">
            <div className="text-xs text-slate-600 font-medium">
              Actas registradas:{' '}
              <span className="font-school-mono font-bold text-[#0F294A]">
                {filteredSheets.length}
              </span>
            </div>

            {(deletableFilteredSheets.length > 0 || isSelectionMode) && (
              <button
                type="button"
                disabled={isBulkDeleting}
                onClick={isSelectionMode ? exitSelectionMode : enterSelectionMode}
                className={`h-9 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors border ${
                  isSelectionMode
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-[#D5DCE6]'
                    : 'bg-white hover:bg-[#0F294A] text-[#0F294A] hover:text-white border-[#D5DCE6] hover:border-[#0F294A]'
                } disabled:opacity-50`}
              >
                {isSelectionMode ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>Cancelar selección</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Seleccionar</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Multi-select action bar */}
        {isSelectionMode && (
          <div className="pt-3 border-t border-[#E4E9F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={isBulkDeleting || deletableFilteredSheets.length === 0}
                onClick={toggleSelectAllVisible}
                className="px-2.5 py-1.5 rounded border border-[#D5DCE6] bg-[#F8FAFC] hover:bg-slate-100 text-xs font-semibold text-[#0F294A] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {allVisibleSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-[#0F294A]" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>
                  {allVisibleSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </span>
              </button>

              <span className="text-xs text-slate-600">
                <strong className="font-school-mono text-[#0F294A]">
                  {visibleSelectedIds.length}
                </strong>{' '}
                de{' '}
                <strong className="font-school-mono text-slate-800">
                  {deletableFilteredSheets.length}
                </strong>{' '}
                {visibleSelectedIds.length === 1 ? 'seleccionado' : 'seleccionados'}
              </span>
            </div>

            {!isBulkConfirming ? (
              <button
                type="button"
                disabled={visibleSelectedIds.length === 0 || isBulkDeleting}
                onClick={() => setIsBulkConfirming(true)}
                className="bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-45 disabled:cursor-not-allowed text-white font-semibold px-3.5 py-1.5 rounded-md text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>
                  Eliminar seleccionados ({visibleSelectedIds.length})
                </span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 bg-rose-50 border border-rose-300 rounded-md px-3 py-1.5">
                <span className="text-xs font-semibold text-[#B91C1C] flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  ¿Eliminar {visibleSelectedIds.length}{' '}
                  {visibleSelectedIds.length === 1 ? 'planilla' : 'planillas'}?
                </span>
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={handleBulkDelete}
                  className="bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-60 text-white font-semibold px-2.5 py-1 rounded text-xs flex items-center gap-1 cursor-pointer"
                >
                  {isBulkDeleting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <span>Confirmar eliminación</span>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isBulkDeleting}
                  onClick={() => setIsBulkConfirming(false)}
                  className="bg-white hover:bg-slate-100 text-slate-700 border border-[#D5DCE6] font-semibold px-2.5 py-1 rounded text-xs cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Institutional Ledger List (Actas Diarias) */}
      <section className="bg-white border border-[#D5DCE6] rounded-lg shadow-2xs overflow-hidden">
        {filteredSheets.length === 0 ? (
          <div className="py-12 text-center text-slate-500 italic text-xs">
            No se encontraron registros de asistencias para los criterios indicados.
          </div>
        ) : (
          <div className="divide-y divide-[#E4E9F0]">
            {filteredSheets.map(sheet => {
              const course = courses.find(c => c.id === sheet.courseId);
              const subject = subjects.find(s => s.id === sheet.subjectId);
              const manageable = canManageSheet(sheet);
              const isSelected = isSelectionMode && visibleSelectedIds.includes(sheet.id);
              const recordedAt = formatDateTime(sheet.timestamp);
              const attendanceType = getAttendanceTypeLabel(sheet);
              const subjectOrScheduleLabel =
                sheet.subjectId === 'sub-general'
                  ? `Horario de Entrada · Turno ${sheet.turn}`
                  : `${subject ? subject.name : 'Materia asignada'} · Turno ${sheet.turn}`;

              return (
                <article
                  key={sheet.id}
                  onClick={() => {
                    if (isSelectionMode && manageable) {
                      toggleSelectSheet(sheet.id);
                    }
                  }}
                  role={isSelectionMode && manageable ? 'checkbox' : undefined}
                  aria-checked={isSelectionMode && manageable ? isSelected : undefined}
                  tabIndex={isSelectionMode && manageable ? 0 : undefined}
                  onKeyDown={e => {
                    if (
                      isSelectionMode &&
                      manageable &&
                      (e.key === 'Enter' || e.key === ' ')
                    ) {
                      e.preventDefault();
                      toggleSelectSheet(sheet.id);
                    }
                  }}
                  className={`px-4 py-4 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 transition-colors ${
                    isSelected
                      ? 'bg-[#F0F4FA]'
                      : isSelectionMode && !manageable
                      ? 'bg-slate-50 opacity-60'
                      : 'bg-white hover:bg-[#F8FAFC]'
                  } ${isSelectionMode && manageable ? 'cursor-pointer select-none' : ''}`}
                >
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    {isSelectionMode && manageable && (
                      <span className="mt-1 inline-flex items-center justify-center shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#0F294A]" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </span>
                    )}

                    {/* Date & Turn Anchor */}
                    <div className="sm:w-36 shrink-0">
                      <div className="font-school-mono text-sm font-bold text-[#0F294A]">
                        {formatShortDate(sheet.date)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Turno {sheet.turn}
                      </div>
                    </div>

                    {/* Course, Subject/Schedule, Type & Responsible */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <h3 className="text-sm sm:text-base font-bold font-school-serif text-slate-900">
                          {course ? course.name : 'Curso'}
                        </h3>
                        <span className="text-xs text-slate-500">
                          {course?.specialty || 'Ciclo Básico Técnico'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="font-semibold text-[#0F294A]">
                          {attendanceType}
                        </span>
                        <span className="text-slate-300" aria-hidden="true">·</span>
                        <span>{subjectOrScheduleLabel}</span>
                      </div>

                      <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span>
                          Registrado por{' '}
                          <strong className="text-slate-900">{sheet.takenByUserName}</strong> (
                          {ROLE_LABELS[sheet.takenByRole] || sheet.takenByRole})
                        </span>
                        {recordedAt && (
                          <>
                            <span className="text-slate-300" aria-hidden="true">·</span>
                            <span className="font-school-mono text-slate-500">
                              Fecha de carga: {recordedAt}
                            </span>
                          </>
                        )}
                      </div>

                      {sheet.lastEditedByUserName &&
                        (sheet.lastEditedByRole === 'administrador' ||
                          sheet.lastEditedByUserId !== sheet.takenByUserId) && (
                          <div className="text-[11px] text-[#B91C1C] font-medium">
                            Última edición: <strong className="font-semibold">{sheet.lastEditedByUserName}</strong> (
                            {ROLE_LABELS[sheet.lastEditedByRole || ''] || sheet.lastEditedByRole})
                            {sheet.lastEditedAt && (
                              <span className="font-school-mono text-slate-500 ml-1.5">
                                · {formatDateTime(sheet.lastEditedAt)}
                              </span>
                            )}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  {!isSelectionMode && (
                    <div className="flex items-center justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E4E9F0]">
                      <button
                        type="button"
                        onClick={() => setViewingSheet(sheet)}
                        className="bg-[#0F294A] hover:bg-[#0A1D37] text-white px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver</span>
                      </button>

                      {manageable && (
                        <button
                          type="button"
                          onClick={() => handleDelete(sheet.id)}
                          title="Anular planilla"
                          aria-label="Anular planilla"
                          className="text-slate-400 hover:text-[#B91C1C] p-1.5 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Read-Only Sheet Viewer Modal (with explicit Edit trigger inside) */}
      {viewingSheet && (
        <div
          className="fixed inset-0 z-50 bg-[#0A1D37]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-sheet-title"
        >
          <div className="bg-white border border-[#D5DCE6] rounded-lg max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-xl">
            <div className="h-1 w-full flex shrink-0">
              <div className="w-3/4 bg-[#0F294A]" />
              <div className="w-1/4 bg-[#B91C1C]" />
            </div>

            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#E4E9F0] flex items-start justify-between gap-4 shrink-0">
              <div className="space-y-1 min-w-0">
                <div className="text-[11px] font-semibold text-[#B91C1C] uppercase tracking-wider">
                  Planilla Diaria · Solo Lectura
                </div>
                <h2
                  id="view-sheet-title"
                  className="text-lg sm:text-xl font-bold font-school-serif text-[#0F294A]"
                >
                  {viewingCourse ? viewingCourse.name : 'Curso'} — {formatShortDate(viewingSheet.date)}
                </h2>
                <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-semibold text-slate-800">
                    {getAttendanceTypeLabel(viewingSheet)}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {viewingSheet.subjectId === 'sub-general'
                      ? `Horario de Entrada (Turno ${viewingSheet.turn})`
                      : `${viewingSubject ? viewingSubject.name : 'Materia'} (Turno ${viewingSheet.turn})`}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>
                    Registrado por{' '}
                    <strong className="text-slate-900">{viewingSheet.takenByUserName}</strong> (
                    {ROLE_LABELS[viewingSheet.takenByRole] || viewingSheet.takenByRole})
                  </span>
                  {viewingSheet.timestamp && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-school-mono">
                        {formatDateTime(viewingSheet.timestamp)}
                      </span>
                    </>
                  )}
                </div>
                {viewingSheet.lastEditedByUserName &&
                  (viewingSheet.lastEditedByRole === 'administrador' ||
                    viewingSheet.lastEditedByUserId !== viewingSheet.takenByUserId) && (
                    <div className="text-[11px] text-[#B91C1C] font-medium">
                      Responsable de edición:{' '}
                      <strong>{viewingSheet.lastEditedByUserName}</strong> (
                      {ROLE_LABELS[viewingSheet.lastEditedByRole || ''] ||
                        viewingSheet.lastEditedByRole}
                      )
                      {viewingSheet.lastEditedAt && (
                        <span className="font-school-mono text-slate-500 ml-1">
                          · {formatDateTime(viewingSheet.lastEditedAt)}
                        </span>
                      )}
                    </div>
                  )}
              </div>

              <button
                type="button"
                onClick={() => setViewingSheet(null)}
                className="text-slate-400 hover:text-slate-900 p-1.5 rounded-md hover:bg-slate-100 cursor-pointer shrink-0"
                aria-label="Cerrar vista de planilla"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {viewingSheet.notes && (
              <div className="px-5 py-2.5 bg-[#F8FAFC] border-b border-[#E4E9F0] text-xs text-slate-700 shrink-0">
                <strong className="text-[#0F294A]">Observación general:</strong>{' '}
                {viewingSheet.notes}
              </div>
            )}

            {/* Read-Only Student Attendance Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-900 border-collapse">
                <thead className="bg-[#0F294A] text-white text-[11px] uppercase tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-10 border-r border-white/15">
                      N°
                    </th>
                    <th className="py-2.5 px-3 border-r border-white/15">
                      Apellido y Nombre
                    </th>
                    <th className="py-2.5 px-3 w-28 hidden sm:table-cell border-r border-white/15">
                      D.N.I.
                    </th>
                    <th className="py-2.5 px-3 w-28 border-r border-white/15">
                      Estado
                    </th>
                    <th className="py-2.5 px-3">Observación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E9F0]">
                  {sortedViewingEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                        Esta planilla no tiene alumnos registrados.
                      </td>
                    </tr>
                  ) : (
                    sortedViewingEntries.map((entry, index) => {
                      const student = studentsById.get(entry.studentId);
                      return (
                        <tr
                          key={entry.studentId}
                          className={index % 2 === 1 ? 'bg-[#F8FAFC]' : 'bg-white'}
                        >
                          <td className="py-2 px-3 text-center font-school-mono text-slate-500 border-r border-[#E4E9F0]">
                            {index + 1}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 border-r border-[#E4E9F0]">
                            {student
                              ? `${student.lastName}, ${student.firstName}`
                              : entry.studentId}
                          </td>
                          <td className="py-2 px-3 font-school-mono text-slate-600 hidden sm:table-cell border-r border-[#E4E9F0]">
                            {student ? student.dni : '—'}
                          </td>
                          <td className="py-2 px-3 font-semibold text-[#0F294A] border-r border-[#E4E9F0]">
                            {STATUS_LABELS[entry.status] || entry.status}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {entry.observation || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-[#F8FAFC] border-t border-[#E4E9F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-slate-600">
                Modo solo lectura ·{' '}
                <strong className="font-school-mono text-slate-800">
                  {sortedViewingEntries.length}
                </strong>{' '}
                {sortedViewingEntries.length === 1 ? 'alumno listado' : 'alumnos listados'}
              </span>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setViewingSheet(null)}
                  className="px-3.5 py-2 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-[#D5DCE6] cursor-pointer transition-colors"
                >
                  Cerrar
                </button>

                {canManageSheet(viewingSheet) && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = viewingSheet;
                      setViewingSheet(null);
                      onEditSheet(target);
                    }}
                    className="bg-[#B91C1C] hover:bg-[#991B1B] text-white font-semibold px-4 py-2 rounded-md text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar planilla</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
