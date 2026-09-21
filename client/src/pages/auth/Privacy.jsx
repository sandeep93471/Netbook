import { Link } from 'react-router-dom'
import { Typography, Box } from '@mui/material'

const Privacy = () => (
  <Box className="min-h-screen bg-[#fafafa] dark:bg-[#0f172a] py-12 px-6">
    <Box className="max-w-2xl mx-auto bg-white dark:bg-[#1e293b] rounded-xl p-8 shadow-card">
      <Typography variant="h4" className="font-bold mb-6">Privacy Policy</Typography>
      <Typography variant="body2" className="text-[#64748b] dark:text-[#94a3b8] space-y-3 block">
        <span className="block">1. We store your name, email, avatar, and the content you post on our MongoDB database.</span>
        <span className="block">2. Images you upload are hosted on Cloudinary.</span>
        <span className="block">3. Passwords are hashed with bcrypt — never stored or logged in plain text.</span>
        <span className="block">4. Chat messages are stored in Firestore and visible only to participants.</span>
        <span className="block">5. This is a learning project — do not share sensitive personal information.</span>
      </Typography>
      <Link to="/register" className="text-[#0A5CE0] font-semibold hover:underline inline-block mt-8">
        ← Back to sign up
      </Link>
    </Box>
  </Box>
)

export default Privacy
