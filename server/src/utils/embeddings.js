import { logger } from './logger.js'

// Semantic search embeddings — all-MiniLM-L6-v2 (384-dim) running locally via
// @huggingface/transformers (onnxruntime). Free, no API key, model (~23MB
// quantized) downloads once then is cached on disk.
//
// The dependency is optional on purpose: if the package/model can't load
// (or SEMANTIC_SEARCH=off), every embed call returns null and callers fall
// back to keyword search — the app never breaks over it.
//
// At real scale you'd store these in Atlas Vector Search ($vectorSearch) —
// set ATLAS_VECTOR_INDEX to your index name and we try that path first,
// falling back to in-app cosine over the recent pool (fine ≤ ~10k posts).

const DISABLED = process.env.SEMANTIC_SEARCH === 'off'
const MODEL = 'Xenova/all-MiniLM-L6-v2'
const DIMS = 384

let pipePromise = null
const getPipe = () => {
  if (DISABLED) return null
  if (!pipePromise) {
    pipePromise = import('@huggingface/transformers')
      .then((m) => m.pipeline('feature-extraction', MODEL, { dtype: 'q8' }))
      .then((p) => { logger.info({ model: MODEL }, 'embedding model loaded'); return p })
      .catch((err) => {
        logger.warn({ err: err.message }, 'embedding model unavailable — semantic search off')
        return null
      })
  }
  return pipePromise
}

// Mean-pool the token embeddings + L2 normalize → unit vector for cosine dot
export const embedText = async (text) => {
  const pipe = await getPipe()
  if (!pipe || !text?.trim()) return null
  try {
    const out = await pipe(text.slice(0, 512), { pooling: 'mean', normalize: true })
    const vec = Array.from(out.data)
    return vec.length === DIMS ? vec : null
  } catch {
    return null
  }
}

export const semanticEnabled = async () => !!(await getPipe())

// unit vectors → dot product IS cosine similarity
export const cosine = (a, b) => {
  let dot = 0
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i]
  return dot
}
