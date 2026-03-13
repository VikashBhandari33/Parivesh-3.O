import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useMutation as useMut } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, AlertTriangle, SendHorizonal, FileCheck, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';

export default function ApplicationReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [edsDeficiencies, setEdsDeficiencies] = useState([{ field: '', reason: '' }]);
  const [showEdsForm, setShowEdsForm] = useState(false);

  const { data: app, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => api.get(`/applications/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });

  const issuedEdsMutation = useMut({
    mutationFn: () => api.post(`/applications/${id}/eds`, {
      deficiencies: edsDeficiencies.filter(d => d.field && d.reason),
    }),
    onSuccess: () => {
      toast.success('EDS notice issued');
      void queryClient.invalidateQueries({ queryKey: ['application', id] });
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
      setShowEdsForm(false);
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
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!app) return <p className="text-center text-gray-500 py-8">Application not found</p>;

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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Details */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
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

          {/* Documents to verify */}
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

          {/* EDS Form */}
          {showEdsForm && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-orange-50 rounded-xl border border-orange-200 p-5">
              <h2 className="font-semibold text-orange-800 mb-4">Issue EDS Notice</h2>
              <div className="space-y-3">
                {edsDeficiencies.map((d, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2">
                    <input
                      value={d.field}
                      onChange={(e) => { const updated = [...edsDeficiencies]; updated[i].field = e.target.value; setEdsDeficiencies(updated); }}
                      placeholder="Document/field required"
                      className="px-3 py-2 border border-orange-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                    <input
                      value={d.reason}
                      onChange={(e) => { const updated = [...edsDeficiencies]; updated[i].reason = e.target.value; setEdsDeficiencies(updated); }}
                      placeholder="Reason / deficiency"
                      className="px-3 py-2 border border-orange-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                  </div>
                ))}
                <button onClick={() => setEdsDeficiencies([...edsDeficiencies, { field: '', reason: '' }])} className="text-xs text-orange-600 hover:underline">+ Add more</button>
              </div>
              <div className="flex gap-3 mt-4">
                <button onClick={() => setShowEdsForm(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                <button
                  onClick={() => issuedEdsMutation.mutate()}
                  disabled={issuedEdsMutation.isPending}
                  className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-60"
                >
                  <SendHorizonal className="w-3.5 h-3.5" /> Issue Notice
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Actions sidebar */}
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
    </div>
  );
}
