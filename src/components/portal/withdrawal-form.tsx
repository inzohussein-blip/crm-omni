'use client';

/**
 * OMNI-CRM Withdrawal Form
 * Form for clients to request withdrawals with multiple payout methods
 */

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  Shield,
  Clock,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface WalletData {
  id: string;
  walletType: string;
  currency: string;
  balance: number;
  frozenBalance: number;
  status: string;
}

interface WithdrawalFormProps {
  userId: string;
  wallets: WalletData[];
  onSuccess?: () => void;
}

// ============================================
// WITHDRAWAL METHODS CONFIG
// ============================================

const WITHDRAWAL_METHODS = [
  {
    id: 'crypto',
    name: 'Cryptocurrency',
    icon: Bitcoin,
    currencies: ['BTC', 'ETH', 'USDT', 'USDC'],
    fee: 0,
    feeType: 'free',
    processingTime: '10-30 minutes',
    minWithdrawal: 20,
    maxWithdrawal: 100000,
    requiresAddress: true,
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    icon: Building2,
    currencies: ['USD', 'EUR', 'GBP'],
    fee: 25,
    feeType: 'fixed',
    processingTime: '3-5 business days',
    minWithdrawal: 100,
    maxWithdrawal: 500000,
    requiresBankDetails: true,
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    icon: CreditCard,
    currencies: ['USD', 'EUR', 'GBP'],
    fee: 1.5,
    feeType: 'percentage',
    processingTime: '1-3 business days',
    minWithdrawal: 50,
    maxWithdrawal: 10000,
    requiresCardDetails: true,
  },
  {
    id: 'skrill',
    name: 'Skrill',
    icon: Wallet,
    currencies: ['USD', 'EUR', 'GBP'],
    fee: 1,
    feeType: 'percentage',
    processingTime: 'Instant',
    minWithdrawal: 20,
    maxWithdrawal: 25000,
    requiresEmail: true,
  },
  {
    id: 'neteller',
    name: 'Neteller',
    icon: Wallet,
    currencies: ['USD', 'EUR', 'GBP'],
    fee: 1,
    feeType: 'percentage',
    processingTime: 'Instant',
    minWithdrawal: 20,
    maxWithdrawal: 25000,
    requiresEmail: true,
  },
];

// ============================================
// MAIN COMPONENT
// ============================================

