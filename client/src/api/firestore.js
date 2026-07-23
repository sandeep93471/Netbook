import api from './client'

// User search/follow/suggestions — mirrors old api/firestore.js exports
export const searchUsers = async (term) => {
  const { data } = await api.get(`/users/search`, { params: { q: term } })
  return data.users
}

export const fetchSuggestedUsers = async () => {
  const { data } = await api.get('/users/suggested')
  return data.users
}
