import type { Course, Subject, Student, AttendanceSheet } from '../types/index.ts';

export const SEED_COURSES: Course[] = [
  {
    id: 'c-1a',
    name: '1° Año "A"',
    specialty: 'Ciclo Básico Técnico',
    cycle: 'Ciclo Básico',
    turn: 'Mañana',
    preceptorId: 'user-prec-1',
  },
  {
    id: 'c-1b',
    name: '1° Año "B"',
    specialty: 'Ciclo Básico Técnico',
    cycle: 'Ciclo Básico',
    turn: 'Tarde',
    preceptorId: 'user-prec-2',
  },
  {
    id: 'c-2a',
    name: '2° Año "A"',
    specialty: 'Ciclo Básico Técnico',
    cycle: 'Ciclo Básico',
    turn: 'Mañana',
    preceptorId: 'user-prec-1',
  },
  {
    id: 'c-2b',
    name: '2° Año "B"',
    specialty: 'Ciclo Básico Técnico',
    cycle: 'Ciclo Básico',
    turn: 'Tarde',
    preceptorId: 'user-prec-2',
  },
  {
    id: 'c-3a',
    name: '3° Año "A"',
    specialty: 'Ciclo Básico Técnico',
    cycle: 'Ciclo Básico',
    turn: 'Mañana',
    preceptorId: 'user-prec-1',
  },
  {
    id: 'c-3b',
    name: '3° Año "B"',
    specialty: 'Ciclo Básico Técnico',
    cycle: 'Ciclo Básico',
    turn: 'Tarde',
    preceptorId: 'user-prec-2',
  },
];

export const SEED_SUBJECTS: Subject[] = [
  { id: 'sub-general', name: 'Asistencia General (Preceptoría / Entrada)', courseId: 'all' },

  // 1° Año A
  { id: 'sub-mat-1a', name: 'Matemática I', courseId: 'c-1a', weeklyHours: 5 },
  { id: 'sub-len-1a', name: 'Lengua y Literatura I', courseId: 'c-1a', weeklyHours: 4 },
  { id: 'sub-tall-1a', name: 'Taller de Ajuste Manual y Hojalatería', courseId: 'c-1a', weeklyHours: 6 },
  { id: 'sub-dib-1a', name: 'Dibujo Técnico I', courseId: 'c-1a', weeklyHours: 4 },

  // 1° Año B
  { id: 'sub-mat-1b', name: 'Matemática I', courseId: 'c-1b', weeklyHours: 5 },
  { id: 'sub-tall-1b', name: 'Taller de Ajuste Manual y Carpintería', courseId: 'c-1b', weeklyHours: 6 },
  { id: 'sub-cs-1b', name: 'Ciencias Naturales (Físico-Química)', courseId: 'c-1b', weeklyHours: 4 },

  // 2° Año A
  { id: 'sub-mat-2a', name: 'Matemática II', courseId: 'c-2a', weeklyHours: 5 },
  { id: 'sub-tall-2a', name: 'Taller de Tornería y Soldadura', courseId: 'c-2a', weeklyHours: 6 },
  { id: 'sub-elec-2a', name: 'Electricidad Básica', courseId: 'c-2a', weeklyHours: 4 },
  { id: 'sub-dib-2a', name: 'Dibujo Técnico II', courseId: 'c-2a', weeklyHours: 4 },

  // 2° Año B
  { id: 'sub-mat-2b', name: 'Matemática II', courseId: 'c-2b', weeklyHours: 5 },
  { id: 'sub-tall-2b', name: 'Taller de Herrería y Soldadura', courseId: 'c-2b', weeklyHours: 6 },
  { id: 'sub-len-2b', name: 'Lengua y Literatura II', courseId: 'c-2b', weeklyHours: 4 },

  // 3° Año A
  { id: 'sub-mat-3a', name: 'Matemática III', courseId: 'c-3a', weeklyHours: 4 },
  { id: 'sub-tall-3a', name: 'Taller de Mecanizado CNC y Fresado', courseId: 'c-3a', weeklyHours: 6 },
  { id: 'sub-fis-3a', name: 'Física Aplicada', courseId: 'c-3a', weeklyHours: 4 },
  { id: 'sub-elec-3a', name: 'Instalaciones Eléctricas Básicas', courseId: 'c-3a', weeklyHours: 4 },

  // 3° Año B
  { id: 'sub-mat-3b', name: 'Matemática III', courseId: 'c-3b', weeklyHours: 4 },
  { id: 'sub-tall-3b', name: 'Taller de Electrónica y Motores Básicos', courseId: 'c-3b', weeklyHours: 6 },
  { id: 'sub-fis-3b', name: 'Física y Química Aplicada', courseId: 'c-3b', weeklyHours: 4 },
];

