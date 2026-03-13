import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BookOpen, FileEdit, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';

interface Application {
  id: string;
  projectName: string;
  sector: string;
  status: string;
  district: string;
  gistText: string | null;
  momText: string | null;
  momLocked: boolean;
  createdAt: string;
  proponent: { name: string; organization: string | null };
}

export default function MomDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['applications', 'mom'],
    queryFn: () => api.get('/applications').then((r) => r.data),
  });

  const applications: Application[] = data?.data || [];

  const referred = applications.filter((a) => a.status === 'REFERRED');
  const momGenerated = applications.filter((a) => a.status === 'MOM_GENERATED');
  const finalized = applications.filter((a) => a.status === 'FINALIZED');

  const statItems = [
    { label: 'Awaiting AI Gist', value: referred.length, color: 'text-purple-600', bg: 'bg-purple-50', Icon: Sparkles },
    { label: 'Ready to Edit', value: momGenerated.length, color: 'text-cyan-600', bg: 'bg-cyan-50', Icon: FileEdit },
    { label: 'Finalized', value: finalized.length, color: 'text-green-600', bg: 'bg-green-50', Icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">MoM Dashboard</h1>
          <p className="text-gray-500 text-sm">Minutes of Meeting — edit, finalize, and export</p>
        </div>
        <div className="flex items-center gap-2 bg-cyan-50 px-4 py-2 rounded-xl border border-cyan-200">
          <BookOpen className="w-4 h-4 text-cyan-600" />
          <span className="text-sm font-medium text-cyan-700">MoM Team</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {statItems.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm"
          >
            <div className={`p-3 rounded-xl ${item.bg}`}>
              <item.Icon className={`w-5 h-5 ${item.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Applications to process */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Applications Requiring MoM Action</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : [...referred, ...momGenerated, ...finalized].length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-gray-600 font-medium">No applications yet</h3>
            <p className="text-gray-400 text-sm">Applications referred from Scrutiny will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {[...referred, ...momGenerated, ...finalized].map((app) => (
              <div key={app.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">{app.projectName}</div>
                  <div className="text-xs text-gray-500">
                    {app.sector} • {app.district} • {app.proponent.name}
                    {app.proponent.organization ? ` (${app.proponent.organization})` : ''}
                    {' • '}{format(new Date(app.createdAt), 'dd MMM yyyy')}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={app.status} />
                    {app.status === 'REFERRED' && (
                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full animate-pulse">
                        AI generating gist...
                      </span>
                    )}
                    {app.status === 'MOM_GENERATED' && app.gistText && (
                      <span className="text-xs text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full">
                        ✨ AI Gist Ready
                      </span>
                    )}
                    {app.momLocked && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">🔒 Locked</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {app.status === 'MOM_GENERATED' && !app.momLocked && (
                    <Link
                      to={`/dashboard/mom/editor/${app.id}`}
                      className="flex items-center gap-1 text-xs bg-cyan-500 text-white px-3 py-1.5 rounded-lg hover:bg-cyan-600 transition-colors"
                    >
                      <FileEdit className="w-3.5 h-3.5" /> Edit MoM
                    </Link>
                  )}
                  {app.status === 'FINALIZED' && (
                    <a
                      href={`/api/gist/${app.id}/export?format=pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      Export PDF
                    </a>
                  )}
                  <Link
                    to={`/dashboard/mom/editor/${app.id}`}
                    className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                  >
                    Open <ArrowRight className="w-3 h-3" />
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
