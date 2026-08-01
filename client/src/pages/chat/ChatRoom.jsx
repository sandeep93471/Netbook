import { useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  TextField, IconButton, Typography, Avatar, Paper, Badge, List, ListItem,
  ListItemButton, ListItemAvatar, ListItemText, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Checkbox, Chip, Tooltip, Menu, MenuItem, Select, FormControl, InputLabel, Divider,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import DeleteOutlineIcon from '@mui/icons-material/DeleteForeverOutlined'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import GroupAddIcon from '@mui/icons-material/GroupAdd'
import SettingsIcon from '@mui/icons-material/Settings'
import GroupsIcon from '@mui/icons-material/Groups'
import PersonAddAltIcon from '@mui/icons-material/PersonAddAlt'
import { setTyping, subscribeToTyping } from '../../api/typing'
import { timeAgo } from '../../utils/timeAgo'
import { validateMessage } from '../../utils/validation'
import { showError, showSuccess } from '../../utils/errorHandler'
import OnlineStatusDot from '../../components/common/OnlineStatusDot'
import { useUserStatus } from '../../hooks/usePresence'
import {
  sendMessage, subscribeToMessages,
  subscribeToConversations, markConversationRead,
  createGroupConversation, updateConversation, addGroupMember, removeGroupMember,
  addGroupAdmin, removeGroupAdmin, unsendMessage, reactToMessage,
} from '../../api/chat'
import {
  setConversations, setActiveConversation, setMessages,
  selectConversations, selectConversationsLoaded, selectActiveConversation, selectMessages,
} from '../../redux/slices/chatSlice'
import { fetchUserProfile, selectUserById } from '../../redux/slices/userSlice'
import { ChatSkeleton } from '../../components/common/SkeletonLoader'
import EmptyState from '../../components/common/EmptyState'
import ForumIcon from '@mui/icons-material/Forum'

const CHAT_THEMES = ['#1976d2', '#7c3aed', '#e11d48', '#059669', '#ea580c', '#db2777', '#0891b2', '#4f46e5']

// Pick readable bubble text for any theme swatch (WCAG ≥4.5:1)
const relLum = (hex) => {
  const c = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const textOn = (bg) => (relLum(bg) > 0.35 ? '#050505' : '#ffffff')

// Resolve a display name for any participant id
const nameOf = (convo, uid) => convo?.participantInfo?.[uid]?.displayName || 'User'

const ChatRoom = () => {
  const dispatch = useDispatch()
  const { user } = useSelector((state) => state.auth)
  const conversations = useSelector(selectConversations)
  const conversationsLoaded = useSelector(selectConversationsLoaded)
  const activeConversation = useSelector(selectActiveConversation)
  const messages = useSelector(selectMessages)
  const myProfile = useSelector((state) => selectUserById(state, user?.uid))

  const [text, setText] = useState('')
  const [typingUsers, setTypingUsers] = useState([])
  const [groupDialog, setGroupDialog] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [picked, setPicked] = useState([])
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [addMemberId, setAddMemberId] = useState('')
  const [msgMenu, setMsgMenu] = useState(null) // { anchor, msg, mine }
  const [memberMenu, setMemberMenu] = useState(null) // { anchor, uid }

  const QUICK_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🙏']
  const openMsgMenu = (e, msg) => {
    e.preventDefault()
    setMsgMenu({ anchor: e.currentTarget, msg, mine: msg.senderId === user.uid })
  }
  const closeMsgMenu = () => setMsgMenu(null)

  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)

  // People I can invite: friends only
  const candidates = [...new Set(myProfile?.friends || [])].filter((id) => id !== user?.uid)

  // Load candidate profiles for the picker
  useEffect(() => {
    candidates.slice(0, 20).forEach((id) => {
      dispatch(fetchUserProfile(id)).catch?.(() => {})
    })
  }, [dispatch, candidates.join(',')]) // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to conversations list
  useEffect(() => {
    if (!user?.uid) return
    const unsub = subscribeToConversations(user.uid, (convos) => {
      dispatch(setConversations(convos))
    })
    return unsub
  }, [user?.uid, dispatch])

  // Subscribe to messages in active conversation
  useEffect(() => {
    if (!activeConversation || !user?.uid) return
    const unsub = subscribeToMessages(activeConversation, (msgs) => {
      dispatch(setMessages(msgs))
    })
    markConversationRead(activeConversation, user.uid).catch(() => {})
    return unsub
  }, [activeConversation, user?.uid, dispatch])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Debounced typing indicator
  const handleTyping = () => {
    if (!activeConversation || !user?.uid) return
    setTyping(activeConversation, user.uid, true).catch(() => {})
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(activeConversation, user.uid, false).catch(() => {})
    }, 2000)
  }

  useEffect(() => {
    if (!activeConversation || !user?.uid) return
    const unsub = subscribeToTyping(activeConversation, (entries) => {
      const active = entries.filter(
        (e) => e.id !== user.uid && e.isTyping && Date.now() - e.timestamp < 5000
      )
      setTypingUsers(active.map((e) => e.id))
    })
    return unsub
  }, [activeConversation, user?.uid])

  const handleSend = async () => {
    if (!activeConversation) return
    const error = validateMessage(text)
    if (error) {
      if (text.trim()) showError({ message: error })
      return
    }
    clearTimeout(typingTimeoutRef.current)
    setTyping(activeConversation, user.uid, false).catch(() => {})
    await sendMessage(activeConversation, user.uid, text.trim())
    setText('')
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || picked.length === 0) return
    const id = await createGroupConversation(groupName.trim(), user.uid, picked)
    dispatch(setActiveConversation(id))
    setGroupDialog(false)
    setGroupName('')
    setPicked([])
    showSuccess('Group created')
  }

  const getOtherParticipant = (conversation) =>
    conversation.participants.find((p) => p !== user?.uid)

  // Display info: group → name + group icon; DM → other person
  const convoDisplay = (convo) => {
    if (convo.isGroup) {
      return { name: convo.name || 'Group chat', photoURL: '', isGroup: true }
    }
    const otherId = getOtherParticipant(convo)
    const info = convo.participantInfo?.[otherId] || { displayName: 'User', photoURL: '' }
    return { name: info.displayName, photoURL: info.photoURL, isGroup: false, otherId }
  }

  const getUnreadCount = (conversation) =>
    conversation.unreadCounts?.[user?.uid] || 0

  const activeConvo = conversations.find((c) => c.id === activeConversation)
  const display = activeConvo ? convoDisplay(activeConvo) : null
  const theme = activeConvo?.theme || '#1976d2'
  const isAdmin = activeConvo?.admins?.includes(user?.uid)
  const otherStatus = useUserStatus(display?.otherId)

  const typingNames = typingUsers.map((id) => nameOf(activeConvo, id)).join(', ')

  return (
    <div className="flex gap-4 h-[calc(100dvh-96px)] w-full">
      {/* Conversations Sidebar */}
      <Paper
        className={`w-full md:w-[340px] shrink-0 overflow-y-auto rounded-2xl ${activeConversation ? 'hidden md:block' : 'block'}`}
        elevation={1}
        sx={{ borderColor: 'divider' }}
      >
        <div className="p-4 flex items-center justify-between">
          <Typography variant="h6" className="font-bold">Messages</Typography>
          <Tooltip title="New group chat">
            <IconButton size="small" onClick={() => setGroupDialog(true)} aria-label="Create group chat">
              <GroupAddIcon />
            </IconButton>
          </Tooltip>
        </div>
        {!conversationsLoaded && <ChatSkeleton />}
        <List>
          {conversations.map((convo) => {
            const d = convoDisplay(convo)
            const unread = getUnreadCount(convo)
            return (
              <ListItem key={convo.id} disablePadding>
                <ListItemButton
                  selected={activeConversation === convo.id}
                  onClick={() => dispatch(setActiveConversation(convo.id))}
                >
                  <ListItemAvatar>
                    <Badge badgeContent={unread} color="primary">
                      <span className="relative inline-block">
                        {d.isGroup ? (
                          <Avatar sx={{ bgcolor: convo.theme || '#7c3aed' }}><GroupsIcon /></Avatar>
                        ) : (
                          <>
                            <Avatar src={d.photoURL}>{d.name?.charAt(0)}</Avatar>
                            <OnlineStatusDot userId={d.otherId} />
                          </>
                        )}
                      </span>
                    </Badge>
                  </ListItemAvatar>
                  <ListItemText
                    primary={d.name}
                    secondary={convo.lastMessage?.slice(0, 30) || 'No messages yet'}
                    slotProps={{ secondary: { noWrap: true } }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
        {conversationsLoaded && conversations.length === 0 && (
          <EmptyState
            icon={<ForumIcon className="text-gray-300" sx={{ fontSize: 48 }} />}
            title="No conversations"
            description="Visit someone's profile and hit Message, or create a group"
          />
        )}
      </Paper>

      {/* Create group dialog */}
      <Dialog open={groupDialog} onClose={() => setGroupDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>New group chat</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth size="small" label="Group name" autoFocus
            value={groupName} onChange={(e) => setGroupName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <Typography variant="caption" color="text.secondary">Add members</Typography>
          <List dense sx={{ maxHeight: 240, overflow: 'auto' }}>
            {candidates.map((id) => (
              <CandidateRow key={id} uid={id} picked={picked} setPicked={setPicked} />
            ))}
            {candidates.length === 0 && (
              <Typography variant="body2" color="text.secondary" className="px-2 py-3">
                Follow people or add friends first to invite them.
              </Typography>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGroupDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateGroup}
            disabled={!groupName.trim() || picked.length === 0}>
            Create ({picked.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Group settings dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Chat settings</DialogTitle>
        <DialogContent>
          {activeConvo?.isGroup && isAdmin && (
            <>
              <Typography variant="caption" color="text.secondary">Group name</Typography>
              <div className="flex gap-2 mt-1 mb-4">
                <TextField
                  fullWidth size="small"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  placeholder={activeConvo.name}
                />
                <Button variant="outlined" size="small"
                  disabled={!renameValue.trim()}
                  onClick={() => {
                    updateConversation(activeConvo.id, { name: renameValue.trim() })
                    setRenameValue('')
                    showSuccess('Group renamed')
                  }}>
                  Save
                </Button>
              </div>
            </>
          )}

          <Typography variant="caption" color="text.secondary">Theme</Typography>
          <div className="flex gap-2 flex-wrap mt-1 mb-4">
            {CHAT_THEMES.map((c) => (
              <button
                key={c}
                onClick={() => updateConversation(activeConvo.id, { theme: c })}
                className="w-9 h-9 rounded-full transition-transform hover:scale-110"
                style={{ background: c, outline: theme === c ? '3px solid #0f172a' : 'none', outlineOffset: 2 }}
                aria-label={`Theme ${c}`}
              />
            ))}
          </div>

          {activeConvo?.isGroup && (
            <>
              <Typography variant="caption" color="text.secondary">
                Members ({activeConvo.participants.length})
              </Typography>
              <List dense>
                {activeConvo.participants.map((pid) => (
                  <ListItem key={pid} disablePadding
                    secondaryAction={
                      isAdmin && pid !== user.uid ? (
                        <IconButton size="small" aria-label={`Options for ${nameOf(activeConvo, pid)}`}
                          onClick={(e) => setMemberMenu({ anchor: e.currentTarget, uid: pid })}>
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      ) : activeConvo.admins?.includes(pid) ? (
                        <Chip label="Admin" size="small" color="primary" variant="outlined" />
                      ) : null
                    }
                  >
                    <ListItemText
                      primary={nameOf(activeConvo, pid) + (pid === user.uid ? ' (you)' : '')}
                      secondary={activeConvo.admins?.includes(pid) ? 'Admin' : undefined}
                    />
                  </ListItem>
                ))}
              </List>

              {/* Member options menu — admin actions per member */}
              <Menu
                anchorEl={memberMenu?.anchor}
                open={!!memberMenu}
                onClose={() => setMemberMenu(null)}
              >
                {memberMenu && !activeConvo.admins?.includes(memberMenu.uid) && (
                  <MenuItem onClick={() => {
                    addGroupAdmin(activeConvo.id, memberMenu.uid)
                    setMemberMenu(null)
                    showSuccess('Admin added')
                  }}>Make admin</MenuItem>
                )}
                {memberMenu && activeConvo.admins?.includes(memberMenu.uid) && activeConvo.admins.length > 1 && (
                  <MenuItem onClick={() => {
                    removeGroupAdmin(activeConvo.id, memberMenu.uid)
                    setMemberMenu(null)
                    showSuccess('Admin removed')
                  }}>Remove admin</MenuItem>
                )}
                {memberMenu && (
                  <MenuItem onClick={() => {
                    removeGroupMember(activeConvo.id, memberMenu.uid)
                    setMemberMenu(null)
                  }} sx={{ color: 'error.main' }}>Remove from group</MenuItem>
                )}
              </Menu>

              {/* Who can add members — admins only when setting says so */}
              {(isAdmin || activeConvo.settings?.whoCanAddMembers !== 'admins') && (
                <div className="flex gap-2 mt-2 items-center">
                  <TextField
                    select fullWidth size="small" label="Add member"
                    value={addMemberId} onChange={(e) => setAddMemberId(e.target.value)}
                    SelectProps={{ native: true }}
                  >
                    <option value=""></option>
                    {candidates
                      .filter((id) => !activeConvo.participants.includes(id))
                      .map((id) => <CandidateOption key={id} uid={id} />)}
                  </TextField>
                  <IconButton
                    color="primary" disabled={!addMemberId} aria-label="Add member"
                    onClick={() => {
                      addGroupMember(activeConvo.id, addMemberId)
                      setAddMemberId('')
                      showSuccess('Member added')
                    }}>
                    <PersonAddAltIcon />
                  </IconButton>
                </div>
              )}

              {/* Group permissions — admin only */}
              {isAdmin && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary" className="font-semibold uppercase">
                    Group permissions
                  </Typography>
                  <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
                    <InputLabel>Who can send messages</InputLabel>
                    <Select
                      label="Who can send messages"
                      value={activeConvo.settings?.whoCanMessage || 'everyone'}
                      onChange={(e) => updateConversation(activeConvo.id, {
                        settings: { ...activeConvo.settings, whoCanMessage: e.target.value },
                      })}
                    >
                      <MenuItem value="everyone">Everyone</MenuItem>
                      <MenuItem value="admins">Admins only</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small" sx={{ mt: 1.5 }}>
                    <InputLabel>Who can add members</InputLabel>
                    <Select
                      label="Who can add members"
                      value={activeConvo.settings?.whoCanAddMembers || 'everyone'}
                      onChange={(e) => updateConversation(activeConvo.id, {
                        settings: { ...activeConvo.settings, whoCanAddMembers: e.target.value },
                      })}
                    >
                      <MenuItem value="everyone">Everyone</MenuItem>
                      <MenuItem value="admins">Admins only</MenuItem>
                    </Select>
                  </FormControl>
                </>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>

      {/* Chat Area */}
      <Paper
        elevation={1}
        className={`flex-1 flex-col rounded-2xl overflow-hidden ${activeConversation ? 'flex' : 'hidden md:flex'}`}
        sx={{ minWidth: 0 }}
      >
        {activeConversation && activeConvo ? (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-2 p-3 border-b" style={{ borderColor: 'var(--mui-palette-divider, #CED0D4)' }}>
              <IconButton className="md:hidden" size="small"
                onClick={() => dispatch(setActiveConversation(null))}>
                <ArrowBackIcon />
              </IconButton>
              <span className="relative inline-block">
                {display.isGroup ? (
                  <Avatar sx={{ bgcolor: theme, width: 32, height: 32 }}><GroupsIcon fontSize="small" /></Avatar>
                ) : (
                  <>
                    <Avatar src={display.photoURL} sx={{ width: 32, height: 32 }}>
                      {display.name?.charAt(0)}
                    </Avatar>
                    <OnlineStatusDot userId={display.otherId} size={10} />
                  </>
                )}
              </span>
              <div className="flex-1">
                <Typography variant="subtitle1" className="font-semibold leading-tight">
                  {display.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" className="leading-tight">
                  {display.isGroup
                    ? `${activeConvo.participants.length} members`
                    : otherStatus.status === 'online'
                      ? 'Online'
                      : otherStatus.lastSeen
                        ? `Last seen ${timeAgo(otherStatus.lastSeen)}`
                        : 'Offline'}
                </Typography>
              </div>
              <IconButton size="small" aria-label="Chat settings"
                onClick={() => { setRenameValue(activeConvo.name || ''); setSettingsOpen(true) }}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(() => {
                // Last message I sent — read receipts shown under it (Facebook-style)
                const others = (activeConvo?.participants || []).filter((p) => p !== user.uid)
                const lastMine = [...messages].reverse().find((m) => m.senderId === user.uid)
                const seenByAll = lastMine && others.length > 0 &&
                  others.every((p) => (lastMine.read || []).includes(p))
                return messages.map((msg) => {
                const mine = msg.senderId === user.uid
                return (
                  <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[70%]">
                      {display.isGroup && !mine && (
                        <Typography variant="caption" color="text.secondary" className="pl-2">
                          {nameOf(activeConvo, msg.senderId)}
                        </Typography>
                      )}
                      <Paper
                        elevation={1}
                        className="px-4 py-2 rounded-2xl relative group cursor-default"
                        sx={mine ? { background: theme, color: textOn(theme) } : {}}
                        onContextMenu={(e) => openMsgMenu(e, msg)}
                        onDoubleClick={() => reactToMessage(msg.id, '❤️').catch(() => {})}
                      >
                        <Typography variant="body2">{msg.text}</Typography>
                        <Typography variant="caption" className={`block text-right mt-1 ${
                          mine ? (textOn(theme) === '#ffffff' ? 'text-white/70' : 'text-black/60') : 'text-gray-400'
                        }`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Typography>
                        {/* hover actions — like Messenger's bubble menu */}
                        <IconButton
                          size="small" aria-label="Message options"
                          className="absolute -top-3 right-1 opacity-0 group-hover:opacity-100 transition bg-white dark:bg-[#3A3B3C] shadow"
                          sx={{ width: 22, height: 22 }}
                          onClick={(e) => openMsgMenu(e, msg)}
                        >
                          <MoreVertIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </Paper>
                      {/* reaction chips under the bubble */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className={`flex gap-0.5 mt-0.5 ${mine ? 'justify-end' : 'justify-start'} pl-1`}>
                          {[...new Set(Object.values(msg.reactions))].map((e) => (
                            <span key={e} className="text-xs bg-gray-100 dark:bg-[#3A3B3C] rounded-full px-1 shadow-sm">{e}</span>
                          ))}
                        </div>
                      )}
                      {mine && msg.id === lastMine?.id && (
                        <Typography variant="caption" className={`block text-right pr-1 ${
                          seenByAll ? 'text-[#1976d2]' : 'text-gray-400'
                        }`}>
                          {seenByAll ? '✓✓ Seen' : '✓ Sent'}
                        </Typography>
                      )}
                    </div>
                  </div>
                )
              })})()}
              {typingUsers.length > 0 && (
                <Typography variant="caption" color="text.secondary" className="italic px-1">
                  {typingNames} {typingUsers.length > 1 ? 'are' : 'is'} typing...
                </Typography>
              )}
              {/* Message context menu — quick reactions + unsend */}
              <Menu
                anchorEl={msgMenu?.anchor}
                open={!!msgMenu}
                onClose={closeMsgMenu}
                PaperProps={{ sx: { borderRadius: 999, px: 1, py: 0.5 } }}
              >
                <div className="flex items-center gap-0.5">
                  {QUICK_EMOJIS.map((e) => (
                    <IconButton
                      key={e} size="small" sx={{ fontSize: '1.15rem', p: 0.5 }}
                      onClick={() => { reactToMessage(msgMenu.msg.id, e).catch(() => {}); closeMsgMenu() }}
                    >
                      {e}
                    </IconButton>
                  ))}
                  {msgMenu?.mine && (
                    <IconButton
                      size="small" aria-label="Unsend message"
                      onClick={() => { unsendMessage(msgMenu.msg.id).catch(() => {}); closeMsgMenu() }}
                    >
                      <DeleteOutlineIcon fontSize="small" color="error" />
                    </IconButton>
                  )}
                </div>
              </Menu>
              <div ref={messagesEndRef} />
            </div>

            {/* Input — hidden when group is admins-only messaging */}
            <div className="p-4 border-t" style={{ borderColor: 'var(--mui-palette-divider, #CED0D4)' }}>
              {activeConvo.isGroup && activeConvo.settings?.whoCanMessage === 'admins' && !isAdmin ? (
                <Typography variant="body2" color="text.secondary" className="text-center py-1">
                  Only admins can send messages in this group
                </Typography>
              ) : (
                <div className="flex gap-2">
                  <TextField
                    fullWidth size="small" placeholder="Type a message..."
                    value={text} onChange={(e) => { setText(e.target.value); handleTyping() }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <IconButton onClick={handleSend} disabled={!text.trim()}
                    sx={{ color: theme, minWidth: 44, minHeight: 44 }} aria-label="Send message">
                    <SendIcon />
                  </IconButton>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 items-center justify-center hidden md:flex">
            <EmptyState
              icon={<ForumIcon className="text-gray-300 dark:text-gray-600" sx={{ fontSize: 56 }} />}
              title="Your messages"
              description="Select a conversation or start a new chat"
            />
          </div>
        )}
      </Paper>
    </div>
  )
}

// Member picker row — resolves profile from the users adapter
const CandidateRow = ({ uid, picked, setPicked }) => {
  const profile = useSelector((state) => selectUserById(state, uid))
  const checked = picked.includes(uid)
  return (
    <ListItem disablePadding>
      <ListItemButton onClick={() =>
        setPicked(checked ? picked.filter((p) => p !== uid) : [...picked, uid])
      }>
        <ListItemAvatar>
          <Avatar src={profile?.photoURL}>{profile?.displayName?.charAt(0) || '?'}</Avatar>
        </ListItemAvatar>
        <ListItemText primary={profile?.displayName || uid.slice(0, 8)} />
        <Checkbox edge="end" checked={checked} tabIndex={-1} />
      </ListItemButton>
    </ListItem>
  )
}

const CandidateOption = ({ uid }) => {
  const profile = useSelector((state) => selectUserById(state, uid))
  return <option value={uid}>{profile?.displayName || uid.slice(0, 8)}</option>
}

export default ChatRoom
