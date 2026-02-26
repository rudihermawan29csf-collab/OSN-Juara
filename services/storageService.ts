import { Student, Packet, Question, Exam, Result, SchoolSettings, QuestionType, Material } from '../types';
import { MOCK_STUDENTS, MOCK_PACKETS, MOCK_QUESTIONS, MOCK_EXAMS, MOCK_RESULTS } from './mockData';

// Keys for LocalStorage
const KEYS = {
  CACHE_DATA: 'cbt_full_data_cache',
  API_URL: 'cbt_api_url'
};

const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbyNOZD1QIaOQYmrGBIGHNeTAc4wTDHxzX77UJ2itRgirPcvOrF9EF4HY5YabolMbrj7/exec';

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

// Helper to deduplicate items by ID
const deduplicate = <T extends { id: string }>(items: T[]): T[] => {
    const seen = new Set();
    return items.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });
};

// --- INITIALIZATION: LOAD FROM LOCAL STORAGE OR MOCK DATA ---
const loadData = () => {
    try {
        const savedData = localStorage.getItem(KEYS.CACHE_DATA);
        if (savedData) {
            const parsed = JSON.parse(savedData);
            if (parsed.Settings) CACHE.Settings = parsed.Settings; // Settings usually single row
            if (parsed.Students) CACHE.Students = deduplicate(parsed.Students);
            if (parsed.Packets) CACHE.Packets = deduplicate(parsed.Packets);
            if (parsed.Questions) CACHE.Questions = deduplicate(parsed.Questions);
            if (parsed.Exams) CACHE.Exams = deduplicate(parsed.Exams);
            if (parsed.Results) CACHE.Results = deduplicate(parsed.Results);
            if (parsed.Materials) CACHE.Materials = deduplicate(parsed.Materials);
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

// --- API INTEGRATION ---
const getApiUrl = () => localStorage.getItem(KEYS.API_URL) || DEFAULT_API_URL;

const apiRequest = async (action: string, collection?: string, data?: any, id?: string) => {
    const url = getApiUrl();
    if (!url) return null;

    try {
        const response = await fetch(url, {
            method: 'POST',
            mode: 'no-cors', // Google Apps Script Web App requires no-cors for simple requests or handling redirects
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action, collection, data, id })
        });
        // Note: no-cors mode returns an opaque response, so we can't read the body or status.
        // We assume success if no network error.
        // For 'getAll', we need 'cors' or a different approach if possible, but GAS usually redirects.
        // Actually, for GET requests (reading data), we can use GET method which might work better with redirects.
        return response;
    } catch (e) {
        console.error("API Request Failed", e);
        return null;
    }
};

// Special fetch for reading data (GET) to handle redirects properly if possible
const fetchAllData = async () => {
    const url = getApiUrl();
    if (!url) return null;

    try {
        // Append action=getAll to URL
        const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}action=getAll`;
        const response = await fetch(fetchUrl);
        const json = await response.json();
        return json;
    } catch (e) {
        console.error("Failed to fetch all data from API", e);
        return null;
    }
};


export const storage = {
  getApiUrl,
  setApiUrl: (url: string) => {
      localStorage.setItem(KEYS.API_URL, url);
  },

  sync: async (): Promise<boolean> => {
      const url = getApiUrl();
      if (!url) return false;

      console.log("Syncing with Cloud...");
      const cloudData = await fetchAllData();
      
      if (cloudData) {
          console.log("Cloud data received", cloudData);
          if (cloudData.Settings) CACHE.Settings = cloudData.Settings;
          if (cloudData.Students) CACHE.Students = deduplicate(cloudData.Students);
          if (cloudData.Packets) CACHE.Packets = deduplicate(cloudData.Packets);
          if (cloudData.Questions) CACHE.Questions = deduplicate(cloudData.Questions);
          if (cloudData.Exams) CACHE.Exams = deduplicate(cloudData.Exams);
          if (cloudData.Results) CACHE.Results = deduplicate(cloudData.Results);
          if (cloudData.Materials) CACHE.Materials = deduplicate(cloudData.Materials);
          
          saveToLocalStorage();
          return true;
      }
      return false;
  },
  
  resetData: () => {
      localStorage.removeItem(KEYS.CACHE_DATA);
      loadData(); // Will reload mock data
  },

  settings: {
    get: (): SchoolSettings => CACHE.Settings[0] || DEFAULT_SETTINGS,
    save: (settings: SchoolSettings) => {
      // Check if we already established an ID for settings
      // If the ID matches our fixed ID, we assume it exists in the cloud (from previous save or sync)
      const existingId = settings.id || CACHE.Settings[0]?.id;
      const isExisting = existingId === 'SETTINGS_001';

      // Force a consistent ID for settings to ensure updates work on the single row
      const fixedSettings = { ...settings, id: 'SETTINGS_001' }; 
      
      CACHE.Settings = [fixedSettings];
      saveToLocalStorage();

      if (isExisting) {
          // We have saved before or synced, so it should exist -> Update
          apiRequest('update', 'Settings', fixedSettings, 'SETTINGS_001');
      } else {
          // First time saving (or recovered from reset/empty), assume not in cloud -> Create
          apiRequest('create', 'Settings', fixedSettings);
      }
    }
  },

  students: {
    getAll: () => CACHE.Students,
    add: (item: Student) => {
      const newItem = { ...item, id: item.id || generateId() };
      CACHE.Students.push(newItem);
      saveToLocalStorage();
      apiRequest('create', 'Students', newItem);
    },
    update: (id: string, updates: Partial<Student>) => {
      const idx = CACHE.Students.findIndex(i => i.id === id);
      if (idx !== -1) {
        const updatedItem = { ...CACHE.Students[idx], ...updates };
        CACHE.Students[idx] = updatedItem;
        saveToLocalStorage();
        apiRequest('update', 'Students', updatedItem, id);
      }
    },
    delete: (id: string) => {
      CACHE.Students = CACHE.Students.filter(i => i.id !== id);
      saveToLocalStorage();
      apiRequest('delete', 'Students', undefined, id);
    }
  },
  packets: {
    getAll: () => CACHE.Packets,
    add: (item: Packet) => {
      const newItem = { ...item, id: item.id || generateId() };
      CACHE.Packets.push(newItem);
      saveToLocalStorage();
      apiRequest('create', 'Packets', newItem);
    },
    update: (id: string, updates: Partial<Packet>) => {
      const idx = CACHE.Packets.findIndex(i => i.id === id);
      if (idx !== -1) {
        const updatedItem = { ...CACHE.Packets[idx], ...updates };
        CACHE.Packets[idx] = updatedItem;
        saveToLocalStorage();
        apiRequest('update', 'Packets', updatedItem, id);
      }
    },
    delete: (id: string) => {
        CACHE.Packets = CACHE.Packets.filter(i => i.id !== id);
        saveToLocalStorage();
        apiRequest('delete', 'Packets', undefined, id);
    }
  },
  questions: {
    getAll: () => CACHE.Questions,
    add: (item: Question) => {
      const newItem = { ...item, id: item.id || generateId() };
      CACHE.Questions.push(newItem);
      saveToLocalStorage();
      apiRequest('create', 'Questions', newItem);
    },
    update: (id: string, updates: Partial<Question>) => {
      const idx = CACHE.Questions.findIndex(q => q.id === id);
      if (idx !== -1) {
        const updatedItem = { ...CACHE.Questions[idx], ...updates };
        CACHE.Questions[idx] = updatedItem;
        saveToLocalStorage();
        apiRequest('update', 'Questions', updatedItem, id);
      }
    },
    getByPacketId: (packetId: string) => CACHE.Questions.filter(q => q.packetId === packetId),
    delete: (id: string) => {
        CACHE.Questions = CACHE.Questions.filter(i => i.id !== id);
        saveToLocalStorage();
        apiRequest('delete', 'Questions', undefined, id);
    }
  },
  exams: {
    getAll: () => CACHE.Exams,
    add: (item: Exam) => {
      const newItem = { ...item, id: item.id || generateId() };
      CACHE.Exams.push(newItem);
      saveToLocalStorage();
      apiRequest('create', 'Exams', newItem);
    },
    update: (id: string, updates: Partial<Exam>) => {
       const idx = CACHE.Exams.findIndex(e => e.id === id);
       if (idx !== -1) {
         const updatedItem = { ...CACHE.Exams[idx], ...updates };
         CACHE.Exams[idx] = updatedItem;
         saveToLocalStorage();
         apiRequest('update', 'Exams', updatedItem, id);
       }
    },
    delete: (id: string) => {
        CACHE.Exams = CACHE.Exams.filter(i => i.id !== id);
        saveToLocalStorage();
        apiRequest('delete', 'Exams', undefined, id);
    }
  },
  results: {
    getAll: () => CACHE.Results,
    add: (item: Result) => {
      const newItem = { ...item, id: item.id || generateId() };
      CACHE.Results.push(newItem);
      saveToLocalStorage();
      apiRequest('create', 'Results', newItem);
    }
  },
  materials: {
    getAll: () => CACHE.Materials,
    add: (item: Material) => {
      const newItem = { ...item, id: item.id || generateId(), createdAt: new Date().toISOString() };
      CACHE.Materials.push(newItem);
      saveToLocalStorage();
      apiRequest('create', 'Materials', newItem);
    },
    update: (id: string, updates: Partial<Material>) => {
      const idx = CACHE.Materials.findIndex(i => i.id === id);
      if (idx !== -1) {
        const updatedItem = { ...CACHE.Materials[idx], ...updates };
        CACHE.Materials[idx] = updatedItem;
        saveToLocalStorage();
        apiRequest('update', 'Materials', updatedItem, id);
      }
    },
    delete: (id: string) => {
      CACHE.Materials = CACHE.Materials.filter(i => i.id !== id);
      saveToLocalStorage();
      apiRequest('delete', 'Materials', undefined, id);
    }
  }
};