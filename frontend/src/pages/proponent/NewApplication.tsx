import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ChevronRight, ChevronLeft, Check, MapPin, AlertTriangle, Info } from 'lucide-react';
import api from '../../lib/api';
import GISMap from '../../components/GISMap';
import DocumentUpload from '../../components/DocumentUpload';

const STEPS = ['Project Details', 'Location & GIS', 'Documents', 'Payment Info', 'Review & Submit'];

const emptyToUndefined = (v: any) => (v === '' || v === null || v === undefined) ? undefined : Number(v);

const schema = z.object({
  projectName:    z.string().min(3, 'Project name required'),
  sector:         z.string().min(1, 'Sector required'),
  description:    z.string().optional(),
  district:       z.string().min(1, 'District required'),
  areaHa:         z.preprocess(emptyToUndefined, z.number().positive('Area must be positive').optional()),
  investmentCr:   z.preprocess(emptyToUndefined, z.number().positive().optional()),
  employmentCount: z.preprocess(emptyToUndefined, z.number().int().nonnegative().optional()),
  lat:            z.number().optional(),
  lng:            z.number().optional(),
  contactPhone:   z.string().min(10, 'Enter a valid 10-digit mobile number').max(15, 'Phone number too long').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface IndustrialZone {
  name: string;
  lat: number;
  lng: number;
}

const DISTRICT_DATA: Record<string, { center: [number, number], suggestions: IndustrialZone[] }> = {
  'Raipur': {
    center: [21.2514, 81.6296],
    suggestions: [
      { name: 'Siltara Industrial Area', lat: 21.3780, lng: 81.6700 },
      { name: 'Urla Industrial Complex', lat: 21.3100, lng: 81.6100 },
      { name: 'Bhanpuri Cluster', lat: 21.2900, lng: 81.6400 }
    ]
  },
  'Bilaspur': {
    center: [22.0797, 82.1391],
    suggestions: [
      { name: 'Sirgitti Industrial Area', lat: 22.0400, lng: 82.1200 },
      { name: 'Tifra Industrial Estate', lat: 22.0600, lng: 82.0900 },
      { name: 'Dagori', lat: 21.9500, lng: 82.0200 }
    ]
  },
  'Durg': {
    center: [21.1905, 81.2849],
    suggestions: [
      { name: 'Bhilai Industrial Area', lat: 21.2100, lng: 81.3500 },
      { name: 'Borai Industrial Growth Centre', lat: 21.1200, lng: 81.2500 }
    ]
  },
  'Korba': {
    center: [22.3595, 82.7501],
    suggestions: [
      { name: 'Balco Industrial Area', lat: 22.3900, lng: 82.7300 },
      { name: 'Amanala', lat: 22.3400, lng: 82.7100 }
    ]
  },
  'Raigarh': {
    center: [21.8974, 83.3950],
    suggestions: [
      { name: 'Punjipatra Industrial Area', lat: 22.1200, lng: 83.3200 },
      { name: 'Tamnar Cluster', lat: 22.2100, lng: 83.4200 }
    ]
  }
};

const SECTORS = [
  'Mining', 'Thermal Power', 'Industry', 'Infrastructure',
  'River Valley', 'Nuclear', 'Construction', 'Irrigation', 'Other',
];
const DISTRICTS = [
  'Raipur', 'Bilaspur', 'Durg', 'Rajnandgaon', 'Korba', 'Raigarh',
  'Jagdalpur', 'Ambikapur', 'Dhamtari', 'Kanker', 'Surguja', 'Jashpur',
];

export default function NewApplication() {
  const [step, setStep] = useState(0);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [mapViewCenter, setMapViewCenter] = useState<[number, number] | undefined>(undefined);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, getValues, trigger, setValue, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const lat = watch('lat');
  const lng = watch('lng');
  const district = watch('district');

  // Pan map view when district is selected (no pin dropped)
  useEffect(() => {
    if (district && DISTRICT_DATA[district]) {
      setMapViewCenter(DISTRICT_DATA[district].center);
    }
  }, [district]);

  // Fetch GIS risk flags whenever lat/lng are set (Existing local DB check)
  const { data: gisData } = useQuery({
    queryKey: ['gis-check', lat, lng],
    queryFn: () => api.get(`/gis/check?lat=${lat}&lng=${lng}`).then(r => r.data.data),
    enabled: !!(lat && lng),
  });

  // Fetch Live Satellite Hackathon Data whenever lat/lng change
  const { data: satelliteData, isFetching: isSatelliteLoading } = useQuery({
    queryKey: ['satellite-check', lat, lng],
    queryFn: () => api.get(`/satellite/analyze?lat=${lat}&lng=${lng}`).then(r => r.data.data),
    enabled: !!(lat && lng),
    staleTime: 60000,
  });

  // Step 1: Create draft application
  const createMutation = useMutation({
    mutationFn: (data: FormData) => api.post('/applications', data),
    onSuccess: (res) => {
      const id = res.data.data.id as string;
      setDraftId(id);
      toast.success('Draft saved! Now upload your documents.');
      setStep(2); // Jump to documents step
    },
    onError: () => toast.error('Failed to create application'),
  });

  // Final submit (navigate to detail)
  const onFinalSubmit = () => {
    if (draftId) {
      toast.success('Application saved as Draft!');
      navigate(`/dashboard/proponent/application/${draftId}`);
    }
  };

  const handleLocationChange = useCallback((newLat: number, newLng: number) => {
    setValue('lat', newLat);
    setValue('lng', newLng);
    setMapViewCenter([newLat, newLng]);
  }, [setValue]);

  const nextStep = async () => {
    if (step === 0) {
      const valid = await trigger(['projectName', 'sector', 'district']);
      if (!valid) return;
    }
    if (step === 1) {
      // Auto-create draft when leaving step 1 (location) if not yet created
      if (!draftId) {
        const formData = getValues();
        const parsed = schema.safeParse(formData);
        if (!parsed.success) {
          toast.error('Please check project details');
          setStep(0);
          return;
        }
        createMutation.mutate(parsed.data);
        return; // createMutation.onSuccess will advance to step 2
      }
    }
    if (step < STEPS.length - 1) setStep(s => s + 1);
  };

  const goBack = () => {
    if (step > 0) setStep(s => s - 1);
    else navigate('/dashboard/proponent');
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">New Environmental Clearance Application</h1>
        <p className="text-gray-500 text-sm">Fill in the details step by step — your progress is auto-saved</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
              i < step ? 'step-complete' : i === step ? 'step-active' : 'step-pending'
            }`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <div className="hidden sm:block text-xs font-medium text-gray-600 flex-1 truncate px-1">{s}</div>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 rounded ${i < step ? 'bg-primary' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >

            {/* ── Step 1: Project Details ── */}
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Details</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
                  <input
                    {...register('projectName')}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g. Raipur Steel Plant Expansion"
                  />
                  {errors.projectName && <p className="text-xs text-red-500 mt-1">{errors.projectName.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sector *</label>
                    <select
                      {...register('sector')}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    >
                      <option value="">Select sector</option>
                      {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.sector && <p className="text-xs text-red-500 mt-1">{errors.sector.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
                    <select
                      {...register('district')}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    >
                      <option value="">Select district</option>
                      {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {errors.district && <p className="text-xs text-red-500 mt-1">{errors.district.message}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Area (Hectares)</label>
                    <input {...register('areaHa')} type="number" step="0.01" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. 150.5" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Investment (Crore ₹)</label>
                    <input {...register('investmentCr')} type="number" step="0.01" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. 250" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Employment Generated (persons)</label>
                  <input {...register('employmentCount')} type="number" className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. 500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Description</label>
                  <textarea {...register('description')} rows={3} className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" placeholder="Briefly describe the project…" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Mobile Number (for SMS Alerts) *</label>
                  <input 
                    {...register('contactPhone')} 
                    type="tel" 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary" 
                    placeholder="e.g. 9876543210" 
                  />
                  {errors.contactPhone && <p className="text-xs text-red-500 mt-1">{errors.contactPhone.message}</p>}
                </div>
              </div>
            )}

            {/* ── Step 2: Location & GIS ── */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Location & Environmental Context</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Click on the map to pin your project location. The system will automatically check proximity to forests, rivers, wildlife sanctuaries, and wetlands.
                </p>

                <GISMap
                  interactive
                  lat={lat}
                  lng={lng}
                  viewCenter={mapViewCenter}
                  onLocationChange={handleLocationChange}
                  riskFlags={gisData?.riskFlags ?? []}
                  height="360px"
                />

                {district && DISTRICT_DATA[district]?.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-primary" /> Suggested Industrial Areas in {district}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DISTRICT_DATA[district].suggestions.map((zone) => (
                        <button
                          key={zone.name}
                          type="button"
                          onClick={() => handleLocationChange(zone.lat, zone.lng)}
                          className="px-3 py-1.5 bg-gray-50 border border-gray-200 hover:border-primary hover:bg-primary/5 rounded-full text-xs font-medium text-gray-700 transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {zone.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {lat && lng ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                      <MapPin className="w-4 h-4" />
                      Pin set at <strong>{lat.toFixed(5)}, {lng.toFixed(5)}</strong>
                      {gisData?.riskFlags?.length > 0 && (
                        <span className="ml-2 text-orange-600 font-medium">⚠️ {gisData.riskFlags.length} risk flag(s) detected</span>
                      )}
                    </div>
                    
                    {/* Hackathon Satellite Verification Alerts */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                       <div className="p-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                         <h3 className="font-semibold text-gray-900 text-sm">Live Satellite Verification</h3>
                         {isSatelliteLoading && <span className="text-xs text-blue-600 animate-pulse">Scanning area...</span>}
                       </div>
                       <div className="p-3">
                          {isSatelliteLoading ? (
                             <div className="h-10 flex items-center justify-center">
                               <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                             </div>
                          ) : satelliteData ? (
                             <div className="space-y-2">
                               {satelliteData.findings.length > 0 ? (
                                 satelliteData.findings.map((f: string, i: number) => (
                                   <div key={i} className="flex items-start gap-2 text-sm bg-orange-50 text-orange-800 p-2.5 rounded-lg border border-orange-100">
                                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-orange-600" />
                                      <span><strong>Alert:</strong> {f}</span>
                                   </div>
                                 ))
                               ) : (
                                 <div className="flex items-start gap-2 text-sm bg-green-50 text-green-800 p-2.5 rounded-lg border border-green-100">
                                   <Check className="w-4 h-4 shrink-0 mt-0.5 text-green-600" />
                                   <span>Area is clear. No immediate forests or water bodies detected within 5km.</span>
                                 </div>
                               )}
                               <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                 <Info className="w-3 h-3" /> Powered by OpenStreetMap Overpass AI Verification
                               </div>
                             </div>
                          ) : (
                             <p className="text-sm text-gray-500 text-center py-2">Verification results will appear here.</p>
                          )}
                       </div>
                    </div>

                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                    📍 No pin set — you can still proceed, but GIS analysis won't be available
                  </div>
                )}
              </div>
            )}

            {/* ── Step 3: Documents ── */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Upload Documents</h2>
                <p className="text-sm text-gray-500 mb-4">
                  Upload required documents: Form-I, Form-IA, EIA Report, Pre-Feasibility Report, Topo Sheet.
                </p>
                {draftId ? (
                  <DocumentUpload applicationId={draftId} />
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
                    <p className="text-sm text-amber-700">⏳ Creating your draft application first…</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 4: Fee ── */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Fee</h2>
                <p className="text-sm text-gray-500">
                  Application fee will be calculated based on your sector and project area after submission.
                  You will receive a UPI QR code to complete payment.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-3 text-sm text-green-700">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💳</span>
                    <div>
                      <strong>UPI Payment</strong>
                      <p className="text-xs text-green-600 mt-0.5">
                        After submission, a QR code will be generated linked to <strong>cecb.cg@sbi</strong>
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-gray-500 text-xs mb-1">Category A (EIA required)</div>
                    <div className="font-semibold text-gray-900">₹50,000 – ₹2,00,000</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-gray-500 text-xs mb-1">Category B (SEIA)</div>
                    <div className="font-semibold text-gray-900">₹10,000 – ₹50,000</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 5: Review ── */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Review & Save</h2>
                <div className="bg-gray-50 rounded-xl p-5 space-y-3 text-sm">
                  {[
                    ['Project Name', getValues('projectName')],
                    ['Sector',       getValues('sector')],
                    ['District',     getValues('district')],
                    ['Area',         getValues('areaHa') ? `${getValues('areaHa')} ha` : '—'],
                    ['Investment',   getValues('investmentCr') ? `₹${getValues('investmentCr')} Cr` : '—'],
                    ['Location',     lat && lng ? `${lat?.toFixed(4)}, ${lng?.toFixed(4)}` : 'Not set'],
                    ['Contact Phone', getValues('contactPhone') || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-medium text-gray-900">{value || '—'}</span>
                    </div>
                  ))}
                </div>
                {draftId ? (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
                    ✅ Draft created (ID: <code className="font-mono text-xs bg-green-100 px-1 rounded">{draftId.slice(0, 8)}…</code>). Click below to go to your application.
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    Clicking "Save as Draft" will create the application. You can then upload documents and submit it for review.
                  </p>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <button
          onClick={goBack}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> {step > 0 ? 'Back' : 'Cancel'}
        </button>

        {step < STEPS.length - 1 ? (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => void nextStep()}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 bg-gradient-cecb text-white px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60"
          >
            {createMutation.isPending ? 'Saving…' : 'Next'}
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={draftId ? onFinalSubmit : handleSubmit(data => createMutation.mutate(data))}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 bg-gradient-cecb text-white px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60"
          >
            <Check className="w-4 h-4" />
            {createMutation.isPending ? 'Saving…' : draftId ? 'Open Application →' : 'Save as Draft'}
          </motion.button>
        )}
      </div>
    </div>
  );
}
