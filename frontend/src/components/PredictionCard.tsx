import { motion } from 'framer-motion';
import { Target, Clock, AlertTriangle, CheckCircle, BrainCircuit, Activity, BarChart4 } from 'lucide-react';
import { PredictionResult } from '../hooks/usePrediction';

interface PredictionCardProps {
  prediction: PredictionResult | undefined;
  isLoading: boolean;
  error?: Error | null;
}

export default function PredictionCard({ prediction, isLoading, error }: PredictionCardProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-600">
        <div className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="w-5 h-5" /> 
          Prediction Engine Error
        </div>
        <p className="text-sm mt-1">{error.message || 'Could not compute predictive analysis.'}</p>
      </div>
    );
  }

  if (isLoading || !prediction) {
    return (
      <div className="bg-white border text-center border-gray-200 rounded-xl p-8 animate-pulse">
        <BrainCircuit className="w-8 h-8 text-gray-300 mx-auto animate-bounce mb-3" />
        <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto mb-2" />
        <div className="h-3 bg-gray-100 rounded w-1/2 mx-auto" />
      </div>
    );
  }

  const { approvalChance, estimatedDays, riskLevel, confidence, dataPoints, verdict, stageBreakdown, factors } = prediction;

  // Determine top-level color scheme
  let mainColor = 'text-gray-900';
  let badgeClasses = 'bg-gray-100 text-gray-700 border-gray-200';
  
  if (approvalChance >= 70) {
    mainColor = 'text-green-600';
    badgeClasses = 'bg-green-50 text-green-700 border-green-200';
  } else if (approvalChance >= 40) {
    mainColor = 'text-amber-600';
    badgeClasses = 'bg-amber-50 text-amber-700 border-amber-200';
  } else {
    mainColor = 'text-red-500';
    badgeClasses = 'bg-red-50 text-red-700 border-red-200';
  }

  const stageStages = [
    { label: 'Scrutiny', days: stageBreakdown.scrutiny, color: 'bg-blue-400' },
    { label: 'EDS (if any)', days: stageBreakdown.eds, color: 'bg-orange-400' },
    { label: 'Referred/Comm.', days: stageBreakdown.referred, color: 'bg-purple-400' },
    { label: 'MoM', days: stageBreakdown.mom, color: 'bg-yellow-400' },
  ].filter(s => s.days > 0);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* Header section */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-1">
            <Activity className="w-4 h-4" /> AI PREDICTION ENGINE
          </div>
          <h3 className="font-bold text-gray-900">Application Outlook</h3>
        </div>
        <div className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${badgeClasses}`}>
          <BarChart4 className="w-3.5 h-3.5" />
          {confidence}% Confidence
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Core Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-center">
            <Target className={`w-6 h-6 mb-2 ${mainColor}`} />
            <div className={`text-2xl font-bold ${mainColor}`}>{approvalChance}%</div>
            <div className="text-xs text-gray-500 mt-1">Approval Odds</div>
          </div>
          
          <div className="p-4 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-center">
            <Clock className="w-6 h-6 mb-2 text-blue-500" />
            <div className="text-2xl font-bold text-gray-900">{estimatedDays}</div>
            <div className="text-xs text-gray-500 mt-1">Avg Timeline (Days)</div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-center">
            <AlertTriangle className={`w-6 h-6 mb-2 ${
              riskLevel === 'Low' ? 'text-green-500' : riskLevel === 'Medium' ? 'text-amber-500' : 'text-orange-500'
            }`} />
            <div className="text-lg font-bold text-gray-900">{riskLevel}</div>
            <div className="text-xs text-gray-500 mt-1">Risk Profile</div>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-center">
            <CheckCircle className="w-6 h-6 mb-2 text-gray-400" />
            <div className="text-lg font-bold text-gray-900">{dataPoints.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">Data Points Used</div>
          </div>
        </div>

        {/* Verdict */}
        <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
          <p className="text-sm text-blue-800 leading-relaxed font-medium">
            "{verdict}"
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Key Factors */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2 cursor-pointer">Impacting Factors</h4>
            <div className="space-y-2">
              {factors.length === 0 && <span className="text-xs text-gray-400">Standard indicators.</span>}
              {factors.map((f, i) => (
                <div key={i} className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">{f.name}</span>
                  <span className={`font-medium ${
                    f.direction === 'positive' ? 'text-green-600' : 
                    f.direction === 'negative' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {f.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Stage Timeline */}
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-3 border-b pb-2">Estimated Timeline ({estimatedDays} days)</h4>
            
            {/* Proportional Bar */}
            <div className="w-full flex h-3 rounded-full overflow-hidden mb-3">
              {stageStages.map((s, i) => (
                <div 
                  key={i} 
                  className={`${s.color} transition-all`} 
                  style={{ width: `${(s.days / estimatedDays) * 100}%` }}
                  title={`${s.label}: ${s.days} days`}
                />
              ))}
            </div>
            
            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 mt-2">
              {stageStages.map((s, i) => (
                 <div key={i} className="flex items-center gap-1.5 text-xs">
                   <div className={`w-2 h-2 rounded-full ${s.color}`} />
                   <span className="text-gray-600">{s.label} ({s.days}d)</span>
                 </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
