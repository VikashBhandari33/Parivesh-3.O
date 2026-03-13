import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, FileText, ShieldCheck, Activity, AlertCircle, CheckCircle,
  TrendingUp, Clock, ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../lib/api';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9CA3AF', SUBMITTED: '#3B82F6', UNDER_SCRUTINY: '#F59E0B',
  EDS: '#F97316', REFERRED: '#8B5CF6', MOM_GENERATED: '#06B6D4', FINALIZED: '#10B981',
};

export default function AdminDashboard() {
  const { data: statsData, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.get('/admin/stats').then((r) => r.data.data),
  });

  const { data: auditData } = useQuery({
    queryKey: ['audit-verify'],
    queryFn: () => api.get('/audit/chain/verify').then((r) => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = statsData || {};
  const byStatus: Record<string, number> = stats.byStatus || {};
  const chartData = Object.entries(byStatus).map(([status, count]) => ({ status, count }));
  const pieData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));

  const topCards = [
    { label: 'Total Applications', value: stats.totalApplications || 0, Icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Users', value: stats.totalUsers || 0, Icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Pending Scrutiny', value: (byStatus['SUBMITTED'] || 0) + (byStatus['UNDER_SCRUTINY'] || 0), Icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Finalized', value: byStatus['FINALIZED'] || 0, Icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm">System overview and management</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Audit chain status */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
            auditData?.valid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <Activity className="w-4 h-4" />
            <span className="text-xs font-semibold">
              Chain: {auditData?.valid ? '✅ Intact' : '⚠️ Broken'}
            </span>
          </div>
          <Link
            to="/dashboard/admin/users"
            className="flex items-center gap-2 bg-gradient-cecb text-white px-4 py-2 rounded-xl text-sm font-medium"
          >
            <Users className="w-4 h-4" /> Manage Users
          </Link>
        </div>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {topCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm"
          >
            <div className={`p-3 rounded-xl ${card.bg}`}>
              <card.Icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">{card.value}</div>
              <div className="text-xs text-gray-500">{card.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Applications by Stage
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="status" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [v, 'Applications']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#6B7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Users by Role
          </h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="60%" height={180}>
              <PieChart>
                <Pie data={Object.entries(stats.byRole || {}).map(([name, value]) => ({ name, value }))} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {Object.keys(stats.byRole || {}).map((_, index) => (
                    <Cell key={index} fill={['#1B5E20', '#0D47A1', '#7B1FA2', '#E65100'][index % 4]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {Object.entries(stats.byRole || {}).map(([role, count], i) => (
                <div key={role} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ background: ['#1B5E20', '#0D47A1', '#7B1FA2', '#E65100'][i % 4] }} />
                  <span className="text-gray-600">{role}</span>
                  <span className="font-semibold text-gray-900">{String(count)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent applications */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Applications</h2>
          <Link to="/dashboard/application" className="text-xs text-primary font-medium flex items-center gap-1 hover:underline">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100">
          {(stats.recentApplications || []).map((app: { id: string; projectName: string; status: string; proponent: { name: string } }) => (
            <div key={app.id} className="flex items-center gap-4 px-6 py-3 hover:bg-gray-50 transition-colors">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{app.projectName}</div>
                <div className="text-xs text-gray-500">by {app.proponent?.name}</div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium`} style={{
                background: STATUS_COLORS[app.status] + '20',
                color: STATUS_COLORS[app.status],
                border: `1px solid ${STATUS_COLORS[app.status]}40`
              }}>
                {app.status.replace(/_/g, ' ')}
              </span>
              <Link to={`/dashboard/admin/audit/${app.id}`} className="text-xs text-primary hover:underline">Audit</Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
