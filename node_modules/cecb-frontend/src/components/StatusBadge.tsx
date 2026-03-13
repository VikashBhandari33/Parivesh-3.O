import { clsx } from 'clsx';

type Status =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_SCRUTINY'
  | 'EDS'
  | 'REFERRED'
  | 'MOM_GENERATED'
  | 'FINALIZED';

const statusConfig: Record<Status, { label: string; className: string }> = {
  DRAFT:          { label: 'Draft',               className: 'status-draft' },
  SUBMITTED:      { label: 'Submitted',            className: 'status-submitted' },
  UNDER_SCRUTINY: { label: 'Under Scrutiny',       className: 'status-under_scrutiny' },
  EDS:            { label: 'Document Deficiency',  className: 'status-eds' },
  REFERRED:       { label: 'Referred to Meeting',  className: 'status-referred' },
  MOM_GENERATED:  { label: 'MoM Generated',        className: 'status-mom_generated' },
  FINALIZED:      { label: 'Finalized',            className: 'status-finalized' },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as Status] || { label: status, className: 'status-draft' };
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