export const SEED_STUDENTS: Student[] = [
  // 1° Año A
  { id: 'st-1a-01', dni: '48.112.330', lastName: 'Altamirano', firstName: 'Tiziano Nahuel', courseId: 'c-1a', guardianName: 'Patricia Altamirano', guardianPhone: '351-2233441' },
  { id: 'st-1a-02', dni: '48.234.901', lastName: 'Argañaraz', firstName: 'Ciro Bautista', courseId: 'c-1a', guardianName: 'Marcelo Argañaraz', guardianPhone: '351-3344552' },
  { id: 'st-1a-03', dni: '48.098.221', lastName: 'Brizuela', firstName: 'Candela Lourdes', courseId: 'c-1a', guardianName: 'Mariana Brizuela', guardianPhone: '351-4455663' },
  { id: 'st-1a-04', dni: '48.455.109', lastName: 'Choque', firstName: 'Facundo', courseId: 'c-1a', guardianName: 'Carlos Choque', guardianPhone: '351-5566774' },
  { id: 'st-1a-05', dni: '48.309.812', lastName: 'Ceballos', firstName: 'Malena Ailén', courseId: 'c-1a', guardianName: 'Norma Ceballos', guardianPhone: '351-6677885' },
  { id: 'st-1a-06', dni: '48.190.234', lastName: 'Funes', firstName: 'Lisandro Gael', courseId: 'c-1a', guardianName: 'Pablo Funes', guardianPhone: '351-7788996' },
  { id: 'st-1a-07', dni: '48.601.442', lastName: 'Ledesma', firstName: 'Ludmila Morena', courseId: 'c-1a', guardianName: 'Laura Ledesma', guardianPhone: '351-8899007' },
  { id: 'st-1a-08', dni: '48.512.909', lastName: 'Páez Mendoza', firstName: 'Thiago', courseId: 'c-1a', guardianName: 'Diego Páez Mendoza', guardianPhone: '351-9900118' },
  { id: 'st-1a-09', dni: '48.421.770', lastName: 'Pedernera', firstName: 'Brisa Oriana', courseId: 'c-1a', guardianName: 'Sonia Pedernera', guardianPhone: '351-1122339' },
  { id: 'st-1a-10', dni: '48.330.129', lastName: 'Villafañe', firstName: 'Alma Catalina', courseId: 'c-1a', guardianName: 'Cristian Villafañe', guardianPhone: '351-2233440' },

  // 1° Año B
  { id: 'st-1b-01', dni: '48.701.112', lastName: 'Agüero', firstName: 'Renzo Octavio', courseId: 'c-1b', guardianName: 'Raúl Agüero', guardianPhone: '351-9876543' },
  { id: 'st-1b-02', dni: '48.720.912', lastName: 'Barrionuevo', firstName: 'Jeremías Leonel', courseId: 'c-1b', guardianName: 'Rosa Barrionuevo', guardianPhone: '351-8765432' },
  { id: 'st-1b-03', dni: '48.798.771', lastName: 'Cornejo', firstName: 'Santino Ariel', courseId: 'c-1b', guardianName: 'Héctor Cornejo', guardianPhone: '351-7654321' },
  { id: 'st-1b-04', dni: '48.831.409', lastName: 'Gudiño', firstName: 'Lautaro Iván', courseId: 'c-1b', guardianName: 'Teresa Gudiño', guardianPhone: '351-6543210' },
  { id: 'st-1b-05', dni: '48.989.123', lastName: 'Maidana', firstName: 'Genaro Ezequiel', courseId: 'c-1b', guardianName: 'Oscar Maidana', guardianPhone: '351-5432109' },
  { id: 'st-1b-06', dni: '48.911.002', lastName: 'Salguero', firstName: 'Ramiro Benjamín', courseId: 'c-1b', guardianName: 'Susana Salguero', guardianPhone: '351-4321098' },

  // 2° Año A
  { id: 'st-2a-01', dni: '47.128.452', lastName: 'Ávila', firstName: 'Joaquín Ignacio', courseId: 'c-2a', guardianName: 'Silvia Ávila', guardianPhone: '351-4829102' },
  { id: 'st-2a-02', dni: '47.981.203', lastName: 'Balderrama', firstName: 'Mateo Valentín', courseId: 'c-2a', guardianName: 'Carlos Balderrama', guardianPhone: '351-5192831' },
  { id: 'st-2a-03', dni: '47.340.119', lastName: 'Cabral', firstName: 'Bianca Solange', courseId: 'c-2a', guardianName: 'Marta Cabral', guardianPhone: '351-6781290' },
  { id: 'st-2a-04', dni: '47.892.304', lastName: 'Carrizo', firstName: 'Alejo Agustín', courseId: 'c-2a', guardianName: 'Jorge Carrizo', guardianPhone: '351-3490182' },
  { id: 'st-2a-05', dni: '47.502.941', lastName: 'Gaitán', firstName: 'Máximo Julián', courseId: 'c-2a', guardianName: 'Elena Gaitán', guardianPhone: '351-7890123' },
  { id: 'st-2a-06', dni: '47.772.109', lastName: 'Heredia', firstName: 'Priscila Rocío', courseId: 'c-2a', guardianName: 'Ricardo Heredia', guardianPhone: '351-8901234' },
  { id: 'st-2a-07', dni: '47.019.283', lastName: 'Moyano', firstName: 'Tomás Benjamín', courseId: 'c-2a', guardianName: 'Marcela Moyano', guardianPhone: '351-9012345' },
  { id: 'st-2a-08', dni: '47.211.890', lastName: 'Quiroga', firstName: 'Axel Damián', courseId: 'c-2a', guardianName: 'Gustavo Quiroga', guardianPhone: '351-0123456' },

  // 2° Año B
  { id: 'st-2b-01', dni: '47.890.112', lastName: 'Barreto', firstName: 'Leandro Martín', courseId: 'c-2b', guardianName: 'Mirta Barreto', guardianPhone: '351-1209384' },
  { id: 'st-2b-02', dni: '47.712.940', lastName: 'Cárdenas', firstName: 'Pilar Agustina', courseId: 'c-2b', guardianName: 'Jorge Cárdenas', guardianPhone: '351-2310495' },
  { id: 'st-2b-03', dni: '47.920.334', lastName: 'Luján', firstName: 'Felipe Agustín', courseId: 'c-2b', guardianName: 'Liliana Luján', guardianPhone: '351-3421506' },
  { id: 'st-2b-04', dni: '47.601.889', lastName: 'Olmos', firstName: 'Bautista Gabriel', courseId: 'c-2b', guardianName: 'Eduardo Olmos', guardianPhone: '351-4532617' },
  { id: 'st-2b-05', dni: '47.882.102', lastName: 'Peñaloza', firstName: 'Micaela Milagros', courseId: 'c-2b', guardianName: 'Mónica Peñaloza', guardianPhone: '351-5643728' },
  { id: 'st-2b-06', dni: '47.790.415', lastName: 'Rearte', firstName: 'Tobías Manuel', courseId: 'c-2b', guardianName: 'Carlos Rearte', guardianPhone: '351-6754839' },

  // 3° Año A
  { id: 'st-3a-01', dni: '46.912.448', lastName: 'Maldonado', firstName: 'Florencia Abril', courseId: 'c-3a', guardianName: 'Patricia Maldonado', guardianPhone: '351-1234567' },
  { id: 'st-3a-02', dni: '46.401.782', lastName: 'Mercado', firstName: 'Franco Nicolás', courseId: 'c-3a', guardianName: 'Roberto Mercado', guardianPhone: '351-2345678' },
  { id: 'st-3a-03', dni: '46.698.120', lastName: 'Nieto', firstName: 'Nahuel Alejandro', courseId: 'c-3a', guardianName: 'Beatriz Nieto', guardianPhone: '351-3456789' },
  { id: 'st-3a-04', dni: '46.155.932', lastName: 'Ocampo', firstName: 'Camila Ayelén', courseId: 'c-3a', guardianName: 'Esteban Ocampo', guardianPhone: '351-4567890' },
  { id: 'st-3a-05', dni: '46.820.311', lastName: 'Pacheco', firstName: 'Enzo Gabriel', courseId: 'c-3a', guardianName: 'Lorena Pacheco', guardianPhone: '351-5678901' },
  { id: 'st-3a-06', dni: '46.290.418', lastName: 'Quevedo', firstName: 'Maximiliano', courseId: 'c-3a', guardianName: 'Hugo Quevedo', guardianPhone: '351-6789012' },
  { id: 'st-3a-07', dni: '46.002.399', lastName: 'Roldán', firstName: 'Luciana Abril', courseId: 'c-3a', guardianName: 'Claudia Roldán', guardianPhone: '351-7890124' },
  { id: 'st-3a-08', dni: '46.901.277', lastName: 'Santillán', firstName: 'Kevin Santiago', courseId: 'c-3a', guardianName: 'Daniel Santillán', guardianPhone: '351-8901235' },
  { id: 'st-3a-09', dni: '46.442.810', lastName: 'Sosa', firstName: 'Ignacio Julián', courseId: 'c-3a', guardianName: 'Roxana Sosa', guardianPhone: '351-9012346' },
  { id: 'st-3a-10', dni: '46.789.012', lastName: 'Tello', firstName: 'Milagros Agostina', courseId: 'c-3a', guardianName: 'Marcos Tello', guardianPhone: '351-0123457' },

  // 3° Año B
  { id: 'st-3b-01', dni: '46.943.201', lastName: 'Tapia', firstName: 'Victoria Sol', courseId: 'c-3b', guardianName: 'Daniela Tapia', guardianPhone: '351-7865940' },
  { id: 'st-3b-02', dni: '46.699.810', lastName: 'Zeballos', firstName: 'Ulises Damián', courseId: 'c-3b', guardianName: 'Héctor Zeballos', guardianPhone: '351-8976051' },
  { id: 'st-3b-03', dni: '46.190.844', lastName: 'Báez', firstName: 'Santino Joel', courseId: 'c-3b', guardianName: 'Walter Báez', guardianPhone: '351-3210987' },
  { id: 'st-3b-04', dni: '46.877.291', lastName: 'Ferreyra', firstName: 'Tobías Valentín', courseId: 'c-3b', guardianName: 'Graciela Ferreyra', guardianPhone: '351-2109876' },
  { id: 'st-3b-05', dni: '46.518.302', lastName: 'Mansilla', firstName: 'Gael Nicolás', courseId: 'c-3b', guardianName: 'Marcela Mansilla', guardianPhone: '351-6123980' },
  { id: 'st-3b-06', dni: '46.734.119', lastName: 'Quinteros', firstName: 'Martín Leonel', courseId: 'c-3b', guardianName: 'Carlos Quinteros', guardianPhone: '351-5341209' },
];

