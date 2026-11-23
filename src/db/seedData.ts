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
  { id: 'st-1a-01', dni: '48.112.330', lastName: 'Álvarez', firstName: 'Bruno Matías', courseId: 'c-1a', guardianName: 'Cecilia Álvarez', guardianPhone: '351-2233441' },
  { id: 'st-1a-02', dni: '48.234.901', lastName: 'Benítez', firstName: 'Ciro Valentín', courseId: 'c-1a', guardianName: 'Juan Benítez', guardianPhone: '351-3344552' },
  { id: 'st-1a-03', dni: '48.098.221', lastName: 'Castro', firstName: 'Delfina Rocío', courseId: 'c-1a', guardianName: 'Mariana Castro', guardianPhone: '351-4455663' },
  { id: 'st-1a-04', dni: '48.455.109', lastName: 'Díaz', firstName: 'Emiliano José', courseId: 'c-1a', guardianName: 'Federico Díaz', guardianPhone: '351-5566774' },
  { id: 'st-1a-05', dni: '48.309.812', lastName: 'Fernández', firstName: 'Guadalupe Luz', courseId: 'c-1a', guardianName: 'Norma Fernández', guardianPhone: '351-6677885' },
  { id: 'st-1a-06', dni: '48.190.234', lastName: 'González', firstName: 'Ignacio David', courseId: 'c-1a', guardianName: 'Pablo González', guardianPhone: '351-7788996' },
  { id: 'st-1a-07', dni: '48.601.442', lastName: 'Luna', firstName: 'Jazmín Anahí', courseId: 'c-1a', guardianName: 'Laura Luna', guardianPhone: '351-8899007' },
  { id: 'st-1a-08', dni: '48.512.909', lastName: 'Mansilla', firstName: 'Leonel Andrés', courseId: 'c-1a', guardianName: 'Andrés Mansilla', guardianPhone: '351-9900118' },
  { id: 'st-1a-09', dni: '48.421.770', lastName: 'Romero', firstName: 'Valeria Nicole', courseId: 'c-1a', guardianName: 'Sonia Romero', guardianPhone: '351-1122339' },
  { id: 'st-1a-10', dni: '48.330.129', lastName: 'Vázquez', firstName: 'Zoe Mailén', courseId: 'c-1a', guardianName: 'Cristian Vázquez', guardianPhone: '351-2233440' },

  // 1° Año B
  { id: 'st-1b-01', dni: '48.701.112', lastName: 'Aguirre', firstName: 'Brian Alexis', courseId: 'c-1b', guardianName: 'Raúl Aguirre', guardianPhone: '351-9876543' },
  { id: 'st-1b-02', dni: '48.720.912', lastName: 'Correa', firstName: 'Damián Leonel', courseId: 'c-1b', guardianName: 'Rosa Correa', guardianPhone: '351-8765432' },
  { id: 'st-1b-03', dni: '48.798.771', lastName: 'Flores', firstName: 'Gastón Ariel', courseId: 'c-1b', guardianName: 'Héctor Flores', guardianPhone: '351-7654321' },
  { id: 'st-1b-04', dni: '48.831.409', lastName: 'Godoy', firstName: 'Lautaro Iván', courseId: 'c-1b', guardianName: 'Teresa Godoy', guardianPhone: '351-6543210' },
  { id: 'st-1b-05', dni: '48.989.123', lastName: 'Lucero', firstName: 'Matías Ezequiel', courseId: 'c-1b', guardianName: 'Oscar Lucero', guardianPhone: '351-5432109' },
  { id: 'st-1b-06', dni: '48.911.002', lastName: 'Medina', firstName: 'Ramiro Benjamín', courseId: 'c-1b', guardianName: 'Susana Medina', guardianPhone: '351-4321098' },

  // 2° Año A
  { id: 'st-2a-01', dni: '47.128.452', lastName: 'Acosta', firstName: 'Joaquín Ignacio', courseId: 'c-2a', guardianName: 'Silvia Acosta', guardianPhone: '351-4829102' },
  { id: 'st-2a-02', dni: '47.981.203', lastName: 'Balderrama', firstName: 'Mateo Lautaro', courseId: 'c-2a', guardianName: 'Carlos Balderrama', guardianPhone: '351-5192831' },
  { id: 'st-2a-03', dni: '47.340.119', lastName: 'Caballero', firstName: 'Sofía Belén', courseId: 'c-2a', guardianName: 'Marta Caballero', guardianPhone: '351-6781290' },
  { id: 'st-2a-04', dni: '47.892.304', lastName: 'Carrizo', firstName: 'Facundo Agustín', courseId: 'c-2a', guardianName: 'Jorge Carrizo', guardianPhone: '351-3490182' },
  { id: 'st-2a-05', dni: '47.502.941', lastName: 'Delgado', firstName: 'Lucas Ezequiel', courseId: 'c-2a', guardianName: 'Elena Delgado', guardianPhone: '351-7890123' },
  { id: 'st-2a-06', dni: '47.772.109', lastName: 'Espíndola', firstName: 'Valentina Rocío', courseId: 'c-2a', guardianName: 'Ricardo Espíndola', guardianPhone: '351-8901234' },
  { id: 'st-2a-07', dni: '47.019.283', lastName: 'Ferreyra', firstName: 'Santiago Tomás', courseId: 'c-2a', guardianName: 'Marcela Ferreyra', guardianPhone: '351-9012345' },
  { id: 'st-2a-08', dni: '47.211.890', lastName: 'Giménez', firstName: 'Thiago Damián', courseId: 'c-2a', guardianName: 'Gustavo Giménez', guardianPhone: '351-0123456' },

  // 2° Año B
  { id: 'st-2b-01', dni: '47.890.112', lastName: 'Barreto', firstName: 'Alejo Martín', courseId: 'c-2b', guardianName: 'Mirta Barreto', guardianPhone: '351-1209384' },
  { id: 'st-2b-02', dni: '47.712.940', lastName: 'Bustos', firstName: 'Camila Victoria', courseId: 'c-2b', guardianName: 'Jorge Bustos', guardianPhone: '351-2310495' },
  { id: 'st-2b-03', dni: '47.920.334', lastName: 'Chávez', firstName: 'Felipe Agustín', courseId: 'c-2b', guardianName: 'Liliana Chávez', guardianPhone: '351-3421506' },
  { id: 'st-2b-04', dni: '47.601.889', lastName: 'Domínguez', firstName: 'Joaquín Ignacio', courseId: 'c-2b', guardianName: 'Eduardo Domínguez', guardianPhone: '351-4532617' },
  { id: 'st-2b-05', dni: '47.882.102', lastName: 'Ibáñez', firstName: 'Lucía Milagros', courseId: 'c-2b', guardianName: 'Mónica Ibáñez', guardianPhone: '351-5643728' },
  { id: 'st-2b-06', dni: '47.790.415', lastName: 'Montenegro', firstName: 'Manuel Tobías', courseId: 'c-2b', guardianName: 'Carlos Montenegro', guardianPhone: '351-6754839' },

  // 3° Año A
  { id: 'st-3a-01', dni: '46.912.448', lastName: 'Herrera', firstName: 'Martina Sol', courseId: 'c-3a', guardianName: 'Patricia Herrera', guardianPhone: '351-1234567' },
  { id: 'st-3a-02', dni: '46.401.782', lastName: 'Juárez', firstName: 'Franco Nicolás', courseId: 'c-3a', guardianName: 'Roberto Juárez', guardianPhone: '351-2345678' },
  { id: 'st-3a-03', dni: '46.698.120', lastName: 'López', firstName: 'Nahuel Alejandro', courseId: 'c-3a', guardianName: 'Beatriz López', guardianPhone: '351-3456789' },
  { id: 'st-3a-04', dni: '46.155.932', lastName: 'Molina', firstName: 'Camila Ayelén', courseId: 'c-3a', guardianName: 'Esteban Molina', guardianPhone: '351-4567890' },
  { id: 'st-3a-05', dni: '46.820.311', lastName: 'Navarro', firstName: 'Enzo Gabriel', courseId: 'c-3a', guardianName: 'Lorena Navarro', guardianPhone: '351-5678901' },
  { id: 'st-3a-06', dni: '46.290.418', lastName: 'Peralta', firstName: 'Maximiliano', courseId: 'c-3a', guardianName: 'Hugo Peralta', guardianPhone: '351-6789012' },
  { id: 'st-3a-07', dni: '46.002.399', lastName: 'Quinteros', firstName: 'Luciana Abril', courseId: 'c-3a', guardianName: 'Claudia Quinteros', guardianPhone: '351-7890124' },
  { id: 'st-3a-08', dni: '46.901.277', lastName: 'Ríos', firstName: 'Bautista Benjamín', courseId: 'c-3a', guardianName: 'Daniel Ríos', guardianPhone: '351-8901235' },
  { id: 'st-3a-09', dni: '46.442.810', lastName: 'Soria', firstName: 'Tomás Julián', courseId: 'c-3a', guardianName: 'Roxana Soria', guardianPhone: '351-9012346' },
  { id: 'st-3a-10', dni: '46.789.012', lastName: 'Toledo', firstName: 'Milagros Agostina', courseId: 'c-3a', guardianName: 'Marcos Toledo', guardianPhone: '351-0123457' },

  // 3° Año B
  { id: 'st-3b-01', dni: '46.943.201', lastName: 'Ojeda', firstName: 'Victoria Sol', courseId: 'c-3b', guardianName: 'Daniela Ojeda', guardianPhone: '351-7865940' },
  { id: 'st-3b-02', dni: '46.699.810', lastName: 'Vega', firstName: 'Ulises Damián', courseId: 'c-3b', guardianName: 'Héctor Vega', guardianPhone: '351-8976051' },
  { id: 'st-3b-03', dni: '46.190.844', lastName: 'Paz', firstName: 'Santino Joel', courseId: 'c-3b', guardianName: 'Walter Paz', guardianPhone: '351-3210987' },
  { id: 'st-3b-04', dni: '46.877.291', lastName: 'Suárez', firstName: 'Tobías Valentín', courseId: 'c-3b', guardianName: 'Graciela Suárez', guardianPhone: '351-2109876' },
  { id: 'st-3b-05', dni: '46.518.302', lastName: 'Pérez', firstName: 'Santino Nicolás', courseId: 'c-3b', guardianName: 'Marcela Pérez', guardianPhone: '351-6123980' },
  { id: 'st-3b-06', dni: '46.734.119', lastName: 'Sánchez', firstName: 'Martín Leonel', courseId: 'c-3b', guardianName: 'Carlos Sánchez', guardianPhone: '351-5341209' },
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
