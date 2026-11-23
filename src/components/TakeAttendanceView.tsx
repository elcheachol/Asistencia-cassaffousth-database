import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Search,
  Save,
  CheckCheck,
  RotateCcw,
  School,
  Info,
  ShieldCheck,
  Lock,
  HelpCircle,
} from 'lucide-react';
import {
  AttendanceStatus,
  AttendanceEntry,
  AttendanceSheet,
  UserProfile,
} from '../types';
import {
  getAvailableCoursesForUser,
  getAvailableSubjectsForUser,
  getStudentsByCourse,
  findAttendanceSheet,
  saveAttendanceSheet,
} from '../services/storage';
import { studentMatchesQuery } from '../utils/textUtils';

interface TakeAttendanceViewProps {
  currentUser: UserProfile;
  onSavedSuccess?: () => void;
  onGoToMonthlyReport?: (courseId: string, month: number, year: number) => void;
  initialCourseId?: string;
  initialDate?: string;
}

export const TakeAttendanceView: React.FC<TakeAttendanceViewProps> = ({
  currentUser,
  onSavedSuccess,
  onGoToMonthlyReport,
  initialCourseId,
  initialDate,
}) => {
  const isTeacher = currentUser.role === 'profesor';

  const getTodayStr = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const availableCourses = useMemo(() => {
    return getAvailableCoursesForUser(currentUser);
  }, [currentUser]);

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getTodayStr());

  const [selectedCourseId, setSelectedCourseId] = useState<string>(() => {
    if (initialCourseId && availableCourses.some(c => c.id === initialCourseId)) {
      return initialCourseId;
    }
    return availableCourses.length > 0 ? availableCourses[0].id : '';
  });

  // PRECEPTOR: Strictly receives only 'sub-general' (Asistencia General).
  // PROFESOR: Strictly receives only their assigned curricular subjects.
  const availableSubjects = useMemo(() => {
    if (!selectedCourseId) return [];
    return getAvailableSubjectsForUser(currentUser, selectedCourseId);
  }, [currentUser, selectedCourseId]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [classHour, setClassHour] = useState('1° y 2° Módulo (07:30 a 09:00)');
  const [generalNotes, setGeneralNotes] = useState('');
  const [isSavedRecently, setIsSavedRecently] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [existingRecordNotice, setExistingRecordNotice] = useState(false);
  const [showTeacherHelp, setShowTeacherHelp] = useState(false);

  const students = useMemo(() => {
    if (!selectedCourseId) return [];
    return getStudentsByCourse(selectedCourseId);
  }, [selectedCourseId]);

  // Check if Preceptoría recorded morning absences (for teachers)
  const preceptorMorningAbsences = useMemo(() => {
    if (!selectedCourseId || !selectedDate) return new Set<string>();
    const morningSheet = findAttendanceSheet(selectedDate, selectedCourseId, 'sub-general');
    if (!morningSheet) return new Set<string>();
    const absentIds = new Set<string>();
    morningSheet.entries.forEach(e => {
      if (e.status === 'ausente') absentIds.add(e.studentId);
    });
    return absentIds;
  }, [selectedDate, selectedCourseId]);

  useEffect(() => {
    if (availableSubjects.length > 0) {
      const currentValid = availableSubjects.find(s => s.id === selectedSubjectId);
      if (!currentValid) {
        setSelectedSubjectId(availableSubjects[0].id);
      }
    } else {
      setSelectedSubjectId('');
    }
  }, [availableSubjects, selectedSubjectId]);

  const [entries, setEntries] = useState<Record<string, { status: AttendanceStatus; observation: string }>>({});

  useEffect(() => {
    if (!selectedCourseId || !selectedDate || !selectedSubjectId) return;

    const existingSheet = findAttendanceSheet(selectedDate, selectedCourseId, selectedSubjectId);
    const initialEntries: Record<string, { status: AttendanceStatus; observation: string }> = {};

    if (existingSheet && existingSheet.entries.length > 0) {
      setExistingRecordNotice(true);
      setGeneralNotes(existingSheet.notes || '');

      students.forEach(st => {
        const savedEntry = existingSheet.entries.find(e => e.studentId === st.id);
        if (savedEntry) {
          initialEntries[st.id] = {
            status: savedEntry.status,
            observation: savedEntry.observation || '',
          };
        } else {
          initialEntries[st.id] = { status: 'presente', observation: '' };
        }
      });
    } else {
      setExistingRecordNotice(false);
      students.forEach(st => {
        initialEntries[st.id] = { status: 'presente', observation: '' };
      });
    }

    setEntries(initialEntries);
  }, [selectedDate, selectedCourseId, selectedSubjectId, students]);

  const currentCourse = availableCourses.find(c => c.id === selectedCourseId);

  const counts = useMemo(() => {
    let p = 0;
    let a = 0;
    let j = 0;
    let t = 0;
    Object.values(entries).forEach(e => {
      if (e.status === 'presente') p++;
      else if (e.status === 'ausente') a++;
      else if (e.status === 'justificado') j++;
      else if (e.status === 'tardanza') t++;
    });
    const total = students.length;
    const rate = total > 0 ? Math.round(((p + j) / total) * 100) : 100;
    return { p, a, j, t, total, rate };
  }, [entries, students.length]);

  const handleMarkAllPresent = () => {
    const updated: Record<string, { status: AttendanceStatus; observation: string }> = {};
    students.forEach(st => {
      updated[st.id] = {
        status: 'presente',
        observation: entries[st.id]?.observation || '',
      };
    });
    setEntries(updated);
  };

  const handleSetStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setEntries(prev => ({
      ...prev,
      [studentId]: {
        status,
        observation: prev[studentId]?.observation || '',
      },
    }));
  };

  const handleSetStudentObservation = (studentId: string, observation: string) => {
    setEntries(prev => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'presente',
        observation,
      },
    }));
  };

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    return students.filter(st => studentMatchesQuery(st, searchTerm));
  }, [students, searchTerm]);

  const handleSaveAttendance = async () => {
    setSaveError(null);
    if (!selectedCourseId || !selectedDate || !selectedSubjectId) {
      setSaveError('Por favor verifique que haya seleccionado fecha, curso y materia.');
      return;
    }

    const entryList: AttendanceEntry[] = students.map(st => ({
      studentId: st.id,
      status: entries[st.id]?.status || 'presente',
      observation: entries[st.id]?.observation?.trim() || undefined,
    }));

    const sheetId = `sheet-${selectedDate}-${selectedCourseId}-${selectedSubjectId}`;

    const sheet: AttendanceSheet = {
      id: sheetId,
      date: selectedDate,
      courseId: selectedCourseId,
      subjectId: selectedSubjectId,
      turn: currentCourse?.turn || 'Mañana',
      takenByUserId: currentUser.id,
      takenByUserName: currentUser.name,
      takenByRole: currentUser.role,
      entries: entryList,
      timestamp: new Date().toISOString(),
      notes: generalNotes.trim() ? `${classHour} - ${generalNotes.trim()}` : classHour,
    };

    setIsSaving(true);
    try {
      await saveAttendanceSheet(sheet);
      setExistingRecordNotice(true);
      setIsSavedRecently(true);

      if (onSavedSuccess) {
        onSavedSuccess();
      }

      setTimeout(() => {
        setIsSavedRecently(false);
      }, 4500);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : 'No se pudo guardar la asistencia en el servidor.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Institutional Header Card */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg overflow-hidden shadow-2xs">
        <div className="h-1 w-full flex">
          <div className="w-3/4 bg-[#0F294A]" />
          <div className="w-1/4 bg-[#B91C1C]" />
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E9F0] pb-3.5">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0">
                <img
                  src="/assets/aistudio/cassa-sn-fondo_ebfb5d01.png"
                  alt="Escudo I.P.E.T. N° 247"
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 sm:w-11 sm:h-11 object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#B91C1C] truncate">
                  I.P.E.T. N° 247 · {isTeacher ? 'Módulo Profesor' : 'Módulo Preceptoría'}
                </div>
                <h1 className="text-lg sm:text-xl font-bold font-school-serif text-[#0F294A] mt-0.5 truncate">
                  {isTeacher ? 'Asistencia de Cátedra / Taller' : 'Asistencia General de Entrada'}
                </h1>
                <p className="text-xs text-slate-600 mt-0.5 truncate">
                  {isTeacher ? (
                    <span>Docente: <strong className="text-slate-900">{currentUser.name}</strong> · Registro de materias asignadas</span>
                  ) : (
                    <span>Preceptor: <strong className="text-slate-900">{currentUser.name}</strong> · Registro diario general del curso</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setShowTeacherHelp(!showTeacherHelp)}
                className="text-xs text-slate-700 hover:text-[#0F294A] bg-white hover:bg-slate-50 border border-[#D5DCE6] px-3 py-2 rounded-md flex items-center gap-1.5 cursor-pointer font-semibold transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                <span>{showTeacherHelp ? 'Ocultar' : 'Orientaciones'}</span>
              </button>

              <button
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="bg-[#0F294A] hover:bg-[#0A1D37] disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-md flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Guardando...' : 'Guardar'}</span>
              </button>
            </div>
          </div>

          {/* Collapsible Orientative Box */}
          {showTeacherHelp && (
            <div className="mt-3 p-3.5 bg-[#F8FAFC] border border-[#D5DCE6] rounded-md text-xs text-slate-700 space-y-1.5">
              <div className="font-bold text-[#0F294A] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#B91C1C] shrink-0" />
                <span>Normativa y Roles de Asistencia I.P.E.T. N° 247</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                • <strong className="text-slate-900">Preceptores:</strong> Tienen a su cargo exclusivamente la <em>Asistencia General Institucional</em> (entrada diaria del curso para el libro matriz). No marcan materias individuales.
              </p>
              <p className="text-[11px] leading-relaxed">
                • <strong className="text-slate-900">Profesores:</strong> Tienen a su cargo exclusivamente la asistencia de sus <em>materias y módulos de taller técnico</em> asignados. No tienen acceso a la asistencia general.
              </p>
              <p className="text-[11px] leading-relaxed">
                • <strong className="text-slate-900">Marcas:</strong> [P] Presente, [A] Ausente injustificado (1 falta), [J] Justificado (con certificado), [T] Tardanza pasados 15 min (0.5 falta).
              </p>
            </div>
          )}

          {/* Informative Role Banner */}
          <div className="mt-3 p-2.5 rounded-md text-xs flex items-center gap-2 bg-[#F8FAFC] border border-[#D5DCE6] border-l-4 border-l-[#0F294A] text-slate-700">
            <ShieldCheck className="w-4 h-4 text-[#0F294A] shrink-0" />
            <span>
              {isTeacher ? (
                <span><strong className="text-[#0F294A]">Restricción activa:</strong> Como profesor, usted asienta la asistencia de sus materias a cargo. La Asistencia General corresponde a Preceptoría.</span>
              ) : (
                <span><strong className="text-[#0F294A]">Función de Preceptoría:</strong> Usted asienta la Asistencia General del curso. La asistencia de materias corresponde a los profesores.</span>
              )}
            </span>
          </div>

          {/* Saved Success Notice */}
          {isSavedRecently && (
            <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-300 rounded-md flex items-center justify-between text-xs text-emerald-950">
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                Asistencia guardada correctamente en la base de datos.
              </span>
              {onGoToMonthlyReport && (
                <button
                  onClick={() => {
                    const parts = selectedDate.split('-');
                    onGoToMonthlyReport(selectedCourseId, parseInt(parts[1], 10), parseInt(parts[0], 10));
                  }}
                  className="underline font-bold text-[#0F294A] hover:text-[#B91C1C] cursor-pointer ml-2"
                >
                  Ver Planilla Mensual →
                </button>
              )}
            </div>
          )}

          {saveError && (
            <div className="mt-3 p-2.5 bg-rose-50 border border-rose-300 rounded-md text-xs text-[#B91C1C] font-semibold">
              {saveError}
            </div>
          )}

          {existingRecordNotice && (
            <div className="mt-2.5 p-2 bg-[#F8FAFC] border border-[#D5DCE6] rounded-md text-xs text-slate-700 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#0F294A] shrink-0" />
              <span>Ya existe registro para este día y curso. Al presionar Guardar se actualizará.</span>
            </div>
          )}
        </div>
      </div>

      {/* Selectors Card */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg p-4 shadow-2xs">
        <div className="text-xs font-bold uppercase tracking-wider text-[#0F294A] mb-3 flex items-center gap-1.5">
          <School className="w-4 h-4 text-[#B91C1C] shrink-0" />
          <span>Datos de la Clase / Jornada</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* 1. Fecha */}
          <div className="bg-[#F8FAFC] p-2.5 rounded-md border border-[#E4E9F0]">
            <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center justify-between">
              <span>1. Fecha</span>
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayStr())}
                className="text-[11px] text-[#0F294A] hover:text-[#B91C1C] hover:underline font-semibold cursor-pointer"
              >
                Hoy
              </button>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md px-2.5 text-xs font-school-mono text-slate-900 font-semibold focus:outline-none focus:border-[#0F294A]"
            />
          </div>

          {/* 2. Curso */}
          <div className="bg-[#F8FAFC] p-2.5 rounded-md border border-[#E4E9F0]">
            <label className="block text-xs font-semibold text-slate-800 mb-1">
              2. Curso / División
            </label>
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md px-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0F294A]"
            >
              {availableCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name} {course.specialty ? `- ${course.specialty}` : ''} ({course.turn})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Materia: STRICT SEPARATION */}
          <div className="bg-[#F8FAFC] p-2.5 rounded-md border border-[#E4E9F0] sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold text-slate-800 mb-1 flex items-center justify-between">
              <span>3. Materia / Cátedra</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#B91C1C]">
                {isTeacher ? 'Profesor' : 'Preceptoría'}
              </span>
            </label>

            {!isTeacher ? (
              <div className="h-9 bg-white border border-[#D5DCE6] rounded-md px-2.5 text-xs font-semibold text-[#0F294A] flex items-center justify-between">
                <span className="truncate">Asistencia General (Preceptoría / Entrada)</span>
                <span title="Fijado: Preceptoría solo asienta asistencia general" className="inline-flex shrink-0 ml-1">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </span>
              </div>
            ) : (
              <select
                value={selectedSubjectId}
                onChange={e => setSelectedSubjectId(e.target.value)}
                className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md px-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0F294A]"
              >
                {availableSubjects.map(sub => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            )}

            <p className="text-[10px] text-slate-500 mt-1">
              {!isTeacher
                ? 'Preceptor: Control de entrada general del curso.'
                : 'Profesor: Solo se muestran sus materias asignadas.'}
            </p>
          </div>
        </div>

        {/* Schedule & Notes */}
        <div className="mt-3 pt-3 border-t border-[#E4E9F0] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Módulo / Horario
            </label>
            <select
              value={classHour}
              onChange={e => setClassHour(e.target.value)}
              className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md px-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0F294A]"
            >
              <option value="1° y 2° Módulo (07:30 a 09:00)">1° y 2° Módulo (07:30 a 09:00)</option>
              <option value="3° y 4° Módulo (09:15 a 10:45)">3° y 4° Módulo (09:15 a 10:45)</option>
              <option value="5° y 6° Módulo (11:00 a 12:30)">5° y 6° Módulo (11:00 a 12:30)</option>
              <option value="Jornada de Taller Técnico">Jornada de Taller Técnico</option>
              <option value="Turno Tarde - Entrada (13:30 a 15:00)">Turno Tarde - Entrada (13:30 a 15:00)</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Observación de la clase (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Práctica de pañol, evaluación, acto escolar..."
              value={generalNotes}
              onChange={e => setGeneralNotes(e.target.value)}
              className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md px-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
            />
          </div>
        </div>
      </div>

      {/* Metric Counters Strip */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg grid grid-cols-3 sm:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-[#E4E9F0] overflow-hidden shadow-2xs">
        <div className="p-2.5 text-center">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total</div>
          <div className="text-lg font-bold font-school-mono text-[#0F294A]">{counts.total}</div>
        </div>
        <div className="p-2.5 text-center">
          <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Presentes</div>
          <div className="text-lg font-bold font-school-mono text-emerald-700">{counts.p}</div>
        </div>
        <div className="p-2.5 text-center">
          <div className="text-[10px] font-bold text-[#B91C1C] uppercase tracking-wider">Ausentes</div>
          <div className="text-lg font-bold font-school-mono text-[#B91C1C]">{counts.a}</div>
        </div>
        <div className="p-2.5 text-center">
          <div className="text-[10px] font-bold text-[#0F294A] uppercase tracking-wider">Justif.</div>
          <div className="text-lg font-bold font-school-mono text-[#0F294A]">{counts.j}</div>
        </div>
        <div className="p-2.5 text-center">
          <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Tardanzas</div>
          <div className="text-lg font-bold font-school-mono text-amber-700">{counts.t}</div>
        </div>
        <div className="p-2.5 text-center bg-[#F8FAFC]">
          <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">% Asist.</div>
          <div className="text-lg font-bold font-school-mono text-[#0F294A]">{counts.rate}%</div>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-3 bg-[#F8FAFC] border-b border-[#E4E9F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por apellido o DNI (sin tildes)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md pl-8 pr-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="bg-[#0F294A] hover:bg-[#0A1D37] text-white px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              title="Marcar todos los alumnos como presentes"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Todos Presentes</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const updated: Record<string, { status: AttendanceStatus; observation: string }> = {};
                students.forEach(st => {
                  updated[st.id] = { status: 'ausente', observation: '' };
                });
                setEntries(updated);
              }}
              className="bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer border border-[#D5DCE6] transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="px-3.5 py-2 bg-white border-b border-[#E4E9F0] text-[11px] text-slate-600 flex flex-wrap items-center gap-4">
          <span className="font-bold text-[#0F294A]">Referencias:</span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
            <span className="w-4 h-4 rounded bg-emerald-700 text-white flex items-center justify-center text-[10px] font-school-mono">P</span>
            Presente
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#B91C1C]">
            <span className="w-4 h-4 rounded bg-[#B91C1C] text-white flex items-center justify-center text-[10px] font-school-mono">A</span>
            Ausente (1 falta)
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-[#0F294A]">
            <span className="w-4 h-4 rounded bg-[#0F294A] text-white flex items-center justify-center text-[10px] font-school-mono">J</span>
            Justificado
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-amber-800">
            <span className="w-4 h-4 rounded bg-amber-600 text-white flex items-center justify-center text-[10px] font-school-mono">T</span>
            Tardanza (0.5 falta)
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-900 border-collapse">
            <thead className="bg-[#0F294A] text-white text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-2 text-center w-9 border-r border-white/15">#</th>
                <th className="py-2.5 px-3 min-w-[180px] border-r border-white/15">Estudiante</th>
                <th className="py-2.5 px-2 text-center w-24 hidden sm:table-cell border-r border-white/15">D.N.I.</th>
                <th className="py-2.5 px-2 text-center min-w-[155px] border-r border-white/15">Marca</th>
                <th className="py-2.5 px-2.5 min-w-[160px]">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E9F0]">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                    No se encontraron estudiantes para este curso.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const entry = entries[student.id] || { status: 'presente', observation: '' };
                  const isMorningAbsent = preceptorMorningAbsences.has(student.id);

                  return (
                    <tr
                      key={student.id}
                      className={`transition-colors ${
                        entry.status === 'ausente'
                          ? 'bg-rose-50/60'
                          : entry.status === 'tardanza'
                          ? 'bg-amber-50/50'
                          : entry.status === 'justificado'
                          ? 'bg-slate-50'
                          : idx % 2 === 1 ? 'bg-[#F8FAFC]' : 'bg-white'
                      }`}
                    >
                      <td className="py-2 px-2 text-center font-school-mono text-slate-500 border-r border-[#E4E9F0] text-xs">
                        {idx + 1}
                      </td>

                      <td className="py-2 px-3 border-r border-[#E4E9F0]">
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {student.lastName}, {student.firstName}
                        </div>
                        {isTeacher && isMorningAbsent && (
                          <div className="text-[10px] text-[#B91C1C] font-semibold mt-0.5">
                            Preceptoría: Ausente en entrada
                          </div>
                        )}
                      </td>

                      <td className="py-2 px-2 text-center font-school-mono text-xs text-slate-600 hidden sm:table-cell border-r border-[#E4E9F0]">
                        {student.dni}
                      </td>

                      {/* Segmented Status Buttons */}
                      <td className="py-2 px-2 text-center border-r border-[#E4E9F0]">
                        <div className="inline-flex items-center gap-0.5 bg-white p-0.5 rounded-md border border-[#D5DCE6]">
                          <button
                            type="button"
                            onClick={() => handleSetStudentStatus(student.id, 'presente')}
                            className={`w-7 h-7 rounded text-xs font-school-mono font-bold transition-colors cursor-pointer flex items-center justify-center ${
                              entry.status === 'presente'
                                ? 'bg-emerald-700 text-white'
                                : 'text-slate-500 hover:text-emerald-800 hover:bg-emerald-50'
                            }`}
                            title="Presente"
                          >
                            P
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetStudentStatus(student.id, 'ausente')}
                            className={`w-7 h-7 rounded text-xs font-school-mono font-bold transition-colors cursor-pointer flex items-center justify-center ${
                              entry.status === 'ausente'
                                ? 'bg-[#B91C1C] text-white'
                                : 'text-slate-500 hover:text-[#B91C1C] hover:bg-rose-50'
                            }`}
                            title="Ausente"
                          >
                            A
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetStudentStatus(student.id, 'justificado')}
                            className={`w-7 h-7 rounded text-xs font-school-mono font-bold transition-colors cursor-pointer flex items-center justify-center ${
                              entry.status === 'justificado'
                                ? 'bg-[#0F294A] text-white'
                                : 'text-slate-500 hover:text-[#0F294A] hover:bg-slate-100'
                            }`}
                            title="Justificado"
                          >
                            J
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetStudentStatus(student.id, 'tardanza')}
                            className={`w-7 h-7 rounded text-xs font-school-mono font-bold transition-colors cursor-pointer flex items-center justify-center ${
                              entry.status === 'tardanza'
                                ? 'bg-amber-600 text-white'
                                : 'text-slate-500 hover:text-amber-700 hover:bg-amber-50'
                            }`}
                            title="Tardanza"
                          >
                            T
                          </button>
                        </div>
                      </td>

                      <td className="py-2 px-2">
                        <input
                          type="text"
                          placeholder={
                            entry.status === 'ausente'
                              ? 'Motivo...'
                              : entry.status === 'tardanza'
                              ? 'Hora llegada...'
                              : entry.status === 'justificado'
                              ? 'Certificado médico...'
                              : 'Observación...'
                          }
                          value={entry.observation}
                          onChange={e => handleSetStudentObservation(student.id, e.target.value)}
                          className="w-full h-8 bg-white border border-[#D5DCE6] rounded px-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Action */}
        <div className="p-3 bg-[#F8FAFC] border-t border-[#E4E9F0] flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-600 truncate">
            Responsable: <strong className="text-slate-900">{currentUser.name}</strong> ({isTeacher ? 'Profesor/a' : 'Preceptor/a'})
          </span>

          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveAttendance}
            className="bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-60 text-white font-semibold px-4 py-2 rounded-md text-xs cursor-pointer transition-colors shrink-0"
          >
            {isSaving ? 'Guardando...' : 'Guardar Asistencias'}
          </button>
        </div>
      </div>
    </div>
  );
};