export function generateSeedAttendanceSheets(): AttendanceSheet[] {
  const sheets: AttendanceSheet[] = [];
  const students1a = SEED_STUDENTS.filter((s) => s.courseId === 'c-1a');
  const students3a = SEED_STUDENTS.filter((s) => s.courseId === 'c-3a');

  const schoolDaysNov = [
    '2026-11-02',
    '2026-11-03',
    '2026-11-04',
    '2026-11-05',
    '2026-11-06',
  ];

  const schoolDaysOct = [
    '2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07',
    '2026-10-08', '2026-10-09', '2026-10-13', '2026-10-14', '2026-10-15',
    '2026-10-16', '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22',
    '2026-10-23', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30',
  ];

  schoolDaysNov.forEach((date, index) => {
    const entriesGeneral1a = students1a.map((st, i) => {
      if (i === 1 && (index === 0 || index === 2)) {
        return { studentId: st.id, status: 'tardanza' as const, observation: 'Llegó 7:45 hs' };
      }
      if (i === 4 && index === 1) {
        return { studentId: st.id, status: 'justificado' as const, observation: 'Certificado odontológico' };
      }
      if (i === 6 && (index === 2 || index === 3)) {
        return { studentId: st.id, status: 'ausente' as const, observation: 'Sin aviso de los padres' };
      }
      return { studentId: st.id, status: 'presente' as const };
    });

    sheets.push({
      id: `sheet-seed-1a-gen-${date}`,
      date,
      courseId: 'c-1a',
      subjectId: 'sub-general',
      turn: 'Mañana',
      takenByUserId: 'user-prec-1',
      takenByUserName: 'Lucas Benítez',
      takenByRole: 'preceptor',
      entries: entriesGeneral1a,
      timestamp: `${date}T07:40:00Z`,
      notes: 'Registro diario de entrada regular.',
    });

    if (index === 1 || index === 3) {
      const entriesTaller3a = students3a.map((st, i) => {
        if (i === 5) return { studentId: st.id, status: 'ausente' as const, observation: 'Ausente en jornada de taller' };
        if (i === 2 && index === 3) return { studentId: st.id, status: 'tardanza' as const, observation: 'Ingreso tardío al pañol' };
        return { studentId: st.id, status: 'presente' as const };
      });

      sheets.push({
        id: `sheet-seed-3a-tall-${date}`,
        date,
        courseId: 'c-3a',
        subjectId: 'sub-tall-3a',
        turn: 'Mañana',
        takenByUserId: 'user-prof-1',
        takenByUserName: 'Ing. Marcelo Rossi',
        takenByRole: 'profesor',
        entries: entriesTaller3a,
        timestamp: `${date}T09:15:00Z`,
        notes: 'Prácticas de mecanizado en taller.',
      });
    }
  });

  schoolDaysOct.forEach((date, idx) => {
    const entriesGeneral1a = students1a.map((st, i) => {
      if (i === 7 && idx % 3 === 0) {
        return { studentId: st.id, status: 'ausente' as const, observation: 'Falta injustificada' };
      }
      if (i === 4 && (idx === 4 || idx === 8)) {
        return { studentId: st.id, status: 'justificado' as const, observation: 'Licencia médica' };
      }
      if (i === 1 && idx % 4 === 0) {
        return { studentId: st.id, status: 'tardanza' as const, observation: 'Demora transporte' };
      }
      if ((i + idx) % 17 === 0) {
        return { studentId: st.id, status: 'ausente' as const };
      }
      return { studentId: st.id, status: 'presente' as const };
    });

    sheets.push({
      id: `sheet-seed-oct-1a-${date}`,
      date,
      courseId: 'c-1a',
      subjectId: 'sub-general',
      turn: 'Mañana',
      takenByUserId: 'user-prec-1',
      takenByUserName: 'Lucas Benítez',
      takenByRole: 'preceptor',
      entries: entriesGeneral1a,
      timestamp: `${date}T07:45:00Z`,
      notes: 'Control matutino preceptoría.',
    });
  });

  return sheets;
}
