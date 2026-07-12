import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Paper, Typography, Avatar, Button, IconButton, Skeleton, Divider } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import { useSelector } from 'react-redux'
import { fetchSuggestedUsers } from '../../api/firestore'
import FriendButton from '../common/FriendButton'

// Skeleton row — matches final layout so there's no content shift
const SuggestionSkeleton = () => (
  <div className="flex items-center gap-2.5 px-2 py-2">
    <Skeleton variant="circular" width={40} height={40} />
    <div className="flex-1">
      <Skeleton variant="text" width="60%" height={18} />
      <Skeleton variant="text" width="40%" height={14} />
    </div>
    <Skeleton variant="rounded" width={76} height={28} />
  </div>
)

// Right rail — "People you may know" (Facebook's right column pattern)
const RightRail = () => {
  const { user } = useSelector((state) => state.auth)
  const [suggested, setSuggested] = useState(null)
  const [dismissed, setDismissed] = useState(() => new Set()) // session-only dismissals

  useEffect(() => {
    if (!user) return
    let active = true
    fetchSuggestedUsers(user.uid)
      .then((users) => { if (active) setSuggested(users) })
      .catch(() => { if (active) setSuggested([]) })
    return () => { active = false }
  }, [user])

  const visible = (suggested || []).filter((u) => !dismissed.has(u.uid))

  return (
    <Paper elevation={0} className="h-full py-3 px-2" sx={{ bgcolor: 'transparent' }}>
      {user && (
        <>
          <Typography
            variant="subtitle2" color="text.secondary" fontWeight={600}
            className="px-2 mb-1"
          >
            People you may know
          </Typography>

          {suggested === null ? (
            <>
              <SuggestionSkeleton />
              <SuggestionSkeleton />
              <SuggestionSkeleton />
            </>
          ) : visible.length === 0 ? (
            <div className="px-2 py-3">
              <Typography variant="body2" color="text.secondary">
                No suggestions right now
              </Typography>
              <Button component={Link} to="/explore" size="small"
                sx={{ textTransform: 'none', mt: 0.5, ml: -1 }}>
                Find people
              </Button>
            </div>
          ) : (
            <div>
              {visible.map((u) => (
                <div
                  key={u.uid}
                  className="group relative flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Link
                    to={`/profile/${u.uid}`}
                    className="flex items-center gap-2.5 no-underline text-inherit min-w-0 flex-1"
                  >
                    <Avatar src={u.photoURL} sx={{ width: 40, height: 40 }} />
                    <div className="min-w-0">
                      <Typography variant="body2" className="font-semibold truncate leading-tight">
                        {u.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" className="truncate block">
                        Suggested for you
                      </Typography>
                    </div>
                  </Link>
                  <FriendButton targetUserId={u.uid} targetName={u.displayName} />
                  <IconButton
                    size="small"
                    aria-label={`Dismiss suggestion ${u.displayName}`}
                    onClick={() => setDismissed((s) => new Set(s).add(u.uid))}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    sx={{ position: 'absolute', top: 2, right: 2, width: 22, height: 22 }}
                  >
                    <CloseIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </div>
              ))}
              <Button component={Link} to="/explore" size="small" fullWidth
                sx={{ textTransform: 'none', justifyContent: 'flex-start', px: 2, mt: 0.5 }}>
                See all
              </Button>
            </div>
          )}

          {/* Footer links — consistent help location (WCAG 3.2.6) */}
          <Divider className="mt-4 mb-2" />
          <Typography variant="caption" color="text.secondary" className="px-2 leading-relaxed block">
            Privacy · Terms · Help
          </Typography>
          <Typography variant="caption" color="text.disabled" className="px-2 block">
            Netbook © 2026
          </Typography>
        </>
      )}
    </Paper>
  )
}

export default RightRail
