/**
 * Pre-Upload Validation for PO Files
 * Catches errors BEFORE processing starts
 */

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  file: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  file: string;
  message: string;
}

/**
 * Validate files before upload processing
 */
export const validateBeforeUpload = (
  files: File[],
  mappings?: Record<string, any>
): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const file of files) {
    // Check 1: Valid file extension
    const validExtensions = ['.csv', '.xlsx', '.xls'];
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(extension)) {
      errors.push({
        file: file.name,
        message: `Invalid file type "${extension}". Please upload CSV or Excel files only.`,
        severity: 'error'
      });
      continue; // Skip further checks for invalid file type
    }

    // Check 2: File is not empty
    if (file.size === 0) {
      errors.push({
        file: file.name,
        message: 'File is empty. Please upload a file with data.',
        severity: 'error'
      });
      continue;
    }

    // Check 3: File size is reasonable (max 20MB)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      errors.push({
        file: file.name,
        message: `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum of 20MB.`,
        severity: 'error'
      });
    }

    // Check 4: Warn about large files
    const warnSize = 5 * 1024 * 1024; // 5MB
    if (file.size > warnSize && file.size <= maxSize) {
      warnings.push({
        file: file.name,
        message: `Large file (${(file.size / 1024 / 1024).toFixed(2)}MB) may take longer to process.`
      });
    }
  }

  return {
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    warnings
  };
};

/**
 * Validate parsed data before database insertion
 */
export const validateParsedData = (
  data: any[],
  fileName: string
): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check 1: Must have at least 1 data row
  if (!data || data.length === 0) {
    errors.push({
      file: fileName,
      message: 'No data rows found. File must contain at least one row of data.',
      severity: 'error'
    });
    return { isValid: false, errors, warnings };
  }

  // Check 2: Data should have some columns
  const firstRow = data[0];
  if (!firstRow || Object.keys(firstRow).length === 0) {
    errors.push({
      file: fileName,
      message: 'No columns detected. Please ensure file has proper headers.',
      severity: 'error'
    });
    return { isValid: false, errors, warnings };
  }

  // Check 3: Warn if many empty rows
  const emptyRows = data.filter(row => {
    const values = Object.values(row);
    return values.every(v => !v || v.toString().trim() === '');
  }).length;

  if (emptyRows > data.length * 0.3) {
    warnings.push({
      file: fileName,
      message: `${emptyRows} empty rows detected (${Math.round(emptyRows / data.length * 100)}% of total). These will be skipped.`
    });
  }

  return {
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    warnings
  };
};

/**
 * Validate column mapping completeness
 */
export const validateMapping = (
  mapping: any,
  fileName: string,
  headers: string[]
): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Required fields for PO upload
  const requiredFields = ['po_number', 'ship_to_location', 'asin', 'quantity'];

  for (const field of requiredFields) {
    const mappedColumn = mapping[field];
    const hasManualPO = field === 'po_number' && mapping.manual_po_number?.trim();

    // For PO number, either column mapping or manual entry is OK
    if (field === 'po_number') {
      if (!mappedColumn && !hasManualPO) {
        errors.push({
          file: fileName,
          message: 'PO Number is required. Either map a column or enter a manual PO number.',
          severity: 'error'
        });
      }
    } else {
      // Other required fields must be mapped
      if (!mappedColumn || mappedColumn === 'none') {
        errors.push({
          file: fileName,
          message: `Required field "${field}" is not mapped. Please select a column.`,
          severity: 'error'
        });
      } else if (!headers.includes(mappedColumn)) {
        errors.push({
          file: fileName,
          message: `Mapped column "${mappedColumn}" for "${field}" not found in file headers.`,
          severity: 'error'
        });
      }
    }
  }

  // Warn about unmapped optional fields
  const optionalFields = ['model_number', 'title'];
  for (const field of optionalFields) {
    if (!mapping[field] || mapping[field] === 'none') {
      warnings.push({
        file: fileName,
        message: `Optional field "${field}" is not mapped. This field will be empty.`
      });
    }
  }

  return {
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    warnings
  };
};

/**
 * Validate data quality after mapping
 */
export const validateMappedData = (
  data: any[],
  fileName: string
): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  let missingPOCount = 0;
  let missingASINCount = 0;
  let invalidQtyCount = 0;
  let missingLocationCount = 0;

  data.forEach((row, index) => {
    const rowNum = index + 1;

    // Count issues
    if (!row.po_number || !row.po_number.trim()) missingPOCount++;
    if (!row.asin || !row.asin.trim()) missingASINCount++;
    if (!row.ship_to_location || !row.ship_to_location.trim()) missingLocationCount++;
    
    const qty = parseInt(row.quantity);
    if (isNaN(qty) || qty <= 0) invalidQtyCount++;
  });

  // Report issues
  const totalRows = data.length;
  const threshold = 0.2; // 20% threshold for warnings

  if (missingPOCount > 0) {
    const percentage = Math.round((missingPOCount / totalRows) * 100);
    const message = `${missingPOCount} rows (${percentage}%) have missing PO numbers and will be skipped.`;
    
    if (missingPOCount / totalRows > threshold) {
      errors.push({ file: fileName, message, severity: 'error' });
    } else {
      warnings.push({ file: fileName, message });
    }
  }

  if (missingASINCount > 0) {
    const percentage = Math.round((missingASINCount / totalRows) * 100);
    const message = `${missingASINCount} rows (${percentage}%) have missing ASIN and will be skipped.`;
    
    if (missingASINCount / totalRows > threshold) {
      errors.push({ file: fileName, message, severity: 'error' });
    } else {
      warnings.push({ file: fileName, message });
    }
  }

  if (missingLocationCount > 0) {
    const percentage = Math.round((missingLocationCount / totalRows) * 100);
    warnings.push({
      file: fileName,
      message: `${missingLocationCount} rows (${percentage}%) have missing ship-to location.`
    });
  }

  if (invalidQtyCount > 0) {
    const percentage = Math.round((invalidQtyCount / totalRows) * 100);
    const message = `${invalidQtyCount} rows (${percentage}%) have invalid quantities and will be skipped.`;
    
    if (invalidQtyCount / totalRows > threshold) {
      errors.push({ file: fileName, message, severity: 'error' });
    } else {
      warnings.push({ file: fileName, message });
    }
  }

  return {
    isValid: errors.filter(e => e.severity === 'error').length === 0,
    errors,
    warnings
  };
};
