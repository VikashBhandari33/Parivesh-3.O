import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { CreditCard, CheckCircle, ArrowLeft, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [utrNumber, setUtrNumber] = useState('');
  const [step, setStep] = useState<'qr' | 'utr' | 'done'>('qr');

  const { data: paymentData, isLoading, refetch } = useQuery({
    queryKey: ['payment', id],
    queryFn: async () => {
      try {
        const res = await api.get(`/payments/${id}`);
        return res.data.data;
      } catch {
        // initiate if not exists
        const init = await api.post('/payments/initiate', { applicationId: id });
        return init.data.data;
      }
    },
    enabled: !!id,
  });

  const verifyMutation = useMutation({
    mutationFn: () => api.post('/payments/verify', { applicationId: id, utrNumber, amount: paymentData?.amount || 0 }),
    onSuccess: () => {
      setStep('done');
      toast.success('Payment recorded! Awaiting scrutiny verification.');
    },
    onError: () => toast.error('Failed to record payment'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const payment = paymentData?.payment || paymentData;
  const amount = payment?.amount || paymentData?.amount || 5000;
  const upiId = 'cecb.cg@sbi';
  const upiString = `upi://pay?pa=${upiId}&pn=CECB+Chhattisgarh&am=${amount}&tn=ENV+CLEARANCE&cu=INR`;

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Application Fee Payment</h1>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
        {/* Amount banner */}
        <div className="bg-gradient-cecb text-white p-6 text-center">
          <div className="text-sm text-white/80 mb-1">Application Fee</div>
          <div className="text-4xl font-bold">₹{amount.toLocaleString()}</div>
          <div className="text-sm text-white/70 mt-1">UPI ID: {upiId}</div>
        </div>

        <div className="p-6">
          {step === 'done' ? (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Submitted!</h2>
              <p className="text-gray-500 text-sm">Your UTR number has been recorded. Scrutiny team will verify the payment.</p>
              <button onClick={() => navigate(-1)} className="mt-6 bg-primary text-white px-6 py-2.5 rounded-xl font-medium">
                Back to Application
              </button>
            </motion.div>
          ) : step === 'qr' ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-600">Scan the QR code with any UPI app to pay</p>
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl border-2 border-gray-200 inline-block">
                  <QRCodeSVG value={upiString} size={200} level="H" />
                </div>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 text-sm">
                <span className="text-gray-500 flex-1">{upiId}</span>
                <button
                  onClick={() => { void navigator.clipboard.writeText(upiId); toast.success('UPI ID copied!'); }}
                  className="text-primary hover:text-primary-700"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-400">Supported: PhonePe, Google Pay, Paytm, BHIM, any UPI app</p>
              <button
                onClick={() => setStep('utr')}
                className="w-full bg-gradient-cecb text-white py-2.5 rounded-xl font-semibold"
              >
                I have made the payment →
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-semibold text-gray-900">Enter UTR Number</h2>
              <p className="text-sm text-gray-500">Enter the 12–22 digit UTR/transaction reference number from your UPI app</p>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                placeholder="e.g. 415432123456"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                maxLength={22}
              />
              <div className="flex gap-3">
                <button onClick={() => setStep('qr')} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl hover:bg-gray-50">
                  Back
                </button>
                <button
                  onClick={() => verifyMutation.mutate()}
                  disabled={utrNumber.length < 12 || verifyMutation.isPending}
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl font-semibold disabled:opacity-50"
                >
                  {verifyMutation.isPending ? 'Submitting...' : 'Submit UTR'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
