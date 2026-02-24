import { Student, Packet, Question, Exam, Result, SchoolSettings, QuestionType, Material } from '../types';
import { MOCK_STUDENTS, MOCK_PACKETS, MOCK_QUESTIONS, MOCK_EXAMS, MOCK_RESULTS } from './mockData';

// Keys for LocalStorage
const KEYS = {
  CACHE_DATA: 'cbt_full_data_cache'
};

const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'SMPN 3 Pacet',
  loginTitle: 'OSN Juara',
  academicYear: '2025/2026',
  semester: 'Genap',
  adminPassword: 'admin',
  teacherIpaPassword: 'guru',
  teacherIpsPassword: 'guru',
  teacherMtkPassword: 'guru'
};

const CACHE = {
  Settings: [] as SchoolSettings[],
  Students: [] as Student[],
  Packets: [] as Packet[],
  Questions: [] as Question[],
  Exams: [] as Exam[],
  Results: [] as Result[],
  Materials: [] as Material[]
};

// --- INITIALIZATION: LOAD FROM LOCAL STORAGE OR MOCK DATA ---
const loadData = () => {
    try {
        const savedData = localStorage.getItem(KEYS.CACHE_DATA);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            if (parsed.Settings) CACHE.Settings = parsed.Settings;
            if (parsed.Students) CACHE.Students = parsed.Students;
            if (parsed.Packets) CACHE.Packets = parsed.Packets;
            if (parsed.Questions) CACHE.Questions = parsed.Questions;
            if (parsed.Exams) CACHE.Exams = parsed.Exams;
            if (parsed.Results) CACHE.Results = parsed.Results;
            if (parsed.Materials) CACHE.Materials = parsed.Materials;
            console.log("Data loaded from Local Storage");
        } else {
            // Initialize with Mock Data if LocalStorage is empty
            console.log("Initializing with Mock Data");
            CACHE.Settings = [DEFAULT_SETTINGS];
            CACHE.Students = [...MOCK_STUDENTS];
            CACHE.Packets = [...MOCK_PACKETS];
            CACHE.Questions = [...MOCK_QUESTIONS];
            CACHE.Exams = [...MOCK_EXAMS];
            CACHE.Results = [...MOCK_RESULTS];
            CACHE.Materials = [];
            saveToLocalStorage();
        }
    } catch (e) {
        console.warn("Failed to load local data", e);
    }
};

const saveToLocalStorage = () => {
    localStorage.setItem(KEYS.CACHE_DATA, JSON.stringify(CACHE));
};

// Load data immediately
loadData();

const generateId = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

export const storage = {
  sync: async (): Promise<boolean> => {
      // In offline mode, sync just ensures data is loaded. 
      // Since we load on init, this is mostly a no-op or a re-load.
      loadData();
      return true;
  },
  
  resetData: () => {
      localStorage.removeItem(KEYS.CACHE_DATA);
      loadData(); // Will reload mock data
  },

  settings: {
    get: (): SchoolSettings => CACHE.Settings[0] || DEFAULT_SETTINGS,
    save: (settings: SchoolSettings) => {
      CACHE.Settings = [settings];
      saveToLocalStorage();
    }
  },
  students: {
    getAll: () => CACHE.Students,
    add: (item: Student) => {
      const newItem = { ...item, id: item.id || generateId() };
      CACHE.Students.push(newItem);
      saveToLocalStorage();
    },
    update: (id: string, updates: Partial<Student>) => {
      const idx = CACHE.Students.findIndex(i => i.id === id);
      if (idx !== -1) {
        CACHE.Students[idx] = { ...CACHE.Students[idx], ...updates };
        saveToLocalStorage();
      }
    },
    delete: (id: string) => {
      CACHE.Students = CACHE.Students.filter(i => i.id !== id);
      saveToLocalStorage();
    }
  },
  packets: {
    getAll: () => CACHE.Packets,
    add: (item: Packet) => {
      const newItem = { ...item, id: item.id || generateId() };
      CACHE.Packets.push(newItem);
      saveToLocalStorage();
    },
    update: (id: string, updates: Partial<Packet>) => {
      const idx = CACHE.Packets.findIndex(i => i.id === id);
      if (idx !== -1) {
        CACHE.Packets[idx] = { ...CACHE.Packets[idx], ...updates };
        saveToLocalStorage();
      }
    },
    delete: (id: string) => {
        CACHE.Packets = CACHE.Packets.filter(i => i.id !== id);
        saveToLocalStorage();
    }
  },
  questions: {
    getAll: () => CACHE.Questions,
    add: (item: Question) => {
      const newItem = { ...item, id: item.id || generateId() };
      CACHE.Questions.push(newItem);
      saveToLocalStorage();
    },
    getByPacketId: (packetId: string) => CACHE.Questions.filter(q => q.packetId === packetId),
    delete: (id: string) => {
        CACHE.Questions = CACHE.Questions.filter(i => i.id !== id);
        saveToLocalStorage();
    }
  },
  exams: {
    getAll: () => CACHE.Exams,
    add: (item: Exam) => {
      const newItem = { ...item, id: item.id || generateId() };
      CACHE.Exams.push(newItem);
      saveToLocalStorage();
    },
    update: (id: string, updates: Partial<Exam>) => {
       const idx = CACHE.Exams.findIndex(e => e.id === id);
       if (idx !== -1) {
         CACHE.Exams[idx] = { ...CACHE.Exams[idx], ...updates };
         saveToLocalStorage();
       }
    },
    delete: (id: string) => {
        CACHE.Exams = CACHE.Exams.filter(i => i.id !== id);
        saveToLocalStorage();
    }
  },
  results: {
    getAll: () => CACHE.Results,
    add: (item: Result) => {
      const newItem = { ...item, id: item.id || generateId() };
      CACHE.Results.push(newItem);
      saveToLocalStorage();
    }
  },
  materials: {
    getAll: () => CACHE.Materials,
    add: (item: Material) => {
      const newItem = { ...item, id: item.id || generateId(), createdAt: new Date().toISOString() };
      CACHE.Materials.push(newItem);
      saveToLocalStorage();
    },
    update: (id: string, updates: Partial<Material>) => {
      const idx = CACHE.Materials.findIndex(i => i.id === id);
      if (idx !== -1) {
        CACHE.Materials[idx] = { ...CACHE.Materials[idx], ...updates };
        saveToLocalStorage();
      }
    },
    delete: (id: string) => {
      CACHE.Materials = CACHE.Materials.filter(i => i.id !== id);
      saveToLocalStorage();
    }
  }
};