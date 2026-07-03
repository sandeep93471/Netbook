import { Skeleton, Card, CardHeader, CardContent } from '@mui/material'

export const PostSkeleton = () => (
  <Card className="mb-4 rounded-xl">
    <CardHeader
      avatar={<Skeleton variant="circular" width={40} height={40} />}
      title={<Skeleton width="60%" />}
      subheader={<Skeleton width="30%" />}
    />
    <CardContent>
      <Skeleton variant="rectangular" height={200} className="rounded-lg" />
      <Skeleton className="mt-2" />
      <Skeleton width="80%" />
    </CardContent>
  </Card>
)

export const ProfileSkeleton = () => (
  <div className="max-w-2xl mx-auto">
    <Skeleton variant="rectangular" height={192} className="rounded-xl" />
    <div className="flex justify-center -mt-16">
      <Skeleton variant="circular" width={120} height={120} className="border-4 border-white" />
    </div>
    <div className="text-center mt-4 space-y-2">
      <Skeleton width="40%" className="mx-auto" />
      <Skeleton width="60%" className="mx-auto" />
    </div>
  </div>
)

export const ChatSkeleton = () => (
  <div className="space-y-3 p-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1">
          <Skeleton width="40%" />
          <Skeleton width="70%" />
        </div>
      </div>
    ))}
  </div>
)
