import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: { mode: 'light' },
  reducers: {
    toggleMode: (state) => { state.mode = state.mode === 'light' ? 'dark' : 'light' },
    setMode: (state, action) => { state.mode = action.payload },
  },
})

export const { toggleMode, setMode } = uiSlice.actions
export default uiSlice.reducer
export const selectMode = (state) => state.ui.mode
