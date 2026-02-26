export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'guru',
  STUDENT = 'siswa',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'PG',
  COMPLEX_MULTIPLE_CHOICE = 'PGK',
  TRUE_FALSE = 'BS',
  ESSAY = 'ESSAY',
  MATCHING = 'JODOHKAN'
}

export interface SchoolSettings {
  id?: string;
  schoolName: string;
  loginTitle: string; 
  academicYear: string; 
  semester: string; 
  adminPassword: string;
  teacherIpaPassword: string;
  teacherIpsPassword: string;
  teacherMtkPassword: string;
}

export interface Student {
  id: string;
  no: string;
  name: string;
  class: string;
  nis: string;
  nisn: string;
  osnSubjects: string[]; // ['OSN IPA', 'OSN IPS', 'OSN Matematika']
  readMaterials?: string[]; // Array of Material IDs that have been read/opened
  completedSchedules?: string[]; // Array of Exam/Schedule IDs that have been completed
}

export interface Question {
  id: string;
  packetId: string;
  number: number;
  stimulus: string; // Text content
  text: string;
  image?: string; // Explicit image column
  type: QuestionType;
  options: string; // JSON string
  correctAnswerIndex: number; 
  correctAnswerIndices?: string; // JSON string for PGK
  matchingPairs?: string; // JSON string for JODOHKAN/BS rows
  category: string; 
  discussion?: string; // Pembahasan Soal
}

export interface Packet {
  id: string;
  name: string;
  category: string; 
  totalQuestions: number;
  questionTypes: string; 
}

export interface Exam {
  id: string;
  title: string;
  category: string; // OSN IPA, OSN IPS, OSN Matematika
  packetId?: string; // Optional if only material
  materialId?: string; // Optional if only exam
  scheduledStart: string; 
  scheduledEnd: string; 
  durationMinutes: number;
  classTarget: string; // Comma separated string or JSON string array
  questions: string; 
  isActive: boolean;
  allowRetry: boolean; // Bisa diulang atau tidak
  minScore?: number; // Minimum score to pass (default 70)
  order?: number; // Sequence order
}

export interface Result {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  score: number;
  literasiScore: number;
  numerasiScore: number;
  answers: string; 
  timestamp: string;
  violationCount: number;
  isDisqualified: boolean;
}

export interface Material {
  id: string;
  title: string;
  category: string; // OSN IPA, OSN IPS, OSN Matematika
  type: 'embed' | 'link' | 'image'; // New field
  content: string; // Stores HTML for embed, or URL for link/image
  createdAt: string;
  // Deprecated but kept for backward compatibility during migration if needed
  embedCode?: string; 
}

export interface AppState {
  currentUser: { role: UserRole; name: string; id?: string } | null;
  scriptUrl: string;
}