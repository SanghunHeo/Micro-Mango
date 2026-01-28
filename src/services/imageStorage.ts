/**
 * IndexedDB-based image storage service
 * Stores large base64 images separately from localStorage to avoid quota issues
 */

const DB_NAME = 'micromango-images'
const DB_VERSION = 1
const STORE_NAME = 'images'

interface StoredImage {
  id: string
  queueItemId: string
  type: 'reference' | 'interim' | 'final'
  index: number
  data: string // base64
  createdAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('[ImageStorage] Failed to open database:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object store with indexes
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('queueItemId', 'queueItemId', { unique: false })
        store.createIndex('type', 'type', { unique: false })
        console.log('[ImageStorage] Created object store')
      }
    }
  })

  return dbPromise
}

/**
 * Save images for a queue item
 */
export async function saveImages(
  queueItemId: string,
  type: 'reference' | 'interim' | 'final',
  images: string[]
): Promise<void> {
  if (!images || images.length === 0) return

  try {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)

    for (let i = 0; i < images.length; i++) {
      const record: StoredImage = {
        id: `${queueItemId}_${type}_${i}`,
        queueItemId,
        type,
        index: i,
        data: images[i],
        createdAt: Date.now(),
      }
      store.put(record)
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })

    console.log(`[ImageStorage] Saved ${images.length} ${type} images for ${queueItemId}`)
  } catch (error) {
    console.error('[ImageStorage] Failed to save images:', error)
  }
}

/**
 * Load images for a queue item by type
 */
export async function loadImages(
  queueItemId: string,
  type: 'reference' | 'interim' | 'final'
): Promise<string[]> {
  try {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('queueItemId')

    const records = await new Promise<StoredImage[]>((resolve, reject) => {
      const request = index.getAll(queueItemId)
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })

    // Filter by type and sort by index
    const filtered = records
      .filter((r) => r.type === type)
      .sort((a, b) => a.index - b.index)
      .map((r) => r.data)

    return filtered
  } catch (error) {
    console.error('[ImageStorage] Failed to load images:', error)
    return []
  }
}

/**
 * Load all images for a queue item
 */
export async function loadAllImages(queueItemId: string): Promise<{
  referenceImages: string[]
  interimImages: string[]
  finalImages: string[]
}> {
  const [referenceImages, interimImages, finalImages] = await Promise.all([
    loadImages(queueItemId, 'reference'),
    loadImages(queueItemId, 'interim'),
    loadImages(queueItemId, 'final'),
  ])

  return { referenceImages, interimImages, finalImages }
}

/**
 * Delete all images for a queue item
 */
export async function deleteImages(queueItemId: string): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('queueItemId')

    // Get all keys for this queue item
    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = index.getAllKeys(queueItemId)
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })

    // Delete each record
    for (const key of keys) {
      store.delete(key)
    }

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })

    console.log(`[ImageStorage] Deleted ${keys.length} images for ${queueItemId}`)
  } catch (error) {
    console.error('[ImageStorage] Failed to delete images:', error)
  }
}

/**
 * Clear all stored images (for debugging/reset)
 */
export async function clearAllImages(): Promise<void> {
  try {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })

    console.log('[ImageStorage] Cleared all images')
  } catch (error) {
    console.error('[ImageStorage] Failed to clear images:', error)
  }
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  count: number
  totalSize: number
  byType: Record<string, number>
}> {
  try {
    const db = await getDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)

    const records = await new Promise<StoredImage[]>((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result || [])
      request.onerror = () => reject(request.error)
    })

    const byType: Record<string, number> = {}
    let totalSize = 0

    for (const record of records) {
      const size = record.data.length
      totalSize += size
      byType[record.type] = (byType[record.type] || 0) + size
    }

    return {
      count: records.length,
      totalSize,
      byType,
    }
  } catch (error) {
    console.error('[ImageStorage] Failed to get stats:', error)
    return { count: 0, totalSize: 0, byType: {} }
  }
}
