import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
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
  areaHa: number;
  feePaid: boolean;
  createdAt: string;
  updatedAt: string;
  _count: { documents: number; edsNotices: number };
}

const statCards = [
  { key: 'DRAFT', label: 'Drafts', icon: FileText, color: 'text-gray-500', bg: 'bg-gray-50' },
  { key: 'SUBMITTED', label: 'Submitted', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
  { key: 'EDS', label: 'Deficiencies', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-50' },
  { key: 'FINALIZED', label: 'Finalized', icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50' },
];

export default function ProponentDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => api.get('/applications').then((r) => r.data),
  });

  const applications: Application[] = data?.data || [];

  const statCounts = statCards.reduce((acc, s) => {
    acc[s.key] = applications.filter((a) => a.status === s.key).length;
    return acc;
  }, {} as Record<string, number>);

  const submitMutation = useMutation({
    mutationFn: (id: string) => api.post(`/applications/${id}/submit`),
    onSuccess: () => {
      toast.success('Application submitted!');
      void queryClient.invalidateQueries({ queryKey: ['applications'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Submission failed';
      toast.error(msg);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-500 text-sm">Manage your environmental clearance applications</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/dashboard/proponent/new')}
          className="flex items-center gap-2 bg-gradient-cecb text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
        >
          <Plus className="w-4 h-4" /> New Application
        </motion.button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm"
          >
            <div className={`p-3 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{statCounts[stat.key] || 0}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Applications table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">All Applications</h2>
        </div>

        {applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-gray-600 font-medium">No applications yet</h3>
            <p className="text-gray-400 text-sm mb-5">Create your first environmental clearance application</p>
            <Link
              to="/dashboard/proponent/new"
              className="flex items-center gap-2 bg-gradient-cecb text-white px-5 py-2 rounded-lg font-medium"
            >
              <Plus className="w-4 h-4" /> Create Application
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {applications.map((app) => (
              <motion.div
                key={app.id}
                layout
                className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-soft rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{app.projectName}</div>
                  <div className="text-xs text-gray-500">
                    {app.sector} • {app.district} • {format(new Date(app.createdAt), 'dd MMM yyyy')}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={app.status} />
                    {app.status !== 'DRAFT' && !app.feePaid && (
                      <span className="text-xs text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-full">
                        Fee Pending
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{app._count.documents} docs</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {app.status === 'DRAFT' && (
                    <button
                      onClick={() => submitMutation.mutate(app.id)}
                      disabled={submitMutation.isPending}
                      className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
                    >
                      Submit
                    </button>
                  )}
                  {app.status !== 'DRAFT' && !app.feePaid && (
                    <Link
                      to={`/dashboard/proponent/payment/${app.id}`}
                      className="text-xs bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition-colors"
                    >
                      Pay Fee
                    </Link>
                  )}
                  <Link
                    to={`/dashboard/proponent/application/${app.id}`}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    View →
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
