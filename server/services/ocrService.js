const path = require('path');
const fs = require('fs');


 //OCR Service using Tesseract.js
 //PDF support via pdf-to-img (no GraphicsMagick needed)
 

let Tesseract;
try {
  Tesseract = require('tesseract.js');
} catch (e) {
  console.warn('⚠️  tesseract.js not installed. Run: npm install tesseract.js');
}


 //Convert PDF to images using pdf-to-img (no GraphicsMagick needed)
 
const pdfToImages = async (filePath) => {
  const { pdf } = require('pdf-to-img');
  const outputDir = path.join(__dirname, '../uploads/pdf_images');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const images = [];
  const document = await pdf(filePath, { scale: 2 }); // scale 2 = better quality

  let pageNum = 1;
  for await (const image of document) {
    const imgPath = path.join(outputDir, `page_${Date.now()}_${pageNum}.png`);
    fs.writeFileSync(imgPath, image);
    images.push(imgPath);
    pageNum++;
    if (pageNum > 3) break; // OCR first 3 pages max for performance
  }

  return images;
};


 //Run OCR on a file (image or PDF)
 
const runOCR = async (filePath) => {
  if (!Tesseract) throw new Error('Tesseract.js not installed. Run: npm install tesseract.js');

  const ext = path.extname(filePath).toLowerCase();

  //  Images run Tesseract directly 
  if (['.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.webp'].includes(ext)) {
    const { data } = await Tesseract.recognize(filePath, 'eng', {
      logger: () => {},
    });
    return {
      text: data.text,
      confidence: data.confidence,
    };
  }

  // PDFs  convert to images using pdf-to-img, then OCR 
  if (ext === '.pdf') {
    let imagePaths = [];
    try {
      imagePaths = await pdfToImages(filePath);

      if (imagePaths.length === 0) {
        throw new Error('No pages extracted from PDF.');
      }

      // Run OCR on each page and combine text
      let fullText = '';
      let totalConfidence = 0;

      for (const imgPath of imagePaths) {
        const { data } = await Tesseract.recognize(imgPath, 'eng', { logger: () => {} });
        fullText += data.text + '\n';
        totalConfidence += data.confidence;
      }

      const avgConfidence = totalConfidence / imagePaths.length;

      // Clean up temp images
      imagePaths.forEach(p => { try { fs.unlinkSync(p); } catch (_) {} });

      return {
        text: fullText.trim(),
        confidence: avgConfidence,
      };

    } catch (pdfErr) {
      // Clean up on error
      imagePaths.forEach(p => { try { fs.unlinkSync(p); } catch (_) {} });
      throw new Error('PDF OCR failed: ' + pdfErr.message + '. Make sure pdf-to-img is installed: npm install pdf-to-img');
    }
  }

  throw new Error('Unsupported file type: ' + ext);
};


 //Extract field values from raw OCR text using template fields
 //Uses pattern matching + keyword proximity
 
const extractFields = (rawText, templateFields) => {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);

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
        case 'date': {
          const dateMatch = rawText.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/);
          if (dateMatch) { extractedValue = dateMatch[0]; confidence = 60; }
          break;
        }
        case 'amount': {
          const amtMatch = rawText.match(/(?:rs\.?|inr|₹|\$|€|£)?\s*[\d,]+\.?\d*/i);
          if (amtMatch) { extractedValue = amtMatch[0].trim(); confidence = 60; }
          break;
        }
        case 'email': {
          const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.\w+/);
          if (emailMatch) { extractedValue = emailMatch[0]; confidence = 85; }
          break;
        }
        case 'phone': {
          const phoneMatch = rawText.match(/(?:\+91[\s-]?)?[6-9]\d{9}|\d{3}[\s-]?\d{3}[\s-]?\d{4}/);
          if (phoneMatch) { extractedValue = phoneMatch[0]; confidence = 75; }
          break;
        }
        case 'number': {
          const numMatch = rawText.match(/\b\d+\.?\d*\b/);
          if (numMatch) { extractedValue = numMatch[0]; confidence = 50; }
          break;
        }
        default: break;
      }
    }

    // Strategy 3: Look in lines near the field keyword
    if (!extractedValue) {
      const lineIdx = lines.findIndex(l => l.toLowerCase().includes(fieldNameLower));
      if (lineIdx !== -1) {
        const sameLine = lines[lineIdx]
          .replace(new RegExp(fieldNameLower, 'i'), '')
          .replace(/[:\-]/g, '')
          .trim();
        if (sameLine.length > 0) { extractedValue = sameLine; confidence = 50; }
        else if (lines[lineIdx + 1]) { extractedValue = lines[lineIdx + 1]; confidence = 40; }
      }
    }

    return {
      fieldName: field.fieldName,
      fieldType: field.fieldType,
      extractedValue: extractedValue.slice(0, 500),
      correctedValue: extractedValue.slice(0, 500),
      confidence,
      isVerified: false,
    };
  });
};

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = { runOCR, extractFields };