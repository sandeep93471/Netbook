import api from './client'

// End-to-end encrypted DMs — Signal-style ECDH key agreement:
//   both sides hold an ECDH P-256 keypair (private key in IndexedDB only)
//   shared AES-256-GCM key = ECDH(my private, their public)
//   = ECDH(their private, my public) — the server only stores ciphertext.
//
// Honest tradeoffs (same as every v1 E2EE): keys live on this device/browser
// — a new device can't read old ciphertext until keys are re-exchanged, and
// there is no key-backup. Group chats stay server-readable for now.
const subtle = window.crypto?.subtle
export const e2eeSupported = () => !!subtle && !!window.indexedDB

// --- minimal IndexedDB wrapper ---
const dbPromise = () => new Promise((resolve, reject) => {
  const req = indexedDB.open('netbook-e2ee', 1)
  req.onupgradeneeded = () => req.result.createObjectStore('keys')
  req.onsuccess = () => resolve(req.result)
  req.onerror = () => reject(req.error)
})
const idbGet = async (key) => {
  const db = await dbPromise()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys').objectStore('keys').get(key)
    tx.onsuccess = () => resolve(tx.result)
    tx.onerror = () => reject(tx.error)
  })
}
const idbSet = async (key, val) => {
  const db = await dbPromise()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('keys', 'readwrite').objectStore('keys').put(val, key)
    tx.onsuccess = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0)).buffer

// --- my identity keypair ---
let myKeys = null // { privateKey: CryptoKey, publicJwk }

// Generate (once) or load my ECDH keypair; publish the public half so peers
// can derive the shared key without me being online.
export const ensureMyKeys = async (uid) => {
  if (myKeys || !e2eeSupported()) return myKeys
  try {
    let stored = await idbGet(`id:${uid}`)
    if (!stored) {
      const pair = await subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'],
      )
      stored = {
        privateJwk: await subtle.exportKey('jwk', pair.privateKey),
        publicJwk: await subtle.exportKey('jwk', pair.publicKey),
      }
      await idbSet(`id:${uid}`, stored)
      await api.put('/users/me/e2ee-key', { jwk: stored.publicJwk })
    }
    myKeys = {
      privateKey: await subtle.importKey(
        'jwk', stored.privateJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey'],
      ),
      publicJwk: stored.publicJwk,
    }
  } catch { myKeys = null }
  return myKeys
}

// --- per-conversation shared key (cached in memory + IndexedDB) ---
const convoKeys = new Map()

export const getConvoKey = async (conversationId, peerUid) => {
  if (convoKeys.has(conversationId)) return convoKeys.get(conversationId)
  if (!myKeys) return null

  // Warm path — the raw AES key persisted from an earlier session
  const saved = await idbGet(`conv:${conversationId}`).catch(() => null)
  if (saved?.raw) {
    const key = await subtle.importKey('raw', unb64(saved.raw), 'AES-GCM', false, ['encrypt', 'decrypt'])
    convoKeys.set(conversationId, key)
    return key
  }

  // Cold path — fetch peer's published public key and run ECDH
  const { data } = await api.get('/users/basic', { params: { ids: peerUid } })
  const peerJwk = data.users?.[0]?.e2eePublicKey
  if (!peerJwk) return null
  const peerKey = await subtle.importKey(
    'jwk', peerJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, [],
  )
  const key = await subtle.deriveKey(
    { name: 'ECDH', public: peerKey }, myKeys.privateKey,
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'],
  )
  const raw = await subtle.exportKey('raw', key)
  await idbSet(`conv:${conversationId}`, { raw: b64(raw) }).catch(() => {})
  convoKeys.set(conversationId, key)
  return key
}

export const encryptText = async (key, text) => {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text))
  return { v: 1, iv: b64(iv), ct: b64(ct) }
}

export const decryptText = async (key, enc) => {
  try {
    const pt = await subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(unb64(enc.iv)) },
      key, unb64(enc.ct),
    )
    return new TextDecoder().decode(pt)
  } catch {
    return null // wrong key / tampered — render a placeholder, never crash
  }
}
