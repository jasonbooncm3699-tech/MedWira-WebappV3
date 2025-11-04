/**
 * AI Status Types - Phase 2 Enhancement
 * 
 * Defines processing stages for realistic status tracking
 * Similar to ChatGPT/Gemini/Grok - shows actual processing stages
 */

export enum AIProcessingStage {
  IDLE = 'idle',
  LOADING_PROFILE = 'loading_profile',
  LOADING_MEDICATIONS = 'loading_medications',
  ANALYZING_QUESTION = 'analyzing_question',
  CHECKING_HISTORY = 'checking_history',
  EXTRACTING_KEYWORDS = 'extracting_keywords',
  DETECTING_PATTERNS = 'detecting_patterns',
  GENERATING_RESPONSE = 'generating_response',
  FINALIZING = 'finalizing'
}

/**
 * Get status message for a given stage and language
 * Returns realistic, professional messages like ChatGPT/Gemini
 */
export function getStatusMessage(stage: AIProcessingStage, language: string = 'English'): string {
  const statusMessages: { [key in AIProcessingStage]: { [lang: string]: string } } = {
    [AIProcessingStage.IDLE]: {
      'English': '',
      'Chinese': '',
      'Malay': '',
      'Indonesian': ''
    },
    [AIProcessingStage.LOADING_PROFILE]: {
      'English': 'Loading your health profile...',
      'Chinese': '正在加载您的健康档案...',
      'Malay': 'Memuatkan profil kesihatan anda...',
      'Indonesian': 'Memuat profil kesehatan Anda...'
    },
    [AIProcessingStage.LOADING_MEDICATIONS]: {
      'English': 'Loading your medications...',
      'Chinese': '正在加载您的药物信息...',
      'Malay': 'Memuatkan ubat anda...',
      'Indonesian': 'Memuat obat Anda...'
    },
    [AIProcessingStage.ANALYZING_QUESTION]: {
      'English': 'Analyzing your question...',
      'Chinese': '正在分析您的问题...',
      'Malay': 'Menganalisis soalan anda...',
      'Indonesian': 'Menganalisis pertanyaan Anda...'
    },
    [AIProcessingStage.CHECKING_HISTORY]: {
      'English': 'Checking your health history...',
      'Chinese': '正在检查您的健康历史...',
      'Malay': 'Menyemak sejarah kesihatan anda...',
      'Indonesian': 'Memeriksa riwayat kesehatan Anda...'
    },
    [AIProcessingStage.EXTRACTING_KEYWORDS]: {
      'English': 'Extracting health information...',
      'Chinese': '正在提取健康信息...',
      'Malay': 'Mengekstrak maklumat kesihatan...',
      'Indonesian': 'Mengekstrak informasi kesehatan...'
    },
    [AIProcessingStage.DETECTING_PATTERNS]: {
      'English': 'Detecting health patterns...',
      'Chinese': '正在检测健康模式...',
      'Malay': 'Mengesan corak kesihatan...',
      'Indonesian': 'Mendeteksi pola kesehatan...'
    },
    [AIProcessingStage.GENERATING_RESPONSE]: {
      'English': 'Generating personalized response...',
      'Chinese': '正在生成个性化回复...',
      'Malay': 'Menjana respons peribadi...',
      'Indonesian': 'Menghasilkan respons personal...'
    },
    [AIProcessingStage.FINALIZING]: {
      'English': 'Finalizing your answer...',
      'Chinese': '正在完成您的回答...',
      'Malay': 'Menyelesaikan jawapan anda...',
      'Indonesian': 'Menyelesaikan jawaban Anda...'
    }
  };

  const messages = statusMessages[stage];
  return messages[language] || messages['English'] || '';
}

