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
    <div className="space-y-4 sm:space-y-5">
      {/* Welcome Banner - Refined institutional letterhead style */}
      <div className="bg-white border border-[#DCD7D0] rounded-xl p-4 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="inline-flex items-center gap-2 text-xs text-[#8E1919] font-bold">
              <img
                src="/assets/aistudio/cassa-sn-fondo_ebfb5d01.png"
                alt="Escudo"
                className="w-5 h-5 object-contain shrink-0"
              />
              <span className="font-school-serif tracking-wide">I.P.E.T. N° 247 · Ing. Carlos A. Cassaffousth</span>
              <span className="text-[#DCD7D0]">|</span>
              <span className="text-slate-600 font-normal">Turno {currentUser.turn}</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold font-school-serif text-[#16212E] tracking-tight truncate">
              Libro de Aula · {currentUser.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-700 max-w-2xl leading-relaxed">
              {isTeacher ? (
                <span>
                  Registro de cátedra docente: asiente las asistencias e inasistencias en sus <strong>materias y talleres técnicos asignados</strong>.
                </span>
              ) : (
                <span>
                  Control de Preceptoría: asiente la <strong>asistencia general diaria</strong> del curso para el libro matriz de entrada institucional.
                </span>
              )}
            </p>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-600 pt-1">
              <span className="flex items-center gap-1 font-semibold text-[#16212E]">
                <Calendar className="w-3.5 h-3.5 text-[#8E1919] shrink-0" />
                Fecha: {todayStr}
              </span>
              <span className="text-[#DCD7D0]">·</span>
              <span className="flex items-center gap-1 font-semibold text-[#2E5328]">
                <Users className="w-3.5 h-3.5 text-[#2E5328] shrink-0" />
                {allStudents.length} Alumnos en matrícula
              </span>
            </div>
          </div>

          {/* Direct link to monthly reports */}
          <div className="flex items-center self-start md:self-auto shrink-0">
            <button
              onClick={() => onGoToMonthlyReport()}
              className="bg-[#F8F7F4] hover:bg-[#EFECE6] text-[#16212E] font-semibold px-3.5 py-2 rounded-lg border border-[#DCD7D0] flex items-center gap-1.5 text-xs cursor-pointer transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#8E1919]" />
              <span>Ver Planillas Mensuales</span>
            </button>
          </div>
        </div>
      </div>

      {/* Course / Subject Roster Overview */}
      <div className="bg-white border border-[#DCD7D0] rounded-xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-[#E8E4DD] pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold font-school-serif text-[#16212E] flex items-center gap-2">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#8E1919] shrink-0" />
              <span>
                {isTeacher
                  ? 'Cátedras y Espacios Curriculares Asignados'
                  : 'Cursos del Turno (Asistencia General de Preceptoría)'}
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {isTeacher
                ? 'Haga clic en cualquiera de sus cátedras para asentar o revisar la lista de hoy.'
                : 'Haga clic en un curso para cargar o consultar la asistencia general del día.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs shrink-0 font-medium">
            <span className="px-2.5 py-0.5 rounded bg-[#F4F9F3] text-[#2E5328] border border-[#C5DEC0] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E5328]" />
              {completedCount} Listos
            </span>
            <span className="px-2.5 py-0.5 rounded bg-[#FFFBF5] text-[#8D5B18] border border-[#EADBCA] flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#8D5B18]" />
              {pendingCount} Pendientes
            </span>
          </div>
        </div>

        {/* Clean, Non-Redundant Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {todayStatusCards.map((item, idx) => {
            const isCompleted = item.status === 'completed';

            return (
              <div
                key={idx}
                onClick={() => onOpenTakeAttendance(item.courseId)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                  isCompleted
                    ? 'bg-[#FCFDFB] border-[#CDE1CA] hover:border-[#2E5328] hover:shadow-xs'
                    : 'bg-[#FCFBFA] border-[#DCD7D0] hover:border-[#8E1919] hover:shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-bold text-[#16212E] bg-[#F1EFEA] px-2 py-0.5 rounded border border-[#DDD8D0]">
                      {item.courseName}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        isCompleted
                          ? 'bg-[#2E5328] text-white'
                          : 'bg-[#FFF3E0] text-[#9A3412] border border-[#FED7AA]'
                      }`}
                    >
                      {isCompleted ? '✓ Asentado' : 'Pendiente hoy'}
                    </span>
                  </div>

                  <h3 className="font-school-serif font-bold text-sm text-[#16212E] mt-1 leading-snug group-hover:text-[#8E1919] transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {item.specialty || 'Ciclo Básico'}
                  </p>
                </div>

                <div className="mt-3.5 pt-2.5 border-t border-[#EAE6DF] flex items-center justify-between text-xs">
                  {isCompleted ? (
                    <span className="text-[#2E5328] font-bold text-[11px]">
                      {item.presentes} Pres. · {item.ausentes} Aus.
                    </span>
                  ) : (
                    <span className="text-[#9A3412] font-medium text-[11px]">
                      {item.totalStudents} Alumnos sin asentar
                    </span>
                  )}

                  <span className="text-slate-500 group-hover:text-[#8E1919] font-semibold text-[11px] flex items-center gap-0.5 transition-colors">
                    <span>{isCompleted ? 'Revisar' : 'Cargar'}</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Informative School Tips Footer */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-[#DCD7D0] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-1.5 text-[#8E1919] font-school-serif font-bold text-xs mb-1">
            <Info className="w-4 h-4 text-[#8E1919] shrink-0" />
            <span>Cómputo de Faltas Escolares</span>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Inasistencia injustificada: 1 falta. Tardanza: 0.5 falta. Las justificaciones requieren certificado médico o constancia autorizada por Preceptoría dentro de los plazos reglamentarios.
          </p>
        </div>

        <div className="bg-white border border-[#DCD7D0] rounded-xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-1.5 text-[#2E5328] font-school-serif font-bold text-xs mb-1">
            <FileSpreadsheet className="w-4 h-4 text-[#2E5328] shrink-0" />
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
