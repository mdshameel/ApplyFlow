import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { ApplyStepper } from '../components/ApplyStepper';
import { FileUploader } from '../components/FileUploader';
import { DocumentSlot, UploadedDocMetadata } from '../lib/types';
import { ArrowLeft, ArrowRight, Info, Download, Sparkles, FileText, Check } from 'lucide-react';

interface ApplyStep2DocumentsProps {
  documents: {
    id_proof?: UploadedDocMetadata;
    marksheet?: UploadedDocMetadata;
    income_certificate?: UploadedDocMetadata;
  };
  onSaveAndNext: (docs: any) => void;
  onBack: () => void;
  onSignOut: () => void;
  onGoToStaff?: () => void;
  currentUser?: any;
}

export const ApplyStep2Documents: React.FC<ApplyStep2DocumentsProps> = ({
  documents: initialDocs,
  onSaveAndNext,
  onBack,
  onSignOut,
  onGoToStaff,
  currentUser
}) => {
  const [docs, setDocs] = useState(initialDocs || {});
  const [sampleSets, setSampleSets] = useState<any | null>(null);
  const [loadingSetKey, setLoadingSetKey] = useState<string | null>(null);

  const isDemoApplicant = currentUser?.isDemo || currentUser?.uid?.startsWith('demo-applicant-');

  useEffect(() => {
    if (isDemoApplicant) {
      fetch('/api/demo/samples')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.sets) {
            setSampleSets(data.sets);
          }
        })
        .catch(console.error);
    }
  }, [isDemoApplicant]);

  const handleUpload = (slot: DocumentSlot, fileMeta: UploadedDocMetadata) => {
    setDocs((prev) => ({
      ...prev,
      [slot]: fileMeta
    }));
  };

  const handleRemove = (slot: DocumentSlot) => {
    setDocs((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  };

  const handleAutoLoadSet = (setKey: string) => {
    if (!sampleSets || !sampleSets[setKey]) return;
    setLoadingSetKey(setKey);
    const setObj = sampleSets[setKey];
    setDocs({
      id_proof: {
        slot: 'id_proof',
        fileName: setObj.files.id_proof.fileName,
        fileType: setObj.files.id_proof.fileType,
        fileSize: 15000,
        dataUrl: setObj.files.id_proof.dataUrl,
        uploadedAt: new Date().toISOString()
      },
      marksheet: {
        slot: 'marksheet',
        fileName: setObj.files.marksheet.fileName,
        fileType: setObj.files.marksheet.fileType,
        fileSize: 22000,
        dataUrl: setObj.files.marksheet.dataUrl,
        uploadedAt: new Date().toISOString()
      },
      income_certificate: {
        slot: 'income_certificate',
        fileName: setObj.files.income_certificate.fileName,
        fileType: setObj.files.income_certificate.fileType,
        fileSize: 18000,
        dataUrl: setObj.files.income_certificate.dataUrl,
        uploadedAt: new Date().toISOString()
      }
    });
    setTimeout(() => setLoadingSetKey(null), 300);
  };

  const allUploaded = Boolean(docs.id_proof && docs.marksheet && docs.income_certificate);

  return (
    <div className="min-h-screen bg-[#FAF8F4] flex flex-col">
      <Header
        onSignOut={onSignOut}
        userRole={currentUser?.role}
        userEmail={currentUser?.email}
        onNavigateToStaff={onGoToStaff}
      />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <ApplyStepper currentStep={2} />

        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-[#1F1D1A] tracking-tight mb-1">
            Your documents
          </h1>
          <p className="text-sm text-[#6B665E]">
            Upload clear photos or scans of your original documents. Accepted types: PDF, JPG, PNG, up to 5 MB per file.
          </p>
        </div>

        {/* Demo applicant test files section */}
        {isDemoApplicant && (
          <div className="mb-6 p-4 sm:p-5 bg-white border border-[#E4E0D8] rounded-[6px] shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#B5532C]" />
              <h2 className="text-sm font-semibold text-[#1F1D1A]">Need test files?</h2>
              <span className="text-[10px] bg-[#FFF1EB] text-[#B5532C] border border-[#B5532C]/20 px-1.5 py-0.5 rounded font-medium">Demo Evaluation</span>
            </div>
            <p className="text-xs text-[#6B665E] mb-4 leading-relaxed">
              Download fictional sample documents watermarked with "SAMPLE - FICTIONAL" to test verification scenarios, or click <strong>Load into form</strong> to populate the upload slots immediately:
            </p>

            <div className="space-y-3">
              {/* Set (a) Clean */}
              <div className="p-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-semibold text-[#1F1D1A] block mb-0.5">(a) Clean set (all details match)</span>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6B665E] mt-1">
                    <a href="/samples/sample_id_clean.pdf" download="sample_id_clean.pdf" className="inline-flex items-center gap-1 text-[#B5532C] hover:underline">
                      <Download className="w-3 h-3" /> ID card
                    </a>
                    <span>&bull;</span>
                    <a href="/samples/sample_marksheet_clean.pdf" download="sample_marksheet_clean.pdf" className="inline-flex items-center gap-1 text-[#B5532C] hover:underline">
                      <Download className="w-3 h-3" /> Marksheet
                    </a>
                    <span>&bull;</span>
                    <a href="/samples/sample_income_clean.pdf" download="sample_income_clean.pdf" className="inline-flex items-center gap-1 text-[#B5532C] hover:underline">
                      <Download className="w-3 h-3" /> Income cert
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAutoLoadSet('clean')}
                  className="px-3 py-1.5 bg-[#1F1D1A] hover:bg-[#35322D] text-white text-xs font-medium rounded-[4px] transition-colors cursor-pointer flex-shrink-0"
                >
                  {loadingSetKey === 'clean' ? 'Loaded!' : 'Load set (a)'}
                </button>
              </div>

              {/* Set (b) Wrong date of birth */}
              <div className="p-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-semibold text-[#1F1D1A] block mb-0.5">(b) Wrong date of birth (ID differs from form)</span>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6B665E] mt-1">
                    <a href="/samples/sample_id_wrong_dob.pdf" download="sample_id_wrong_dob.pdf" className="inline-flex items-center gap-1 text-[#B5532C] hover:underline">
                      <Download className="w-3 h-3" /> ID (Wrong DOB)
                    </a>
                    <span>&bull;</span>
                    <a href="/samples/sample_marksheet_clean.pdf" download="sample_marksheet_clean.pdf" className="inline-flex items-center gap-1 text-[#B5532C] hover:underline">
                      <Download className="w-3 h-3" /> Marksheet
                    </a>
                    <span>&bull;</span>
                    <a href="/samples/sample_income_clean.pdf" download="sample_income_clean.pdf" className="inline-flex items-center gap-1 text-[#B5532C] hover:underline">
                      <Download className="w-3 h-3" /> Income cert
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAutoLoadSet('wrong_dob')}
                  className="px-3 py-1.5 bg-white border border-[#D5D0C6] hover:border-[#1F1D1A] text-[#1F1D1A] text-xs font-medium rounded-[4px] transition-colors cursor-pointer flex-shrink-0"
                >
                  {loadingSetKey === 'wrong_dob' ? 'Loaded!' : 'Load set (b)'}
                </button>
              </div>

              {/* Set (c) Blurry / unreadable scan */}
              <div className="p-3 bg-[#FAF8F4] border border-[#E4E0D8] rounded-[6px] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs">
                  <span className="font-semibold text-[#1F1D1A] block mb-0.5">(c) Unreadable income certificate (blurry scan)</span>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6B665E] mt-1">
                    <a href="/samples/sample_id_clean.pdf" download="sample_id_clean.pdf" className="inline-flex items-center gap-1 text-[#B5532C] hover:underline">
                      <Download className="w-3 h-3" /> ID card
                    </a>
                    <span>&bull;</span>
                    <a href="/samples/sample_marksheet_clean.pdf" download="sample_marksheet_clean.pdf" className="inline-flex items-center gap-1 text-[#B5532C] hover:underline">
                      <Download className="w-3 h-3" /> Marksheet
                    </a>
                    <span>&bull;</span>
                    <a href="/samples/sample_income_blurry.pdf" download="sample_income_blurry.pdf" className="inline-flex items-center gap-1 text-[#B5532C] hover:underline">
                      <Download className="w-3 h-3" /> Blurry Income Scan
                    </a>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleAutoLoadSet('unreadable')}
                  className="px-3 py-1.5 bg-white border border-[#D5D0C6] hover:border-[#1F1D1A] text-[#1F1D1A] text-xs font-medium rounded-[4px] transition-colors cursor-pointer flex-shrink-0"
                >
                  {loadingSetKey === 'unreadable' ? 'Loaded!' : 'Load set (c)'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3 Upload slots */}
        <div className="space-y-4 mb-6">
          <FileUploader
            slot="id_proof"
            title="ID proof"
            doc={docs.id_proof}
            onUpload={handleUpload}
            onRemove={handleRemove}
          />

          <FileUploader
            slot="marksheet"
            title="Marksheet"
            doc={docs.marksheet}
            onUpload={handleUpload}
            onRemove={handleRemove}
          />

          <FileUploader
            slot="income_certificate"
            title="Income certificate"
            doc={docs.income_certificate}
            onUpload={handleUpload}
            onRemove={handleRemove}
          />
        </div>

        {/* Info callout */}
        <div className="bg-white border border-[#E4E0D8] rounded-[6px] p-4 flex items-center gap-2.5 text-xs text-[#6B665E] mb-6">
          <Info className="w-4 h-4 text-[#6B665E] flex-shrink-0" />
          <span>Continue stays disabled until all three documents are uploaded and verified.</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#E4E0D8] hover:border-[#1F1D1A] text-sm font-medium text-[#1F1D1A] rounded-[6px] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          <button
            type="button"
            disabled={!allUploaded}
            onClick={() => onSaveAndNext(docs)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#1F1D1A] hover:bg-[#35322D] active:bg-black text-white text-sm font-medium rounded-[6px] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>
    </div>
  );
};

