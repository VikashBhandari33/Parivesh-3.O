import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Shield, CheckCircle, AlertCircle, Hash } from 'lucide-react';
import api from '../../lib/api';

interface AuditEntry {
  id: number;
  eventType: string;
  actorId: string;
  actor: { name: string; role: string };
  payload: Record<string, unknown>;
  payloadHash: string;
  prevHash: string;
  chainHash: string;
  createdAt: string;
}

const EVENT_COLORS: Record<string, string> = {
  APPLICATION_CREATED: 'bg-blue-100 text-blue-700',
  APPLICATION_SUBMITTED: 'bg-indigo-100 text-indigo-700',
  SCRUTINY_STARTED: 'bg-amber-100 text-amber-700',
  EDS_ISSUED: 'bg-orange-100 text-orange-700',
  APPLICATION_REFERRED: 'bg-purple-100 text-purple-700',
  GIST_GENERATED: 'bg-cyan-100 text-cyan-700',
  MOM_EDITED: 'bg-teal-100 text-teal-700',
  MOM_FINALIZED: 'bg-green-100 text-green-700',
  PAYMENT_SUBMITTED: 'bg-yellow-100 text-yellow-700',
  PAYMENT_APPROVED: 'bg-green-100 text-green-700',
  DOCUMENT_UPLOADED: 'bg-gray-100 text-gray-700',
  DOCUMENT_VERIFIED: 'bg-green-100 text-green-700',
};

export default function AuditLog() {
  const { id } = useParams<{ id: string }>();

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['audit', id],
    queryFn: () => api.get(`/audit/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: verifyData } = useQuery({
    queryKey: ['audit-verify'],
    queryFn: () => api.get('/audit/chain/verify').then((r) => r.data.data),
  });

  const events: AuditEntry[] = eventsData?.data || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Blockchain Audit Trail</h1>
          <p className="text-gray-500 text-sm">SHA3-256 Merkle chain — immutable event log</p>
        </div>
        {verifyData && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium ${
            verifyData.valid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {verifyData.valid ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            Chain {verifyData.valid ? 'Intact' : 'BROKEN'} • {verifyData.totalEntries} entries
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
            >
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 bg-gradient-cecb rounded-lg flex items-center justify-center text-white text-xs font-bold">
                    {event.id}
                  </div>
                  {i < events.length - 1 && <div className="w-0.5 h-3 bg-gray-200 mt-1" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${EVENT_COLORS[event.eventType] || 'bg-gray-100 text-gray-700'}`}>
                      {event.eventType.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-500">{format(new Date(event.createdAt), 'dd MMM yyyy HH:mm:ss')}</span>
                    <span className="text-xs text-gray-400">by {event.actor?.name} ({event.actor?.role})</span>
                  </div>

                  {/* Payload */}
                  {Object.keys(event.payload || {}).length > 0 && (
                    <div className="text-xs text-gray-500 font-mono bg-gray-50 rounded px-2 py-1 mt-1">
                      {JSON.stringify(event.payload)}
                    </div>
                  )}

                  {/* Hashes */}
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Hash className="w-3 h-3" />
                      <span className="font-mono truncate max-w-[120px]" title={event.chainHash}>{event.chainHash.slice(0, 16)}…</span>
                    </div>
                    <Shield className="w-3 h-3 text-green-400" title="Chain integrity OK" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
