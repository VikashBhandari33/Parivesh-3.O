import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Shield, UserCheck, UserX, Edit3 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

type UserRole = 'ADMIN' | 'PROPONENT' | 'SCRUTINY' | 'MOM_TEAM';

interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization: string | null;
  isActive: boolean;
  createdAt: string;
}

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  SCRUTINY: 'bg-amber-100 text-amber-700',
  MOM_TEAM: 'bg-cyan-100 text-cyan-700',
  PROPONENT: 'bg-green-100 text-green-700',
};

export default function UserManagement() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<UserRole>('PROPONENT');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => api.get('/admin/users').then((r) => r.data.data as User[]),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      api.patch(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => {
      toast.success('Role updated');
      setEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error('Failed to update role'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (userId: string) => api.patch(`/admin/users/${userId}/toggle`),
    onSuccess: () => {
      toast.success('User status toggled');
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => toast.error('Failed to toggle status'),
  });

  const users: User[] = data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm">Manage roles and access for all system users</p>
        </div>
        <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-xl border border-purple-200">
          <Users className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-medium text-purple-700">{users.length} total users</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['User', 'Role', 'Organization', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user, i) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-cecb flex items-center justify-center text-white text-sm font-bold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {editingId === user.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value as UserRole)}
                          className="text-xs border border-gray-300 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {(['PROPONENT', 'SCRUTINY', 'MOM_TEAM', 'ADMIN'] as UserRole[]).map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => changeRoleMutation.mutate({ userId: user.id, role: newRole })}
                          className="text-xs bg-primary text-white px-2 py-1 rounded-lg"
                        >
                          Save
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                      </div>
                    ) : (
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${ROLE_COLORS[user.role]}`}>
                        {user.role.replace(/_/g, ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">{user.organization || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingId(user.id); setNewRole(user.role); }}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary-50 rounded-lg transition-colors"
                        title="Change role"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleActiveMutation.mutate(user.id)}
                        className={`p-1.5 rounded-lg transition-colors ${user.isActive ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-400 hover:text-green-500 hover:bg-green-50'}`}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {user.isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
