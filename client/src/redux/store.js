import { configureStore, combineReducers } from '@reduxjs/toolkit'
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'
import storage from 'redux-persist/es/storage'
import authReducer from './slices/authSlice'
import userReducer from './slices/userSlice'
import chatReducer from './slices/chatSlice'
import postReducer from './slices/postSlice'
import commentReducer from './slices/commentSlice'
import friendReducer from './slices/friendSlice'
import notificationReducer from './slices/notificationSlice'
import uiReducer from './slices/uiSlice'
import { toastMiddleware } from './middleware/toastMiddleware'

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'ui'],
}

const rootReducer = combineReducers({
  auth: authReducer,
  users: userReducer,
  chat: chatReducer,
  posts: postReducer,
  comments: commentReducer,
  friends: friendReducer,
  notifications: notificationReducer,
  ui: uiReducer,
})

const persistedReducer = persistReducer(persistConfig, rootReducer)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(toastMiddleware),
})

export const persistor = persistStore(store)
