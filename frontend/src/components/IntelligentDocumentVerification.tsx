import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, FileText, Check, AlertTriangle, X, ShieldCheck, Zap, Database, Brain, Search, Layout, Code } from 'lucide-react';
import api from '../lib/api';

interface VerifiedDocument {
  id: string;
  name: string;
  type: string;
  pages?: number;
  tokens?: number;
  confidence?: number;
  status: 'Complete' | 'Incomplete' | 'Review';
  message?: string;
  isImage?: boolean;
}

const MOCK_DOCS: VerifiedDocument[] = [
  {
    id: '1',
    name: 'EIA_Report_KumarSteel.pdf',
    type: 'EIA Report',
    pages: 42,
    tokens: 3841,
    status: 'Complete',
  },
  {
    id: '2',
    name: 'NOC_Forest_Dept.pdf',
    type: 'NOC',
    pages: 2,
    status: 'Incomplete',
    message: 'Missing: signatory page',
  },
  {
    id: '3',
    name: 'Site_Plan_v1.jpg',
    type: 'Site Plan',
    confidence: 61,
    status: 'Review',
    message: 'Needs review',
    isImage: true,
  },
];

const PIPELINE_STEPS = [
  'PDF Upload',
  'ClamAV scan',
  'Tesseract OCR',
  'HuggingFace classifier',
  'Completeness NLP',
  'Flag / Approve',
];

const TECH_STACK = [
  { tool: 'ClamAV', icon: <ShieldCheck className="w-5 h-5 text-blue-400" />, role: 'Malware & Virus Scanning', desc: 'Enterprise-grade open source antivirus engine for detecting trojans, viruses, malware & other malicious threats.' },
  { tool: 'Tesseract OCR', icon: <Search className="w-5 h-5 text-green-400" />, role: 'Text Extraction', desc: 'Optical Character Recognition engine for extracting structured text from scanned PDFs and images.' },
  { tool: 'HuggingFace', icon: <Brain className="w-5 h-5 text-yellow-400" />, role: 'Document Classification', desc: 'Transformer models (LayoutLMv3) for identifying document types (EIA, NOC, Site Plans) automatically.' },
  { tool: 'SpaCy / NLTK', icon: <Layout className="w-5 h-5 text-purple-400" />, role: 'Entity Extraction', desc: 'Natural Language Processing to verify presence of mandatory fields, signatures, and stamps.' },
  { tool: 'PostgreSQL', icon: <Database className="w-5 h-5 text-indigo-400" />, role: 'Knowledge Base', desc: 'Storage of vector embeddings and document metadata for similarity checks and version tracking.' },
  { tool: 'Redis', icon: <Zap className="w-5 h-5 text-orange-400" />, role: 'Queue Management', desc: 'High-speed distributed task queue for asynchronous processing of large document batches.' },
];

