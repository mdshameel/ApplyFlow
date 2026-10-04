import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';

export interface SampleDocSet {
  id: string;
  name: string;
  description: string;
  files: {
    id_proof: { fileName: string; fileType: string; dataUrl: string; downloadUrl: string };
    marksheet: { fileName: string; fileType: string; dataUrl: string; downloadUrl: string };
    income_certificate: { fileName: string; fileType: string; dataUrl: string; downloadUrl: string };
  };
}

let cachedSampleSets: Record<string, SampleDocSet> | null = null;

const SAMPLES_DIR = path.resolve(process.cwd(), 'public', 'samples');

function ensureSamplesDir() {
  if (!fs.existsSync(SAMPLES_DIR)) {
    fs.mkdirSync(SAMPLES_DIR, { recursive: true });
  }
}

/**
 * Draw a clean background watermark: "SAMPLE - FICTIONAL"
 */
function drawWatermark(page: any, font: any, text = 'SAMPLE - FICTIONAL') {
  const { width, height } = page.getSize();
  page.drawText(text, {
    x: width * 0.15,
    y: height * 0.45,
    size: 38,
    font,
    color: rgb(0.88, 0.88, 0.88),
    rotate: degrees(28)
  });
}

/**
 * Generate (a) Clean ID Card
 */
