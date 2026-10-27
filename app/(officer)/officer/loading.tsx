import { DashboardSkeleton } from '@/app/components/ui/Skeleton';

export default function OfficerDashboardLoading() {
  return (
    <div className="py-2">
      <DashboardSkeleton />
    </div>
  );
}
