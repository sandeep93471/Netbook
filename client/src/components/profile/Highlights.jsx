import { useEffect, useState } from 'react'
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, IconButton, Typography, CircularProgress, Tooltip } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import EditIcon from '@mui/icons-material/Edit'
import { getUserHighlights, createHighlight, updateHighlight, deleteHighlight, getStoryArchive } from '../../api/highlights'
import { StoryViewer } from '../post/StoryBar'
import { showError, showSuccess } from '../../utils/errorHandler'
import { timeAgo } from '../../utils/timeAgo'

// Instagram-style story Highlights — named story collections on the profile.
const Highlights = ({ userId, isOwnProfile, displayName, photoURL }) => {
  const [highlights, setHighlights] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editing, setEditing] = useState(null) // highlight being edited, null = create mode
  const [archive, setArchive] = useState(null)
  const [picked, setPicked] = useState([])
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // highlight pending delete
  const [deleting, setDeleting] = useState(false)
  const [viewing, setViewing] = useState(null) // highlight being viewed

  const load = () => getUserHighlights(userId).then(setHighlights).catch(() => setHighlights([]))
  useEffect(() => { load() }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  const openPicker = (h = null) => {
    setEditing(h)
    setName(h?.name || '')
    setPicked(h ? h.items.map((i) => i.id) : [])
    setPickerOpen(true)
    if (archive === null) getStoryArchive().then(setArchive).catch(() => setArchive([]))
  }

  const closePicker = () => {
    setPickerOpen(false)
    setEditing(null)
    setPicked([])
    setName('')
  }

  const togglePick = (id) =>
    setPicked((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])

  const save = async () => {
    if (!name.trim() || !picked.length) return
    setSaving(true)
    try {
      if (editing) {
        await updateHighlight(editing.id, name.trim(), picked)
        showSuccess('Highlight updated')
      } else {
        await createHighlight(name.trim(), picked)
        showSuccess('Highlight created')
      }
      closePicker()
      load()
    } catch (err) {
      showError(err)
    } finally {
      setSaving(false)
    }
  }

  const askRemove = (e, h) => {
    e.stopPropagation()
    setConfirmDelete(h)
  }

  const remove = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await deleteHighlight(confirmDelete.id)
      showSuccess('Highlight removed')
      setConfirmDelete(null)
      load()
    } catch (err) {
      showError(err)
    } finally {
      setDeleting(false)
    }
  }

  if (highlights === null) return null
  if (!isOwnProfile && highlights.length === 0) return null

  return (
    <>
      <div className="mx-4 mt-4">
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
          {/* New highlight — own profile only */}
          {isOwnProfile && (
            <button
              onClick={() => openPicker()}
              className="flex flex-col items-center gap-1.5 shrink-0 group"
              aria-label="Create highlight"
            >
              <span className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 group-hover:border-blue-500 group-hover:text-blue-500 transition-colors">
                <AddIcon sx={{ fontSize: 28 }} />
              </span>
              <Typography variant="caption" color="text.secondary">New</Typography>
            </button>
          )}

          {highlights.map((h) => (
            <div key={h.id} className="flex flex-col items-center gap-1.5 shrink-0 relative group">
              <button
                onClick={() => setViewing(h)}
                className="w-16 h-16 rounded-full overflow-hidden ring-2 ring-gray-200 dark:ring-gray-700 hover:ring-blue-500 transition-all"
                aria-label={`View highlight ${h.name}`}
              >
                <img src={h.coverImage} alt={h.name} className="w-full h-full object-cover" />
              </button>
              <Typography variant="caption" className="max-w-16 truncate">{h.name}</Typography>
              {/* Edit / delete — own highlights, hover reveal */}
              {isOwnProfile && (
                <>
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); openPicker(h) }}
                    aria-label={`Edit highlight ${h.name}`}
                    sx={{
                      position: 'absolute', top: -4, left: 2, width: 20, height: 20,
                      bgcolor: 'background.paper', boxShadow: 1, opacity: 0,
                      '.group:hover &': { opacity: 1 },
                      '&:hover': { bgcolor: 'primary.main', color: '#fff' },
                    }}
                  >
                    <EditIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={(e) => askRemove(e, h)}
                    aria-label={`Delete highlight ${h.name}`}
                    sx={{
                      position: 'absolute', top: -4, right: 2, width: 20, height: 20,
                      bgcolor: 'background.paper', boxShadow: 1, opacity: 0,
                      '.group:hover &': { opacity: 1 },
                      '&:hover': { bgcolor: 'error.light', color: '#fff' },
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create/edit dialog — name + pick stories from archive */}
      <Dialog open={pickerOpen} onClose={closePicker} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Edit highlight' : 'New highlight'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth size="small" label="Highlight name"
            placeholder="e.g. Jaipur trip, Birthday..."
            value={name} onChange={(e) => setName(e.target.value)}
            inputProps={{ maxLength: 30 }}
            sx={{ mb: 2, mt: 0.5 }}
            autoFocus
          />
          <Typography variant="caption" color="text.secondary" className="block mb-2">
            Pick stories to save — {picked.length} selected
          </Typography>
          {archive === null ? (
            <div className="flex justify-center py-8"><CircularProgress /></div>
          ) : archive.length === 0 ? (
            <Typography variant="body2" color="text.secondary" className="text-center py-8">
              No stories yet — post a story first, then save it here.
            </Typography>
          ) : (
            <div className="grid grid-cols-3 gap-1.5 max-h-72 overflow-y-auto">
              {archive.map((s) => {
                const selected = picked.includes(s.id)
                return (
                  <Tooltip key={s.id} title={timeAgo(s.createdAt)}>
                    <button
                      onClick={() => togglePick(s.id)}
                      className="relative aspect-[9/16] rounded-lg overflow-hidden"
                      style={{ outline: selected ? '3px solid #0A5CE0' : 'none', outlineOffset: -3 }}
                      aria-label={`${selected ? 'Deselect' : 'Select'} story from ${timeAgo(s.createdAt)}`}
                      aria-pressed={selected}
                    >
                      <img src={s.imageURL} alt="" className="w-full h-full object-cover" />
                      {selected && (
                        <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#0A5CE0] text-white text-xs flex items-center justify-center font-bold">
                          {picked.indexOf(s.id) + 1}
                        </span>
                      )}
                    </button>
                  </Tooltip>
                )
              })}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closePicker}>Cancel</Button>
          <Button variant="contained" onClick={save}
            disabled={saving || !name.trim() || !picked.length}>
            {saving ? 'Saving...' : editing ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation — stories stay saved in the archive */}
      <Dialog open={!!confirmDelete} onClose={() => !deleting && setConfirmDelete(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete highlight?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            "{confirmDelete?.name}" will be removed from your profile. Your stories won't be deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(null)} disabled={deleting}>Cancel</Button>
          <Button variant="contained" color="error" onClick={remove} disabled={deleting}>
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Highlight viewer — reuse the story viewer */}
      {viewing && (
        <StoryViewer
          group={{
            userId,
            displayName,
            photoURL,
            stories: viewing.items.map((i) => ({ ...i, viewCount: 0 })),
          }}
          isOwner={isOwnProfile}
          onClose={() => setViewing(null)}
        />
      )}
    </>
  )
}

export default Highlights
