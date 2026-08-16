import api from './client'
import { uploadImage } from './storage'

export const addStory = async ({ imageFile, closeFriendsOnly = false }) => {
  const imageURL = await uploadImage(imageFile, 'stories')
  const { data } = await api.post('/stories', { imageURL, closeFriendsOnly })
  return data.story
}

export const fetchActiveStories = async () => {
  const { data } = await api.get('/stories')
  return data.groups
}
