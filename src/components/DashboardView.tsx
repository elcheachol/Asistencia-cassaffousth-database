import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Users,
  BookOpen,
  ChevronRight,
  Bell,
} from 'lucide-react';
import { UserProfile, Course, Subject } from '../types';
import {
  getCourses,
  getAvailableCoursesForUser,
  getAvailableSubjectsForUser,
  getAllAttendanceSheets,
  getStudents,
} from '../services/storage';

type YearFilter = 'all' | '1' | '2' | '3';

function getCourseYearLevel(courseName: string): '1' | '2' | '3' | 'other' {
  const trimmed = courseName.trim();
  if (/^1[°º]?\b|^1er\b/i.test(trimmed)) return '1';
  if (/^2[°º]?\b|^2do\b/i.test(trimmed)) return '2';
  if (/^3[°º]?\b|^3er\b/i.test(trimmed)) return '3';
  return 'other';
}

interface DashboardViewProps {
  currentUser: UserProfile;
  pendingRequestsCount?: number;
  onOpenTakeAttendance: (courseId?: string) => void;
  onGoToMonthlyReport: (courseId?: string) => void;
  onGoToStudents: (courseId?: string) => void;
  onGoToAdminRequests?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  pendingRequestsCount = 0,
  onOpenTakeAttendance,
  onGoToMonthlyReport,
  onGoToStudents,
  onGoToAdminRequests,
}) => {
  const isAdmin = currentUser.role === 'administrador';
  const isTeacher = currentUser.role === 'profesor';

  const courses = useMemo(() => getCourses(), []);
  const allSheets = useMemo(() => getAllAttendanceSheets(), []);
  const allStudents = useMemo(() => getStudents(), []);
  const [selectedYearFilter, setSelectedYearFilter] = useState<YearFilter>('all');

  const todayStr = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // For teachers: their assigned courses
  const teacherCourses = useMemo(() => {
    return getAvailableCoursesForUser(currentUser);
  }, [currentUser]);

  // List of teacher's specific cátedras
  const teacherCatedras = useMemo(() => {
    if (!isTeacher) return [];
    const subjectsForTeacher: { course: Course; subject: Subject }[] = [];

    teacherCourses.forEach(course => {
      const subs = getAvailableSubjectsForUser(currentUser, course.id);
      subs.forEach(s => {
        subjectsForTeacher.push({ course, subject: s });
      });
    });

    return subjectsForTeacher;
  }, [isTeacher, currentUser, teacherCourses]);

  // Status cards for today's classes
  const todayStatusCards = useMemo(() => {
    if (isTeacher) {
      return teacherCatedras.map(({ course, subject }) => {
        const sheet = allSheets.find(
          s => s.date === todayStr && s.courseId === course.id && s.subjectId === subject.id
        );
        const courseStudents = allStudents.filter(st => st.courseId === course.id);

        if (!sheet) {
          return {
            title: subject.name,
            courseName: course.name,
            specialty: course.specialty,
            courseId: course.id,
            subjectId: subject.id,
            status: 'pending' as const,
            totalStudents: courseStudents.length,
            presentes: 0,
            ausentes: 0,
          };
        }

        let pres = 0;
        let aus = 0;
        sheet.entries.forEach(e => {
          if (e.status === 'presente') pres++;
          else if (e.status === 'ausente' || e.status === 'justificado') aus++;
        });

        return {
          title: subject.name,
          courseName: course.name,
          specialty: course.specialty,
          courseId: course.id,
          subjectId: subject.id,
          status: 'completed' as const,
          totalStudents: courseStudents.length,
          presentes: pres,
          ausentes: aus,
        };
      });
    }

    // For Preceptors: ONLY General Attendance
    return courses.map(course => {
      const sheet = allSheets.find(
        s => s.date === todayStr && s.courseId === course.id && s.subjectId === 'sub-general'
      );
      const courseStudents = allStudents.filter(st => st.courseId === course.id);

      if (!sheet) {
        return {
          title: `Asistencia General - ${course.name}`,
          courseName: course.name,
          specialty: course.specialty,
          courseId: course.id,
          subjectId: 'sub-general',
          status: 'pending' as const,
          totalStudents: courseStudents.length,
          presentes: 0,
          ausentes: 0,
        };
      }

      let pres = 0;
      let aus = 0;
      sheet.entries.forEach(e => {
        if (e.status === 'presente') pres++;
        else if (e.status === 'ausente' || e.status === 'justificado') aus++;
      });

      return {
        title: `Asistencia General - ${course.name}`,
        courseName: course.name,
        specialty: course.specialty,
        courseId: course.id,
        subjectId: 'sub-general',
        status: 'completed' as const,
        totalStudents: courseStudents.length,
        presentes: pres,
        ausentes: aus,
      };
    });
  }, [isTeacher, teacherCatedras, courses, allSheets, allStudents, todayStr]);

  const completedCount = todayStatusCards.filter(c => c.status === 'completed').length;
  const pendingCount = todayStatusCards.filter(c => c.status === 'pending').length;

  const adminCourseCards = useMemo(() => {
    if (!isAdmin) return [];
    return courses.map(course => {
      const courseStudents = allStudents.filter(st => st.courseId === course.id);
      const todaySheetsForCourse = allSheets.filter(
        s => s.date === todayStr && s.courseId === course.id
      );
      return {
        courseId: course.id,
        courseName: course.name,
        specialty: course.specialty || 'Ciclo Básico Técnico',
        turn: course.turn,
        totalStudents: courseStudents.length,
        todaySheetsCount: todaySheetsForCourse.length,
      };
    });
  }, [isAdmin, courses, allStudents, allSheets, todayStr]);

  const todayAllSheetsCount = useMemo(
    () => allSheets.filter(s => s.date === todayStr).length,
    [allSheets, todayStr]
  );

  const yearFilterOptions = useMemo(() => {
    const sourceNames = isAdmin
      ? adminCourseCards.map(c => c.courseName)
      : todayStatusCards.map(c => c.courseName);

    const countByYear: Record<'1' | '2' | '3', number> = { '1': 0, '2': 0, '3': 0 };
    sourceNames.forEach(name => {
      const level = getCourseYearLevel(name);
      if (level === '1' || level === '2' || level === '3') {
        countByYear[level]++;
      }
    });

    return [
      { key: 'all' as const, label: 'Todos', count: sourceNames.length },
      { key: '1' as const, label: '1° Año', count: countByYear['1'] },
      { key: '2' as const, label: '2° Año', count: countByYear['2'] },
      { key: '3' as const, label: '3° Año', count: countByYear['3'] },
    ];
  }, [isAdmin, adminCourseCards, todayStatusCards]);

  const filteredAdminCourseCards = useMemo(() => {
    if (selectedYearFilter === 'all') return adminCourseCards;
    return adminCourseCards.filter(
      c => getCourseYearLevel(c.courseName) === selectedYearFilter
    );
  }, [adminCourseCards, selectedYearFilter]);

  const filteredTodayStatusCards = useMemo(() => {
    if (selectedYearFilter === 'all') return todayStatusCards;
    return todayStatusCards.filter(
      c => getCourseYearLevel(c.courseName) === selectedYearFilter
    );
  }, [todayStatusCards, selectedYearFilter]);

  return (
    <div className="space-y-5">
      {/* Institutional Welcome Header */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg overflow-hidden shadow-2xs">
        <div className="h-1 w-full flex">
          <div className="w-3/4 bg-[#0F294A]" />
          <div className="w-1/4 bg-[#B91C1C]" />
        </div>
        <div className="p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <img
                src="/assets/aistudio/cassa-sn-fondo_ebfb5d01.png"
                alt="Escudo I.P.E.T. N° 247"
                referrerPolicy="no-referrer"
                className="w-5 h-5 object-contain shrink-0"
              />
              <span className="font-school-serif font-bold text-[#0F294A]">I.P.E.T. N° 247</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="font-semibold text-[#B91C1C]">Turno {currentUser.turn}</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">·</span>
              <span className="hidden sm:inline font-school-mono">{todayStr}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold font-school-serif text-[#0F294A] tracking-tight truncate">
              Libro de Aula · {currentUser.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              {isAdmin ? (
                <span>
                  Administración Institucional: acceso completo a todos los{' '}
                  <strong className="text-slate-900">cursos, cátedras, padrón de alumnos y planillas</strong> del establecimiento.
                </span>
              ) : isTeacher ? (
                <span>
                  Registro de cátedra docente: asiente las asistencias e inasistencias en sus{' '}
                  <strong className="text-slate-900">materias y talleres técnicos asignados</strong>.
                </span>
              ) : (
                <span>
                  Control de Preceptoría: asiente la{' '}
                  <strong className="text-slate-900">asistencia general diaria</strong> del curso para el libro matriz institucional.
                </span>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
              <span className="flex items-center gap-1 font-medium text-[#0F294A] sm:hidden font-school-mono">
                <Calendar className="w-3.5 h-3.5 text-[#B91C1C] shrink-0" />
                {todayStr}
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Users className="w-3.5 h-3.5 text-[#0F294A] shrink-0" />
                <span className="font-school-mono font-semibold text-[#0F294A]">{allStudents.length}</span> alumnos en matrícula
              </span>
            </div>
          </div>

          <div className="flex items-center self-start md:self-auto shrink-0">
            <button
              onClick={() => onGoToMonthlyReport()}
              className="bg-white hover:bg-[#F3F5F8] text-[#0F294A] font-semibold px-4 py-2 rounded-md border border-[#D5DCE6] flex items-center gap-1.5 text-xs cursor-pointer transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#B91C1C]" />
              <span>Ver Planillas Mensuales</span>
            </button>
          </div>
        </div>
      </div>

      {isAdmin && pendingRequestsCount > 0 && onGoToAdminRequests && (
        <div className="bg-white border border-[#D5DCE6] border-l-4 border-l-[#B91C1C] rounded-lg p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-[#B91C1C] shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-[#0F294A]">
                Notificación de Administración · {pendingRequestsCount}{' '}
                {pendingRequestsCount === 1
                  ? 'solicitud de registro pendiente'
                  : 'solicitudes de registro pendientes'}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {pendingRequestsCount === 1
                  ? 'Un usuario verificó su identidad por Gmail y aguarda su aprobación o rechazo.'
                  : 'Nuevos usuarios verificaron su identidad por Gmail y aguardan su aprobación o rechazo.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onGoToAdminRequests}
            className="bg-[#B91C1C] hover:bg-[#991B1B] text-white font-semibold px-4 py-2 rounded-md text-xs shrink-0 self-start sm:self-auto cursor-pointer transition-colors"
          >
            Revisar solicitudes
          </button>
        </div>
      )}

      {/* Course / Subject Roster Overview */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-[#E4E9F0] pb-3.5">
          <div>
            <h2 className="text-sm sm:text-base font-bold font-school-serif text-[#0F294A] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#B91C1C] shrink-0" />
              <span>
                {isAdmin
                  ? 'Cursos del Establecimiento (Administración)'
                  : isTeacher
                  ? 'Cátedras y Espacios Curriculares Asignados'
                  : 'Cursos del Turno (Asistencia General de Preceptoría)'}
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {isAdmin
                ? 'Vista general de matrícula y movimientos del día. Puede abrir cualquier curso si necesita cargar o editar asistencias.'
                : isTeacher
                ? 'Seleccione una cátedra para cargar o revisar la lista de hoy.'
                : 'Seleccione un curso para cargar o consultar la asistencia general del día.'}
            </p>
          </div>

          {isAdmin ? (
            <div className="flex items-center gap-3 text-xs shrink-0 font-medium text-slate-600">
              <span className="font-school-mono">
                <strong className="text-[#0F294A]">{courses.length}</strong> cursos
              </span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="font-school-mono">
                <strong className="text-[#0F294A]">{todayAllSheetsCount}</strong>{' '}
                {todayAllSheetsCount === 1 ? 'planilla hoy' : 'planillas hoy'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-xs shrink-0 font-medium text-slate-700">
              <span className="flex items-center gap-1 font-school-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <strong className="text-slate-900">{completedCount}</strong> Listos
              </span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="flex items-center gap-1 font-school-mono">
                <Clock className="w-3.5 h-3.5 text-[#B91C1C]" />
                <strong className="text-slate-900">{pendingCount}</strong> Pendientes
              </span>
            </div>
          )}
        </div>

        {/* Year Filter Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="Filtrar cursos por año"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#F3F5F8] rounded-md border border-[#D5DCE6]"
          >
            {yearFilterOptions.map(opt => {
              const active = selectedYearFilter === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedYearFilter(opt.key)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    active
                      ? 'bg-[#0F294A] text-white'
                      : 'text-slate-700 hover:text-[#0F294A] hover:bg-white/70'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span
                    className={`font-school-mono text-[11px] ${
                      active ? 'text-slate-200' : 'text-slate-500'
                    }`}
                  >
                    {opt.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Clean Institutional Grid */}
        {isAdmin ? (
          filteredAdminCourseCards.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-[#D5DCE6] rounded-md">
              No hay cursos registrados en el año seleccionado.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAdminCourseCards.map((course) => (
                <div
                  key={course.courseId}
                  onClick={() => onOpenTakeAttendance(course.courseId)}
                  className="p-4 rounded-md border border-[#D5DCE6] bg-white hover:border-[#0F294A] transition-colors cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                      <span className="font-semibold text-[#0F294A]">
                        Turno {course.turn}
                      </span>
                      <span className="text-[11px] font-school-mono text-slate-500">
                        {course.totalStudents} {course.totalStudents === 1 ? 'alumno' : 'alumnos'}
                      </span>
                    </div>

                    <h3 className="font-school-serif font-bold text-base text-slate-900 leading-snug group-hover:text-[#0F294A] transition-colors">
                      {course.courseName}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {course.specialty}
                    </p>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-[#E4E9F0] flex items-center justify-between text-xs">
                    {course.todaySheetsCount > 0 ? (
                      <span className="text-[#0F294A] font-medium text-[11px] font-school-mono">
                        {course.todaySheetsCount}{' '}
                        {course.todaySheetsCount === 1 ? 'registro hoy' : 'registros hoy'}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">
                        Sin registros hoy
                      </span>
                    )}

                    <span className="text-[#0F294A] group-hover:text-[#B91C1C] font-semibold text-[11px] flex items-center gap-0.5 transition-colors">
                      <span>Cargar / Editar</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredTodayStatusCards.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 border border-dashed border-[#D5DCE6] rounded-md">
            No hay cursos ni cátedras registradas en el año seleccionado.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTodayStatusCards.map((item, idx) => {
              const isCompleted = item.status === 'completed';

              return (
                <div
                  key={idx}
                  onClick={() => onOpenTakeAttendance(item.courseId)}
                  className="p-4 rounded-md border border-[#D5DCE6] bg-white hover:border-[#0F294A] transition-colors cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                      <span className="font-semibold text-[#0F294A]">
                        {item.courseName}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          isCompleted ? 'text-emerald-700' : 'text-[#B91C1C]'
                        }`}
                      >
                        {isCompleted ? 'Asentado' : 'Pendiente hoy'}
                      </span>
                    </div>

                    <h3 className="font-school-serif font-bold text-sm text-slate-900 leading-snug group-hover:text-[#0F294A] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {item.specialty || 'Ciclo Básico'}
                    </p>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-[#E4E9F0] flex items-center justify-between text-xs">
                    {isCompleted ? (
                      <span className="text-slate-700 font-medium text-[11px] font-school-mono">
                        {item.presentes} Pres. · {item.ausentes} Aus.
                      </span>
                    ) : (
                      <span className="text-slate-600 font-medium text-[11px] font-school-mono">
                        {item.totalStudents} alumnos
                      </span>
                    )}

                    <span className="text-[#0F294A] group-hover:text-[#B91C1C] font-semibold text-[11px] flex items-center gap-0.5 transition-colors">
                      <span>{isCompleted ? 'Revisar' : 'Cargar'}</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
