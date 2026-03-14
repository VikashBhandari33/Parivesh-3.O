import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, FileText, Check, AlertTriangle, X } from 'lucide-react';

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

export default function IntelligentDocumentVerification({ title = "Intelligent Document Verification" }) {
  const [activeTab, setActiveTab] = useState<'Pipeline' | 'Live Demo' | 'Tech Stack'>('Pipeline');

  return (
    <div className="bg-[#242424] rounded-xl border border-gray-700 shadow-xl overflow-hidden text-gray-200">
      {/* Header section */}
      <div className="px-6 py-5 border-b border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Every uploaded PDF passes through a 3-stage AI pipeline: OCR extraction <ArrowRight className="inline w-3 h-3 mx-1" /> document type classification <ArrowRight className="inline w-3 h-3 mx-1" /> completeness check. Deficiencies are auto-flagged before a human scrutiny officer even opens the file.
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
        {activeTab === 'Pipeline' && (
          <div className="space-y-6">
            {/* Visual Pipeline */}
            <div className="flex flex-wrap items-center gap-2 mb-8">
              {PIPELINE_STEPS.map((step, index) => (
                <div key={step} className="flex items-center gap-2">
                  <div className="px-3 py-1.5 bg-[#1e1e1e] border border-gray-700 rounded-md text-xs font-medium text-gray-300 whitespace-nowrap">
                    {step}
                  </div>
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
                    <div className="w-10 h-10 bg-white rounded flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-indigo-200" fill="#e0e7ff" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white mb-0.5">{doc.name}</h4>
                      <div className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                        <span>Classified: {doc.type}</span>
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
                            <span>Low confidence {doc.confidence}%</span>
                          </>
                        )}
                        {doc.message && (
                          <>
                            <span>•</span>
                            <span>{doc.message}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {doc.status === 'Complete' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-green-400 bg-green-400/10 border border-green-500/20 rounded-md">
                        <Check className="w-3.5 h-3.5" /> Complete
                      </span>
                    )}
                    {doc.status === 'Incomplete' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                        <AlertTriangle className="w-3.5 h-3.5" /> Incomplete
                      </span>
                    )}
                    {doc.status === 'Review' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-400 bg-red-400/10 border border-red-500/20 rounded-md">
                        <X className="w-3.5 h-3.5" /> Review
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other Tabs Placeholder */}
        {activeTab !== 'Pipeline' && (
          <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
            Content for {activeTab} view goes here.
          </div>
        )}
      </div>
    </div>
  );
}
