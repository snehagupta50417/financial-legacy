/** A selected file stays local until its upload succeeds or the user removes it. */
const database = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open("keeper-attachments", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("files");
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(new Error("This browser could not preserve the attachment. Please choose it again."));
});
async function transact<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("files", mode);
    const request = work(transaction.objectStore("files"));
    transaction.oncomplete = () => { db.close(); resolve(request.result); };
    transaction.onerror = () => { db.close(); reject(transaction.error || new Error("Could not preserve attachment.")); };
  });
}
export const keepFile = (id: string, file: File) => transact("readwrite", store => store.put(file, id));
export const readFile = (id: string) => transact<File | undefined>("readonly", store => store.get(id));
export const forgetFile = (id: string) => transact("readwrite", store => store.delete(id));

export const forgetAllFiles = () => transact("readwrite", store => store.clear());
