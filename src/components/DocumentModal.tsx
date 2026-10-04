import React from 'react';
import { UploadedDocMetadata } from '../lib/types';
import { X, FileText, Download } from 'lucide-react';

interface DocumentModalProps {
  docMeta: UploadedDocMetadata | null;
  onClose: () => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({ docMeta, onClose }) => {
  if (!docMeta) return null;

  const isPdf = docMeta.fileType === 'application/pdf' || docMeta.fileName.toLowerCase().endsWith('.pdf');

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[6px] border border-[#E4E0D8] w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E4E0D8]">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#B5532C]" />
            <span className="font-semibold text-[#1F1D1A] truncate max-w-md">
              {docMeta.fileName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {docMeta.dataUrl && (
              <a
                href={docMeta.dataUrl}
                download={docMeta.fileName}
                className="p-1.5 text-[#6B665E] hover:text-[#1F1D1A] rounded hover:bg-[#F2EFE9] transition-colors"
                title="Download file"
              >
                <Download className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              type="button"
              className="p-1.5 text-[#6B665E] hover:text-[#1F1D1A] rounded hover:bg-[#F2EFE9] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-[#FAF8F4]">
          {docMeta.dataUrl ? (
            isPdf ? (
              <iframe
                src={docMeta.dataUrl}
                title={docMeta.fileName}
                className="w-full h-[65vh] border border-[#E4E0D8] rounded bg-white"
              />
            ) : (
              <img
                src={docMeta.dataUrl}
                alt={docMeta.fileName}
                className="max-w-full max-h-[65vh] object-contain rounded border border-[#E4E0D8]"
              />
            )
          ) : (
            <div className="text-center py-12 text-[#6B665E]">
              <FileText className="w-12 h-12 mx-auto mb-3 text-[#A8A39D]" />
              <p className="text-sm">File preview is not available in demo mode</p>
              <p className="text-xs text-[#A8A39D] mt-1">{docMeta.fileName} ({(docMeta.fileSize / 1024 / 1024).toFixed(1)} MB)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
