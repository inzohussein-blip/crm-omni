'use client';

/**
 * OMNI-CRM KYC Document Upload
 * Form for clients to upload KYC verification documents
 */

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Eye,
  Trash2,
  Shield,
  Camera,
  CreditCard,
  Building2,
  User,
  Info,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  preview?: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress: number;
}

interface KYCUploadProps {
  userId: string;
  kycLevel: number;
  onSuccess?: () => void;
}

// ============================================
// DOCUMENT TYPES CONFIG
// ============================================

const DOCUMENT_TYPES = [
  {
    id: 'PASSPORT',
    name: 'Passport',
    icon: CreditCard,
    description: 'Government-issued passport',
    required: true,
    level: 2,
    sides: ['front'],
    requiresSelfie: true,
  },
  {
    id: 'NATIONAL_ID',
    name: 'National ID',
    icon: CreditCard,
    description: 'National identity card',
    required: true,
    level: 2,
    sides: ['front', 'back'],
    requiresSelfie: true,
  },
  {
    id: 'DRIVERS_LICENSE',
    name: "Driver's License",
    icon: CreditCard,
    description: 'Valid driver\'s license',
    required: false,
    level: 2,
    sides: ['front', 'back'],
    requiresSelfie: true,
  },
  {
    id: 'UTILITY_BILL',
    name: 'Utility Bill',
    icon: Building2,
    description: 'Recent utility bill (within 3 months)',
    required: true,
    level: 3,
    sides: ['front'],
    requiresSelfie: false,
  },
  {
    id: 'BANK_STATEMENT',
    name: 'Bank Statement',
    icon: Building2,
    description: 'Recent bank statement (within 3 months)',
    required: false,
    level: 3,
    sides: ['front'],
    requiresSelfie: false,
  },
  {
    id: 'SELFIE',
    name: 'Selfie Verification',
    icon: Camera,
    description: 'Selfie with your ID document',
    required: true,
    level: 2,
    sides: ['front'],
    requiresSelfie: false,
  },
];

// ============================================
// MAIN COMPONENT
// ============================================

export function KYCUpload({ userId, kycLevel, onSuccess }: KYCUploadProps) {
  const [selectedDocType, setSelectedDocType] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>('');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedDoc = DOCUMENT_TYPES.find((d) => d.id === selectedDocType);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'pending',
      progress: 0,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);

    // Simulate upload progress
    newFiles.forEach((file) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        setUploadedFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? { ...f, progress, status: progress === 100 ? 'uploaded' : 'uploading' }
              : f
          )
        );
        if (progress >= 100) {
          clearInterval(interval);
        }
      }, 200);
    });
  }, []);

  const removeFile = (fileId: string) => {
    setUploadedFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  const validateForm = () => {
    if (!selectedDocType) return 'Please select a document type';
    
    if (selectedDoc?.sides && uploadedFiles.length < selectedDoc.sides.length) {
      return `Please upload ${selectedDoc.sides.length} file(s) (${selectedDoc.sides.join(' and ')})`;
    }

    const pendingFiles = uploadedFiles.filter((f) => f.status !== 'uploaded');
    if (pendingFiles.length > 0) {
      return 'Please wait for all files to finish uploading';
    }

    // Check file sizes (max 10MB each)
    const oversizedFiles = uploadedFiles.filter((f) => f.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      return 'Some files exceed the 10MB limit';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'kyc_upload',
          userId,
          documentType: selectedDocType,
          documentNumber: documentNumber || null,
          issueDate: issueDate || null,
          expiryDate: expiryDate || null,
          files: uploadedFiles.map((f) => ({
            name: f.name,
            type: f.type,
            size: f.size,
          })),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
        }, 1500);
      } else {
        setError(data.error || 'Failed to submit documents');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold">Documents Submitted!</h3>
        <p className="text-sm text-muted-foreground text-center mt-2">
          Your documents have been submitted for verification. This typically takes 1-2 business days.
        </p>
      </div>
    );
  }

  // Filter documents based on current KYC level
  const availableDocs = DOCUMENT_TYPES.filter((d) => d.level > kycLevel || d.level === kycLevel + 1);

  return (
    <div className="space-y-6">
      {/* KYC Level Info */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-violet-100 dark:bg-violet-900/30">
              <Shield className="h-6 w-6 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Current KYC Level: {kycLevel}</p>
              <p className="text-sm text-muted-foreground">
                {kycLevel === 0 && 'Complete basic verification to unlock deposits and withdrawals'}
                {kycLevel === 1 && 'Upload ID documents to increase limits'}
                {kycLevel === 2 && 'Add proof of address for full verification'}
                {kycLevel === 3 && 'Your account is fully verified'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Document Type Selection */}
        <div className="space-y-3">
          <Label>Select Document Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {availableDocs.map((doc) => {
              const Icon = doc.icon;
              return (
                <Card
                  key={doc.id}
                  className={cn(
                    'cursor-pointer transition-all hover:border-primary/50',
                    selectedDocType === doc.id ? 'border-primary bg-primary/5' : ''
                  )}
                  onClick={() => {
                    setSelectedDocType(doc.id);
                    setUploadedFiles([]);
                  }}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn(
                      'p-2 rounded-lg',
                      selectedDocType === doc.id ? 'bg-primary/10' : 'bg-muted'
                    )}>
                      <Icon className={cn(
                        'h-4 w-4',
                        selectedDocType === doc.id ? 'text-primary' : 'text-muted-foreground'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{doc.description}</p>
                    </div>
                    {doc.required && (
                      <Badge variant="outline" className="text-xs">Required</Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Document Details */}
        {selectedDoc && (
          <>
            {/* Document Number */}
            {!['SELFIE', 'UTILITY_BILL', 'BANK_STATEMENT'].includes(selectedDoc.id) && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Document Number</Label>
                  <Input
                    placeholder="e.g., AB1234567"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Issue Date</Label>
                  <Input
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Expiry Date</Label>
                  <Input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* File Upload */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Upload {selectedDoc.sides?.join(' & ') || 'Document'}</Label>
                <span className="text-xs text-muted-foreground">
                  Max 10MB per file • JPG, PNG, PDF
                </span>
              </div>

              {/* Upload Area */}
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept="image/jpeg,image/png,application/pdf"
                  multiple
                  onChange={handleFileSelect}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-2">
                    <div className="p-4 rounded-full bg-muted">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedDoc.sides?.length === 2
                        ? 'Upload both front and back of your document'
                        : 'Upload your document'}
                    </p>
                  </div>
                </label>
              </div>

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      {file.preview ? (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{formatFileSize(file.size)}</span>
                          {file.status === 'uploading' && (
                            <>
                              <span>•</span>
                              <Progress value={file.progress} className="h-1 w-20" />
                            </>
                          )}
                          {file.status === 'uploaded' && (
                            <>
                              <span>•</span>
                              <span className="text-green-600">Uploaded</span>
                            </>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(file.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Selfie Instructions */}
              {selectedDoc.requiresSelfie && selectedDoc.id !== 'SELFIE' && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <p>
                    After uploading your ID, you'll also need to upload a selfie holding the same document.
                    Select "Selfie Verification" from the document type menu.
                  </p>
                </div>
              )}
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
          disabled={!selectedDocType || uploadedFiles.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Submit Documents
            </>
          )}
        </Button>
      </form>

      {/* Document Requirements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Document Requirements</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              Document must be valid and not expired
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              All information must be clearly visible
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              No cropped or edited images
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              Utility bills must be within the last 3 months
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              Name on document must match your profile
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default KYCUpload;
