import { MedicineAnalysisResult } from './gemini-service';

export interface FormattedMessage {
  title: string;
  content: string;
  structuredData: {
    medicineName?: string;
    genericName?: string;
    dosage?: string;
    sideEffects?: string[];
    interactions?: string[];
    warnings?: string[];
    storage?: string;
    category?: string;
    confidence?: number;
  };
}

export class MessageFormatter {
  static formatMedicineAnalysis(result: MedicineAnalysisResult): FormattedMessage {
    const { language = 'English' } = result;
    
    if (!result.success || result.error) {
      return this.formatErrorMessage(result.error || 'Analysis failed', language);
    }

    const templates = this.getLanguageTemplates(language);
    
    let content = '';
    let structuredData: any = {};

    // Medicine Name
    if (result.medicineName) {
      content += `**${templates.medicineName}:** ${result.medicineName}\n\n`;
      structuredData.medicineName = result.medicineName;
    }

    // Generic Name
    if (result.genericName) {
      content += `**${templates.genericName}:** ${result.genericName}\n\n`;
      structuredData.genericName = result.genericName;
    }

    // Category
    if (result.category) {
      content += `**${templates.category}:** ${result.category}\n\n`;
      structuredData.category = result.category;
    }

    // Dosage Instructions
    if (result.dosage) {
      content += `**${templates.dosageInstructions}:**\n${result.dosage}\n\n`;
      structuredData.dosage = result.dosage;
    }

    // Side Effects
    if (result.sideEffects && result.sideEffects.length > 0) {
      content += `**${templates.sideEffects}:**\n`;
      result.sideEffects.forEach((effect, index) => {
        content += `${index + 1}. ${effect}\n`;
      });
      content += '\n';
      structuredData.sideEffects = result.sideEffects;
    }

    // Warnings
    if (result.warnings && result.warnings.length > 0) {
      content += `**${templates.warnings}:**\n`;
      result.warnings.forEach((warning, index) => {
        content += `⚠️ ${warning}\n`;
      });
      content += '\n';
      structuredData.warnings = result.warnings;
    }

    // Drug Interactions
    if (result.interactions && result.interactions.length > 0) {
      content += `**${templates.interactions}:**\n`;
      result.interactions.forEach((interaction, index) => {
        content += `${index + 1}. ${interaction}\n`;
      });
      content += '\n';
      structuredData.interactions = result.interactions;
    }

    // Storage Instructions
    if (result.storage) {
      content += `**${templates.storage}:** ${result.storage}\n\n`;
      structuredData.storage = result.storage;
    }

    // Confidence and Disclaimer
    if (result.confidence) {
      const confidencePercent = Math.round(result.confidence * 100);
      content += `**${templates.confidence}:** ${confidencePercent}%\n\n`;
      structuredData.confidence = result.confidence;
    }

    content += `**${templates.disclaimer}**`;

    return {
      title: `${templates.analysisTitle} - ${result.medicineName || 'Medicine'}`,
      content,
      structuredData
    };
  }

  private static formatErrorMessage(error: string, language: string): FormattedMessage {
    const templates = this.getLanguageTemplates(language);
    
    return {
      title: templates.errorTitle,
      content: `**${templates.error}:** ${error}\n\n${templates.tryAgain}`,
      structuredData: {}
    };
  }

  private static getLanguageTemplates(language: string): any {
    const templates: { [key: string]: any } = {
      'English': {
        analysisTitle: 'Medicine Analysis',
        medicineName: 'Medicine Name',
        genericName: 'Generic Name',
        category: 'Category',
        dosageInstructions: 'Dosage Instructions',
        sideEffects: 'Side Effects',
        warnings: 'Important Warnings',
        interactions: 'Drug Interactions',
        storage: 'Storage Instructions',
        confidence: 'Analysis Confidence',
        disclaimer: '⚠️ **Important Disclaimer:** This information is for educational purposes only. Always consult with a healthcare professional before taking any medication.',
        errorTitle: 'Analysis Error',
        error: 'Error',
        tryAgain: 'Please try again with a clearer image or contact support if the problem persists.'
      },
      'Chinese': {
        analysisTitle: '药物分析',
        medicineName: '药物名称',
        genericName: '通用名称',
        category: '药物类别',
        dosageInstructions: '剂量说明',
        sideEffects: '副作用',
        warnings: '重要警告',
        interactions: '药物相互作用',
        storage: '储存说明',
        confidence: '分析置信度',
        disclaimer: '⚠️ **重要免责声明：** 此信息仅供参考。在服用任何药物之前，请务必咨询医疗专业人士。',
        errorTitle: '分析错误',
        error: '错误',
        tryAgain: '请尝试上传更清晰的图像，如果问题持续存在，请联系技术支持。'
      },
      'Malay': {
        analysisTitle: 'Analisis Ubat',
        medicineName: 'Nama Ubat',
        genericName: 'Nama Generik',
        category: 'Kategori',
        dosageInstructions: 'Arahan Dos',
        sideEffects: 'Kesan Sampingan',
        warnings: 'Amaran Penting',
        interactions: 'Interaksi Ubat',
        storage: 'Arahan Penyimpanan',
        confidence: 'Keyakinan Analisis',
        disclaimer: '⚠️ **Penafian Penting:** Maklumat ini adalah untuk tujuan pendidikan sahaja. Sentiasa berunding dengan profesional penjagaan kesihatan sebelum mengambil sebarang ubat.',
        errorTitle: 'Ralat Analisis',
        error: 'Ralat',
        tryAgain: 'Sila cuba lagi dengan imej yang lebih jelas atau hubungi sokongan jika masalah berterusan.'
      }
    };

    return templates[language] || templates['English'];
  }
}
