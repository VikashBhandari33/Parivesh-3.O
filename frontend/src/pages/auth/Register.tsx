import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Leaf, UserPlus } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  organization: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['PROPONENT', 'SCRUTINY', 'MOM_TEAM']).default('PROPONENT'),
});

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [showPwd, setShowPwd] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'PROPONENT' },
  });

  const registerMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/auth/register', data),
    onSuccess: (res) => {
      const { user, accessToken } = res.data.data;
      setAuth(user, accessToken);
      toast.success(`Account created! Welcome, ${user.name}!`);
      navigate('/dashboard');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Registration failed';
      toast.error(msg);
    },
  });

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-cecb rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 text-sm">Join CECB Environmental Clearance System</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit((d) => registerMutation.mutate(d))} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input {...register('name')} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition" placeholder="Your full name" />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
              <input {...register('email')} type="email" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition" placeholder="you@example.com" />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <input {...register('password')} type={showPwd ? 'text' : 'password'} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition" placeholder="Min. 8 characters" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            {/* Organization */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Organization</label>
              <input {...register('organization')} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition" placeholder="Your company / organization" />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
              <select {...register('role')} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition bg-white">
                <option value="PROPONENT">Project Proponent / RQP</option>
                <option value="SCRUTINY">Scrutiny Officer</option>
                <option value="MOM_TEAM">MoM Team</option>
              </select>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full bg-gradient-cecb text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
            >
              <UserPlus className="w-4 h-4" />
              {registerMutation.isPending ? 'Creating account...' : 'Create Account'}
            </motion.button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/" className="text-primary font-semibold hover:text-primary-600">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
