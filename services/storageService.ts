import { Student, Packet, Question, Exam, Result, SchoolSettings, QuestionType, Material } from '../types';
import { MOCK_STUDENTS, MOCK_PACKETS, MOCK_QUESTIONS, MOCK_EXAMS, MOCK_RESULTS } from './mockData';

// Keys for LocalStorage
const KEYS = {
  CACHE_DATA: 'cbt_full_data_cache',
  API_URL: 'cbt_api_url'
};

const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycby8xwmXEnF_z2SWSeZT_57wbesHFiShI1mIbdooKeD-gyKgc-e9lbJND9nfIMWfBjte/exec';

const DEFAULT_SETTINGS: SchoolSettings = {
  schoolName: 'SMPN 3 Pacet',
  loginTitle: 'OSN Juara',
  academicYear: '2025/2026',
  semester: 'Genap',
  adminPassword: 'admin',
  teacherIpaPassword: 'guru',
  teacherIpsPassword: 'guru',
  teacherMtkPassword: 'guru',
  teacherLiterasiPassword: 'guru',
  teacherNumerasiPassword: 'guru'
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
      // Logic to prevent piling up of settings rows in Spreadsheet
      // 1. Check if we have any existing settings in cache (which implies they exist in DB)
      const currentSettings = CACHE.Settings[0];
      
      // 2. Determine the ID to use. 
      // If current settings has an ID, use it. 
      // If not, use 'SETTINGS_001' as a default/fallback ID.
      const targetId = settings.id || currentSettings?.id || 'SETTINGS_001';
      
      // 3. Prepare the new settings object with the target ID
      const newSettings = { ...settings, id: targetId };
      
      // 4. Update Local Cache
      CACHE.Settings = [newSettings];
      saveToLocalStorage();

      // 5. Sync with Cloud
      // If we found an ID in the cache (that isn't undefined), we assume it exists in DB -> Update
      // If we are using 'SETTINGS_001', we also try to update first if we suspect it exists, 
      // but since we can't be sure without a prior sync, we'll rely on the cache state.
      
      if (currentSettings?.id) {
          // We have an ID from a previous load/sync, so it definitely exists.
          apiRequest('update', 'Settings', newSettings, targetId);
      } else {
          // No ID found in cache. This happens if:
          // a) First time ever saving
          // b) Local storage was cleared and we haven't synced yet
          // c) The existing row in sheet has no ID (legacy data)
          
          // To be safe and avoid duplicates if 'SETTINGS_001' actually exists remotely:
          // We could try to 'update' blindly with 'SETTINGS_001'. 
          // If GAS script supports update by ID and fails if not found, we could catch it.
          // But our apiRequest doesn't return detailed error status easily in no-cors.
          
          // BEST EFFORT: 
          // If we are here, it means we don't have a local ID.
          // We will assume it's a new create OR we are overwriting.
          // Since the user complains about "piling up", it means we were calling 'create' too often.
          
          // Let's try to UPDATE first with the fixed ID 'SETTINGS_001'.
          // If it doesn't exist, this might fail silently (depending on GAS implementation).
          // But if the user has "piled up" data, they likely have rows.
          // If we use 'create', we add another row.
          
          // CHANGE: We will use 'create' ONLY if we are sure it's brand new.
          // But since we can't be sure, and we want to avoid duplicates...
          
          // Actually, if we force the ID to be 'SETTINGS_001', and we call 'create', 
          // GAS `createItem` usually appends.
          
          // If we call 'update', GAS `updateItem` searches for the ID.
          
          // If the user has rows WITHOUT IDs, we can't update them.
          // If the user has rows WITH IDs (e.g. 'SETTINGS_001'), 'update' will work.
          
          // Strategy:
          // 1. If we have no local ID, we assume we might need to create.
          // BUT, to fix the "piling up", we should probably try to sync first?
          // The user is in the Admin Settings page.
          
          // Let's just use 'create' for now BUT ensuring we use the fixed ID.
          // The issue likely was that `isExisting` check was failing because `existingId` was undefined.
          // Now we force `targetId`.
          
          // If we call `create` with `id='SETTINGS_001'`, and a row with `id='SETTINGS_001'` already exists,
          // GAS `createItem` (simple append) will add a DUPLICATE row with same ID.
          
          // We need to change this to `update` if we want to avoid duplicates, 
          // assuming the row exists.
          
          // If we assume the app has been run at least once, 'SETTINGS_001' should exist if we enforced it.
          // If it doesn't exist, `update` will fail.
          
          // Let's try to be smart:
          // If CACHE is empty, we send 'create'.
          // If CACHE is not empty (even if no ID, which shouldn't happen if we save correctly), we send 'update'.
          
          // But wait, `DEFAULT_SETTINGS` makes CACHE not empty.
          
          // Let's rely on `currentSettings?.id`. 
          // If it's undefined, it means we are using Default settings (not from DB).
          // So we 'create'.
          
          // The problem: User loads page -> Default Settings (no ID) -> User saves -> Create (ID=SETTINGS_001).
          // User reloads page -> Load from LocalStorage (ID=SETTINGS_001) -> User saves -> Update.
          
          // Why did it pile up?
          // Maybe `loadData` failed to load from LocalStorage? Or user cleared cache?
          // If user clears cache, `CACHE.Settings` is Default (no ID).
          // User saves -> Create. Duplicate!
          
          // FIX: We must try to fetch/sync before saving if we don't have an ID.
          // But we can't easily do that inside `save` (async).
          
          // Workaround: In `save`, if we don't have an ID, we will blindly send 'update' with 'SETTINGS_001' 
          // AND 'create' with 'SETTINGS_001'?? No.
          
          // We will send 'create' ONLY if we are sure.
          // Since we can't be sure, let's assume if the user is saving settings, they might have done it before.
          
          // If I change the GAS script, I can fix it properly (upsert).
          // But I can't.
          
          // Let's trust that if the user has "piled up" data, they have at least one row.
          // If we send 'update' with 'SETTINGS_001', and they have a row with 'SETTINGS_001', it updates.
          // If they have rows with DIFFERENT IDs (or no IDs), 'update' fails.
          
          // If I force `apiRequest('create', ...)` it ALWAYS appends.
          
          // The only way to stop piling up from the client side without changing GAS 
          // (and without knowing if row exists) is to assume it exists if we are in a "piled up" state.
          
          // But for a clean slate?
          
          // Let's go with:
          // If `currentSettings?.id` exists -> UPDATE.
          // If NOT -> CREATE.
          
          // AND we must ensure `Settings.tsx` calls `sync` on mount so we get the ID if it exists remotely.
          
          apiRequest('create', 'Settings', newSettings);
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