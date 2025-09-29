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

    // Check if this is the new enhanced 11-section format
    if (result.packagingDetected || result.purpose || result.allergyWarning) {
      return this.format11SectionAnalysis(result, language);
    }

    // Fall back to legacy format for backward compatibility
    return this.formatLegacyAnalysis(result, language);
  }

  private static format11SectionAnalysis(result: MedicineAnalysisResult, language: string): FormattedMessage {
    const templates = this.getLanguageTemplates(language);
    
    let content = '';
    let structuredData: any = {};

    // 1. Packaging Detected
    if (result.packagingDetected) {
      content += `**${templates.packagingDetected}:** ${result.packagingDetected}\n\n`;
      structuredData.packagingDetected = result.packagingDetected;
    }

    // 2. Medicine Name
    if (result.medicineName) {
      content += `**${templates.medicineName}:** ${result.medicineName}`;
      if (result.genericName) {
        content += ` (${result.genericName})`;
      }
      content += '\n\n';
      structuredData.medicineName = result.medicineName;
      structuredData.genericName = result.genericName;
    }

    // 3. Purpose
    if (result.purpose) {
      content += `**${templates.purpose}:** ${result.purpose}\n\n`;
      structuredData.purpose = result.purpose;
    }

    // 4. Dosage Instructions
    if (result.dosageInstructions) {
      content += `**${templates.dosageInstructions}:**\n${result.dosageInstructions}\n\n`;
      structuredData.dosageInstructions = result.dosageInstructions;
    }

    // 5. Side Effects
    if (result.sideEffects && result.sideEffects.length > 0) {
      content += `**${templates.sideEffects}:** ${result.sideEffects.join('. ')}\n\n`;
      structuredData.sideEffects = result.sideEffects;
    }

    // 6. Allergy Warning
    if (result.allergyWarning) {
      content += `**${templates.allergyWarning}:** ${result.allergyWarning}\n\n`;
      structuredData.allergyWarning = result.allergyWarning;
    }

    // 7. Drug Interactions
    if (result.drugInteractions) {
      content += `**${templates.drugInteractions}:** ${result.drugInteractions}\n\n`;
      structuredData.drugInteractions = result.drugInteractions;
    }

    // 8. Safety Notes
    if (result.safetyNotes) {
      content += `**${templates.safetyNotes}:** ${result.safetyNotes}\n\n`;
      structuredData.safetyNotes = result.safetyNotes;
    }

    // 9. Storage
    if (result.storage) {
      content += `**${templates.storage}:** ${result.storage}\n\n`;
      structuredData.storage = result.storage;
    }

    // 10. Disclaimer
    if (result.disclaimer) {
      content += `**${templates.disclaimer}:** ${result.disclaimer}`;
    } else {
      content += `**${templates.disclaimer}:** ${templates.defaultDisclaimer}`;
    }

    // Add confidence if available
    if (result.confidence) {
      structuredData.confidence = result.confidence;
    }

    return {
      title: `${templates.analysisTitle} - ${result.medicineName || 'Medicine'}`,
      content,
      structuredData
    };
  }

  private static formatLegacyAnalysis(result: MedicineAnalysisResult, language: string): FormattedMessage {
    const templates = this.getLanguageTemplates(language);
    
    let content = '';
    let structuredData: any = {};

    // Legacy format (existing logic)
    if (result.medicineName) {
      content += `**${templates.medicineName}:** ${result.medicineName}\n\n`;
      structuredData.medicineName = result.medicineName;
    }

    if (result.genericName) {
      content += `**${templates.genericName}:** ${result.genericName}\n\n`;
      structuredData.genericName = result.genericName;
    }

    if (result.category) {
      content += `**${templates.category}:** ${result.category}\n\n`;
      structuredData.category = result.category;
    }

    if (result.dosage) {
      content += `**${templates.dosageInstructions}:**\n${result.dosage}\n\n`;
      structuredData.dosage = result.dosage;
    }

    if (result.sideEffects && result.sideEffects.length > 0) {
      content += `**${templates.sideEffects}:**\n`;
      result.sideEffects.forEach((effect, index) => {
        content += `${index + 1}. ${effect}\n`;
      });
      content += '\n';
      structuredData.sideEffects = result.sideEffects;
    }

    if (result.storage) {
      content += `**${templates.storage}:** ${result.storage}\n\n`;
      structuredData.storage = result.storage;
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
        packagingDetected: 'Packaging Detected',
        medicineName: 'Medicine Name',
        genericName: 'Generic Name',
        purpose: 'Purpose',
        dosageInstructions: 'Dosage Instructions',
        sideEffects: 'Side Effects',
        allergyWarning: 'Allergy Warning',
        drugInteractions: 'Drug Interactions',
        safetyNotes: 'Safety Notes',
        storage: 'Storage',
        warnings: 'Important Warnings',
        interactions: 'Drug Interactions',
        confidence: 'Analysis Confidence',
        disclaimer: 'Disclaimer',
        defaultDisclaimer: '⚠️ **Important Disclaimer:** This information is sourced from public websites, packaging details, and the NPRA database. For informational purposes only. Not medical advice. Consult a doctor or pharmacist before use.',
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
        packagingDetected: 'Pembungkusan Dikesan',
        medicineName: 'Nama Ubat',
        genericName: 'Nama Generik',
        purpose: 'Tujuan',
        dosageInstructions: 'Arahan Dos',
        sideEffects: 'Kesan Sampingan',
        allergyWarning: 'Amaran Alahan',
        drugInteractions: 'Interaksi Ubat',
        safetyNotes: 'Nota Keselamatan',
        storage: 'Penyimpanan',
        warnings: 'Amaran Penting',
        interactions: 'Interaksi Ubat',
        confidence: 'Keyakinan Analisis',
        disclaimer: 'Penafian',
        defaultDisclaimer: '⚠️ **Penafian Penting:** Maklumat ini diperoleh dari laman web awam, butiran pembungkusan, dan pangkalan data NPRA. Untuk tujuan maklumat sahaja. Bukan nasihat perubatan. Rujuk doktor atau ahli farmasi sebelum digunakan.',
        errorTitle: 'Ralat Analisis',
        error: 'Ralat',
        tryAgain: 'Sila cuba lagi dengan imej yang lebih jelas atau hubungi sokongan jika masalah berterusan.'
      }
    };

    return templates[language] || templates['English'];
  }
}
