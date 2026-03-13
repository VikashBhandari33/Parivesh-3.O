import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import api from '../../lib/api';

const STEPS = ['Project Details', 'Location & GIS', 'Documents', 'Payment Info', 'Review & Submit'];

const schema = z.object({
  projectName: z.string().min(3, 'Project name required'),
  sector: z.string().min(1, 'Sector required'),
  description: z.string().optional(),
  district: z.string().min(1, 'District required'),
  areaHa: z.coerce.number().positive('Area must be positive').optional(),
  investmentCr: z.coerce.number().positive().optional(),
});

type FormData = z.infer<typeof schema>;

const SECTORS = ['Mining', 'Thermal Power', 'Industry', 'Infrastructure', 'River Valley', 'Nuclear', 'Construction', 'Other'];
const DISTRICTS = ['Raipur', 'Bilaspur', 'Durg', 'Rajnandgaon', 'Korba', 'Raigarh', 'Jagdalpur', 'Ambikapur', 'Jagdalpur', 'Dhamtari'];

export default function NewApplication() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, getValues, trigger } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/applications', data),
    onSuccess: (res) => {
      const id = res.data.data.id as string;
      toast.success('Application created as Draft!');
      navigate(`/dashboard/proponent/application/${id}`);
    },
    onError: () => toast.error('Failed to create application'),
  });

  const nextStep = async () => {
    if (step === 0) {
      const valid = await trigger(['projectName', 'sector', 'district']);
      if (!valid) return;
    }
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const onSubmit = (data: FormData) => createMutation.mutate(data);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Environmental Clearance Application</h1>
        <p className="text-gray-500 text-sm">Fill in the details step by step</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
              i < step ? 'step-complete' : i === step ? 'step-active' : 'step-pending'
            }`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <div className="hidden sm:block text-xs font-medium text-gray-600 flex-1 truncate">{s}</div>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 rounded ${i < step ? 'bg-primary' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Step 1: Project Details */}
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                  <input {...register('projectName')} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Raipur Steel Plant Expansion" />
                  {errors.projectName && <p className="text-xs text-red-500 mt-1">{errors.projectName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sector *</label>
                  <select {...register('sector')} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
                    <option value="">Select sector</option>
                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.sector && <p className="text-xs text-red-500 mt-1">{errors.sector.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Description</label>
                  <textarea {...register('description')} rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" placeholder="Describe the project..." />
                </div>
              </div>
            )}

            {/* Step 2: Location */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Location & Environmental Context</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
                    <select {...register('district')} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white">
                      <option value="">Select district</option>
                      {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {errors.district && <p className="text-xs text-red-500 mt-1">{errors.district.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area (Hectares)</label>
                    <input {...register('areaHa')} type="number" step="0.01" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. 150.5" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Investment (Crore ₹)</label>
                  <input {...register('investmentCr')} type="number" step="0.01" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. 250" />
                </div>
                {/* GIS map placeholder */}
                <div className="rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 h-48 flex items-center justify-center text-center">
                  <div>
                    <div className="text-gray-500 text-sm font-medium">🗺️ Leaflet Map</div>
                    <div className="text-xs text-gray-400">Drop a pin on your project location to enable GIS proximity analysis</div>
                    <div className="text-xs text-gray-400 mt-1">(Map loads when Leaflet CSS is available)</div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Documents */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Documents</h2>
                <p className="text-sm text-gray-500">
                  Save this application as a Draft first, then upload your documents from the Application Detail page.
                  Required documents: Form-I, Form-IA, EIA Report, Pre-Feasibility Report, Topo Sheet.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                  <strong>📌 Note:</strong> Documents can be uploaded after saving the draft. Supported formats: PDF, JPG, PNG, Word.
                </div>
              </div>
            )}

            {/* Step 4: Fee */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Fee</h2>
                <p className="text-sm text-gray-500">
                  Application fee will be calculated based on your sector and project area after submission.
                  You will receive a UPI QR code to complete payment.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
                  <strong>💳 UPI Payment:</strong> After submission, a QR code will be generated linked to <strong>cecb.cg@sbi</strong>
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Review & Submit</h2>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Project Name</span><span className="font-medium">{getValues('projectName') || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Sector</span><span className="font-medium">{getValues('sector') || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">District</span><span className="font-medium">{getValues('district') || '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Area</span><span className="font-medium">{getValues('areaHa') ? `${getValues('areaHa')} ha` : '—'}</span></div>
                </div>
                <p className="text-xs text-gray-400">
                  By clicking Save as Draft, the application will be created. You must upload documents and submit to progress.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/dashboard/proponent')}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> {step > 0 ? 'Back' : 'Cancel'}
        </button>

        {step < STEPS.length - 1 ? (
          <button onClick={() => void nextStep()} className="flex items-center gap-2 bg-gradient-cecb text-white px-5 py-2.5 rounded-xl font-semibold">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleSubmit(onSubmit)}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 bg-gradient-cecb text-white px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60"
          >
            <Check className="w-4 h-4" />
            {createMutation.isPending ? 'Saving...' : 'Save as Draft'}
          </motion.button>
        )}
      </div>
    </div>
  );
}
