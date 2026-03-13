import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, Clock, CheckCircle, AlertTriangle, UploadCloud, CreditCard, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';

const STAGE_LABELS = [
  { status: 'DRAFT', label: 'Draft Created', icon: FileText },
  { status: 'SUBMITTED', label: 'Application Submitted', icon: UploadCloud },
  { status: 'UNDER_SCRUTINY', label: 'Under Scrutiny', icon: Clock },
  { status: 'EDS', label: 'Document Deficiency', icon: AlertTriangle },
  { status: 'REFERRED', label: 'Referred to Meeting', icon: ArrowLeft },
  { status: 'MOM_GENERATED', label: 'MoM Generated', icon: FileText },
  { status: 'FINALIZED', label: 'Finalized', icon: CheckCircle },
];

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => api.get(`/applications/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  const app = data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!app) return <p className="text-gray-500 text-center py-8">Application not found</p>;

  const currentStageIdx = STAGE_LABELS.findIndex((s) => s.status === app.status);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{app.projectName}</h1>
            <StatusBadge status={app.status} />
          </div>
          <p className="text-gray-500 text-sm ml-7">{app.sector} • {app.district}, {app.state}</p>
        </div>
        {app.status === 'SUBMITTED' && !app.feePaid && (
          <Link
            to={`/dashboard/proponent/payment/${app.id}`}
            className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-600"
          >
            <CreditCard className="w-4 h-4" /> Pay Fee
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: stage timeline */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Application Timeline</h2>
            <div className="space-y-0">
              {STAGE_LABELS.map((stage, i) => {
                const isDone = i < currentStageIdx;
                const isCurrent = i === currentStageIdx;
                const isSkipped = app.status !== 'EDS' && stage.status === 'EDS' && !isDone && !isCurrent;
                return (
                  <div key={stage.status} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isDone ? 'bg-green-500 text-white' :
                        isCurrent ? 'bg-primary text-white ring-4 ring-primary ring-opacity-20' :
                        'bg-gray-200 text-gray-500'
                      } ${isSkipped ? 'opacity-30' : ''}`}>
                        {isDone ? '✓' : <stage.icon className="w-3.5 h-3.5" />}
                      </div>
                      {i < STAGE_LABELS.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    <div className={`pb-4 ${isSkipped ? 'opacity-30' : ''}`}>
                      <div className={`text-xs font-medium ${isCurrent ? 'text-primary' : isDone ? 'text-green-600' : 'text-gray-400'}`}>
                        {stage.label}
                      </div>
                      {isCurrent && <div className="text-xs text-gray-400">Current stage</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Project info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Project Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Project ID</span><div className="font-mono text-xs text-gray-700 mt-0.5">{app.id}</div></div>
              <div><span className="text-gray-500">Sector</span><div className="font-medium mt-0.5">{app.sector}</div></div>
              <div><span className="text-gray-500">District</span><div className="font-medium mt-0.5">{app.district}</div></div>
              <div><span className="text-gray-500">Area</span><div className="font-medium mt-0.5">{app.areaHa ? `${app.areaHa} ha` : '—'}</div></div>
              <div><span className="text-gray-500">Fee</span><div className="font-medium mt-0.5">{app.feeAmount ? `₹${app.feeAmount.toLocaleString()}` : '—'}</div></div>
              <div><span className="text-gray-500">Fee Status</span><div className={`font-medium mt-0.5 ${app.feePaid ? 'text-green-600' : 'text-orange-600'}`}>{app.feePaid ? '✅ Paid' : '⏳ Pending'}</div></div>
              <div><span className="text-gray-500">Created</span><div className="font-medium mt-0.5">{format(new Date(app.createdAt), 'dd MMM yyyy')}</div></div>
              {app.submittedAt && <div><span className="text-gray-500">Submitted</span><div className="font-medium mt-0.5">{format(new Date(app.submittedAt), 'dd MMM yyyy')}</div></div>}
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Documents ({app.documents?.length || 0})</h2>
            {!app.documents?.length ? (
              <p className="text-sm text-gray-400 text-center py-4">No documents uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {app.documents.map((doc: { id: string; docType: string; fileName: string; fileUrl: string; verified: boolean }) => (
                  <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</div>
                      <div className="text-xs text-gray-500">{doc.docType.replace(/_/g, ' ')}</div>
                    </div>
                    {doc.verified ? (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Verified</span>
                    ) : (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Pending</span>
                    )}
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View</a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* EDS Notices */}
          {app.edsNotices?.length > 0 && (
            <div className="bg-orange-50 rounded-xl border border-orange-200 p-5">
              <h2 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Document Deficiency Notice
              </h2>
              {app.edsNotices.map((notice: { id: string; deficiencies: { field: string; reason: string }[]; issuedAt: string; issuedBy: { name: string }; resolvedAt: string | null }) => (
                <div key={notice.id} className="space-y-2">
                  <p className="text-xs text-orange-600">Issued {format(new Date(notice.issuedAt), 'dd MMM yyyy')} by {notice.issuedBy.name}</p>
                  {Array.isArray(notice.deficiencies) && notice.deficiencies.map((d, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 border border-orange-200 text-sm">
                      <div className="font-medium text-gray-900">{String(d.field)}</div>
                      <div className="text-gray-600 text-xs">{String(d.reason)}</div>
                    </div>
                  ))}
                  {notice.resolvedAt && <p className="text-xs text-green-600">✅ Resolved {format(new Date(notice.resolvedAt), 'dd MMM yyyy')}</p>}
                </div>
              ))}
            </div>
          )}

          {/* GIS Risk Flags */}
          {app.gisRiskFlags?.length > 0 && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-5">
              <h2 className="font-semibold text-red-800 mb-3">⚠️ GIS Environmental Risk Flags</h2>
              <div className="space-y-2">
                {app.gisRiskFlags.map((flag: { id: string; flagType: string; layerName: string; distanceM: number; severity: string }) => (
                  <div key={flag.id} className="flex items-center gap-3 bg-white rounded-lg p-3 border border-red-200 text-sm">
                    <div className={`w-2 h-2 rounded-full ${flag.severity === 'HIGH' ? 'bg-red-500' : flag.severity === 'MEDIUM' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                    <div className="flex-1">
                      <span className="font-medium">{flag.flagType}</span>: {flag.layerName}
                      <span className="text-gray-500 ml-2">({Math.round(flag.distanceM)}m)</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      flag.severity === 'HIGH' ? 'bg-red-100 text-red-700' :
                      flag.severity === 'MEDIUM' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{flag.severity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