async function generateIdCard(dob = '15-05-2004', filename = 'sample_id_clean.pdf'): Promise<{ dataUrl: string; buffer: Buffer }> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([520, 320]);

  // Card Border
  page.drawRectangle({
    x: 15,
    y: 15,
    width: 490,
    height: 290,
    borderWidth: 2,
    borderColor: rgb(0.12, 0.11, 0.10),
    color: rgb(0.99, 0.99, 0.98)
  });

  // Top header banner
  page.drawRectangle({
    x: 15,
    y: 250,
    width: 490,
    height: 55,
    color: rgb(0.71, 0.33, 0.17) // Theme Rust #B5532C
  });

  page.drawText('GOVERNMENT OF KARNATAKA - HIGHER EDUCATION COUNCIL', {
    x: 35,
    y: 284,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1)
  });
  page.drawText('STUDENT IDENTIFICATION CARD (FICTIONAL DEMO)', {
    x: 35,
    y: 264,
    size: 14,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  drawWatermark(page, fontBold);

  // Photo placeholder box
  page.drawRectangle({
    x: 35,
    y: 110,
    width: 90,
    height: 110,
    borderWidth: 1,
    borderColor: rgb(0.7, 0.7, 0.7),
    color: rgb(0.94, 0.94, 0.94)
  });
  page.drawText('PHOTO', { x: 58, y: 160, size: 10, font: fontBold, color: rgb(0.5, 0.5, 0.5) });

  // Details
  const startX = 145;
  let currY = 210;
  const lineSpacing = 22;

  const fields = [
    { label: 'Card Number:', value: 'STU-2024-0000' },
    { label: 'Full Name:', value: 'Aarav Kumar Sharma' },
    { label: 'Date of Birth:', value: dob },
    { label: 'Course:', value: 'B.Tech Computer Science and Engineering' },
    { label: 'Institution:', value: 'State Institute of Engineering & Technology' },
    { label: 'Validity:', value: '2024 - 2028 (Academic)' }
  ];

  for (const f of fields) {
    page.drawText(f.label, { x: startX, y: currY, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(f.value, { x: startX + 90, y: currY, size: 10, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    currY -= lineSpacing;
  }

  // Footer bar
  page.drawText('Authorized Signatory: Directorate of Collegiate Education', {
    x: 35,
    y: 35,
    size: 9,
    font: fontRegular,
    color: rgb(0.4, 0.4, 0.4)
  });
  page.drawText('SAMPLE FICTIONAL ID - FOR EVALUATION ONLY', {
    x: 270,
    y: 35,
    size: 9,
    font: fontBold,
    color: rgb(0.71, 0.33, 0.17)
  });

  const bytes = await doc.save();
  const buffer = Buffer.from(bytes);
  ensureSamplesDir();
  fs.writeFileSync(path.join(SAMPLES_DIR, filename), buffer);

  const base64 = buffer.toString('base64');
  return { dataUrl: `data:application/pdf;base64,${base64}`, buffer };
}

/**
 * Generate (a) Clean Marksheet
 */
async function generateMarksheet(filename = 'sample_marksheet_clean.pdf'): Promise<{ dataUrl: string; buffer: Buffer }> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([540, 720]);

  // Page Border
  page.drawRectangle({
    x: 20,
    y: 20,
    width: 500,
    height: 680,
    borderWidth: 2,
    borderColor: rgb(0.15, 0.15, 0.15),
    color: rgb(1, 1, 1)
  });

  drawWatermark(page, fontBold);

  // Header
  page.drawText('STATE HIGHER SECONDARY EXAMINATION BOARD', {
    x: 75,
    y: 655,
    size: 15,
    font: fontBold,
    color: rgb(0.12, 0.11, 0.10)
  });
  page.drawText('STATEMENT OF MARKS - SENIOR SECONDARY EXAMINATION (CLASS XII)', {
    x: 80,
    y: 635,
    size: 10,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3)
  });

  page.drawLine({
    start: { x: 40, y: 620 },
    end: { x: 500, y: 620 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7)
  });

  // Candidate particulars
  let y = 595;
  const candFields = [
    { l1: 'Candidate Name:', v1: 'Aarav Kumar Sharma', l2: 'Roll Number:', v2: '2024-HSE-0000' },
    { l1: 'Date of Birth:', v1: '15-05-2004', l2: 'Board / Council:', v2: 'State Higher Secondary Board' },
    { l1: 'School / Center:', v1: 'Govt PU College, Bangalore North', l2: 'Year of Passing:', v2: 'May 2024' }
  ];

  for (const row of candFields) {
    page.drawText(row.l1, { x: 45, y, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(row.v1, { x: 140, y, size: 9, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });

    page.drawText(row.l2, { x: 310, y, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    page.drawText(row.v2, { x: 405, y, size: 9, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
    y -= 22;
  }

  // Marks Table Header
  y -= 10;
  page.drawRectangle({
    x: 40,
    y: y - 5,
    width: 460,
    height: 24,
    color: rgb(0.94, 0.92, 0.88)
  });
  page.drawText('SUBJECT CODE & NAME', { x: 50, y: y + 2, size: 9, font: fontBold });
  page.drawText('MAX MARKS', { x: 260, y: y + 2, size: 9, font: fontBold });
  page.drawText('MIN MARKS', { x: 345, y: y + 2, size: 9, font: fontBold });
  page.drawText('MARKS OBTAINED', { x: 420, y: y + 2, size: 9, font: fontBold });

  y -= 24;
  const subjects = [
    { code: 'ENG - English (Core)', max: '100', min: '35', obt: '88' },
    { code: 'PHY - Physics Theory & Lab', max: '100', min: '35', obt: '87' },
    { code: 'CHE - Chemistry Theory & Lab', max: '100', min: '35', obt: '86' },
    { code: 'MAT - Mathematics', max: '100', min: '35', obt: '91' },
    { code: 'CSC - Computer Science', max: '100', min: '35', obt: '88' }
  ];

  for (const s of subjects) {
    page.drawLine({ start: { x: 40, y: y + 16 }, end: { x: 500, y: y + 16 }, thickness: 0.5, color: rgb(0.85, 0.85, 0.85) });
    page.drawText(s.code, { x: 50, y: y + 2, size: 9, font: fontRegular });
    page.drawText(s.max, { x: 280, y: y + 2, size: 9, font: fontRegular });
    page.drawText(s.min, { x: 365, y: y + 2, size: 9, font: fontRegular });
    page.drawText(s.obt, { x: 450, y: y + 2, size: 9, font: fontBold });
    y -= 24;
  }

  page.drawLine({ start: { x: 40, y: y + 16 }, end: { x: 500, y: y + 16 }, thickness: 1.5, color: rgb(0.2, 0.2, 0.2) });

  // Summary box
  y -= 10;
  page.drawRectangle({
    x: 40,
    y: y - 25,
    width: 460,
    height: 40,
    color: rgb(0.97, 0.96, 0.94),
    borderWidth: 1,
    borderColor: rgb(0.8, 0.8, 0.8)
  });
  page.drawText('GRAND TOTAL: 440 / 500', { x: 55, y: y - 5, size: 10, font: fontBold, color: rgb(0.12, 0.11, 0.10) });
  page.drawText('PERCENTAGE: 88.00%', { x: 220, y: y - 5, size: 11, font: fontBold, color: rgb(0.71, 0.33, 0.17) });
  page.drawText('RESULT: PASS (DISTINCTION)', { x: 360, y: y - 5, size: 9, font: fontBold, color: rgb(0.12, 0.5, 0.2) });

  // Certification
  page.drawText('Official Seal & Controller of Examinations Signature', {
    x: 300,
    y: 70,
    size: 9,
    font: fontRegular,
    color: rgb(0.3, 0.3, 0.3)
  });
  page.drawText('SAMPLE DOCUMENT FOR SCHOLARSHIP INTAKE DEMO ONLY', {
    x: 45,
    y: 40,
    size: 9,
    font: fontBold,
    color: rgb(0.71, 0.33, 0.17)
  });

  const bytes = await doc.save();
  const buffer = Buffer.from(bytes);
  ensureSamplesDir();
  fs.writeFileSync(path.join(SAMPLES_DIR, filename), buffer);

  const base64 = buffer.toString('base64');
  return { dataUrl: `data:application/pdf;base64,${base64}`, buffer };
}

/**
 * Generate (a) Clean Income Certificate
 */
async function generateIncomeCertificate(isBlurry = false, filename = 'sample_income_clean.pdf'): Promise<{ dataUrl: string; buffer: Buffer }> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([540, 680]);

  // Border
  page.drawRectangle({
    x: 20,
    y: 20,
    width: 500,
    height: 640,
    borderWidth: 2,
    borderColor: isBlurry ? rgb(0.7, 0.7, 0.7) : rgb(0.15, 0.15, 0.15),
    color: isBlurry ? rgb(0.92, 0.92, 0.9) : rgb(1, 1, 1)
  });

  drawWatermark(page, fontBold, isBlurry ? 'UNREADABLE BLURRY SCAN' : 'SAMPLE - FICTIONAL');

  if (isBlurry) {
    // Generate low contrast blurred simulated scan
    page.drawText('GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT', {
      x: 100,
      y: 610,
      size: 13,
      font: fontBold,
      color: rgb(0.65, 0.65, 0.65)
    });
    page.drawText('OFFICE OF THE TAHSILDAR - INCOME CERTIFICATE', {
      x: 120,
      y: 590,
      size: 11,
      font: fontRegular,
      color: rgb(0.68, 0.68, 0.68)
    });

    // Draw blurred simulated text blocks that cannot be read
    for (let i = 0; i < 16; i++) {
      const lineY = 530 - i * 26;
      page.drawRectangle({
        x: 50 + (i % 3) * 15,
        y: lineY,
        width: 380 - (i % 4) * 40,
        height: 9,
        color: rgb(0.78, 0.78, 0.76)
      });
    }

    page.drawText('*** DEFECTIVE / UNREADABLE SCAN - HIGH NOISE & BLUR ***', {
      x: 80,
      y: 120,
      size: 12,
      font: fontBold,
      color: rgb(0.7, 0.2, 0.2)
    });
  } else {
    // Clean, readable income certificate
    page.drawText('GOVERNMENT OF KARNATAKA - REVENUE DEPARTMENT', {
      x: 85,
      y: 615,
      size: 14,
      font: fontBold,
      color: rgb(0.12, 0.11, 0.10)
    });
    page.drawText('OFFICE OF THE TAHSILDAR, BANGALORE URBAN DISTRICT', {
      x: 110,
      y: 595,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3)
    });
    page.drawText('INCOME & ASSET CERTIFICATE FOR SCHOLARSHIP', {
      x: 115,
      y: 575,
      size: 12,
      font: fontBold,
      color: rgb(0.71, 0.33, 0.17)
    });

    page.drawLine({ start: { x: 40, y: 560 }, end: { x: 500, y: 560 }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });

    let y = 520;
    const certDetails = [
      { label: 'Certificate Reference No:', value: 'INC-2026-0000' },
      { label: 'Issue Date:', value: '10 January 2026' },
      { label: 'Name of Beneficiary:', value: 'Aarav Kumar Sharma' },
      { label: 'Father / Guardian Name:', value: 'Rajesh Sharma' },
      { label: 'Residential Address:', value: '#42, Fictional Layout, Ward 12, Bangalore - 560001' },
      { label: 'Category / Caste:', value: 'General (Merit Category)' }
    ];

    for (const item of certDetails) {
      page.drawText(item.label, { x: 50, y, size: 10, font: fontBold, color: rgb(0.25, 0.25, 0.25) });
      page.drawText(item.value, { x: 210, y, size: 10, font: fontRegular, color: rgb(0.1, 0.1, 0.1) });
      y -= 26;
    }

    y -= 10;
    page.drawRectangle({
      x: 45,
      y: y - 45,
      width: 450,
      height: 55,
      color: rgb(0.97, 0.96, 0.94),
      borderWidth: 1.5,
      borderColor: rgb(0.71, 0.33, 0.17)
    });

    page.drawText('VERIFIED ANNUAL FAMILY INCOME FROM ALL SOURCES:', {
      x: 60,
      y: y - 14,
      size: 9,
      font: fontBold,
      color: rgb(0.3, 0.3, 0.3)
    });
    page.drawText('Rs. 2,40,000 /- (Rupees Two Lakh Forty Thousand Only)', {
      x: 60,
      y: y - 35,
      size: 13,
      font: fontBold,
      color: rgb(0.71, 0.33, 0.17)
    });

    y -= 75;
    page.drawText(
      'This certificate is issued on the basis of local revenue enquiry and self-declaration',
      { x: 50, y, size: 9, font: fontRegular, color: rgb(0.35, 0.35, 0.35) }
    );
    page.drawText(
      'for the purpose of educational fee concession and scholarship eligibility for academic year 2025-2026.',
      { x: 50, y: y - 16, size: 9, font: fontRegular, color: rgb(0.35, 0.35, 0.35) }
    );

    // Official Seal box
    page.drawRectangle({
      x: 350,
      y: 60,
      width: 140,
      height: 55,
      borderWidth: 1,
      borderColor: rgb(0.6, 0.6, 0.6),
      color: rgb(0.98, 0.98, 0.98)
    });
    page.drawText('[ OFFICIAL SEAL ]', { x: 372, y: 90, size: 9, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
    page.drawText('Tahsildar / Revenue Officer', { x: 360, y: 72, size: 8, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
  }

  const bytes = await doc.save();
  const buffer = Buffer.from(bytes);
  ensureSamplesDir();
  fs.writeFileSync(path.join(SAMPLES_DIR, filename), buffer);

  const base64 = buffer.toString('base64');
  return { dataUrl: `data:application/pdf;base64,${base64}`, buffer };
}

/**
 * Initialize all sample sets and store in memory cache + public disk
 */
export async function getSampleDocSets(): Promise<Record<string, SampleDocSet>> {
  if (cachedSampleSets) {
    return cachedSampleSets;
  }

  ensureSamplesDir();

  const [idClean, idWrongDob, marksheetClean, incomeClean, incomeBlurry] = await Promise.all([
    generateIdCard('15-05-2004', 'sample_id_clean.pdf'),
    generateIdCard('20-11-2002', 'sample_id_wrong_dob.pdf'),
    generateMarksheet('sample_marksheet_clean.pdf'),
    generateIncomeCertificate(false, 'sample_income_clean.pdf'),
    generateIncomeCertificate(true, 'sample_income_blurry.pdf')
  ]);

  cachedSampleSets = {
    clean: {
      id: 'clean',
      name: '(a) Clean Set (Automatic Approval)',
      description: 'Matching ID, Marksheet (88%), and Income Certificate (Rs. 2,40,000) for Aarav Kumar Sharma.',
      files: {
        id_proof: {
          fileName: 'sample_id_clean.pdf',
          fileType: 'application/pdf',
          dataUrl: idClean.dataUrl,
          downloadUrl: '/samples/sample_id_clean.pdf'
        },
        marksheet: {
          fileName: 'sample_marksheet_clean.pdf',
          fileType: 'application/pdf',
          dataUrl: marksheetClean.dataUrl,
          downloadUrl: '/samples/sample_marksheet_clean.pdf'
        },
        income_certificate: {
          fileName: 'sample_income_clean.pdf',
          fileType: 'application/pdf',
          dataUrl: incomeClean.dataUrl,
          downloadUrl: '/samples/sample_income_clean.pdf'
        }
      }
    },
    wrong_dob: {
      id: 'wrong_dob',
      name: '(b) Wrong Date of Birth (Needs Correction)',
      description: 'Clean marksheet & income cert, but ID card shows DOB 20-11-2002 instead of 15-05-2004.',
      files: {
        id_proof: {
          fileName: 'sample_id_wrong_dob.pdf',
          fileType: 'application/pdf',
          dataUrl: idWrongDob.dataUrl,
          downloadUrl: '/samples/sample_id_wrong_dob.pdf'
        },
        marksheet: {
          fileName: 'sample_marksheet_clean.pdf',
          fileType: 'application/pdf',
          dataUrl: marksheetClean.dataUrl,
          downloadUrl: '/samples/sample_marksheet_clean.pdf'
        },
        income_certificate: {
          fileName: 'sample_income_clean.pdf',
          fileType: 'application/pdf',
          dataUrl: incomeClean.dataUrl,
          downloadUrl: '/samples/sample_income_clean.pdf'
        }
      }
    },
    unreadable: {
      id: 'unreadable',
      name: '(c) Unreadable Income Certificate (Flagged as Blurry)',
      description: 'Clean ID and marksheet, but income certificate scan is blurry/illegible.',
      files: {
        id_proof: {
          fileName: 'sample_id_clean.pdf',
          fileType: 'application/pdf',
          dataUrl: idClean.dataUrl,
          downloadUrl: '/samples/sample_id_clean.pdf'
        },
        marksheet: {
          fileName: 'sample_marksheet_clean.pdf',
          fileType: 'application/pdf',
          dataUrl: marksheetClean.dataUrl,
          downloadUrl: '/samples/sample_marksheet_clean.pdf'
        },
        income_certificate: {
          fileName: 'sample_income_blurry.pdf',
          fileType: 'application/pdf',
          dataUrl: incomeBlurry.dataUrl,
          downloadUrl: '/samples/sample_income_blurry.pdf'
        }
      }
    }
  };

  return cachedSampleSets;
}
