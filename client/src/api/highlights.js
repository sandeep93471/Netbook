import api from './client'

export const getUserHighlights = (userId) =>
  api.get(`/highlights/user/${userId}`).then((r) => r.data.highlights)

export const createHighlight = (name, storyIds) =>
  api.post('/highlights', { name, storyIds }).then((r) => r.data.highlight)

export const deleteHighlight = (id) =>
  api.delete(`/highlights/${id}`)

// My full story archive (incl. expired) — the highlight picker
export const getStoryArchive = () =>
  api.get('/stories/archive').then((r) => r.data.stories)
