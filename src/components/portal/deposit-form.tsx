'use client';

/**
 * OMNI-CRM Deposit Form
 * Form for clients to request deposits with multiple payment methods
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wallet,
  CreditCard,
  Building2,
  Bitcoin,
  Loader2,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  DollarSign,
  Info,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface WalletData {
  id: string;
  walletType: string;
  currency: string;
  balance: number;
  status: string;
}

interface DepositFormProps {
  userId: string;
  wallets: WalletData[];
  onSuccess?: () => void;
}

// ============================================
// PAYMENT METHODS CONFIG
// ============================================

const PAYMENT_METHODS = [
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    icon: Bitcoin,
    currencies: ['BTC', 'ETH', 'USDT', 'USDC'],
    fee: 0,
    feeType: 'free',
    processingTime: '10-30 minutes',
    minDeposit: 10,
    maxDeposit: 100000,
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    icon: Building2,
    currencies: ['USD', 'EUR', 'GBP'],
    fee: 0,
    feeType: 'free',
    processingTime: '1-3 business days',
    minDeposit: 100,
    maxDeposit: 500000,
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    icon: CreditCard,
    currencies: ['USD', 'EUR', 'GBP'],
    fee: 2.5,
    feeType: 'percentage',
    processingTime: 'Instant',
    minDeposit: 50,
    maxDeposit: 50000,
  },
  {
    id: 'skrill',
    name: 'Skrill',
    icon: Wallet,
    currencies: ['USD', 'EUR', 'GBP'],
    fee: 1,
    feeType: 'percentage',
    processingTime: 'Instant',
    minDeposit: 20,
    maxDeposit: 25000,
  },
  {
    id: 'neteller',
    name: 'Neteller',
    icon: Wallet,
    currencies: ['USD', 'EUR', 'GBP'],
    fee: 1,
    feeType: 'percentage',
    processingTime: 'Instant',
    minDeposit: 20,
    maxDeposit: 25000,
  },
];

// ============================================
// MAIN COMPONENT
// ============================================

export function DepositForm({ userId, wallets, onSuccess }: DepositFormProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const method = PAYMENT_METHODS.find((m) => m.id === selectedMethod);
  const wallet = wallets.find((w) => w.id === selectedWallet);

  const calculateFee = () => {
    if (!method || !amount) return 0;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return 0;
    if (method.feeType === 'percentage') {
      return (numAmount * method.fee) / 100;
    }
    return method.fee;
  };

  const validateAmount = () => {
    if (!method || !amount) return null;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return 'Please enter a valid amount';
    if (numAmount < method.minDeposit) return `Minimum deposit is ${method.minDeposit} ${selectedCurrency}`;
    if (numAmount > method.maxDeposit) return `Maximum deposit is ${method.maxDeposit} ${selectedCurrency}`;
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateAmount();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!selectedMethod || !selectedCurrency || !selectedWallet || !amount) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deposit',
          userId,
          walletId: selectedWallet,
          paymentMethod: selectedMethod,
          currency: selectedCurrency,
          amount: parseFloat(amount),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      } else {
        setError(data.error || 'Failed to process deposit');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold">Deposit Request Submitted!</h3>
        <p className="text-sm text-muted-foreground text-center mt-2">
          Your deposit request has been submitted successfully. You will receive a confirmation once processed.
        </p>
      </div>
    );
  }

  const availableCurrencies = method?.currencies || [];
  const fee = calculateFee();
  const totalAmount = amount ? parseFloat(amount) + fee : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Method Selection */}
      <div className="space-y-3">
        <Label>Payment Method</Label>
        <div className="grid grid-cols-2 gap-2">
          {PAYMENT_METHODS.map((pm) => {
            const Icon = pm.icon;
            return (
              <Card
                key={pm.id}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/50',
                  selectedMethod === pm.id ? 'border-primary bg-primary/5' : ''
                )}
                onClick={() => {
                  setSelectedMethod(pm.id);
                  setSelectedCurrency('');
                }}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={cn(
                    'p-2 rounded-lg',
                    selectedMethod === pm.id ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    <Icon className={cn(
                      'h-4 w-4',
                      selectedMethod === pm.id ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pm.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {pm.fee === 0 ? 'Free' : `${pm.fee}${pm.feeType === 'percentage' ? '%' : ''} fee`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Currency Selection */}
      {selectedMethod && (
        <div className="space-y-3">
          <Label>Currency</Label>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {availableCurrencies.map((curr) => (
                <SelectItem key={curr} value={curr}>
                  {curr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Wallet Selection */}
      {selectedCurrency && (
        <div className="space-y-3">
          <Label>Deposit To</Label>
          <Select value={selectedWallet} onValueChange={setSelectedWallet}>
            <SelectTrigger>
              <SelectValue placeholder="Select wallet" />
            </SelectTrigger>
            <SelectContent>
              {wallets
                .filter((w) => w.currency === selectedCurrency || w.walletType === 'INTERNAL')
                .map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.walletType === 'INTERNAL' ? 'Main Wallet' : w.walletType} ({w.currency})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Amount Input */}
      {selectedWallet && method && (
        <>
          <div className="space-y-3">
            <Label>Amount</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                placeholder={`Min: ${method.minDeposit} - Max: ${method.maxDeposit}`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10"
                min={method.minDeposit}
                max={method.maxDeposit}
                step="0.01"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Processing time: {method.processingTime}
            </p>
          </div>

          {/* Fee Summary */}
          {amount && (
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Deposit Amount</span>
                  <span>{selectedCurrency} {parseFloat(amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing Fee</span>
                  <span>{selectedCurrency} {fee.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-medium">
                  <span>Total</span>
                  <span>{selectedCurrency} {totalAmount.toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Amount Buttons */}
          <div className="flex gap-2">
            {[100, 500, 1000, 5000].map((quickAmount) => (
              <Button
                key={quickAmount}
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setAmount(quickAmount.toString())}
              >
                {selectedCurrency} {quickAmount.toLocaleString()}
              </Button>
            ))}
          </div>
        </>
      )}

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={!selectedMethod || !selectedCurrency || !selectedWallet || !amount || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Continue to Deposit
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>

      {/* Info Notice */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Deposits are processed according to the payment method's processing time.
          You will receive a notification once your deposit is credited.
        </p>
      </div>
    </form>
  );
}

export default DepositForm;
