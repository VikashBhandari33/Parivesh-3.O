import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText, Clock, CheckCircle, AlertTriangle, UploadCloud,
  CreditCard, ArrowLeft, RefreshCw, MapPin, Send
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import DocumentUpload from '../../components/DocumentUpload';
import GISMap from '../../components/GISMap';
import { useApplicationPrediction } from '../../hooks/usePrediction';
import ApprovalChanceBadge from '../../components/ApprovalChanceBadge';
import PredictionCard from '../../components/PredictionCard';

const STAGE_LABELS = [
  { status: 'DRAFT',          label: 'Draft Created',          icon: FileText    },
  { status: 'SUBMITTED',      label: 'Application Submitted',  icon: UploadCloud },
  { status: 'UNDER_SCRUTINY', label: 'Under Scrutiny',         icon: Clock       },
  { status: 'EDS',            label: 'Document Deficiency',    icon: AlertTriangle },
  { status: 'REFERRED',       label: 'Referred to Meeting',    icon: Send        },
  { status: 'MOM_GENERATED',  label: 'MoM Generated',          icon: FileText    },
  { status: 'FINALIZED',      label: 'Finalized',              icon: CheckCircle },
];

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => api.get(`/applications/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  const app = data;
  const { data: prediction, isLoading: isPredictionLoading, error: predictionError } = useApplicationPrediction(id);

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/applications/${id}/submit`),
    onSuccess: () => {
      toast.success('Application submitted!');
      void queryClient.invalidateQueries({ queryKey: ['application', id] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message || 'Submission failed'),
  });

  const resubmitMutation = useMutation({
    mutationFn: () => api.post(`/applications/${id}/resubmit`),
    onSuccess: () => {
      toast.success('Application resubmitted for scrutiny!');
      void queryClient.invalidateQueries({ queryKey: ['application', id] });
    },
    onError: () => toast.error('Resubmission failed'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!app) return <p className="text-gray-500 text-center py-8">Application not found</p>;

  const currentStageIdx = STAGE_LABELS.findIndex(s => s.status === app.status);
  const canEdit   = app.status === 'DRAFT' || app.status === 'EDS';
  const canSubmit = app.status === 'DRAFT';
  const canResubmit = app.status === 'EDS';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{app.projectName}</h1>
            <StatusBadge status={app.status} />
            <ApprovalChanceBadge 
              chance={prediction?.approvalChance} 
              days={prediction?.estimatedDays} 
              loading={isPredictionLoading} 
            />
          </div>
          <p className="text-gray-500 text-sm ml-7">{app.sector} • {app.district}, {app.state}</p>
        </div>
        <div className="flex items-center gap-2">
          {app.status !== 'DRAFT' && !app.feePaid && (
            <Link
              to={`/dashboard/proponent/payment/${app.id}`}
              className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-amber-600"
            >
              <CreditCard className="w-4 h-4" /> Pay Fee
            </Link>
          )}
          {canSubmit && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {submitMutation.isPending ? 'Submitting…' : 'Submit Application'}
            </motion.button>
          )}
          {canResubmit && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (confirm('Resubmit application for scrutiny? Ensure all deficiencies are addressed.')) {
                  resubmitMutation.mutate();
                }
              }}
              disabled={resubmitMutation.isPending}
              className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4" />
              {resubmitMutation.isPending ? 'Resubmitting…' : 'Resubmit for Scrutiny'}
            </motion.button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: stage timeline */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Application Timeline</h2>
            <div className="space-y-0">
              {STAGE_LABELS.map((stage, i) => {
                const isDone    = i < currentStageIdx;
                const isCurrent = i === currentStageIdx;
                const isSkipped = app.status !== 'EDS' && stage.status === 'EDS' && !isDone && !isCurrent;

                // Find the audit event for this stage
                const eventMap: Record<string, string> = {
                  DRAFT:          'APPLICATION_CREATED',
                  SUBMITTED:      'APPLICATION_SUBMITTED',
                  UNDER_SCRUTINY: 'SCRUTINY_STARTED',
                  EDS:            'EDS_ISSUED',
                  REFERRED:       'APPLICATION_REFERRED',
                  MOM_GENERATED:  'GIST_GENERATED',
                  FINALIZED:      'MOM_FINALIZED',
                };
                const event = app.auditEvents?.find((e: { eventType: string; createdAt: string }) =>
                  e.eventType === eventMap[stage.status]
                );

                return (
                  <div key={stage.status} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                        isDone    ? 'bg-green-500 text-white' :
                        isCurrent ? 'bg-primary text-white ring-4 ring-primary/20' :
                        'bg-gray-200 text-gray-500'
                      } ${isSkipped ? 'opacity-30' : ''}`}>
                        {isDone ? '✓' : <stage.icon className="w-3.5 h-3.5" />}
                      </div>
                      {i < STAGE_LABELS.length - 1 && (
                        <div className={`w-0.5 h-7 mt-1 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                      )}
                    </div>
                    <div className={`pb-4 ${isSkipped ? 'opacity-30' : ''}`}>
                      <div className={`text-xs font-medium ${
                        isCurrent ? 'text-primary' : isDone ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {stage.label}
                      </div>
                      {event && (
                        <div className="text-[11px] text-gray-400">
                          {format(new Date(event.createdAt), 'dd MMM yyyy, hh:mm a')}
                        </div>
                      )}
                      {isCurrent && !event && (
                        <div className="text-[11px] text-gray-400">Current stage</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SLA info */}
          {app.slaDeadline && (
            <div className={`rounded-xl p-4 border text-sm ${
              new Date(app.slaDeadline) < new Date()
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-amber-50 border-amber-200 text-amber-700'
            }`}>
              <div className="font-semibold mb-0.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> SLA Deadline
              </div>
              <div className="text-xs">{format(new Date(app.slaDeadline), 'dd MMM yyyy')}</div>
            </div>
          )}
        </div>

        {/* Right: details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Project info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Project Details</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {[
                ['Project ID',  <span className="font-mono text-xs text-gray-700">{app.id.slice(0, 12)}…</span>],
                ['Sector',      app.sector],
                ['District',    app.district],
                ['Area',        app.areaHa ? `${app.areaHa} ha` : '—'],
                ['Investment',  app.investmentCr ? `₹${app.investmentCr} Cr` : '—'],
                ['Employment',  app.employmentCount ? `${app.employmentCount} persons` : '—'],
                ['Fee Amount',  app.feeAmount ? `₹${Number(app.feeAmount).toLocaleString()}` : 'TBD'],
                ['Fee Status',  <span className={app.feePaid ? 'text-green-600 font-medium' : 'text-orange-600 font-medium'}>{app.feePaid ? '✅ Paid' : '⏳ Pending'}</span>],
                ['Created',     format(new Date(app.createdAt), 'dd MMM yyyy')],
                ...(app.submittedAt ? [['Submitted', format(new Date(app.submittedAt), 'dd MMM yyyy')]] : []),
              ].map(([label, value], i) => (
                <div key={i}>
                  <span className="text-gray-500 block text-xs">{label}</span>
                  <span className="font-medium text-gray-900">{value || '—'}</span>
                </div>
              ))}
            </div>
            {app.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs text-gray-500 block mb-1">Description</span>
                <p className="text-sm text-gray-700">{app.description}</p>
              </div>
            )}
          </div>

          {/* Predictive Analytics */}
          <div className="mb-4">
            <PredictionCard 
              prediction={prediction} 
              isLoading={isPredictionLoading}
              error={predictionError as Error | null}
            />
          </div>

          {/* Map (if lat/lng available) */}
          {app.lat && app.lng && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Project Location
              </h2>
              <GISMap
                lat={app.lat}
                lng={app.lng}
                riskFlags={app.gisRiskFlags ?? []}
                height="260px"
              />
            </div>
          )}

          {/* Documents */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">
                Documents ({app.documents?.length || 0})
              </h2>
              {canEdit && (
                <button
                  onClick={() => setShowUpload(o => !o)}
                  className="text-xs flex items-center gap-1.5 text-primary border border-primary/30 hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  {showUpload ? 'Hide upload' : 'Upload document'}
                </button>
              )}
            </div>

            <DocumentUpload
              applicationId={app.id}
              sector={app.sector}
              existingDocs={app.documents ?? []}
              canUpload={canEdit && showUpload}
            />
          </div>

          {/* EDS Notices */}
          {app.edsNotices?.length > 0 && (
            <div className="bg-orange-50 rounded-xl border border-orange-200 p-5">
              <h2 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Document Deficiency Notice
              </h2>
              {app.edsNotices.map((notice: {
                id: string;
                deficiencies: { field: string; reason: string }[];
                issuedAt: string;
                issuedBy: { name: string };
                resolvedAt: string | null;
                pdfUrl?: string | null;
              }) => (
                <div key={notice.id} className="space-y-2">
                  <p className="text-xs text-orange-600">
                    Issued {format(new Date(notice.issuedAt), 'dd MMM yyyy')} by {notice.issuedBy.name}
                  </p>
                  {Array.isArray(notice.deficiencies) && notice.deficiencies.map((d, i) => (
                    <div key={i} className="bg-white rounded-lg p-3 border border-orange-200 text-sm">
                      <div className="font-medium text-gray-900">{String(d.field)}</div>
                      <div className="text-gray-600 text-xs mt-0.5">{String(d.reason)}</div>
                    </div>
                  ))}
                  {notice.resolvedAt && (
                    <p className="text-xs text-green-600">
                      ✅ Resolved {format(new Date(notice.resolvedAt), 'dd MMM yyyy')}
                    </p>
                  )}
                  {notice.pdfUrl && (
                    <div className="mt-2 text-right">
                       <a 
                         href={notice.pdfUrl.startsWith('http') ? notice.pdfUrl : `${api.defaults.baseURL?.replace('/api', '')}${notice.pdfUrl}`}
                         target="_blank" 
                         rel="noreferrer"
                         className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-700 hover:underline"
                       >
                         <FileText className="w-3.5 h-3.5" /> Download EDS Notice (PDF)
                       </a>
                    </div>
                  )}
                </div>
              ))}

              {canResubmit && (
                <div className="mt-4 pt-3 border-t border-orange-200">
                  <p className="text-xs text-orange-700 mb-2">
                    After uploading the required documents above, click Resubmit for Scrutiny.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
