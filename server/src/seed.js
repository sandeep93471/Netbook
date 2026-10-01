import 'dotenv/config'
import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { connectDB } from './config/db.js'
import User from './models/User.js'
import Post from './models/Post.js'
import Comment from './models/Comment.js'
import Story from './models/Story.js'
import Notification from './models/Notification.js'
import FriendRequest from './models/FriendRequest.js'
import Conversation from './models/Conversation.js'
import Message from './models/Message.js'
import Highlight from './models/Highlight.js'

// ---------------------------------------------------------------------------
// Seed — fills the app with realistic social content for demos.
// Demo users are identified by the @netbook.demo email domain. Re-running the
// script wipes ONLY demo-owned data — real accounts and their content survive.
// ---------------------------------------------------------------------------

const DEMO_EMAIL = /@netbook\.demo$/
const DEMO_PASSWORD = 'password123'

const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000
const MIN = 60 * 1000
const now = Date.now()
const rand = (n) => Math.floor(Math.random() * n)
const pick = (arr) => arr[rand(arr.length)]
const pickN = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n)
const ago = (ms) => new Date(now - ms)

// Verified-working media -------------------------------------------------------
const img = (seed, w = 900, h = 650) => `https://picsum.photos/seed/${seed}/${w}/${h}`
const avatar = (gender, n) => `https://randomuser.me/api/portraits/${gender}/${n}.jpg`
const cover = (seed) => `https://picsum.photos/seed/${seed}-cover/1200/400`

const VIDEOS = [
  'https://res.cloudinary.com/demo/video/upload/dog.mp4',
  'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
  'https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4',
  'https://res.cloudinary.com/demo/video/upload/cld-sample-video.mp4',
  'https://res.cloudinary.com/demo/video/upload/wave.mp4',
  'https://res.cloudinary.com/demo/video/upload/hotel.mp4',
  'https://res.cloudinary.com/demo/video/upload/snow_deer.mp4',
  'https://res.cloudinary.com/demo/video/upload/ski_jump.mp4',
  'https://res.cloudinary.com/demo/video/upload/docs/walking_talking.mp4',
  'https://res.cloudinary.com/demo/video/upload/samples/dance-2.mp4',
  'https://res.cloudinary.com/demo/video/upload/snow_horses.mp4',
]

const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
]

const REACTIONS = ['like', 'love', 'haha', 'wow', 'sad', 'angry']

// Demo users -------------------------------------------------------------------
const PEOPLE = [
  { name: 'Aarav Mehta',    gender: 'male',   pic: 32, bio: 'Chasing mountains and sunsets. Travel photographer. Based in Manali.', },
  { name: 'Priya Sharma',   gender: 'female', pic: 44, bio: 'Food blogger. If it is delicious, I have probably posted it.', },
  { name: 'Rohan Kapoor',   gender: 'male',   pic: 12, bio: 'Tech nerd. Gadgets, AI and way too many hot takes.', },
  { name: 'Ananya Iyer',    gender: 'female', pic: 26, bio: 'Artist and illustrator. Commissions open.', },
  { name: 'Vikram Singh',   gender: 'male',   pic: 52, bio: 'Fitness coach. No shortcuts, just reps.', },
  { name: 'Meera Nair',     gender: 'female', pic: 65, bio: 'Professional bookworm. Currently reading everything.', },
  { name: 'Arjun Desai',    gender: 'male',   pic: 75, bio: 'Musician. Guitar in hand, always.', },
  { name: 'Kavya Reddy',    gender: 'female', pic: 22, bio: 'Fashion and styling. Thrift queen.', },
  { name: 'Dev Patel',      gender: 'male',   pic: 60, bio: 'Gamer. Streamer. Night owl.', },
  { name: 'Ishita Bose',    gender: 'female', pic: 30, bio: 'Backpacker. 23 countries and counting.', },
  { name: 'Nikhil Joshi',   gender: 'male',   pic: 41, bio: 'Full-stack developer. Coffee-powered.', },
  { name: 'Tara Menon',     gender: 'female', pic: 17, bio: 'Dancer. Classical + hip hop.', },
  { name: 'Kabir Malhotra', gender: 'male',   pic: 7,  bio: 'Car guy. Weekend road trips.', private: true },
  { name: 'Zoya Khan',      gender: 'female', pic: 55, bio: 'Nature photographer. Golden hour addict.', },
]

