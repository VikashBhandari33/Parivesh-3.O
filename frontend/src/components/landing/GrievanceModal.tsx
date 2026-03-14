import { motion } from 'framer-motion';
import { X, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useState } from 'react';

const schema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Invalid email address').or(z.string().regex(/^\d{10}$/, 'Invalid phone number')),
  category: z.enum(['CLEARANCE_DELAY', 'TECHNICAL_ISSUE', 'CORRUPTION', 'OTHER']),
  subject: z.string().min(5, 'Subject is too short'),
  message: z.string().min(20, 'Please provide more details (min 20 chars)'),
});

type FormData = z.infer<typeof schema>;

interface GrievanceModalProps {
  onClose: () => void;
}

export default function GrievanceModal({ onClose }: GrievanceModalProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    // Mock API call
    console.log('Grievance Submitted:', data);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitted(true);
    toast.success('Your grievance has been registered successfully!');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden relative"
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {!isSubmitted ? (
          <div className="p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Public Grievance Portal</h2>
                <p className="text-sm text-gray-500">Submit your complaints or feedback directly to CECB</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Full Name</label>
                  <input 
                    {...register('name')}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  {errors.name && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Email / Mobile</label>
                  <input 
                    {...register('email')}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                  {errors.email && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.email.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Category</label>
                <select 
                  {...register('category')}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
                >
                  <option value="CLEARANCE_DELAY">Delay in Clearance Process</option>
                  <option value="TECHNICAL_ISSUE">Technical Issue / Bug</option>
                  <option value="CORRUPTION">Report Corruption / Unfair Practice</option>
                  <option value="OTHER">Other Feedback</option>
                </select>
                {errors.category && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.category.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Subject</label>
                <input 
                  {...register('subject')}
                  placeholder="Briefly state the issue"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                />
                {errors.subject && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.subject.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 ml-1">Message Details</label>
                <textarea 
                  {...register('message')}
                  rows={4}
                  placeholder="Describe your grievance in detail..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-none"
                />
                {errors.message && <p className="text-[10px] text-red-500 mt-1 ml-1">{errors.message.message}</p>}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-200 hover:shadow-red-300 transition-all disabled:opacity-50 mt-4"
              >
                <Send className={`w-4 h-4 ${isSubmitting ? 'animate-pulse' : ''}`} />
                {isSubmitting ? 'Submitting...' : 'Register Complaint'}
              </button>
            </form>
          </div>
        ) : (
          <div className="p-12 text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Grievance Registered</h2>
              <p className="text-gray-500">
                Your complaint has been successfully submitted to the Monitoring Cell. 
                Your reference ID is: <span className="font-mono font-bold text-primary">GRV-{Math.floor(Math.random() * 90000) + 10000}</span>
              </p>
            </div>
            <button 
              onClick={onClose}
              className="px-8 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
            >
              Close Portal
            </button>
          </div>
        )}

        <div className="bg-gray-50 p-4 text-center border-t border-gray-100">
           <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
             Confidentiality Guaranteed | Monitored by MoEFCC
           </p>
        </div>
      </motion.div>
    </div>
  );
}
