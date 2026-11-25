import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Search,
  Trash2,
  Phone,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { Student, UserProfile } from '../types';
import {
  getCourses,
  getStudents,
  saveStudent,
  deleteStudent,
  syncStudentsFromServer,
} from '../services/storage';
import { studentMatchesQuery } from '../utils/textUtils';

interface StudentsViewProps {
  currentUser: UserProfile;
  initialCourseId?: string;
  onTakeAttendanceForCourse?: (courseId: string) => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  currentUser,
  initialCourseId,
  onTakeAttendanceForCourse,
}) => {
  const courses = useMemo(() => getCourses(), []);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>(
    initialCourseId || 'all'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [allStudentsList, setAllStudentsList] = useState<Student[]>(() => getStudents());
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Student Form
  const [newDni, setNewDni] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newCourseId, setNewCourseId] = useState(courses[0]?.id || '');
  const [newGuardianName, setNewGuardianName] = useState('');
  const [newGuardianPhone, setNewGuardianPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const refreshStudents = () => {
    setAllStudentsList(getStudents());
  };

  useEffect(() => {
    let cancelled = false;
    syncStudentsFromServer()
      .then((fresh) => {
        if (!cancelled) {
          setAllStudentsList(fresh);
        }
      })
      .catch((err) => {
        console.error('Error syncing students:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredStudents = useMemo(() => {
    return allStudentsList.filter(st => {
      if (selectedCourseFilter !== 'all' && st.courseId !== selectedCourseFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        return studentMatchesQuery(st, searchTerm);
      }
      return true;
    });
  }, [allStudentsList, selectedCourseFilter, searchTerm]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLastName.trim() || !newFirstName.trim() || !newDni.trim()) return;

    setIsSaving(true);
    setErrorMsg(null);
    const student: Student = {
      id: `st-${Date.now()}`,
      dni: newDni.trim(),
      lastName: newLastName.trim(),
      firstName: newFirstName.trim(),
      courseId: newCourseId,
      guardianName: newGuardianName.trim() || undefined,
      guardianPhone: newGuardianPhone.trim() || undefined,
    };

    try {
      const saved = await saveStudent(student);
      refreshStudents();
      setIsModalOpen(false);
      setSuccessMsg(`Se guardó correctamente a ${saved.lastName}, ${saved.firstName} en el padrón.`);
      setTimeout(() => setSuccessMsg(null), 4000);

      setNewDni('');
      setNewLastName('');
      setNewFirstName('');
      setNewGuardianName('');
      setNewGuardianPhone('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo guardar el alumno en el padrón.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (student: Student) => {
    if (confirm(`¿Confirma eliminar a ${student.lastName}, ${student.firstName} del padrón?`)) {
      setErrorMsg(null);
      try {
        await deleteStudent(student.id);
        refreshStudents();
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : 'No se pudo eliminar el alumno.'
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
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/cassa-sn-fondo_ebfb5d01.png"
              alt="Escudo I.P.E.T. N° 247"
              referrerPolicy="no-referrer"
              className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0"
            />
            <div>
              <div className="text-xs font-semibold text-[#B91C1C] mb-0.5">
                I.P.E.T. N° 247 · Padrón Institucional
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-school-serif text-[#0F294A] tracking-tight">
                Nómina de Alumnos y Cursos
              </h1>
              <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
                Estudiantes matriculados de 1° a 3° Año en el I.P.E.T. N° 247.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <button
              onClick={() => {
                if (selectedCourseFilter !== 'all') {
                  setNewCourseId(selectedCourseFilter);
                }
                setErrorMsg(null);
                setIsModalOpen(true);
              }}
              className="bg-[#0F294A] hover:bg-[#0A1D37] text-white font-semibold px-4 py-2 rounded-md text-xs sm:text-sm cursor-pointer flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              <span>Añadir Alumno al Padrón</span>
            </button>
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

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="w-full sm:w-64">
            <select
              value={selectedCourseFilter}
              onChange={e => setSelectedCourseFilter(e.target.value)}
              className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md px-2.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0F294A]"
            >
              <option value="all">Todos los Cursos ({allStudentsList.length} alumnos)</option>
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
              placeholder="Buscar por nombre, apellido o DNI (sin tildes)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md pl-8 pr-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0F294A]"
            />
          </div>
        </div>

        <div className="text-xs text-slate-600 font-medium self-end md:self-center">
          Alumnos listados:{' '}
          <span className="font-school-mono font-bold text-[#0F294A]">{filteredStudents.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#D5DCE6] rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-900 border-collapse">
            <thead className="bg-[#0F294A] text-white text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-2.5 text-center w-10 border-r border-white/15">N°</th>
                <th className="py-2.5 px-3 border-r border-white/15">Estudiante</th>
                <th className="py-2.5 px-3 text-center w-28 border-r border-white/15">D.N.I.</th>
                <th className="py-2.5 px-3 border-r border-white/15">Curso / División</th>
                <th className="py-2.5 px-3 border-r border-white/15">Tutor Responsable</th>
                <th className="py-2.5 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E9F0]">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500 italic">
                    No se encontraron estudiantes para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, idx) => {
                  const course = courses.find(c => c.id === st.courseId);

                  return (
                    <tr key={st.id} className={idx % 2 === 1 ? 'bg-[#F8FAFC]' : 'bg-white'}>
                      <td className="py-2.5 px-2.5 text-center font-school-mono text-slate-500 border-r border-[#E4E9F0] text-xs">
                        {idx + 1}
                      </td>

                      <td className="py-2.5 px-3 font-semibold text-slate-900 border-r border-[#E4E9F0]">
                        {st.lastName}, {st.firstName}
                      </td>

                      <td className="py-2.5 px-3 text-center font-school-mono text-xs text-slate-700 border-r border-[#E4E9F0]">
                        {st.dni}
                      </td>

                      <td className="py-2.5 px-3 border-r border-[#E4E9F0]">
                        <span className="font-semibold text-[#0F294A]">
                          {course ? course.name : 'Sin asignar'}
                        </span>
                        {course?.specialty && (
                          <span className="text-[11px] text-slate-500 block">
                            {course.specialty}
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 border-r border-[#E4E9F0]">
                        {st.guardianName ? (
                          <div>
                            <span className="text-xs font-medium text-slate-800">
                              {st.guardianName}
                            </span>
                            {st.guardianPhone && (
                              <div className="text-[11px] text-slate-500 font-school-mono flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{st.guardianPhone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Sin tutor registrado</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {onTakeAttendanceForCourse && (
                            <button
                              type="button"
                              onClick={() => onTakeAttendanceForCourse(st.courseId)}
                              className="text-xs text-[#0F294A] hover:text-white bg-white hover:bg-[#0F294A] border border-[#D5DCE6] hover:border-[#0F294A] px-2.5 py-1 rounded cursor-pointer font-semibold transition-colors whitespace-nowrap"
                            >
                              Tomar Asistencia
                            </button>
                          )}
                          {(currentUser.role === 'preceptor' || currentUser.role === 'administrador') && (
                            <button
                              type="button"
                              onClick={() => handleDelete(st)}
                              title="Eliminar del padrón"
                              className="text-slate-400 hover:text-[#B91C1C] p-1 rounded hover:bg-rose-50 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Modal Add Student */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A1D37]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#D5DCE6] rounded-lg max-w-md w-full p-5 shadow-xl relative">
            <h3 className="text-base font-bold font-school-serif text-[#0F294A] mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-[#B91C1C]" />
              <span>Añadir Nuevo Estudiante al Padrón</span>
            </h3>

            <form onSubmit={handleAddStudent} className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Gómez"
                    value={newLastName}
                    onChange={e => setNewLastName(e.target.value)}
                    className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F294A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre(s) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Marcos David"
                    value={newFirstName}
                    onChange={e => setNewFirstName(e.target.value)}
                    className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F294A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    D.N.I. *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 46.543.210"
                    value={newDni}
                    onChange={e => setNewDni(e.target.value)}
                    className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md px-2.5 text-xs text-slate-900 font-school-mono focus:outline-none focus:border-[#0F294A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Curso *
                  </label>
                  <select
                    value={newCourseId}
                    onChange={e => setNewCourseId(e.target.value)}
                    className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md px-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-[#0F294A]"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.turn})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Tutor / Padre / Madre
                </label>
                <input
                  type="text"
                  placeholder="Ej: Rosa Gómez"
                  value={newGuardianName}
                  onChange={e => setNewGuardianName(e.target.value)}
                  className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md px-2.5 text-xs text-slate-900 focus:outline-none focus:border-[#0F294A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono de Contacto
                </label>
                <input
                  type="text"
                  placeholder="Ej: 351-4123456"
                  value={newGuardianPhone}
                  onChange={e => setNewGuardianPhone(e.target.value)}
                  className="w-full h-9 bg-white border border-[#D5DCE6] rounded-md px-2.5 text-xs text-slate-900 font-school-mono focus:outline-none focus:border-[#0F294A]"
                />
              </div>

              <div className="pt-2.5 flex items-center justify-end gap-2 border-t border-[#E4E9F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-[#0F294A] hover:bg-[#0A1D37] disabled:opacity-60 text-white font-semibold px-4 py-1.5 rounded-md text-xs cursor-pointer transition-colors"
                >
                  {isSaving ? 'Guardando...' : 'Guardar Alumno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
