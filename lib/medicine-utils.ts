/**
 * Medicine Analysis Utilities
 * 
 * Utility functions for medicine analysis and data processing.
 * Will be used with MedGemma 4B integration.
 */

export interface NPRAMedicineData {
  ref_no: string;
  reg_no: string;
  product: string;
  generic_name: string;
  active_ingredient: string;
  manufacturer: string;
  holder: string;
  status: string;
}

/**
 * Parse medicine analysis response into structured format
 */
export function parseMedicineResponse(response: string): any {
  // TODO: Implement parsing logic for MedGemma 4B responses
  return {};
}

/**
 * Validate medicine image format
 */
export function validateImageFormat(imageBase64: string): boolean {
  return imageBase64.startsWith('data:image/');
}

/**
 * Extract base64 data from data URL
 */
export function extractBase64Data(imageBase64: string): string {
  return imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
}

/**
 * Generate error message based on language
 */
export function getErrorMessage(error: any, language: string): string {
  const errorMessages: { [key: string]: { [key: string]: string } } = {
    'English': {
      'API_KEY_MISSING': 'API key not configured. Please contact support.',
      'INVALID_IMAGE': 'Invalid image format. Please upload a clear photo of medicine packaging.',
      'NO_MEDICINE_DETECTED': 'No medicine detected in the image. Please upload a clear photo of medicine packaging, pills, or tablets.',
      'NETWORK_ERROR': 'Network error. Please check your connection and try again.',
      'RATE_LIMIT': 'Too many requests. Please wait a moment and try again.',
      'DEFAULT': 'Analysis failed. Please try again with a clearer image.'
    },
    'Chinese': {
      'API_KEY_MISSING': 'API密钥未配置。请联系技术支持。',
      'INVALID_IMAGE': '图像格式无效。请上传清晰的药物包装照片。',
      'NO_MEDICINE_DETECTED': '图像中未检测到药物。请上传清晰的药物包装、药丸或药片照片。',
      'NETWORK_ERROR': '网络错误。请检查您的连接并重试。',
      'RATE_LIMIT': '请求过多。请稍等片刻后重试。',
      'DEFAULT': '分析失败。请尝试上传更清晰的图像。'
    },
    'Malay': {
      'API_KEY_MISSING': 'Kunci API tidak dikonfigurasi. Sila hubungi sokongan.',
      'INVALID_IMAGE': 'Format imej tidak sah. Sila muat naik foto pembungkusan ubat yang jelas.',
      'NO_MEDICINE_DETECTED': 'Tiada ubat dikesan dalam imej. Sila muat naik foto pembungkusan ubat, pil, atau tablet yang jelas.',
      'NETWORK_ERROR': 'Ralat rangkaian. Sila semak sambungan anda dan cuba lagi.',
      'RATE_LIMIT': 'Terlalu banyak permintaan. Sila tunggu sebentar dan cuba lagi.',
      'DEFAULT': 'Analisis gagal. Sila cuba lagi dengan imej yang lebih jelas.'
    }
  };

  const langMessages = errorMessages[language] || errorMessages['English'];
  
  if (error.message?.includes('API_KEY')) return langMessages['API_KEY_MISSING'];
  if (error.message?.includes('Invalid image')) return langMessages['INVALID_IMAGE'];
  if (error.message?.includes('No medicine')) return langMessages['NO_MEDICINE_DETECTED'];
  if (error.message?.includes('network')) return langMessages['NETWORK_ERROR'];
  if (error.message?.includes('rate limit')) return langMessages['RATE_LIMIT'];
  
  return langMessages['DEFAULT'];
}
