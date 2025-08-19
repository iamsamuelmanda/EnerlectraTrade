import React, { useState, useEffect } from 'react';
import { X, Zap, Smartphone, CreditCard, Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

interface HybridPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: {
    id: string;
    energyAmount: number;
    pricePerKwh: number;
    totalPrice: number;
    fromUserId: string;
    tradeType: string;
  };
  onSuccess: (transactionId: string, paymentMethod: string) => void;
}

interface PaymentMethod {
  id: string;
  type: 'mobile_money' | 'blockchain' | 'hybrid';
  name: string;
  description: string;
  icon: React.ReactNode;
  isAvailable: boolean;
  processingTime: string;
  fees: string;
}

const HybridPaymentModal: React.FC<HybridPaymentModalProps> = ({
  isOpen,
  onClose,
  offer,
  onSuccess
}) => {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('hybrid');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    if (isOpen) {
      initializePaymentMethods();
    }
  }, [isOpen]);

  const initializePaymentMethods = async () => {
    try {
      // Check blockchain status
      const blockchainStatus = await apiService.getBlockchainStatus();
      
      const methods: PaymentMethod[] = [
        {
          id: 'hybrid',
          type: 'hybrid',
          name: 'Smart Payment',
          description: 'Automatically selects the best payment method for you',
          icon: <Zap className="w-5 h-5" />,
          isAvailable: true,
          processingTime: 'Instant',
          fees: 'No additional fees'
        },
        {
          id: 'mobile_money',
          type: 'mobile_money',
          name: 'Mobile Money',
          description: 'Pay using MTN, Airtel, or Zamtel mobile money',
          icon: <Smartphone className="w-5 h-5" />,
          isAvailable: true,
          processingTime: '2-5 minutes',
          fees: 'Standard mobile money fees'
        },
        {
          id: 'blockchain',
          type: 'blockchain',
          name: 'Digital Wallet',
          description: 'Pay using your connected digital wallet',
          icon: <CreditCard className="w-5 h-5" />,
          isAvailable: blockchainStatus.data?.blockchain?.isInitialized || false,
          processingTime: 'Instant',
          fees: 'Minimal network fees'
        }
      ];

      setAvailablePaymentMethods(methods);
      
      // Auto-select hybrid if available
      if (methods.find(m => m.id === 'hybrid')?.isAvailable) {
        setSelectedPaymentMethod('hybrid');
      } else if (methods.find(m => m.id === 'mobile_money')?.isAvailable) {
        setSelectedPaymentMethod('mobile_money');
      }
    } catch (error) {
      console.error('Failed to initialize payment methods:', error);
      // Fallback to mobile money only
      setAvailablePaymentMethods([
        {
          id: 'mobile_money',
          type: 'mobile_money',
          name: 'Mobile Money',
          description: 'Pay using MTN, Airtel, or Zamtel mobile money',
          icon: <Smartphone className="w-5 h-5" />,
          isAvailable: true,
          processingTime: '2-5 minutes',
          fees: 'Standard mobile money fees'
        }
      ]);
      setSelectedPaymentMethod('mobile_money');
    }
  };

  const handlePayment = async () => {
    if (!phoneNumber && selectedPaymentMethod !== 'blockchain') {
      toast.error('Please enter your phone number');
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Initiating payment...');

    try {
      let result;
      
      if (selectedPaymentMethod === 'hybrid') {
        setProcessingStep('Analyzing payment options...');
        
        // Use hybrid payment endpoint
        result = await apiService.executeHybridTrade({
          offerId: offer.id,
          buyerId: 'current-user-id', // This should come from auth context
          phoneNumber,
          paymentMethod: 'hybrid'
        });
      } else if (selectedPaymentMethod === 'mobile_money') {
        setProcessingStep('Processing mobile money payment...');
        
        // Use mobile money endpoint
        result = await apiService.executeMobileMoneyTrade({
          offerId: offer.id,
          buyerPhone: phoneNumber,
          mobileMoneyReference: `MM-${Date.now()}`
        });
      } else {
        setProcessingStep('Processing blockchain payment...');
        
        // Use blockchain endpoint
        result = await apiService.executeBlockchainTrade({
          offerId: offer.id,
          buyerAddress: 'current-user-wallet' // This should come from auth context
        });
      }

      if (result.data?.success) {
        setProcessingStep('Payment completed successfully!');
        
        // Show success message
        toast.success(`Payment completed using ${result.data.data.paymentMethod || selectedPaymentMethod}!`);
        
        // Call success callback
        onSuccess(
          result.data.data.transactionId || result.data.data.tradeId,
          result.data.data.paymentMethod || selectedPaymentMethod
        );
        
        // Close modal after delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error(result.data?.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const getPaymentMethodInfo = (methodId: string) => {
    return availablePaymentMethods.find(m => m.id === methodId);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW'
    }).format(amount);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Complete Your Purchase
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {offer.energyAmount} kWh for {formatCurrency(offer.totalPrice)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Offer Summary */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Energy Amount:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {offer.energyAmount} kWh
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Price per kWh:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                {formatCurrency(offer.pricePerKwh)}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Price:</span>
              <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                {formatCurrency(offer.totalPrice)}
              </span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Trade Type:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white capitalize">
                {offer.tradeType.replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Choose Payment Method
          </h3>
          
          <div className="space-y-3">
            {availablePaymentMethods.map((method) => (
              <label
                key={method.id}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedPaymentMethod === method.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                } ${!method.isAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={selectedPaymentMethod === method.id}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  disabled={!method.isAvailable}
                  className="mr-3 text-blue-600 focus:ring-blue-500"
                />
                
                <div className="flex items-center space-x-3">
                  <div className="text-blue-600 dark:text-blue-400">
                    {method.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {method.name}
                      {method.id === 'hybrid' && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {method.description}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Processing: {method.processingTime} • Fees: {method.fees}
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Payment Details */}
        {selectedPaymentMethod !== 'blockchain' && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Payment Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+260XXXXXXXXX"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  We'll send payment instructions to this number
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Secure Payment Processing</p>
              <p>
                Your payment is processed securely using industry-standard encryption. 
                {selectedPaymentMethod === 'hybrid' && ' We automatically select the most secure and cost-effective payment method for you.'}
              </p>
            </div>
          </div>
        </div>

        {/* Processing State */}
        {isProcessing && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-spin" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium">{processingStep}</p>
                <p>Please don't close this window...</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            onClick={handlePayment}
            disabled={isProcessing || (selectedPaymentMethod !== 'blockchain' && !phoneNumber)}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Complete Payment</span>
              </>
            )}
          </button>
        </div>

        {/* Additional Information */}
        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>
            By completing this payment, you agree to our terms of service and privacy policy.
          </p>
          {selectedPaymentMethod === 'hybrid' && (
            <p className="mt-1">
              Smart Payment automatically selects the best option based on your preferences and availability.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HybridPaymentModal; 