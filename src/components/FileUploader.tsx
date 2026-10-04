import React, { useRef, useState } from 'react';
import { DocumentSlot, UploadedDocMetadata } from '../lib/types';
import { MAX_FILE_SIZE, validateDocumentFile } from '../lib/validation';
import { StatusBadge } from './StatusBadge';
import { FileText, Upload, AlertCircle, X } from 'lucide-react';

interface FileUploaderProps {
  slot: DocumentSlot;
  title: string;
  doc?: UploadedDocMetadata;
  onUpload: (slot: DocumentSlot, fileMeta: UploadedDocMetadata) => void;
  onRemove: (slot: DocumentSlot) => void;
  disabled?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  slot,
  title,
  doc,
  onUpload,
  onRemove,
  disabled = false
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState('');
  const [uploadingFileSize, setUploadingFileSize] = useState(0);

  const handleFileProcess = (file: File) => {
    setErrorMsg(null);

    const validationError = validateDocumentFile(file);
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setUploadingFileName(file.name);
    setUploadingFileSize(file.size);

    const reader = new FileReader();

    // Simulate steady progress for UI feedback matching the screenshot
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 25;
      });
    }, 120);

    reader.onload = (e) => {
      clearInterval(interval);
      setUploadProgress(100);

      setTimeout(() => {
        const dataUrl = e.target?.result as string;
        const uploadedMeta: UploadedDocMetadata = {
          slot,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/pdf',
          dataUrl,
          uploadedAt: new Date().toISOString()
        };
        setIsUploading(false);
        setUploadProgress(0);
        onUpload(slot, uploadedMeta);
      }, 300);
    };

    reader.onerror = () => {
      clearInterval(interval);
      setIsUploading(false);
      setErrorMsg('Failed to read file from your device. Please try again.');
    };

    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const formatMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1) + ' MB';

  return (
    <div className="bg-white border border-[#E4E0D8] rounded-[6px] p-6 mb-4">
      {/* Header Row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-base text-[#1F1D1A]">{title}</h3>
          <p className="text-xs text-[#6B665E]">PDF, JPG, PNG, up to 5 MB</p>
        </div>
        {doc ? (
          <StatusBadge status="Uploaded" />
        ) : isUploading ? (
          <StatusBadge status="Uploading" />
        ) : errorMsg ? (
          <StatusBadge status="Needs correction" />
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
        className="hidden"
        disabled={disabled || isUploading}
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileProcess(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      {/* State 1: Uploaded File row */}
      {doc && !isUploading && (
        <div className="bg-[#FAF8F4] border border-[#E4E0D8] rounded-[6px] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white border border-[#E4E0D8] rounded flex items-center justify-center text-[#B5532C]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#1F1D1A] truncate max-w-xs sm:max-w-md">
                {doc.fileName}
              </p>
              <p className="text-xs text-[#6B665E]">
                {formatMb(doc.fileSize)} • Verified format
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRemove(slot)}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B665E] hover:text-[#B3362E] px-2.5 py-1.5 rounded hover:bg-[#F2EFE9] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>Remove</span>
          </button>
        </div>
      )}

      {/* State 2: Uploading Progress Bar */}
      {isUploading && (
        <div className="bg-[#FAF8F4] border border-[#E4E0D8] rounded-[6px] p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#B5532C] animate-pulse" />
              <span className="text-xs font-medium text-[#1F1D1A] truncate max-w-xs">
                Uploading {uploadingFileName}
              </span>
            </div>
            <span className="text-xs text-[#6B665E]">
              {uploadProgress}% • {formatMb((uploadingFileSize * uploadProgress) / 100)} of {formatMb(uploadingFileSize)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-[#E4E0D8] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#B5532C] transition-all duration-150 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* State 3: Error Message box */}
      {errorMsg && !isUploading && !doc && (
        <div className="bg-[#FDF6E7] border border-[#F2D79A] rounded-[6px] p-6 text-center mb-3">
          <div className="w-10 h-10 bg-[#B3362E] text-white rounded-[6px] mx-auto flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-[#B3362E] mb-1">{errorMsg}</p>
          <p className="text-xs text-[#6B665E] mb-4">Ensure your export resolution is under 300 DPI for faster evaluation.</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E4E0D8] hover:border-[#1F1D1A] text-sm font-medium text-[#1F1D1A] rounded-[6px] transition-colors cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Choose file</span>
          </button>
        </div>
      )}

      {/* State 4: Default Upload prompt */}
      {!doc && !isUploading && !errorMsg && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed ${
            dragOver ? 'border-[#B5532C] bg-[#FAF8F4]' : 'border-[#E4E0D8] bg-[#FAF8F4]/50'
          } rounded-[6px] p-8 text-center cursor-pointer hover:border-[#B5532C] hover:bg-[#FAF8F4] transition-all`}
        >
          <div className="w-10 h-10 rounded-full bg-white border border-[#E4E0D8] text-[#6B665E] mx-auto flex items-center justify-center mb-3">
            <Upload className="w-5 h-5 text-[#B5532C]" />
          </div>
          <p className="text-sm font-medium text-[#1F1D1A]">
            <span className="underline underline-offset-2">Choose a file</span> or drag here
          </p>
          <p className="text-xs text-[#6B665E] mt-1">Accepted formats: PDF, JPG, PNG (up to 5 MB)</p>
        </div>
      )}
    </div>
  );
};
