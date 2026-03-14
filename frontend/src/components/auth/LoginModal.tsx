import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { X, Mail, Lock, LogIn, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface LoginModalProps {
  onClose: () => void;
}

export default function LoginModal({ onClose }: LoginModalProps) {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.data.user, data.data.accessToken);
      toast.success('Welcome back!');
      onClose();
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Invalid email or password';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 text-gray-900">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0b5c3e]/40 backdrop-blur-sm"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
      >
        {/* Header decoration */}
        <div className="h-1.5 bg-[#0b5c3e]" />
        
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Sign In</h2>
              <p className="text-sm text-gray-500 mt-1">Welcome back. Enter your credentials.</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600 text-sm"
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative group text-gray-400">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 group-focus-within:text-[#0b5c3e] transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#0b5c3e] focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-gray-900"
                  placeholder="name@organization.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative group text-gray-400">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 group-focus-within:text-[#0b5c3e] transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#0b5c3e] focus:border-transparent outline-none transition-all text-gray-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#0b5c3e] text-white py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#084831] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-900/10 transition-all hover:translate-y-[-1px] active:translate-y-[0px]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" /> Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600 font-medium">
              Don't have an account?{' '}
              <button 
                onClick={() => { onClose(); navigate('/register'); }}
                className="text-[#0b5c3e] font-bold hover:underline"
              >
                Register here
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
