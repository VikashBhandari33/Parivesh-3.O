import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  FileText, Check, AlertTriangle, X,
  Brain, FileBox, ExternalLink
} from 'lucide-react';
import api from '../lib/api';

// --- Interfaces ---

interface DocumentVerificationResult {
  classification: string;
  status: 'Complete' | 'Incomplete' | 'Review';
  findings: string[];
  pages: number | null;
  confidence: number;
}

interface DocumentData {
  id: string;
  applicationId: string;
  docType: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  ocrText: string | null;
  verificationResult: DocumentVerificationResult | null;
}

// --- Main Component ---

export default function IntelligentDocumentVerification({ applicationId, title = "Document Verification Status" }: { applicationId: string, title?: string }) {
  const queryClient = useQueryClient();

  // Fetch documents and poll if any are in processing
  const { data: documents = [], isLoading } = useQuery<DocumentData[]>({
    queryKey: ['documents', applicationId],
    queryFn: () => api.get(`/documents/${applicationId}`).then((r: any) => r.data.data),
    enabled: !!applicationId,
    refetchInterval: (query: any) => {
        const docs = query.state.data || [];
        const isProcessing = docs.some((d: DocumentData) => !d.verificationResult);
        return isProcessing ? 3000 : false;
    }
  });

  // Backup effect for polling
  useEffect(() => {
     let interval: NodeJS.Timeout | null = null;
     if (documents.some(d => !d.verificationResult)) {
         interval = setInterval(() => {
             queryClient.invalidateQueries({ queryKey: ['documents', applicationId] });
         }, 3000);
     }
     return () => { if (interval) clearInterval(interval); };
  }, [documents, applicationId, queryClient]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Complete':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg shadow-sm"><Check className="w-3.5 h-3.5" /> Verified</span>;
      case 'Incomplete':
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg shadow-sm"><AlertTriangle className="w-3.5 h-3.5" /> Incomplete</span>;
      case 'Review':
      default:
        return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg shadow-sm"><X className="w-3.5 h-3.5" /> Flagged</span>;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden text-gray-900 transition-all duration-300">
      {/* Header section */}
      <div className="px-6 py-5 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-xl border border-green-100">
              <Brain className="w-5.5 h-5.5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">{title}</h2>
              <p className="text-[11px] text-gray-500 font-medium">Automated Multi-stage Document Inspection</p>
            </div>
          </div>
          {documents.length > 0 && (
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
               <span className="text-green-600">{documents.filter(d => d.verificationResult?.status === 'Complete').length}</span> / {documents.length} Records Verified
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 bg-gray-50/30">
        <div className="space-y-4">
          {isLoading ? (
              <div className="py-12 text-center text-gray-400 text-sm flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="font-medium">Validating Documents...</p>
              </div>
          ) : documents.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-2xl border border-gray-200 border-dashed shadow-sm">
                  <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                    <FileBox className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-sm font-semibold italic">No documents currently uploaded.</p>
              </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
               {documents.map((doc) => {
                   const isProcessing = !doc.verificationResult;
                   const vr = doc.verificationResult;

                   return (
                       <div key={doc.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-green-200 hover:shadow-md transition-all group relative overflow-hidden">
                           {isProcessing && (
                               <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center">
                                   <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full shadow-lg text-green-600 font-bold text-[10px] border border-green-100 uppercase tracking-widest">
                                       <div className="w-3.5 h-3.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                                       AI Audit in Progress...
                                   </div>
                               </div>
                           )}

                           <div className={`flex flex-col md:flex-row md:items-start justify-between gap-5 ${isProcessing ? 'opacity-20' : ''}`}>
                               <div className="flex items-start gap-4 flex-1">
                                   <div className="bg-gray-50 p-3.5 rounded-xl shrink-0 border border-gray-100 group-hover:bg-green-50 group-hover:border-green-100 transition-colors">
                                       <FileText className="w-7 h-7 text-gray-400 group-hover:text-green-500 transition-colors" />
                                   </div>
                                   <div className="flex-1 min-w-0">
                                       <a 
                                         href={doc.fileUrl} 
                                         target="_blank" 
                                         rel="noreferrer" 
                                         className="font-bold text-gray-900 text-base hover:text-green-600 flex items-center gap-2 truncate transition-colors decoration-green-500/30"
                                       >
                                          {doc.fileName}
                                          <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-green-400" />
                                       </a>
                                       <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2.5">
                                           <span className="text-[10px] text-gray-400 font-black uppercase tracking-[0.1em]">{doc.docType.replace(/_/g, ' ')}</span>
                                           {vr && (
                                              <>
                                                  <div className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                                                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">
                                                       AI Match: {vr.classification}
                                                  </span>
                                                  <div className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                                                  <span className="text-[10px] text-gray-500 font-medium">{vr.pages ? `${vr.pages} Pages` : 'Auto-length'}</span>
                                              </>
                                           )}
                                       </div>
                                   </div>
                               </div>

                               {vr && (
                                   <div className="flex flex-col items-end md:w-5/12 shrink-0">
                                       <div className="mb-4">{getStatusBadge(vr.status)}</div>
                                       <div className="w-full">
                                          {vr.findings?.length > 0 ? (
                                              <ul className="space-y-2 flex flex-col items-end">
                                                  {vr.findings.map((finding, idx) => (
                                                      <li key={idx} className={`text-[11px] ${vr.status === 'Complete' ? 'text-green-700/80' : 'text-red-600/80'} flex items-center justify-end gap-2.5 text-right font-medium leading-tight`}>
                                                          {finding}
                                                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${vr.status === 'Complete' ? 'bg-green-500' : 'bg-red-500'} shadow-sm`} />
                                                      </li>
                                                  ))}
                                              </ul>
                                          ) : (
                                              <p className="text-[10px] text-gray-400 italic text-right font-medium">No violations detected by AI auditing pipeline.</p>
                                          )}
                                       </div>
                                   </div>
                               )}
                           </div>
                       </div>
                   );
               })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
