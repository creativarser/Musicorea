import { StudioProject } from '../audio/types';
import { demoProjectSynthwave } from '../audio/factoryPresets';

const DB_NAME = 'AuraStudioDB';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllProjects(): Promise<StudioProject[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result as StudioProject[];
        if (!results || results.length === 0) {
          // Initialize with demo project
          saveProject(demoProjectSynthwave);
          results = [demoProjectSynthwave];
        }
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get projects from IndexedDB:', err);
    return [demoProjectSynthwave];
  }
}

export async function getProjectById(id: string): Promise<StudioProject | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get project:', err);
    return null;
  }
}

export async function saveProject(project: StudioProject): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Strip non-serializable AudioBuffer objects before saving to IDB
      const sanitizedProject: StudioProject = {
        ...project,
        updatedAt: new Date().toISOString(),
        tracks: project.tracks.map((t) => ({
          ...t,
          clips: t.clips.map((c) => ({
            ...c,
            audioBuffer: undefined, // AudioBuffer cannot be stored directly in IDB; audioDataUri or notes are preserved
          })),
        })),
      };

      const request = store.put(sanitizedProject);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to save project:', err);
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to delete project:', err);
  }
}

export function exportProjectToFile(project: StudioProject) {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}.studioproj`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function importProjectFromFile(file: File): Promise<StudioProject> {
  const text = await file.text();
  const parsed = JSON.parse(text) as StudioProject;
  parsed.id = `proj_${Date.now()}`;
  parsed.name = `${parsed.name} (Importado)`;
  parsed.updatedAt = new Date().toISOString();
  await saveProject(parsed);
  return parsed;
}
