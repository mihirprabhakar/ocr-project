const axios = require('axios');


 //SAP or External System Push Service
 //Sends mapped OCR data to SAP or any configured ERP endpoint
 

const pushToSAP = async (scanJob, template) => {
  const sapEndpoint = process.env.SAP_ENDPOINT;
  const sapUser = process.env.SAP_USERNAME;
  const sapPassword = process.env.SAP_PASSWORD;

  // Build payload from extracted/corrected fields
  const payload = {
    jobId: scanJob.jobId,
    documentType: template.documentType,
    templateName: template.name,
    scannedAt: scanJob.createdAt,
    fields: {},
  };

  scanJob.extractedFields.forEach((field) => {
    const value = field.correctedValue || field.extractedValue;
    payload.fields[field.fieldName] = value;

    // Apply SAP field mapping if defined in template
    if (template.sapMapping && template.sapMapping.get && template.sapMapping.get(field.fieldName)) {
      const sapKey = template.sapMapping.get(field.fieldName);
      payload.fields[sapKey] = value;
    }
  });

  // If no SAP endpoint configured — simulate push (for development)
  if (!sapEndpoint) {
    console.log('ℹ️  SAP_ENDPOINT not configured. Simulating push:', JSON.stringify(payload, null, 2));
    return {
      success: true,
      simulated: true,
      message: 'SAP endpoint not configured. Data logged to console.',
      payload,
      timestamp: new Date().toISOString(),
    };
  }

  // Real SAP push
  const response = await axios.post(sapEndpoint, payload, {
    auth: sapUser && sapPassword ? { username: sapUser, password: sapPassword } : undefined,
    headers: {
      'Content-Type': 'application/json',
      'X-OCR-Source': 'OCRAdmin',
      ...(process.env.SAP_API_KEY ? { 'X-API-Key': process.env.SAP_API_KEY } : {}),
    },
    timeout: 15000,
  });

  return {
    success: true,
    statusCode: response.status,
    data: response.data,
    timestamp: new Date().toISOString(),
  };
};

module.exports = { pushToSAP };
