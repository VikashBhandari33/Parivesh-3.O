import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, FileSearch, Clock, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';

interface Application {
  id: string;
  projectName: string;
  sector: string;
  status: string;
  district: string;
  areaHa: number | null;
  feePaid: boolean;
  createdAt: string;
  submittedAt: string | null;
  proponent: { name: string; organization: string | null };
  _count: { documents: number; edsNotices: number };
}

export default function ScrutinyDashboard() {
  const [activeTab, setActiveTab] = useState<'SUBMITTED' | 'UNDER_SCRUTINY' | 'EDS'>('SUBMITTED');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['applications', 'scrutiny'],
    queryFn: () => api.get('/applications').then((r) => r.data),
  });

  const applications: Application[] = data?.data || [];

  const counts = {
    SUBMITTED: applications.filter((a) => a.status === 'SUBMITTED').length,
    UNDER_SCRUTINY: applications.filter((a) => a.status === 'UNDER_SCRUTINY').length,
    EDS: applications.filter((a) => a.status === 'EDS').length,
  };

  const filtered = applications.filter((a) => a.status === activeTab);

  const startScrutinyMutation = useMutation({
    mutationFn: (id: string) => api.post(`/applications/${id}/start-scrutiny`),
    onSuccess: () => {
      toast.success('Scrutiny started');
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: () => toast.error('Failed to start scrutiny'),
  });

  const tabs = [
    { key: 'SUBMITTED' as const, label: 'Awaiting Scrutiny', count: counts.SUBMITTED, icon: Clock, color: 'text-blue-600' },
    { key: 'UNDER_SCRUTINY' as const, label: 'Under Review', count: counts.UNDER_SCRUTINY, icon: FileSearch, color: 'text-amber-600' },
    { key: 'EDS' as const, label: 'EDS Issued', count: counts.EDS, icon: AlertTriangle, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scrutiny Queue</h1>
          <p className="text-gray-500 text-sm">Review and process submitted applications</p>
        </div>
        <div className="flex items-center gap-2 bg-primary-50 px-4 py-2 rounded-xl border border-primary-200">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-primary">Scrutiny Officer</span>
        </div>
      </div>

      {/* Tab stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {tabs.map((tab) => (
          <motion.button
            key={tab.key}
            whileHover={{ scale: 1.01 }}
            onClick={() => setActiveTab(tab.key)}
            className={`bg-white rounded-xl border p-5 flex items-center gap-4 text-left shadow-sm transition-all ${
              activeTab === tab.key ? 'border-primary ring-2 ring-primary ring-opacity-20' : 'border-gray-200'
            }`}
          >
            <div className={`p-3 rounded-xl ${activeTab === tab.key ? 'bg-primary text-white' : 'bg-gray-50 ' + tab.color}`}>
              <tab.icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{tab.count}</div>
              <div className="text-xs text-gray-500">{tab.label}</div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Application list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">{tabs.find(t => t.key === activeTab)?.label}</h2>
          <span className="text-xs text-gray-400">{filtered.length} applications</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
            <h3 className="text-gray-600 font-medium">Queue is clear</h3>
            <p className="text-gray-400 text-sm">No applications in this category</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((app) => (
              <div key={app.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{app.projectName}</div>
                  <div className="text-xs text-gray-500">
                    {app.sector} • {app.district} • Proponent: {app.proponent.name}
                    {app.proponent.organization ? ` (${app.proponent.organization})` : ''}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={app.status} />
                    <span className="text-xs text-gray-400">{app._count.documents} docs</span>
                    {app.feePaid ? (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Fee ✓</span>
                    ) : (
                      <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Fee Pending</span>
                    )}
                    {app.submittedAt && (
                      <span className="text-xs text-gray-400">Submitted {format(new Date(app.submittedAt), 'dd MMM')}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {app.status === 'SUBMITTED' && (
                    <button
                      onClick={() => startScrutinyMutation.mutate(app.id)}
                      disabled={startScrutinyMutation.isPending}
                      className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
                    >
                      Start Scrutiny
                    </button>
                  )}
                  <Link
                    to={`/dashboard/scrutiny/review/${app.id}`}
                    className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    Review <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
