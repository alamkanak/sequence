import type { Project } from "./model";
const open = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("sequence-v1", 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("files");
      r.result.createObjectStore("projects");
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
export async function put(
  bucket: "files" | "projects",
  key: string,
  value: unknown,
) {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(bucket, "readwrite");
    tx.objectStore(bucket).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
export async function get<T>(
  bucket: "files" | "projects",
  key: string,
): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const r = db.transaction(bucket).objectStore(bucket).get(key);
    r.onsuccess = () => {
      db.close();
      resolve(r.result);
    };
    r.onerror = () => {
      db.close();
      reject(r.error);
    };
  });
}
export async function saveProject(p: Project) {
  await put("projects", "last", p);
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
