import { Link } from 'react-router-dom'
import { Typography, Box } from '@mui/material'

const Terms = () => (
  <Box className="min-h-screen bg-[#fafafa] dark:bg-[#0f172a] py-12 px-6">
    <Box className="max-w-2xl mx-auto bg-white dark:bg-[#1e293b] rounded-xl p-8 shadow-card">
      <Typography variant="h4" className="font-bold mb-6">Terms of Service</Typography>
      <Typography variant="body2" className="text-[#64748b] dark:text-[#94a3b8] space-y-3 block">
        <span className="block">1. Netbook is a student-built social platform provided as-is for learning purposes.</span>
        <span className="block">2. You are responsible for the content you post. Do not post illegal, harmful, or hateful content.</span>
        <span className="block">3. You must be at least 13 years old to create an account.</span>
        <span className="block">4. We may suspend accounts that violate these terms.</span>
        <span className="block">5. Content you post remains yours, but you grant Netbook a license to display it on the platform.</span>
      </Typography>
      <Link to="/register" className="text-[#0A5CE0] font-semibold hover:underline inline-block mt-8">
        ← Back to sign up
      </Link>
    </Box>
  </Box>
)

export default Terms
