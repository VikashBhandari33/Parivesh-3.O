import { motion } from 'framer-motion';
import { X, CheckCircle2, Clock, FileText, ArrowRight } from 'lucide-react';

interface ServiceDetailModalProps {
  service: {
    title: string;
    icon: string;
    color: string;
    description: string;
    requirements: string[];
    timeline: string;
    documents: string[];
  };
  onClose: () => void;
  onApply: () => void;
}

export default function ServiceDetailModal({ service, onClose, onApply }: ServiceDetailModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className={`p-6 ${service.color} text-white flex justify-between items-center`}>
          <div className="flex items-center gap-4">
            <span className="text-4xl">{service.icon}</span>
            <div>
              <h2 className="text-2xl font-bold">{service.title}</h2>
              <p className="text-white/80 text-sm">Service Overview & Guidelines</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          <section className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" /> Description
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {service.description}
            </p>
          </section>

          <div className="grid md:grid-cols-2 gap-8">
            <section className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" /> Key Requirements
              </h3>
              <ul className="space-y-2">
                {service.requirements.map((req, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600">
                    <span className="text-green-600 font-bold">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" /> Typical Timeline
              </h3>
              <p className="text-sm text-gray-600 bg-orange-50 p-3 rounded-xl border border-orange-100">
                {service.timeline}
              </p>
              
              <h3 className="text-lg font-bold text-gray-900 mt-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" /> Essential Documents
              </h3>
              <ul className="space-y-2">
                {service.documents.map((doc, i) => (
                  <li key={i} className="flex gap-2 text-sm text-gray-600">
                    <span className="text-purple-600 font-bold">•</span>
                    {doc}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-gray-600 font-semibold hover:bg-gray-200 rounded-xl transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              onClose();
              onApply();
            }}
            className="px-8 py-2.5 bg-[#0b5c3e] text-white font-bold rounded-xl hover:bg-[#084831] transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            Apply Online <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