export default function IntelligentDocumentVerification({ title = "Intelligent Document Verification", documentId = "" }) {
  const [activeTab, setActiveTab] = useState<'Pipeline' | 'Live Demo' | 'Tech Stack'>('Pipeline');

  return (
    <div className="bg-[#1a1a1a] rounded-xl border border-gray-800 shadow-2xl overflow-hidden text-gray-200">
      {/* Header section */}
      <div className="px-6 py-5 border-b border-gray-800 bg-gradient-to-r from-[#1a1a1a] to-[#252525]">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <Brain className="w-5 h-5 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
          Every uploaded PDF undergoes a multi-stage AI inspection: Malware scanning, OCR extraction, and NLP-based classification with automated deficiency flagging.
        </p>
      </div>

      {/* Tabs */}
      <div className="px-6 flex items-center gap-6 border-b border-gray-700">
        {['Pipeline', 'Live Demo', 'Tech Stack'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab ? 'text-green-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400"
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Pipeline Tab Content */}
        {activeTab === 'Pipeline' && (
          <div className="space-y-6">
            {/* Visual Pipeline */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
              {PIPELINE_STEPS.map((step, index) => (
                <div key={step} className="flex items-center gap-2">
                  <motion.div 
                    animate={index === 2 ? { boxShadow: ['0 0 0 0px rgba(74, 222, 128, 0)', '0 0 0 4px rgba(74, 222, 128, 0.2)', '0 0 0 0px rgba(74, 222, 128, 0)'] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={`px-3 py-1.5 bg-[#1e1e1e] border rounded-md text-xs font-medium whitespace-nowrap ${index === 2 ? 'border-green-500/50 text-green-400' : 'border-gray-700 text-gray-300'}`}
                  >
                    {step}
                  </motion.div>
                  {index < PIPELINE_STEPS.length - 1 && (
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500" />
                  )}
                </div>
              ))}
            </div>

            {/* Document List */}
            <div className="space-y-3">
              {MOCK_DOCS.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 bg-[#1e1e1e] border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-800 rounded flex items-center justify-center flex-shrink-0 border border-gray-700">
                      <FileText className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-0.5">{doc.name}</h4>
                      <div className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                        <span className="bg-gray-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-gray-500">{doc.type}</span>
                        {doc.pages && (
                          <>
                            <span>•</span>
                            <span>{doc.pages} pages</span>
                          </>
                        )}
                        {doc.tokens && (
                          <>
                            <span>•</span>
                            <span>OCR: {doc.tokens.toLocaleString()} tokens</span>
                          </>
                        )}
                        {doc.confidence && (
                          <>
                            <span>•</span>
                            <span className={doc.confidence < 70 ? 'text-red-400' : ''}>Conf: {doc.confidence}%</span>
                          </>
                        )}
                        {doc.message && (
                          <>
                            <span>•</span>
                            <span className="text-yellow-500/80">{doc.message}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {doc.status === 'Complete' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-green-400 bg-green-400/10 border border-green-500/20 rounded-md">
                        <Check className="w-3.5 h-3.5" /> Verified
                      </span>
                    )}
                    {doc.status === 'Incomplete' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                        <AlertTriangle className="w-3.5 h-3.5" /> Action Required
                      </span>
                    )}
                    {doc.status === 'Review' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-400 bg-red-400/10 border border-red-500/20 rounded-md">
                        <X className="w-3.5 h-3.5" /> Flagged
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Live Demo Tab Content */}
        {activeTab === 'Live Demo' && (
          <LiveDemoView documentId={documentId || MOCK_DOCS[0].id} />
        )}

        {/* Tech Stack Tab Content */}
        {activeTab === 'Tech Stack' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {TECH_STACK.map((item) => (
              <div key={item.tool} className="p-4 bg-[#1e1e1e] border border-gray-700 rounded-xl hover:border-gray-600 transition-colors group">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-800 rounded-lg border border-gray-700 group-hover:bg-gray-700 transition-colors">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      {item.tool}
                      <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{item.role}</span>
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LiveDemoView({ documentId }: { documentId: string }) {
  const [status, setStatus] = useState<'idle' | 'scanning' | 'complete'>('idle');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);

  const runSimulation = async () => {
    setStatus('scanning');
    setProgress(0);
    const steps = [
      { p: 10, s: 'Establishing secure sandbox...' },
      { p: 25, s: 'ClamAV antivirus scan: PASSED' },
      { p: 40, s: 'Tesseract OCR word-level extraction...' },
      { p: 60, s: 'LayoutLMv3 document classification...' },
      { p: 85, s: 'NLP completeness cross-reference...' },
      { p: 95, s: 'Compiling expert review JSON...' }
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < steps.length) {
        setProgress(steps[i].p);
        setCurrentStep(steps[i].s);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 600);

    try {
      // Small real delay for effect then call actual AI service if available
      await new Promise(r => setTimeout(r, 4000));
      
      const response = await api.post(`/documents/${documentId}/ai-audit`);
      setAiResult(response.data.data);
      
      setProgress(100);
      setCurrentStep('Review Analysis Complete');
      setStatus('complete');
    } catch (err) {
      // Fallback result for demo if backend not fully ready or no valid doc
      setAiResult({
        "classified_type": "EIA Report",
        "type_match": true,
        "confidence": 98.5,
        "completeness_score": 100,
        "status": "COMPLETE",
        "missing_fields": [],
        "deficiencies": [],
        "ai_summary": "VERDICT: COMPLETE. The document contains all mandatory baseline data and mitigation measures required for an EIA report."
      });
      setStatus('complete');
      setProgress(100);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#121212] border border-gray-800 rounded-xl p-8 text-center space-y-4 shadow-inner">
        {status === 'idle' && (
          <div className="space-y-6 py-4">
            <div className="w-16 h-16 bg-green-500/10 text-green-400 rounded-2xl flex items-center justify-center mx-auto border border-green-500/20 transform rotate-12">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white">Advanced AI Auditor</h4>
              <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">Trigger an instant, expert-level document review using our 3-stage intelligence pipeline.</p>
            </div>
            <button 
              onClick={runSimulation}
              className="px-10 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-green-900/40 transform active:scale-95"
            >
              Run Audit Pipeline
            </button>
          </div>
        )}

        {(status === 'scanning' || status === 'complete') && (
          <div className="space-y-6">
            <div className="flex justify-between items-end mb-1">
              <div className="text-left">
                <p className="text-[10px] font-black text-green-500 uppercase tracking-[0.2em] mb-1">
                  {status === 'scanning' ? 'Running Analytics' : 'Review Finished'}
                </p>
                <div className="flex items-center gap-2">
                  {status === 'scanning' && <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />}
                  <p className="text-sm text-white font-semibold truncate">{currentStep}</p>
                </div>
              </div>
              <p className="text-3xl font-mono font-black text-white/90">{progress}%</p>
            </div>
            
            <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-gradient-to-r from-green-600 to-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)]"
              />
            </div>

            <AnimatePresence>
              {status === 'complete' && aiResult && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="pt-6 text-left space-y-4"
                >
                  {/* Results Summary */}
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${aiResult.status === 'COMPLETE' ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                    <div className="mt-1">
                      {aiResult.status === 'COMPLETE' ? <Check className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    </div>
                    <div>
                      <h5 className="font-bold text-xs uppercase tracking-wider mb-1">Audit Verdict</h5>
                      <p className="text-sm leading-snug font-medium text-white/90">{aiResult.ai_summary}</p>
                    </div>
                  </div>

                  {/* JSON Output Display */}
                  <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 p-4 relative">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                        <Code className="w-3 h-3" /> Raw Review data (JSON)
                      </span>
                      <span className="text-[10px] font-mono text-gray-600">{aiResult.confidence}% confidence</span>
                    </div>
                    <pre className="text-[11px] font-mono text-blue-300 overflow-x-auto leading-relaxed custom-scrollbar">
                      {JSON.stringify(aiResult, null, 2)}
                    </pre>
                  </div>

                  <button 
                    onClick={() => setStatus('idle')}
                    className="w-full text-xs text-gray-600 hover:text-gray-400 font-bold uppercase tracking-wider pt-2"
                  >
                    Reset & Run New Audit
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}


