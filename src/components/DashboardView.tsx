import React, { useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  Users,
  School,
  BookOpen,
  Info,
  ChevronRight,
  ClipboardList,
} from 'lucide-react';
import { UserProfile, Course, Subject } from '../types';
import {
  getCourses,
  getSubjects,
  getAvailableCoursesForUser,
  getAvailableSubjectsForUser,
  getAllAttendanceSheets,
  getStudents,
} from '../services/storage';

interface DashboardViewProps {
  currentUser: UserProfile;
  onOpenTakeAttendance: (courseId?: string) => void;
  onGoToMonthlyReport: (courseId?: string) => void;
  onGoToStudents: (courseId?: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentUser,
  onOpenTakeAttendance,
  onGoToMonthlyReport,
  onGoToStudents,
}) => {
  const isTeacher = currentUser.role === 'profesor';

  const courses = useMemo(() => getCourses(), []);
  const allSheets = useMemo(() => getAllAttendanceSheets(), []);
  const allStudents = useMemo(() => getStudents(), []);

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
          else if (e.status === 'ausente') aus++;
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
        else if (e.status === 'ausente') aus++;
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
              {isTeacher ? (
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

      {/* Course / Subject Roster Overview */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg p-4 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-[#E4E9F0] pb-3.5">
          <div>
            <h2 className="text-sm sm:text-base font-bold font-school-serif text-[#0F294A] flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#B91C1C] shrink-0" />
              <span>
                {isTeacher
                  ? 'Cátedras y Espacios Curriculares Asignados'
                  : 'Cursos del Turno (Asistencia General de Preceptoría)'}
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {isTeacher
                ? 'Seleccione una cátedra para cargar o revisar la lista de hoy.'
                : 'Seleccione un curso para cargar o consultar la asistencia general del día.'}
            </p>
          </div>

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
        </div>

        {/* Clean Institutional Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {todayStatusCards.map((item, idx) => {
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
      </div>

      {/* Institutional Reference Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-[#D5DCE6] rounded-lg p-4 shadow-2xs">
          <div className="flex items-center gap-1.5 text-[#B91C1C] font-school-serif font-bold text-xs mb-1">
            <Info className="w-4 h-4 shrink-0" />
            <span>Cómputo de Faltas Escolares</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Inasistencia injustificada: 1 falta. Tardanza: 0.5 falta. Las justificaciones requieren certificado médico o constancia autorizada por Preceptoría dentro de los plazos reglamentarios.
          </p>
        </div>

        <div className="bg-white border border-[#D5DCE6] rounded-lg p-4 shadow-2xs">
          <div className="flex items-center gap-1.5 text-[#0F294A] font-school-serif font-bold text-xs mb-1">
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>Planillas Oficiales del I.P.E.T. N° 247</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Descargue en Excel (.XLSX) o imprima el formulario mensual oficial para el archivo institucional y las firmas de Preceptoría y Dirección.
          </p>
        </div>
      </div>
    </div>
  );
};
