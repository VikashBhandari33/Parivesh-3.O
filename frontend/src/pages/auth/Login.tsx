import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Leaf, LogIn } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const loginMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/auth/login', data),
    onSuccess: (res) => {
      const { user, accessToken } = res.data.data;
      setAuth(user, accessToken);
      toast.success(`Welcome back, ${user.name}!`);

      const roleRoutes: Record<string, string> = {
        PROPONENT: '/dashboard/proponent',
        SCRUTINY: '/dashboard/scrutiny',
        MOM_TEAM: '/dashboard/mom',
        ADMIN: '/dashboard/admin',
      };
      navigate(roleRoutes[user.role] || '/dashboard');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Login failed';
      toast.error(msg);
    },
  });

  return (
    <div className="min-h-screen bg-gradient-soft flex">
      {/* Left panel */}
      <motion.div
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        className="hidden lg:flex lg:w-1/2 bg-gradient-cecb flex-col justify-center items-center p-12 text-white"
      >
        <div className="max-w-md">
          {/* Emblem */}
          <div className="w-24 h-24 rounded-full bg-white/15 backdrop-blur flex items-center justify-center mb-8 border-2 border-white/30">
            <Leaf className="w-12 h-12 text-white" />
          </div>

          <h1 className="text-4xl font-bold mb-4 leading-tight">
            CECB Environmental<br />Clearance System
          </h1>
          <p className="text-white/80 text-lg mb-8">
            Digital platform for streamlined environmental clearance under PARIVESH 3.0 — Chhattisgarh Environment Conservation Board
          </p>

          {/* Feature list */}
          <div className="space-y-3 text-sm text-white/90">
            {['✅ 7-stage digital workflow', '🤖 AI-generated Meeting Gist', '🗺️ GIS proximity analysis', '🔗 Blockchain audit trail', '📄 PDF/Word MoM export'].map((f) => (
              <div key={f} className="flex items-center gap-2">{f}</div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Right panel */}
      <motion.div
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex items-center justify-center p-8"
      >
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-gradient-cecb rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Leaf className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CECB Clearance System</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign In</h2>
            <p className="text-gray-500 text-sm mb-6">Welcome back. Enter your credentials to continue.</p>

            {/* Demo credentials banner */}
            <div className="bg-primary-50 rounded-xl p-4 mb-6 border border-primary-200">
              <p className="text-xs font-semibold text-primary-700 mb-2">Demo Accounts</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-primary-600">
                <span>Proponent: <strong>proponent@example.com</strong></span>
                <span>Pass: <strong>Proponent@1234</strong></span>
                <span>Scrutiny: <strong>scrutiny@cecb.cg.gov.in</strong></span>
                <span>Pass: <strong>Scrutiny@1234</strong></span>
                <span>MoM: <strong>mom@cecb.cg.gov.in</strong></span>
                <span>Pass: <strong>MomTeam@1234</strong></span>
                <span>Admin: <strong>admin@cecb.cg.gov.in</strong></span>
                <span>Pass: <strong>Admin@1234</strong></span>
              </div>
            </div>

            <form onSubmit={handleSubmit((d) => loginMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  placeholder="you@example.com"
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                    placeholder="Your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full bg-gradient-cecb text-white py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
              >
                <LogIn className="w-4 h-4" />
                {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
              </motion.button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary font-semibold hover:text-primary-600">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
