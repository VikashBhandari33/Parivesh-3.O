import { Activity } from 'lucide-react';

interface ApprovalChanceBadgeProps {
  chance?: number;
  days?: number;
  loading?: boolean;
  className?: string;
}

export default function ApprovalChanceBadge({ chance, days, loading, className = '' }: ApprovalChanceBadgeProps) {
  if (loading) {
    return (
      <span className={`inline-flex animate-pulse items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 ${className}`}>
        Analyzing data…
      </span>
    );
  }

  if (chance === undefined || days === undefined) {
    return null; // Return nothing if data is missing or incomplete
  }

  let colorClass = 'bg-gray-100 text-gray-800 border-gray-200';
  if (chance >= 70) colorClass = 'bg-green-50 text-green-700 border-green-200';
  else if (chance >= 45) colorClass = 'bg-yellow-50 text-yellow-700 border-yellow-200';
  else colorClass = 'bg-red-50 text-red-700 border-red-200';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${colorClass} ${className}`}>
      <Activity className="w-3.5 h-3.5" />
      {chance}% chance · {days} days
    </span>
  );
}
