import React, { useState, useMemo, useEffect } from 'react';
import {
  Download,
  Printer,
  FileDown,
  Search,
} from 'lucide-react';
import { UserProfile, StudentMonthlySummary } from '../types';
import {
  getCourses,
  getSubjectsForCourse,
  getAvailableSubjectsForUser,
  calculateMonthlyReport,
} from '../services/storage';
import {
  exportMonthlyReportToExcel,
  exportMonthlyReportToCSV,
} from '../services/exportService';
import { apiFetchMonthlyReport } from '../services/api';
import { studentMatchesQuery } from '../utils/textUtils';

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const MONTH_SHORT_NAMES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

interface MonthlyReportViewProps {
  currentUser: UserProfile;
  initialCourseId?: string;
  initialMonth?: number;
  initialYear?: number;
}

export const MonthlyReportView: React.FC<MonthlyReportViewProps> = ({
  currentUser,
  initialCourseId,
  initialMonth = 11, // Defaults to November
  initialYear = 2026,
}) => {
  const isAdmin = currentUser.role === 'administrador';
  const isTeacher = currentUser.role === 'profesor';

  const courses = useMemo(() => {
    return getCourses();
  }, []);

  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId || (courses.length > 0 ? courses[0].id : '')
  );

  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonth);
  const selectedYear = initialYear;
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    isTeacher ? 'all' : 'sub-general'
  );
  const [selectedStudentDetail, setSelectedStudentDetail] = useState<StudentMonthlySummary | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Available subjects for selected course based on role
  const subjects = useMemo(() => {
    if (!selectedCourseId) return [];
    if (isTeacher) {
      return getAvailableSubjectsForUser(currentUser, selectedCourseId);
    }
    return getSubjectsForCourse(selectedCourseId);
  }, [selectedCourseId, isTeacher, currentUser]);

  const currentCourse = courses.find(c => c.id === selectedCourseId);
  const currentSubject = subjects.find(s => s.id === selectedSubjectId);

  // Monthly calculation (initial from hydrated store, synced live from PostgreSQL API)
  const [reportData, setReportData] = useState<{
    studentsSummary: StudentMonthlySummary[];
    schoolDaysWithData: number[];
    totalClasses: number;
  }>(() =>
    selectedCourseId
      ? calculateMonthlyReport(selectedCourseId, selectedYear, selectedMonth, selectedSubjectId)
      : { studentsSummary: [], schoolDaysWithData: [], totalClasses: 0 }
  );

  useEffect(() => {
    if (!selectedCourseId) {
      setReportData({ studentsSummary: [], schoolDaysWithData: [], totalClasses: 0 });
      return;
    }

    let cancelled = false;
    setReportData(
      calculateMonthlyReport(selectedCourseId, selectedYear, selectedMonth, selectedSubjectId)
    );

    apiFetchMonthlyReport(selectedCourseId, selectedYear, selectedMonth, selectedSubjectId)
      .then((fresh) => {
        if (!cancelled) {
          setReportData(fresh);
        }
      })
      .catch((err) => {
        console.error('Error fetching monthly report from API:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedCourseId, selectedYear, selectedMonth, selectedSubjectId]);

  const { studentsSummary, schoolDaysWithData, totalClasses } = reportData;

  // Filter summaries by student name/DNI without accents
  const displayedSummaries = useMemo(() => {
    if (!searchTerm.trim()) return studentsSummary;
    return studentsSummary.filter(s => studentMatchesQuery(s.student, searchTerm));
  }, [studentsSummary, searchTerm]);

  const overallStats = useMemo(() => {
    const totalStudents = studentsSummary.length;
    if (totalStudents === 0) {
      return {
        avgAttendance: 0,
        criticalCount: 0,
        warningCount: 0,
        regularCount: 0,
        totalStudents: 0,
        totalAbsences: 0,
      };
    }
    const sumRate = studentsSummary.reduce((acc, curr) => acc + curr.porcentajeAsistencia, 0);
    const avgAttendance = Math.round(sumRate / totalStudents);
    const criticalCount = studentsSummary.filter(s => s.alertaFaltas === 'critico').length;
    const warningCount = studentsSummary.filter(s => s.alertaFaltas === 'advertencia').length;
    const regularCount = Math.max(0, totalStudents - criticalCount - warningCount);
    const totalAbsences = studentsSummary.reduce(
      (acc, curr) => acc + curr.totalFaltasComputadas,
      0
    );

    return {
      avgAttendance,
      criticalCount,
      warningCount,
      regularCount,
      totalStudents,
      totalAbsences,
    };
  }, [studentsSummary]);

  const handleExportExcel = () => {
    if (!currentCourse) return;
    exportMonthlyReportToExcel({
      course: currentCourse,
      subject: currentSubject,
      monthName: MONTH_NAMES[selectedMonth - 1],
      year: selectedYear,
      daysWithData: schoolDaysWithData,
      summaries: studentsSummary,
      institutionName: 'Escuela Técnica I.P.E.T. N° 247',
    });
  };

  const handleExportCSV = () => {
    if (!currentCourse) return;
    exportMonthlyReportToCSV({
      course: currentCourse,
      subject: currentSubject,
      monthName: MONTH_NAMES[selectedMonth - 1],
      year: selectedYear,
      daysWithData: schoolDaysWithData,
      summaries: studentsSummary,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      {/* Institutional Binder Header */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg overflow-hidden shadow-2xs print:hidden">
        <div className="h-1 w-full flex">
          <div className="w-3/4 bg-[#0F294A]" />
          <div className="w-1/4 bg-[#B91C1C]" />
        </div>
        <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <img
              src="/assets/aistudio/cassa-sn-fondo_ebfb5d01.png"
              alt="Escudo I.P.E.T. N° 247"
              referrerPolicy="no-referrer"
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
            />
            <div>
              <div className="text-xs font-semibold text-[#B91C1C] mb-0.5">
                I.P.E.T. N° 247 · Planilla Matriz Oficial
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-school-serif text-[#0F294A] tracking-tight">
                Reporte Mensual de Asistencias
              </h1>
              <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
                Cuadrícula diaria de asistencias e inasistencias con cómputo de faltas, porcentaje de presentismo y seguimiento institucional.
              </p>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleExportExcel}
              className="bg-[#0F294A] hover:bg-[#0A1D37] text-white font-semibold px-3.5 py-2 rounded-md text-xs sm:text-sm cursor-pointer transition-colors flex items-center gap-1.5"
              title="Descargar archivo Excel (.xlsx) estructurado"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Excel (.XLSX)</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="bg-white hover:bg-slate-50 text-slate-700 font-semibold px-3 py-2 rounded-md border border-[#D5DCE6] text-xs sm:text-sm cursor-pointer flex items-center gap-1.5 transition-colors"
              title="Exportar archivo CSV estándar"
            >
              <FileDown className="w-4 h-4 text-slate-500" />
              <span>CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-[#B91C1C] hover:bg-[#991B1B] text-white font-semibold px-3.5 py-2 rounded-md text-xs sm:text-sm cursor-pointer flex items-center gap-1.5 transition-colors"
              title="Imprimir planilla para la carpeta física"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unified Institutional Folio Controls & Regularity Summary */}
      <section className="bg-white border border-[#D5DCE6] rounded-lg shadow-2xs overflow-hidden print:hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E4E9F0]">
          {/* Left 7 cols: Course, Subject, Year Toggle & 12-Month Calendar Selector */}
          <div className="lg:col-span-7 p-4 sm:p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label
                  htmlFor="report-course-select"
                  className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >
                  Curso y División
                </label>
                <select
                  id="report-course-select"
                  value={selectedCourseId}
                  onChange={e => setSelectedCourseId(e.target.value)}
                  className="w-full h-10 bg-[#F8FAFC] hover:bg-white border border-[#D5DCE6] rounded-md px-3 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0F294A] transition-colors"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.specialty ? `- ${c.specialty}` : ''} ({c.turn})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="report-subject-select"
                  className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5"
                >
                  Cátedra / Control
                </label>
                <select
                  id="report-subject-select"
                  value={selectedSubjectId}
                  onChange={e => setSelectedSubjectId(e.target.value)}
                  className="w-full h-10 bg-[#F8FAFC] hover:bg-white border border-[#D5DCE6] rounded-md px-3 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0F294A] transition-colors"
                >
                  {isAdmin ? (
                    <>
                      <option value="sub-general">Asistencia General (Preceptoría / Entrada)</option>
                      <option value="all">Todas las asistencias acumuladas</option>
                      {subjects
                        .filter(s => s.id !== 'sub-general')
                        .map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                    </>
                  ) : !isTeacher ? (
                    <>
                      <option value="sub-general">Asistencia General (Preceptoría / Entrada)</option>
                      <option value="all">Todas las asistencias acumuladas</option>
                    </>
                  ) : (
                    <>
                      <option value="all">Todas mis materias en este curso</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Period Bar: Direct 1-Click 12-Month Calendar Selector */}
            <div className="pt-3 border-t border-[#E4E9F0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Período Mensual
                </span>
                <span className="text-xs font-semibold text-[#0F294A]">
                  {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
                </span>
              </div>
              <div
                role="group"
                aria-label="Mes a consultar"
                className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-1"
              >
                {MONTH_SHORT_NAMES.map((shortLabel, idx) => {
                  const monthNumber = idx + 1;
                  const active = selectedMonth === monthNumber;
                  return (
                    <button
                      key={shortLabel}
                      type="button"
                      onClick={() => setSelectedMonth(monthNumber)}
                      title={MONTH_NAMES[idx]}
                      className={`py-1.5 px-1 rounded text-[11px] font-semibold transition-colors cursor-pointer text-center whitespace-nowrap border ${
                        active
                          ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                          : 'bg-[#F8FAFC] text-slate-700 border-[#E4E9F0] hover:border-[#0F294A] hover:text-[#0F294A]'
                      }`}
                    >
                      {shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 5 cols: Asymmetric Regularity Ledger Summary */}
          <div className="lg:col-span-5 bg-[#F8FAFC] p-4 sm:p-5 flex flex-col justify-between gap-4">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Presentismo del Curso
                </div>
                <div className="mt-1 flex items-baseline gap-2.5">
                  <span className="text-3xl sm:text-4xl font-bold font-school-mono tabular-nums text-[#0F294A] leading-none">
                    {overallStats.avgAttendance}%
                  </span>
                  <span className="text-xs text-slate-600">
                    promedio mensual
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-lg font-bold font-school-mono tabular-nums text-slate-900 leading-none">
                  {totalClasses}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  {totalClasses === 1 ? 'jornada registrada' : 'jornadas registradas'}
                </div>
              </div>
            </div>

            {/* Attendance rate bar + quiet course context */}
            <div className="space-y-1.5">
              <progress
                value={Math.max(0, Math.min(100, overallStats.avgAttendance))}
                max={100}
                aria-label="Porcentaje de presentismo del curso"
                className="block w-full h-2 rounded-full overflow-hidden appearance-none bg-[#E4E9F0] [&::-webkit-progress-bar]:bg-[#E4E9F0] [&::-webkit-progress-value]:bg-[#0F294A] [&::-webkit-progress-value]:transition-all [&::-moz-progress-bar]:bg-[#0F294A]"
              />
              <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="font-semibold text-slate-800">
                  {currentCourse?.name || 'Curso'}
                </span>
                <span aria-hidden="true">·</span>
                <span>Turno {currentCourse?.turn || 'Mañana'}</span>
                <span aria-hidden="true">·</span>
                <span className="font-school-mono tabular-nums">
                  {overallStats.totalStudents} alumnos evaluados
                </span>
              </div>
            </div>

            {/* Hairline Regularity Distribution Ledger */}
            <dl className="pt-3 border-t border-[#E4E9F0] grid grid-cols-3 divide-x divide-[#E4E9F0] text-left">
              <div className="pr-3">
                <dt className="text-[11px] font-medium text-slate-600 truncate">
                  Regulares
                </dt>
                <dd className="mt-0.5 text-base font-bold font-school-mono tabular-nums text-emerald-700">
                  {overallStats.regularCount}
                </dd>
              </div>
              <div className="px-3">
                <dt className="text-[11px] font-medium text-slate-600 truncate">
                  Aviso (18–24)
                </dt>
                <dd className="mt-0.5 text-base font-bold font-school-mono tabular-nums text-amber-700">
                  {overallStats.warningCount}
                </dd>
              </div>
              <div className="pl-3">
                <dt className="text-[11px] font-medium text-slate-600 truncate">
                  Libres (≥25)
                </dt>
                <dd className="mt-0.5 text-base font-bold font-school-mono tabular-nums text-[#B91C1C]">
                  {overallStats.criticalCount}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* Official Print Header */}
      <div className="hidden print:block mb-6 p-4 border-b-2 border-slate-900 text-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold uppercase">
              Escuela de Educación Secundaria Técnica I.P.E.T. N° 247
            </h1>
            <h2 className="text-sm font-semibold">
              PLANILLA MENSUAL DE ASISTENCIA Y CONTROL DE REGULARIDAD
            </h2>
          </div>
          <div className="text-right text-xs">
            <div>Mes: <strong>{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong></div>
            <div>Curso: <strong>{currentCourse?.name} ({currentCourse?.specialty})</strong></div>
            <div>Turno: <strong>{currentCourse?.turn}</strong></div>
          </div>
        </div>
      </div>

      {/* Monthly Attendance Table - Institutional Matrix */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg shadow-2xs overflow-hidden">
        <div className="p-3 bg-[#F8FAFC] border-b border-[#E4E9F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Filtrar alumno (sin tildes ni mayúsculas)..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md pl-8 pr-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
              />
            </div>
            <span className="text-xs text-slate-500 font-school-mono font-semibold hidden md:inline">
              {displayedSummaries.length} / {studentsSummary.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700 font-semibold self-end sm:self-auto">
            <span className="inline-flex items-center gap-1.5 text-emerald-800">
              <span className="w-4 h-4 bg-emerald-700 text-white flex items-center justify-center rounded text-[10px] font-school-mono">P</span>
              Presente
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#B91C1C]">
              <span className="w-4 h-4 bg-[#B91C1C] text-white flex items-center justify-center rounded text-[10px] font-school-mono">A</span>
              Ausente
            </span>
            <span className="inline-flex items-center gap-1.5 text-[#0F294A]">
              <span className="w-4 h-4 bg-[#0F294A] text-white flex items-center justify-center rounded text-[10px] font-school-mono">J</span>
              Justif.
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-800">
              <span className="w-4 h-4 bg-amber-600 text-white flex items-center justify-center rounded text-[10px] font-school-mono">T</span>
              Tardanza
            </span>
          </div>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-900 border-collapse">
            <thead className="bg-[#0F294A] text-white text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-1.5 text-center w-8 border-r border-white/15">N°</th>
                <th className="py-2.5 px-2.5 min-w-[190px] border-r border-white/15">Apellido y Nombre</th>
                <th className="py-2.5 px-2 text-center w-24 hidden md:table-cell border-r border-white/15">D.N.I.</th>

                {/* Daily columns */}
                {schoolDaysWithData.length === 0 ? (
                  <th className="py-2.5 px-3 text-center text-white/75 font-normal border-r border-white/15">
                    Sin registros para este mes
                  </th>
                ) : (
                  schoolDaysWithData.map(day => (
                    <th
                      key={day}
                      className="py-2.5 px-1 text-center font-school-mono font-bold text-white w-7 border-r border-white/15"
                      title={`Día ${day}`}
                    >
                      {day}
                    </th>
                  ))
                )}

                {/* Summary columns */}
                <th className="py-2.5 px-1.5 text-center bg-[#0A1D37] text-white font-school-mono font-bold border-r border-white/15" title="Total Presentes">
                  P
                </th>
                <th className="py-2.5 px-1.5 text-center bg-[#0A1D37] text-white font-school-mono font-bold border-r border-white/15" title="Total Ausentes">
                  A
                </th>
                <th className="py-2.5 px-1.5 text-center bg-[#0A1D37] text-white font-school-mono font-bold border-r border-white/15" title="Total Justificados">
                  J
                </th>
                <th className="py-2.5 px-1.5 text-center bg-[#0A1D37] text-white font-school-mono font-bold border-r border-white/15" title="Total Tardanzas">
                  T
                </th>
                <th className="py-2.5 px-2 text-center bg-[#0A1D37] text-white font-bold border-r border-white/15" title="Faltas Computadas: A + 0.5*T">
                  Tot. Faltas
                </th>
                <th className="py-2.5 px-2 text-center bg-[#0A1D37] text-white font-bold border-r border-white/15">
                  % Asist.
                </th>
                <th className="py-2.5 px-2.5 text-center bg-[#0A1D37] text-white print:hidden">
                  Condición
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E4E9F0]">
              {displayedSummaries.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(1, schoolDaysWithData.length) + 10} className="py-10 text-center text-slate-500 italic">
                    No se encontraron alumnos con los criterios de búsqueda.
                  </td>
                </tr>
              ) : (
                displayedSummaries.map((summary, idx) => {
                  const { student, dailyStatus, presentes, ausentes, justificados, tardanzas, totalFaltasComputadas, porcentajeAsistencia, alertaFaltas } = summary;

                  return (
                    <tr
                      key={student.id}
                      onClick={() => setSelectedStudentDetail(summary)}
                      className={`hover:bg-slate-100/80 cursor-pointer transition-colors ${
                        idx % 2 === 1 ? 'bg-[#F8FAFC]' : 'bg-white'
                      }`}
                    >
                      <td className="py-1.5 px-1.5 text-center font-school-mono text-slate-500 border-r border-[#E4E9F0]">
                        {idx + 1}
                      </td>

                      <td className="py-1.5 px-2.5 font-semibold text-slate-900 border-r border-[#E4E9F0] whitespace-nowrap">
                        {student.lastName}, {student.firstName}
                      </td>

                      <td className="py-1.5 px-2 text-center font-school-mono text-xs text-slate-600 hidden md:table-cell border-r border-[#E4E9F0]">
                        {student.dni}
                      </td>

                      {/* Day cells */}
                      {schoolDaysWithData.length === 0 ? (
                        <td className="py-1.5 px-3 text-center text-slate-400 border-r border-[#E4E9F0]">
                          —
                        </td>
                      ) : (
                        schoolDaysWithData.map(day => {
                          const status = dailyStatus[day];
                          let cellContent = '-';
                          let cellClass = 'text-slate-300 font-normal';

                          if (status === 'presente') {
                            cellContent = 'P';
                            cellClass = 'text-emerald-800 font-bold bg-emerald-50/70';
                          } else if (status === 'ausente') {
                            cellContent = 'A';
                            cellClass = 'text-[#B91C1C] font-bold bg-rose-50';
                          } else if (status === 'justificado') {
                            cellContent = 'J';
                            cellClass = 'text-[#0F294A] font-bold bg-slate-100';
                          } else if (status === 'tardanza') {
                            cellContent = 'T';
                            cellClass = 'text-amber-800 font-bold bg-amber-50/80';
                          }

                          return (
                            <td
                              key={day}
                              className={`py-1.5 px-1 text-center font-school-mono text-xs border-r border-[#E4E9F0] ${cellClass}`}
                            >
                              {cellContent}
                            </td>
                          );
                        })
                      )}

                      {/* Summary values (uniform institutional ink color) */}
                      <td className="py-1.5 px-1.5 text-center font-school-mono font-bold text-[#0F294A] border-r border-[#E4E9F0]">
                        {presentes}
                      </td>
                      <td className="py-1.5 px-1.5 text-center font-school-mono font-bold text-[#0F294A] border-r border-[#E4E9F0]">
                        {ausentes}
                      </td>
                      <td className="py-1.5 px-1.5 text-center font-school-mono font-bold text-[#0F294A] border-r border-[#E4E9F0]">
                        {justificados}
                      </td>
                      <td className="py-1.5 px-1.5 text-center font-school-mono font-bold text-[#0F294A] border-r border-[#E4E9F0]">
                        {tardanzas}
                      </td>
                      <td className="py-1.5 px-2 text-center font-school-mono font-bold text-[#0F294A] bg-[#F8FAFC] border-r border-[#E4E9F0]">
                        {totalFaltasComputadas}
                      </td>
                      <td className="py-1.5 px-2 text-center font-school-mono font-bold text-[#0F294A] border-r border-[#E4E9F0]">
                        {porcentajeAsistencia}%
                      </td>

                      {/* Condition */}
                      <td className="py-1.5 px-2.5 text-center print:hidden whitespace-nowrap">
                        <span className="text-[11px] font-semibold text-[#0F294A]">
                          {alertaFaltas === 'critico'
                            ? 'Libre (≥25)'
                            : alertaFaltas === 'advertencia'
                            ? 'Advertencia'
                            : 'Regular'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Print Signatures */}
        <div className="hidden print:grid grid-cols-3 gap-8 pt-16 pb-8 px-6 text-center text-xs text-slate-800">
          <div className="border-t border-slate-900 pt-2">
            <p className="font-bold">Firma del Preceptor / Docente</p>
            <p className="text-[10px] text-slate-600">Aclaración y D.N.I.</p>
          </div>
          <div className="border-t border-slate-900 pt-2">
            <p className="font-bold">Firma Regencia Técnica</p>
            <p className="text-[10px] text-slate-600">I.P.E.T. N° 247</p>
          </div>
          <div className="border-t border-slate-900 pt-2">
            <p className="font-bold">Firma Dirección</p>
            <p className="text-[10px] text-slate-600">Sello de la Institución</p>
          </div>
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 bg-[#0A1D37]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D5DCE6] rounded-lg max-w-md w-full overflow-hidden shadow-xl relative">
            <div className="h-1 w-full flex">
              <div className="w-3/4 bg-[#0F294A]" />
              <div className="w-1/4 bg-[#B91C1C]" />
            </div>

            <div className="p-5 relative">
              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-900 p-1 rounded font-bold cursor-pointer"
                aria-label="Cerrar ficha"
              >
                ✕
              </button>

              <div className="flex items-center gap-3 mb-4 pr-6">
                <div className="w-10 h-10 rounded-md bg-[#0F294A] text-white flex items-center justify-center font-bold font-school-serif text-base shrink-0">
                  {selectedStudentDetail.student.lastName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold font-school-serif text-[#0F294A]">
                    {selectedStudentDetail.student.lastName}, {selectedStudentDetail.student.firstName}
                  </h3>
                  <p className="text-xs text-slate-600">
                    DNI: <strong className="font-school-mono text-slate-900">{selectedStudentDetail.student.dni}</strong> · {currentCourse?.name}
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#D5DCE6] rounded-md grid grid-cols-4 divide-x divide-[#E4E9F0] mb-4">
                <div className="p-2 text-center">
                  <div className="text-base font-bold font-school-mono text-emerald-700">{selectedStudentDetail.presentes}</div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Presentes</div>
                </div>
                <div className="p-2 text-center">
                  <div className="text-base font-bold font-school-mono text-[#B91C1C]">{selectedStudentDetail.ausentes}</div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Ausentes</div>
                </div>
                <div className="p-2 text-center">
                  <div className="text-base font-bold font-school-mono text-[#0F294A]">{selectedStudentDetail.justificados}</div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Justif.</div>
                </div>
                <div className="p-2 text-center">
                  <div className="text-base font-bold font-school-mono text-amber-700">{selectedStudentDetail.tardanzas}</div>
                  <div className="text-[9px] text-slate-500 font-bold uppercase">Tardanzas</div>
                </div>
              </div>

              <div className="bg-[#F8FAFC] p-3 rounded-md border border-[#E4E9F0] space-y-1.5 text-xs text-slate-700 mb-4">
                <div className="flex justify-between">
                  <span>Total de Inasistencias Computadas:</span>
                  <span className="font-bold font-school-mono text-slate-900">{selectedStudentDetail.totalFaltasComputadas} faltas</span>
                </div>
                <div className="flex justify-between">
                  <span>Porcentaje de Asistencia:</span>
                  <span className="font-bold font-school-mono text-[#0F294A]">{selectedStudentDetail.porcentajeAsistencia}%</span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-[#E4E9F0]">
                  <span>Condición Escolar:</span>
                  <span className={`font-bold ${
                    selectedStudentDetail.alertaFaltas === 'critico'
                      ? 'text-[#B91C1C]'
                      : selectedStudentDetail.alertaFaltas === 'advertencia'
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}>
                    {selectedStudentDetail.alertaFaltas === 'critico'
                      ? 'Condición Libre (≥ 25 faltas)'
                      : selectedStudentDetail.alertaFaltas === 'advertencia'
                      ? 'Advertencia preventiva'
                      : 'Regular'}
                  </span>
                </div>
              </div>

              {selectedStudentDetail.student.guardianName && (
                <div className="text-xs text-slate-700 bg-[#F8FAFC] p-2.5 rounded-md border border-[#E4E9F0] mb-4">
                  <span className="font-semibold text-[#0F294A]">Contacto de Tutor:</span> {selectedStudentDetail.student.guardianName}
                  {selectedStudentDetail.student.guardianPhone && (
                    <span className="block mt-0.5 font-school-mono text-slate-600">Tel: {selectedStudentDetail.student.guardianPhone}</span>
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => setSelectedStudentDetail(null)}
                  className="bg-[#0F294A] hover:bg-[#0A1D37] text-white font-semibold px-4 py-1.5 rounded-md text-xs cursor-pointer transition-colors"
                >
                  Cerrar Ficha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