export function WithdrawalForm({ userId, wallets, onSuccess }: WithdrawalFormProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [destinationAddress, setDestinationAddress] = useState<string>('');
  const [bankDetails, setBankDetails] = useState({
    accountName: '',
    accountNumber: '',
    bankName: '',
    swiftCode: '',
    iban: '',
  });
  const [accountEmail, setAccountEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const method = WITHDRAWAL_METHODS.find((m) => m.id === selectedMethod);
  const wallet = wallets.find((w) => w.id === selectedWallet);

  const availableBalance = wallet ? wallet.balance - wallet.frozenBalance : 0;

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
    if (numAmount < method.minWithdrawal) return `Minimum withdrawal is ${method.minWithdrawal} ${selectedCurrency}`;
    if (numAmount > method.maxWithdrawal) return `Maximum withdrawal is ${method.maxWithdrawal} ${selectedCurrency}`;
    if (numAmount > availableBalance) return 'Insufficient balance';
    return null;
  };

  const validateDestination = () => {
    if (!method) return 'Select a withdrawal method';
    
    if (method.requiresAddress && !destinationAddress) {
      return 'Please enter your wallet address';
    }
    if (method.requiresBankDetails) {
      if (!bankDetails.accountName || !bankDetails.accountNumber || !bankDetails.bankName) {
        return 'Please fill in all bank details';
      }
    }
    if (method.requiresEmail && !accountEmail) {
      return 'Please enter your account email';
    }
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

    const destError = validateDestination();
    if (destError) {
      setError(destError);
      return;
    }

    if (!selectedMethod || !selectedCurrency || !selectedWallet || !amount) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const withdrawalData: Record<string, unknown> = {
        action: 'withdraw',
        userId,
        walletId: selectedWallet,
        paymentMethod: selectedMethod,
        currency: selectedCurrency,
        amount: parseFloat(amount),
      };

      if (method?.requiresAddress) {
        withdrawalData.cryptoAddress = destinationAddress;
      }
      if (method?.requiresBankDetails) {
        withdrawalData.bankDetails = bankDetails;
      }
      if (method?.requiresEmail) {
        withdrawalData.accountEmail = accountEmail;
      }

      const response = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withdrawalData),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      } else {
        setError(data.error || 'Failed to process withdrawal');
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
        <h3 className="text-lg font-semibold">Withdrawal Request Submitted!</h3>
        <p className="text-sm text-muted-foreground text-center mt-2">
          Your withdrawal request has been submitted and is pending review. You will be notified once processed.
        </p>
      </div>
    );
  }

  const availableCurrencies = method?.currencies || [];
  const fee = calculateFee();
  const netAmount = amount ? parseFloat(amount) - fee : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Security Notice */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
        <Shield className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          Withdrawals are subject to review and may take up to 24 hours to process. 
          Please ensure all your KYC documents are approved.
        </p>
      </div>

      {/* Wallet Selection */}
      <div className="space-y-3">
        <Label>Withdraw From</Label>
        <Select value={selectedWallet} onValueChange={(val) => {
          setSelectedWallet(val);
          const w = wallets.find(w => w.id === val);
          if (w) setSelectedCurrency(w.currency);
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Select wallet" />
          </SelectTrigger>
          <SelectContent>
            {wallets
              .filter((w) => w.status === 'ACTIVE' && w.balance > 0)
              .map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{w.walletType === 'INTERNAL' ? 'Main Wallet' : w.walletType}</span>
                    <Badge variant="outline" className="ml-2">
                      {w.currency} {w.balance.toLocaleString()}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        {wallet && (
          <p className="text-xs text-muted-foreground">
            Available: {wallet.currency} {availableBalance.toLocaleString()}
            {wallet.frozenBalance > 0 && (
              <span className="text-amber-600 ml-2">
                ({wallet.frozenBalance.toLocaleString()} frozen)
              </span>
            )}
          </p>
        )}
      </div>

      {/* Payment Method Selection */}
      {selectedWallet && (
        <div className="space-y-3">
          <Label>Withdrawal Method</Label>
          <div className="grid grid-cols-2 gap-2">
            {WITHDRAWAL_METHODS.filter((m) => m.currencies.includes(selectedCurrency)).map((pm) => {
              const Icon = pm.icon;
              return (
                <Card
                  key={pm.id}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50',
                    selectedMethod === pm.id ? 'border-primary bg-primary/5' : ''
                  )}
                  onClick={() => setSelectedMethod(pm.id)}
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
      )}

      {/* Amount Input */}
      {selectedMethod && method && (
        <div className="space-y-3">
          <Label>Amount</Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              placeholder={`Min: ${method.minWithdrawal} - Max: ${method.maxWithdrawal}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-10"
              min={method.minWithdrawal}
              max={Math.min(method.maxWithdrawal, availableBalance)}
              step="0.01"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              <Clock className="h-3 w-3 inline mr-1" />
              Processing: {method.processingTime}
            </span>
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setAmount(availableBalance.toString())}
            >
              Withdraw All
            </button>
          </div>
        </div>
      )}

      {/* Destination Details */}
      {amount && method && (
        <>
          {/* Crypto Address */}
          {method.requiresAddress && (
            <div className="space-y-3">
              <Label>Wallet Address</Label>
              <Input
                placeholder="Enter your wallet address"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Please double-check the address. Transactions cannot be reversed.
              </p>
            </div>
          )}

          {/* Bank Details */}
          {method.requiresBankDetails && (
            <div className="space-y-4">
              <Label>Bank Details</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Input
                    placeholder="Account Holder Name"
                    value={bankDetails.accountName}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                  />
                </div>
                <Input
                  placeholder="Account Number"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                />
                <Input
                  placeholder="Bank Name"
                  value={bankDetails.bankName}
                  onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                />
                <Input
                  placeholder="SWIFT/BIC Code"
                  value={bankDetails.swiftCode}
                  onChange={(e) => setBankDetails({ ...bankDetails, swiftCode: e.target.value })}
                />
                <Input
                  placeholder="IBAN (optional)"
                  value={bankDetails.iban}
                  onChange={(e) => setBankDetails({ ...bankDetails, iban: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* E-wallet Email */}
          {method.requiresEmail && (
            <div className="space-y-3">
              <Label>Account Email</Label>
              <Input
                type="email"
                placeholder="Enter your Skrill/Neteller email"
                value={accountEmail}
                onChange={(e) => setAccountEmail(e.target.value)}
              />
            </div>
          )}

          {/* Fee Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Withdrawal Amount</span>
                <span>{selectedCurrency} {parseFloat(amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Processing Fee</span>
                <span className="text-red-600">-{selectedCurrency} {fee.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-medium">
                <span>You Receive</span>
                <span className="text-green-600">{selectedCurrency} {netAmount.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
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
        disabled={!selectedMethod || !selectedWallet || !amount || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            Submit Withdrawal Request
            <ArrowRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </form>
  );
}

export default WithdrawalForm;
