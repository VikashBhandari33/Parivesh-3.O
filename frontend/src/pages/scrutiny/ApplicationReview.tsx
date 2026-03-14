import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useMutation as useMut } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, AlertTriangle, SendHorizonal, FileCheck, CreditCard, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import IntelligentDocumentVerification from '../../components/IntelligentDocumentVerification';
import SatelliteVerificationMap from '../../components/SatelliteVerificationMap';
import EnvironmentalRiskReport from '../../components/EnvironmentalRiskReport';

export default function ApplicationReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showEdsForm, setShowEdsForm] = useState(false);
  const [edsDeficiencies, setEdsDeficiencies] = useState<{ field: string; reason: string }[]>([{ field: '', reason: '' }]);
  const [edsRemarks, setEdsRemarks] = useState('');

  const { data: app, isLoading, error } = useQuery({
    queryKey: ['application', id],
    queryFn: () => api.get(`/applications/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  const analyzeSatelliteMutation = useMut({
    mutationFn: () => api.post(`/satellite/analyze/${id}`),
    onSuccess: () => {
      toast.success('Geospatial analysis completed');
      void queryClient.invalidateQueries({ queryKey: ['application', id] });
    },
    onError: () => toast.error('Failed to run geospatial analysis'),
  });

  const issuedEdsMutation = useMut({
    mutationFn: () => api.post(`/applications/${id}/eds`, {
      deficiencies: edsDeficiencies.filter(d => d.field && d.reason),
      remarks: edsRemarks,
    }),
    onSuccess: () => {
      toast.success('EDS notice issued');
      void queryClient.invalidateQueries({ queryKey: ['application', id] });
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      setShowEdsForm(false);
      setEdsDeficiencies([{ field: '', reason: '' }]);
      setEdsRemarks('');
    },
    onError: () => toast.error('Failed to issue EDS'),
  });

  const referMutation = useMut({
    mutationFn: () => api.post(`/applications/${id}/refer`),
    onSuccess: () => {
      toast.success('Application referred to meeting! AI gist generation started.');
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      navigate('/dashboard/scrutiny');
    },
    onError: () => toast.error('Failed to refer application'),
  });

  const verifyPaymentMutation = useMut({
    mutationFn: () => api.post(`/payments/${id}/approve`),
    onSuccess: () => {
      toast.success('Payment verified');
      void queryClient.invalidateQueries({ queryKey: ['application', id] });
    },
    onError: () => toast.error('Failed to verify payment'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="max-w-md mx-auto mt-12 p-8 bg-white rounded-2xl border border-gray-200 shadow-xl text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {error ? 'Failed to load application' : 'Application not found'}
        </h2>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          {error ? (
            ((error as any).response?.data?.message || error.message || 'An unexpected error occurred while fetching application data.')
          ) : (
            `We couldn't find the application with ID "${id}". It may have been deleted or the link is invalid.`
          )}
        </p>
        <div className="space-y-3">
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary/20"
          >
            Try Refreshing
          </button>
          <button 
            onClick={() => navigate('/dashboard/scrutiny')}
            className="w-full text-gray-600 font-medium hover:text-gray-900 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{app.projectName}</h1>
              <StatusBadge status={app.status} />
            </div>
            <p className="text-sm text-gray-500">{app.sector} • {app.district} • {app.proponent?.name}</p>
          </div>
        </div>
      </div>

      {/* Application info */}
      <div className="space-y-6">
        {/* Row 1: Details & Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Details */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 h-full">
              <h2 className="font-semibold text-gray-900 mb-4">Application Details</h2>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Proponent', app.proponent?.name],
                  ['Organization', app.proponent?.organization || '—'],
                  ['District', app.district],
                  ['Area', app.areaHa ? `${app.areaHa} ha` : '—'],
                  ['Investment', app.investmentCr ? `₹${app.investmentCr}Cr` : '—'],
                  ['Submitted', app.submittedAt ? format(new Date(app.submittedAt), 'dd MMM yyyy') : '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span className="text-gray-500 block">{label}</span>
                    <span className="font-medium text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Payment status */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Fee Payment
              </h3>
              <div className={`text-sm font-medium mb-3 ${app.feePaid ? 'text-green-600' : 'text-orange-600'}`}>
                {app.feePaid ? '✅ Fee Paid' : '⏳ Fee Pending'}
              </div>
              {!app.feePaid && app.payment?.utrNumber && (
                <div className="text-xs text-gray-500 mb-3">UTR: <strong>{app.payment.utrNumber}</strong></div>
              )}
              {!app.feePaid && app.payment?.utrNumber && (
                <button
                  onClick={() => verifyPaymentMutation.mutate()}
                  disabled={verifyPaymentMutation.isPending}
                  className="w-full text-sm bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 disabled:opacity-60"
                >
                  Confirm Payment
                </button>
              )}
            </div>

            {/* Scrutiny actions */}
            {(app.status === 'UNDER_SCRUTINY' || app.status === 'EDS') && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-3">
                <h3 className="font-semibold text-gray-900">Scrutiny Actions</h3>

                <button
                  onClick={() => setShowEdsForm(true)}
                  className="w-full flex items-center justify-center gap-2 border-2 border-orange-400 text-orange-600 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-50 transition-colors"
                >
                  <AlertTriangle className="w-4 h-4" /> Issue EDS Notice
                </button>

                <button
                  onClick={() => {
                    if (confirm('Refer this application to the Expert Committee Meeting? AI gist will be generated.')) {
                      referMutation.mutate();
                    }
                  }}
                  disabled={referMutation.isPending || !app.feePaid}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-primary-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  {referMutation.isPending ? 'Referring...' : 'Refer to Meeting'}
                </button>

                {!app.feePaid && (
                  <p className="text-xs text-orange-600 text-center">⚠️ Fee must be verified before referring</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Geospatial Analysis & Map */}
        {(app.lat && app.lng) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {app.satelliteReport ? (
              <>
                <div className="lg:col-span-1">
                  <EnvironmentalRiskReport report={app.satelliteReport} />
                </div>
                <div className="lg:col-span-2">
                  <SatelliteVerificationMap report={app.satelliteReport} className="h-full min-h-[300px] w-full rounded-xl" />
                </div>
              </>
            ) : (
              <div className="lg:col-span-3 bg-blue-50 rounded-xl border border-blue-200 p-6 flex flex-col items-center justify-center text-center space-y-3">
                <MapPin className="w-8 h-8 text-blue-500" />
                <div>
                  <h3 className="font-semibold text-blue-900">Geospatial Analysis Pending</h3>
                  <p className="text-sm text-blue-700">Coordinates found ({app.lat}, {app.lng}). Run verification to detect nearby environmental risks.</p>
                </div>
                <button
                  onClick={() => analyzeSatelliteMutation.mutate()}
                  disabled={analyzeSatelliteMutation.isPending}
                  className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {analyzeSatelliteMutation.isPending ? 'Analyzing...' : 'Run Satellite Verification'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Row 3: IDV */}
        <IntelligentDocumentVerification applicationId={id!} />

        {/* Row 4: Documents */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Documents ({app.documents?.length || 0})</h2>
          {!app.documents?.length ? (
            <p className="text-sm text-gray-400">No documents uploaded</p>
          ) : (
            <div className="space-y-2">
              {app.documents.map((doc: { id: string; docType: string; fileName: string; verified: boolean; fileUrl: string }) => (
                <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileCheck className={`w-4 h-4 ${doc.verified ? 'text-green-500' : 'text-gray-400'}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{doc.fileName}</div>
                    <div className="text-xs text-gray-500">{doc.docType.replace(/_/g, ' ')}</div>
                  </div>
                  {!doc.verified && (
                    <button
                      onClick={() => api.patch(`/documents/${doc.id}/verify`).then(() => {
                        void queryClient.invalidateQueries({ queryKey: ['application', id] });
                        toast.success('Document verified');
                      })}
                      className="text-xs bg-green-500 text-white px-2 py-1 rounded-lg hover:bg-green-600"
                    >
                      Verify
                    </button>
                  )}
                  {doc.verified && <span className="text-xs text-green-600 font-medium">✓ Verified</span>}
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">View</a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* EDS Modal */}
        {showEdsForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              className="bg-white rounded-2xl border border-gray-200 shadow-2xl p-6 w-full max-w-lg"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-orange-600">
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold">Issue EDS Notice</h2>
                </div>
                <button 
                  onClick={() => setShowEdsForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                <p className="text-sm text-gray-500 mb-4">
                  Specify the deficiencies or missing documents required from the proponent.
                </p>

                {edsDeficiencies.map((d, i) => (
                  <div key={i} className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-100 relative group">
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Field / Document</label>
                        <input
                          value={d.field}
                          onChange={(e) => { const updated = [...edsDeficiencies]; updated[i].field = e.target.value; setEdsDeficiencies(updated); }}
                          placeholder="e.g. Forest Clearance Certificate"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Deficiency Reason</label>
                        <textarea
                          value={d.reason}
                          onChange={(e) => { const updated = [...edsDeficiencies]; updated[i].reason = e.target.value; setEdsDeficiencies(updated); }}
                          placeholder="Describe what is missing or incorrect..."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none"
                        />
                      </div>
                    </div>
                    {edsDeficiencies.length > 1 && (
                      <button 
                        onClick={() => setEdsDeficiencies(edsDeficiencies.filter((_, idx) => idx !== i))}
                        className="absolute top-2 right-2 p-1 text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button 
                  onClick={() => setEdsDeficiencies([...edsDeficiencies, { field: '', reason: '' }])} 
                  className="flex items-center gap-2 text-sm text-orange-600 font-semibold hover:text-orange-700 py-1 transition-colors"
                >
                  <span className="text-lg">+</span> Add another deficiency
                </button>

                <div className="pt-2 border-t border-gray-100 mt-4">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">General Remarks (Optional)</label>
                  <textarea
                    value={edsRemarks}
                    onChange={(e) => setEdsRemarks(e.target.value)}
                    placeholder="Any additional notes for the proponent..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowEdsForm(false)} 
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 border border-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => issuedEdsMutation.mutate()}
                  disabled={issuedEdsMutation.isPending || !edsDeficiencies.some(d => d.field && d.reason)}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-0.5"
                >
                  {issuedEdsMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <SendHorizonal className="w-4 h-4" /> 
                      Issue Notice
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
