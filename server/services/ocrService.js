const path = require('path');
const fs = require('fs');

/**
 * OCR Service using Tesseract.js
 * Extracts text from images and PDFs
 */

let Tesseract;
try {
  Tesseract = require('tesseract.js');
} catch (e) {
  console.warn('⚠️  tesseract.js not installed. Run: npm install tesseract.js');
}

/**
 * Run OCR on a file (image or PDF)
 */
const runOCR = async (filePath) => {
  if (!Tesseract) throw new Error('Tesseract.js not installed. Run: npm install tesseract.js');

  const ext = path.extname(filePath).toLowerCase();

  // For images — run Tesseract directly
  if (['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.webp'].includes(ext)) {
    const { data } = await Tesseract.recognize(filePath, 'eng', {
      logger: () => {}, // suppress logs
    });
    return {
      text: data.text,
      confidence: data.confidence,
    };
  }

  // For PDFs — convert first page to image using pdf2pic, then OCR
  if (ext === '.pdf') {
    try {
      const { fromPath } = require('pdf2pic');
      const outputDir = path.join(__dirname, '../uploads/pdf_images');
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

      const converter = fromPath(filePath, {
        density: 200,
        saveFilename: path.basename(filePath, '.pdf'),
        savePath: outputDir,
        format: 'png',
        width: 2480,
        height: 3508,
      });

      const result = await converter(1); // convert page 1
      const { data } = await Tesseract.recognize(result.path, 'eng', { logger: () => {} });
      return { text: data.text, confidence: data.confidence };
    } catch (pdfErr) {
      throw new Error('PDF OCR failed. Ensure pdf2pic and graphicsmagick are installed: ' + pdfErr.message);
    }
  }

  throw new Error('Unsupported file type: ' + ext);
};

/**
 * Extract field values from raw OCR text using template fields
 * Uses pattern matching + keyword proximity
 */
const extractFields = (rawText, templateFields) => {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const fullText = rawText.toLowerCase();

  return templateFields.map((field) => {
    const fieldNameLower = field.fieldName.toLowerCase();
    let extractedValue = '';
    let confidence = 0;

    // Strategy 1: Look for "FieldName: Value" or "FieldName - Value" pattern
    const patterns = [
      new RegExp(`${escapeRegex(fieldNameLower)}\\s*[:\\-]\\s*(.+)`, 'i'),
      new RegExp(`${escapeRegex(fieldNameLower)}\\s+([\\w\\d\\s\\/\\-\\.@,]+)`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = rawText.match(pattern);
      if (match && match[1]) {
        extractedValue = match[1].trim().split('\n')[0].trim();
        confidence = 75;
        break;
      }
    }

    // Strategy 2: Type-based pattern matching
    if (!extractedValue) {
      switch (field.fieldType) {
        case 'date':
          const dateMatch = rawText.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/);
          if (dateMatch) { extractedValue = dateMatch[0]; confidence = 60; }
          break;
        case 'amount':
          const amtMatch = rawText.match(/(?:rs\.?|inr|₹|\$|€|£)?\s*[\d,]+\.?\d*/i);
          if (amtMatch) { extractedValue = amtMatch[0].trim(); confidence = 60; }
          break;
        case 'email':
          const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.\w+/);
          if (emailMatch) { extractedValue = emailMatch[0]; confidence = 85; }
          break;
        case 'phone':
          const phoneMatch = rawText.match(/(?:\+91[\s-]?)?[6-9]\d{9}|\d{3}[\s-]?\d{3}[\s-]?\d{4}/);
          if (phoneMatch) { extractedValue = phoneMatch[0]; confidence = 75; }
          break;
        case 'number':
          const numMatch = rawText.match(/\b\d+\.?\d*\b/);
          if (numMatch) { extractedValue = numMatch[0]; confidence = 50; }
          break;
      }
    }

    // Strategy 3: Look in lines near the field keyword
    if (!extractedValue) {
      const lineIdx = lines.findIndex(l => l.toLowerCase().includes(fieldNameLower));
      if (lineIdx !== -1) {
        // Try same line after the keyword, or next line
        const sameLine = lines[lineIdx].replace(new RegExp(fieldNameLower, 'i'), '').replace(/[:\-]/g, '').trim();
        if (sameLine.length > 0) { extractedValue = sameLine; confidence = 50; }
        else if (lines[lineIdx + 1]) { extractedValue = lines[lineIdx + 1]; confidence = 40; }
      }
    }

    return {
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      extractedValue: extractedValue.slice(0, 500), // cap length
      correctedValue: extractedValue.slice(0, 500),
      confidence,
      isVerified: false,
    };
  });
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { runOCR, extractFields };