const emailFor = (name) =>
  name.toLowerCase().replace(/[^a-z]+/g, '.') + '@netbook.demo'

// Same parsing rules as postController.parsePostText
const parsePostText = async (text, demoByName) => {
  const hashtags = [...new Set([...text.matchAll(/#(\w+)/g)].map((m) => m[1].toLowerCase()))]
  const mentionNames = [...new Set([...text.matchAll(/@([\w.]+)/g)].map((m) => m[1].toLowerCase()))]
  const searchTerms = [...new Set(text.toLowerCase().split(/[^\w#@]+/).filter((w) => w.length > 1))]
  const mentionMap = {}
  mentionNames.forEach((n) => {
    const u = demoByName.get(n) || demoByName.get(n.replace(/\./g, ' '))
    if (u) mentionMap[u.searchName] = u._id.toString()
  })
  return { hashtags, mentions: Object.values(mentionMap), mentionMap, searchTerms }
}

const main = async () => {
  await connectDB()
  const db = mongoose.connection.db

  // -------------------------------------------------------------------------
  // 1. Clean up previous demo data (real accounts untouched)
  // -------------------------------------------------------------------------
  const oldDemo = await User.find({ email: DEMO_EMAIL }).select('_id')
  const oldIds = oldDemo.map((u) => u._id)
  if (oldIds.length) {
    const oldConvoIds = (await Conversation.find({ participants: { $in: oldIds } }).select('_id')).map((c) => c._id)
    const oldPostIds = (await Post.find({ user: { $in: oldIds } }).select('_id')).map((p) => p._id)
    await Promise.all([
      User.deleteMany({ _id: { $in: oldIds } }),
      Post.deleteMany({ user: { $in: oldIds } }),
      Comment.deleteMany({ $or: [{ user: { $in: oldIds } }, { post: { $in: oldPostIds } }] }),
      Story.deleteMany({ user: { $in: oldIds } }),
      Notification.deleteMany({ $or: [{ sender: { $in: oldIds } }, { recipient: { $in: oldIds } }] }),
      FriendRequest.deleteMany({ $or: [{ from: { $in: oldIds } }, { to: { $in: oldIds } }] }),
      Message.deleteMany({ conversation: { $in: oldConvoIds } }),
      Conversation.deleteMany({ _id: { $in: oldConvoIds } }),
      Highlight.deleteMany({ user: { $in: oldIds } }),
      // pull stale demo refs out of real users + posts
      User.updateMany({}, { $pull: { friends: { $in: oldIds }, followers: { $in: oldIds }, following: { $in: oldIds }, closeFriends: { $in: oldIds }, savedPosts: { $in: oldPostIds } } }),
      Post.updateMany({}, { $pull: { likes: { $in: oldIds } } }),
    ])
    console.log(`Cleared ${oldIds.length} previous demo users and their content`)
  }

  // -------------------------------------------------------------------------
  // 2. Demo users
  // -------------------------------------------------------------------------
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const demoDocs = PEOPLE.map((p) => ({
    displayName: p.name,
    searchName: p.name.toLowerCase(),
    email: emailFor(p.name),
    passwordHash,
    photoURL: avatar(p.gender === 'male' ? 'men' : 'women', p.pic),
    coverURL: cover(p.name.split(' ')[0].toLowerCase()),
    bio: p.bio,
    isPrivate: !!p.private,
    verified: true,
    gender: p.gender,
    dob: new Date(1990 + rand(12), rand(12), 1 + rand(28)),
    lastSeen: now - rand(12) * HOUR,
  }))
  const demos = await User.insertMany(demoDocs)
  const demoIds = demos.map((d) => d._id)
  const demoByName = new Map(demos.map((d) => [d.searchName, d]))
  console.log(`Created ${demos.length} demo users`)

  // Existing real users — everyone gets a lively feed no matter who logs in
  const realUsers = await User.find({ email: { $not: DEMO_EMAIL } }).select('_id displayName photoURL friends')
  const realIds = realUsers.map((u) => u._id)
  console.log(`Linking to ${realIds.length} existing accounts`)

  // -------------------------------------------------------------------------
  // 3. Social graph — every demo is friends with every other demo (complete
  //    graph so private/followers content always passes the privacy filter),
  //    plus the first 10 demos friend every real user. The last 4 stay
  //    non-friends so suggestions, "Add friend" buttons and the private-account
  //    flow all still demo properly.
  // -------------------------------------------------------------------------
  const FRIEND_COUNT = 10
  const friendDemos = demos.slice(0, FRIEND_COUNT)
  const friendOps = []
  demos.forEach((d, i) => {
    const all = [...new Set([...demoIds.filter((id) => !id.equals(d._id)), ...(i < FRIEND_COUNT ? realIds : [])].map(String))]
    friendOps.push({
      updateOne: {
        filter: { _id: d._id },
        update: { $set: { friends: all, followers: all, following: all } },
      },
    })
  })
  friendDemos.forEach((d) => {
    realIds.forEach((rid) => {
      friendOps.push({
        updateOne: {
          filter: { _id: rid },
          update: { $addToSet: { friends: d._id, followers: d._id } },
        },
      })
    })
  })
  // close friends — a few demos mark real users so green-ring stories show
  demos.slice(0, 6).forEach((d) => {
    friendOps.push({
      updateOne: {
        filter: { _id: d._id },
        update: { $addToSet: { closeFriends: { $each: realIds.slice(0, 4) } } },
      },
    })
  })
  await User.bulkWrite(friendOps)

  // pending friend requests TO real users, sent by non-friend demos
  // (realistic: a stranger request waiting in the inbox)
  const nonFriendIds = demoIds.slice(FRIEND_COUNT)
  await FriendRequest.insertMany(
    realIds.slice(0, 8).map((rid, i) => ({ from: nonFriendIds[i % nonFriendIds.length], to: rid }))
  )

  // -------------------------------------------------------------------------
  // 4. Posts — captions mapped to each demo's vibe, spread over ~6 days
  // -------------------------------------------------------------------------
  const U = {} // shorthand: U['aarav'] → demo user
  demos.forEach((d) => { U[d.searchName.split(' ')[0]] = d })

  const POSTS = [
    // [authorKey, text, opts]
    ['aarav', 'Sunrise at 4,000m. Worth every frozen toe. #mountains #himalayas #wanderlust', { img: 'peak-1' }],
    ['aarav', 'Three days off-grid in Spiti valley. No signal, no noise, just stars. #travel', { img: 'spiti-2' }],
    ['aarav', 'Golden hour hitting different today.', { bg: 4 }],
    ['aarav', 'Packing list for a week in the mountains: camera, one jacket, zero regrets. #backpacking', {}],
    ['priya', 'Made butter chicken from scratch for the first time. The naan did not survive 5 minutes. #foodie #homecooking', { img: 'food-1' }],
    ['priya', 'Street food tour — this chaat changed my life. #streetfood', { img: 'chaat-2' }],
    ['priya', 'Sunday brunch spread. Pancakes, berries and too much maple syrup. #brunch', { img: 'brunch-3' }],
    ['priya', 'Rating every dessert in the city this month. Week 1: this tiramisu gets a 9/10.', { img: 'tiramisu-4' }],
    ['rohan', 'Hot take: the best feature in any app is the one you never notice — good UX is invisible. #tech', {}],
    ['rohan', 'Just tried the new AI photo editing tools and honestly the future is wild. #ai #technology', { img: 'tech-1' }],
    ['rohan', 'Unpopular opinion: 90% of meetings could be a message thread.', { bg: 0 }],
    ['rohan', 'My desk setup finally feels complete. Mechanical keyboard era. #setup #coding', { img: 'desk-2' }],
    ['ananya', 'Finished this commissioned piece after 3 weeks. Oil on canvas, 24x36. #art #painting', { img: 'canvas-1' }],
    ['ananya', 'Sketchbook dump from this week. Faces are hard. #sketch #artist', { img: 'sketch-2' }],
    ['ananya', 'Art tip nobody tells you: ugly middle stages are part of the process. Keep going.', { bg: 1 }],
    ['vikram', 'Leg day done. Walking downstairs is now a extreme sport. #gym #fitness', {}],
    ['vikram', '6 AM club. Empty gym, loud music, heavy barbell. #motivation', { img: 'gym-1' }],
    ['vikram', 'Progress is progress. Down 8kg in 4 months — slow is sustainable. #fitnessjourney', { img: 'fitness-2' }],
    ['meera', 'Just finished "The Name of the Wind" and I need everyone to read it so we can talk about it. #books #bookstagram', { img: 'book-1' }],
    ['meera', 'Rainy day + coffee + a good book = perfection. #reading', { img: 'rain-book-2' }],
    ['meera', 'My to-read pile is now taller than my lamp. No regrets. #booklover', {}],
    ['arjun', 'Recorded a new acoustic cover today. Dropping it this weekend. #music #acoustic', { img: 'guitar-1' }],
    ['arjun', 'That feeling when the riff you have been practicing for weeks finally clicks.', { bg: 5 }],
    ['arjun', 'Open mic night was incredible. This city has so much talent. #livemusic', { img: 'openmic-2' }],
    ['kavya', 'Thrifted this entire outfit for under 500. Sustainable fashion wins again. #ootd #thrifted', { img: 'outfit-1' }],
    ['kavya', 'Autumn layering season is officially here and I am READY. #fashion', { img: 'autumn-2' }],
    ['dev', 'Finally hit Diamond rank after 6 months of grinding. We take those. #gaming #ranked', {}],
    ['dev', 'Stream starting in 10 — tonight we attempt the boss fight that wrecked me yesterday. #twitch #livestream', {}],
    ['dev', 'New setup day. Dual monitors + RGB = +50% skill, scientifically proven. #gamingsetup', { img: 'setup-3' }],
    ['ishita', 'Country #23: Portugal. The pastel de nata alone was worth the flight. #travel #portugal', { img: 'lisbon-1' }],
    ['ishita', 'Solo travel taught me more than any classroom ever could. #solotravel #wanderlust', { img: 'solo-2' }],
    ['ishita', 'Missed my train, ended up in a tiny village with the best bakery I have ever found. Travel is just planned chaos. #travel', {}],
    ['nikhil', 'Shipped a feature today that cut load times by 60%. Feels good. #webdev #performance', {}],
    ['nikhil', 'Debugging is just being a detective in a crime movie where you are also the murderer. #programming', { bg: 2 }],
    ['nikhil', 'Weekend project: rebuilt my portfolio with React 19 and the new compiler. Fast. #react #javascript', { img: 'code-1' }],
    ['tara', 'New choreography video drops tonight. This one took 3 weeks to nail. #dance #choreography', {}],
    ['tara', 'Dance is just math you can feel. Counts, angles, energy. #dancer', { bg: 3 }],
    ['kabir', 'Sunday drive through the ghats. 200km of pure therapy. #roadtrip #cars', { img: 'drive-1' }],
    ['kabir', 'Washed, waxed, detailed. She is ready for the week. #carsofinstagram', { img: 'car-2' }],
    ['zoya', 'Waited 2 hours for this shot. The light lasted 90 seconds. #photography #goldenhour', { img: 'goldenhour-1' }],
    ['zoya', 'Macro Monday: dew drops on a spider web. Nature is the best artist. #macro #nature', { img: 'dew-2' }],
    ['zoya', 'Mist rolling through the forest at dawn. Sometimes the best lens is patience. #naturephotography', { img: 'mist-3' }],
    ['priya', 'The secret ingredient is always butter. Fight me. #cooking', { bg: 6 }],
    ['rohan', 'Mentioning @aarav.mehta — your Spiti photos convinced me to finally book the trip. #travel', {}],
    ['aarav', '@ishita.bose Portugal looked unreal. Adding Lisbon to the list. #travel', {}],
    ['meera', 'Book club pick for October: Piranesi. Come discuss with us! @ananya.iyer @nikhil.joshi #bookclub', {}],
  ]

  // Reels — video posts, recent so they lead the reels feed
  const REELS = [
    ['tara',  'New routine — turned the volume up for this one. #dance #reels', 'samples/dance-2.mp4'],
    ['aarav', 'Wave timing is everything. #ocean #reels', 'wave.mp4'],
    ['zoya',  'Snow deer at sunrise. Wait for the head turn. #wildlife #reels', 'snow_deer.mp4'],
    ['vikram','POV: the gym playlist hits exactly right. #gym #reels', 'docs/walking_talking.mp4'],
    ['kabir', 'Horses in the snow — shot from the car window. #nature #reels', 'snow_horses.mp4'],
    ['arjun', 'Hotel lobby acoustics were too good to not record. #music #reels', 'hotel.mp4'],
    ['ishita','Sea turtle casually cruising past us. Unreal. #ocean #reels', 'sea_turtle.mp4'],
    ['priya', 'Elephants at the sanctuary today. Gentle giants. #animals #reels', 'elephants.mp4'],
    ['dev',   'Rate my editing — this took 4 hours. #gaming #reels', 'cld-sample-video.mp4'],
    ['ananya','Timelapse vibes — process video coming soon. #art #reels', 'samples/cld-sample-video.mp4'],
    ['nikhil','Dog tax. He supervises all my code reviews. #dog #reels', 'dog.mp4'],
    ['kavya', 'Ski jump slow-mo from the winter trip. #ski #reels', 'ski_jump.mp4'],
  ]

  const videoURL = (file) => `https://res.cloudinary.com/demo/video/upload/${file}`

  const friendIds = new Set(friendDemos.map((d) => d._id.toString()))
  const postDocs = []
  for (let i = 0; i < POSTS.length; i++) {
    const [key, text, opts] = POSTS[i]
    const author = U[key]
    const parsed = await parsePostText(text, demoByName)
    postDocs.push({
      text,
      user: author._id,
      displayName: author.displayName,
      photoURL: author.photoURL,
      imageURL: opts.img ? img(`${opts.img}`, 900, 600) : '',
      background: opts.bg !== undefined ? GRADIENTS[opts.bg] : null,
      // 'followers' only from friend-demos — a non-friend author's
      // followers-post would be filtered out of real users' feeds
      visibility: i % 11 === 4 && friendIds.has(author._id.toString()) ? 'followers' : 'public',
      ...parsed,
      // private-account posts stay old so filtered docs never truncate
      // the first feed page (feed fetches PAGE_SIZE+1 then filters)
      createdAt: author.isPrivate ? ago(4 * DAY + rand(2) * DAY) : ago(rand(5 * DAY) + rand(20) * HOUR + i * 13 * MIN),
      updatedAt: ago(rand(5 * DAY)),
    })
  }
  for (let i = 0; i < REELS.length; i++) {
    const [key, text, file] = REELS[i]
    const author = U[key]
    const parsed = await parsePostText(text, demoByName)
    postDocs.push({
      text,
      user: author._id,
      displayName: author.displayName,
      photoURL: author.photoURL,
      videoURL: videoURL(file),
      ...parsed,
      createdAt: ago(rand(30) * HOUR + i * 47 * MIN),
      updatedAt: ago(rand(30) * HOUR),
    })
  }
  const posts = await Post.insertMany(postDocs)
  console.log(`Created ${posts.length} posts (${REELS.length} reels)`)

  // -------------------------------------------------------------------------
  // 5. Shares — a few demo users repost, bump shareCount on originals
  // -------------------------------------------------------------------------
  const shareSrc = [posts[0], posts[4], posts[39]].filter(Boolean)
  for (let i = 0; i < shareSrc.length; i++) {
    const orig = shareSrc[i]
    const sharer = demos[(i * 4 + 2) % demos.length]
    await Post.create({
      text: pick(['This is amazing, had to share', 'Sharing for everyone who needs to see this', 'Incredible.']),
      user: sharer._id,
      displayName: sharer.displayName,
      photoURL: sharer.photoURL,
      sharedFrom: {
        id: orig._id, displayName: orig.displayName, photoURL: orig.photoURL,
        text: orig.text, imageURL: orig.imageURL, createdAt: orig.createdAt,
      },
      createdAt: ago(rand(2) * DAY),
    })
    await Post.findByIdAndUpdate(orig._id, { $inc: { shareCount: 1 } })
  }

  // -------------------------------------------------------------------------
  // 6. Reactions + comments on every post (denser on recent ones)
  // -------------------------------------------------------------------------
  const allReactorIds = [...demoIds, ...realIds]
  const commentTexts = [
    'This is amazing!', 'Love this', 'So true', 'Wow, incredible shot',
    'Goals honestly', 'Haha yes', 'Need this energy today', 'Beautiful!',
    'Teach me your ways', 'This made my day', 'Underrated post', 'Facts.',
    'Stunning', 'Okay this is actually so good', 'Saving this',
    'Absolute vibes', 'Take my like', 'First?', 'How is this real',
    'Drop the tutorial please', 'Instant classic', 'This deserves more likes',
  ]
  const replyTexts = ['Right?!', 'Agreed 100%', 'Same here', 'Could not agree more', 'Haha exactly']

  const commentDocs = []
  const notifDocs = []

  for (const p of posts) {
    // reactions — recent posts get more love
    const ageH = (now - p.createdAt.getTime()) / HOUR
    const reactorCount = Math.min(allReactorIds.length, Math.max(2, 18 - Math.floor(ageH / 10) + rand(6)))
    const reactors = pickN(allReactorIds.filter((id) => !id.equals(p.user)), reactorCount)
    const reactions = {}
    const likes = []
    reactors.forEach((rid) => {
      const r = Math.random() < 0.62 ? 'like' : pick(REACTIONS.slice(1))
      reactions[rid.toString()] = r
      if (r === 'like') likes.push(rid)
    })

    // comments — 0-5 top-level, some with replies
    const nComments = rand(6)
    let count = 0
    for (let c = 0; c < nComments; c++) {
      const commenter = pick(demos.filter((d) => !d._id.equals(p.user)))
      const cAt = p.createdAt.getTime() + rand(Math.min(ageH * HOUR, 2 * DAY))
      const comment = {
        post: p._id, user: commenter._id,
        displayName: commenter.displayName, photoURL: commenter.photoURL,
        text: pick(commentTexts),
        likes: pickN(allReactorIds, rand(6)),
        createdAt: new Date(cAt), updatedAt: new Date(cAt),
      }
      commentDocs.push(comment)
      count++
      if (Math.random() < 0.45) {
        const replier = pick(demos.filter((d) => !d._id.equals(commenter._id)))
        const rAt = cAt + rand(6) * HOUR
        commentDocs.push({
          post: p._id, user: replier._id,
          displayName: replier.displayName, photoURL: replier.photoURL,
          text: pick(replyTexts),
          parentCommentId: null, // resolved via _parentIdx after insert
          _parentIdx: commentDocs.length - 1,
          likes: pickN(allReactorIds, rand(3)),
          createdAt: new Date(rAt), updatedAt: new Date(rAt),
        })
        count++
      }
    }

    await Post.updateOne({ _id: p._id }, { $set: { reactions, likes, commentCount: count } })

    // a couple of notifications TO the post author from reactors
    pickN(reactors.slice(0, 3), Math.min(2, reactors.length)).forEach((rid) => {
      const sender = demos.find((d) => d._id.equals(rid)) || realUsers.find((u) => u._id.equals(rid))
      if (sender && !rid.equals(p.user)) {
        notifDocs.push({
          recipient: p.user, sender: rid,
          senderName: sender.displayName, senderPhoto: sender.photoURL,
          type: 'like', postId: p._id, postText: p.text?.slice(0, 80),
          read: Math.random() < 0.4,
          createdAt: ago(rand(4) * DAY),
        })
      }
    })
  }

  // resolve reply parent ids, strip temp fields, insert
  const inserted = await Comment.insertMany(commentDocs.map(({ _parentIdx, _tmpId, ...c }) => c))
  const replyOps = []
  commentDocs.forEach((c, i) => {
    if (c._parentIdx !== undefined) {
      replyOps.push({
        updateOne: { filter: { _id: inserted[i]._id }, update: { $set: { parentCommentId: inserted[c._parentIdx]._id } } },
      })
    }
  })
  if (replyOps.length) await Comment.bulkWrite(replyOps)
  console.log(`Created ${inserted.length} comments`)

  // -------------------------------------------------------------------------
  // 7. Notifications for real users — likes, comments, accepts, follows
  // -------------------------------------------------------------------------
  realIds.forEach((rid) => {
    const senders = pickN(demos, 5 + rand(4))
    senders.forEach((s, i) => {
      const post = pick(posts)
      const types = ['like', 'comment', 'friend_accept', 'follow', 'share', 'mention']
      const type = types[i % types.length]
      notifDocs.push({
        recipient: rid, sender: s._id,
        senderName: s.displayName, senderPhoto: s.photoURL,
        type,
        postId: ['like', 'comment', 'share', 'mention'].includes(type) ? post._id : undefined,
        postText: post.text?.slice(0, 80),
        read: i > 2,
        createdAt: ago(rand(3) * DAY + i * HOUR),
      })
    })
  })
  await Notification.insertMany(notifDocs)
  console.log(`Created ${notifDocs.length} notifications`)

  // -------------------------------------------------------------------------
  // 8. Stories — fresh (< 12h old) so the tray is full; some close-friends
  // -------------------------------------------------------------------------
  const storyDocs = []
  const storyAuthors = pickN(demos, 10)
  const storySeeds = ['morning', 'city', 'foodpic', 'sky', 'pets', 'night', 'beach', 'work', 'art', 'hike', 'cafe', 'gym']
  storyAuthors.forEach((s, i) => {
    const n = 1 + rand(3)
    for (let j = 0; j < n; j++) {
      const created = now - rand(10) * HOUR - j * 90 * MIN
      storyDocs.push({
        user: s._id, displayName: s.displayName, photoURL: s.photoURL,
        imageURL: `https://picsum.photos/seed/story-${storySeeds[(i + j) % storySeeds.length]}-${i}${j}/720/1280`,
        createdAt: created,
        expiresAt: new Date(created + DAY),
        viewedBy: pickN(allReactorIds.filter((id) => !id.equals(s._id)), rand(8))
          .map((uid) => ({ user: uid, at: created + rand(5) * HOUR })),
        closeFriendsOnly: j === 0 && i % 3 === 0,
      })
    }
    // one expired story each for highlights/archive
    storyDocs.push({
      user: s._id, displayName: s.displayName, photoURL: s.photoURL,
      imageURL: `https://picsum.photos/seed/arch-${i}/720/1280`,
      createdAt: now - 3 * DAY - i * HOUR,
      expiresAt: new Date(now - 2 * DAY),
      viewedBy: [],
    })
  })
  const stories = await Story.insertMany(storyDocs)
  console.log(`Created ${stories.length} stories`)

  // Highlights for a few users — mix of active + archived stories
  const hlUsers = storyAuthors.slice(0, 4)
  const hlNames = ['Travel', 'Best of 2025', 'Food', 'Moments']
  for (let i = 0; i < hlUsers.length; i++) {
    const mine = stories.filter((s) => s.user.equals(hlUsers[i]._id))
    const items = pickN(mine, Math.min(mine.length, 2 + rand(3)))
    if (!items.length) continue
    await Highlight.create({
      user: hlUsers[i]._id,
      name: hlNames[i],
      coverImage: items[0].imageURL,
      items: items.map((s) => s._id),
    })
  }

  // -------------------------------------------------------------------------
  // 9. Chat — DMs real↔demo + one community group with everyone
  // -------------------------------------------------------------------------
  const chatLines = [
    'hey! how are you', 'did you see my new post?', 'that photo was insane btw',
    'wanna catch up this weekend?', 'lol yes definitely', 'check your notifs',
    'sending you the pics now', 'okk talk soon', 'wait really?? tell me more',
    'haha that is so true', 'bet, it is a plan then', 'gm!', 'nice, congrats!',
    'bro the reel you posted is trending', 'we should collab sometime',
  ]
  let convoCount = 0
  let msgCount = 0
  const pInfo = (u) => ({ displayName: u.displayName, photoURL: u.photoURL })

  for (const ru of realUsers) {
    const buddies = pickN(friendDemos, 2 + rand(2)) // DMs are friends-only in the app
    for (const b of buddies) {
      const nMsg = 4 + rand(6)
      const msgs = []
      let t = now - rand(20) * HOUR
      for (let m = 0; m < nMsg; m++) {
        t += rand(90) * MIN
        const fromDemo = m >= nMsg - (1 + rand(3)) // last messages from demo → unread for real user
        msgs.push({
          sender: fromDemo ? b._id : ru._id,
          text: pick(chatLines),
          read: fromDemo ? [b._id] : [ru._id, b._id],
          createdAt: new Date(t), updatedAt: new Date(t),
        })
      }
      const unreadForReal = msgs.filter((m) => m.sender.equals(b._id) && !m.read.includes(ru._id)).length
      const convo = await Conversation.create({
        participants: [ru._id, b._id],
        participantInfo: { [ru._id]: pInfo(ru), [b._id]: pInfo(b) },
        lastMessage: msgs[msgs.length - 1].text,
        lastSenderId: msgs[msgs.length - 1].sender,
        lastMessageAt: t,
        unreadCounts: { [ru._id]: unreadForReal, [b._id]: 0 },
        theme: pick(['#1976d2', '#e91e63', '#43a047', '#ff6d00', '#7b1fa2']),
      })
      await Message.insertMany(msgs.map((m) => ({ ...m, conversation: convo._id })))
      convoCount++; msgCount += msgs.length
    }
  }

  // Community group — all demos + all real users
  const groupParts = [...realIds, ...demoIds]
  const gInfo = {}
  ;[...realUsers, ...demos].forEach((u) => { gInfo[u._id] = pInfo(u) })
  const gMsgs = []
  let gt = now - 30 * HOUR
  for (let m = 0; m < 14; m++) {
    gt += rand(120) * MIN
    const sender = pick(demos)
    gMsgs.push({
      sender: sender._id, text: pick(chatLines),
      read: pickN(groupParts, groupParts.length - rand(8)),
      createdAt: new Date(gt), updatedAt: new Date(gt),
    })
  }
  const group = await Conversation.create({
    isGroup: true, name: 'Netbook Community',
    admins: [demos[0]._id, ...realIds.slice(0, 1)],
    participants: groupParts, participantInfo: gInfo,
    lastMessage: gMsgs[gMsgs.length - 1].text,
    lastSenderId: gMsgs[gMsgs.length - 1].sender,
    lastMessageAt: gt,
    unreadCounts: Object.fromEntries(groupParts.map((id) => [id, rand(4)])),
    theme: '#1976d2',
  })
  await Message.insertMany(gMsgs.map((m) => ({ ...m, conversation: group._id })))
  convoCount++; msgCount += gMsgs.length

  // saved posts — demo + real users get a few bookmarks
  const saveOps = []
  realIds.forEach((rid) => {
    saveOps.push({
      updateOne: { filter: { _id: rid }, update: { $addToSet: { savedPosts: { $each: pickN(posts, 3 + rand(3)).map((p) => p._id) } } } },
    })
  })
  await User.bulkWrite(saveOps)

  console.log(`Created ${convoCount} conversations / ${msgCount} messages`)
  console.log('\nSeed complete.')
  console.log(`Demo login: ${emailFor(PEOPLE[0].name)} / ${DEMO_PASSWORD}`)
  await mongoose.disconnect()
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
