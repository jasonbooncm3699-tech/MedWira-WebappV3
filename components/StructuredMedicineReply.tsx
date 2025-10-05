'use client';

import React from 'react';
import { Pill, AlertTriangle, Shield, AlertCircle } from 'lucide-react';

interface StructuredMedicineData {
  // Backend format (camelCase) - PRIMARY
  medicineName?: string;
  genericName?: string;
  purpose?: string;
  dosageInstructions?: string;
  sideEffects?: string;
  drugInteractions?: string;
  safetyNotes?: string;
  storage?: string;
  allergyWarning?: string;
  packagingDetected?: string;
  disclaimer?: string;
  activeIngredients?: string;
  databaseVerified?: boolean;
  confidence?: number;
  language?: string;
  rawAnalysis?: string;
  
  // Legacy format (snake_case) - FALLBACK
  medicine_name?: string;
  generic_name?: string;
  dosage_instructions?: string;
  side_effects?: string;
  drug_interactions?: string;
  safety_notes?: string;
  allergy_warning?: string;
  packaging_detected?: string;
  active_ingredients?: string;
  database_verified?: boolean;
  raw_analysis?: string;
  
  // Legacy format (for backward compatibility)
  dosage?: {
    title: string;
    content: string;
    details?: string[];
  };
  legacySideEffects?: {
    title: string;
    content: string;
    details?: string[];
  };
  interactions?: {
    title: string;
    content: string;
    details?: string[];
  };
  warnings?: {
    title: string;
    content: string;
    details?: string[];
  };
}

interface StructuredMedicineReplyProps {
  response: StructuredMedicineData;
  onRender?: () => void;
}

const StructuredMedicineReply: React.FC<StructuredMedicineReplyProps> = ({ response, onRender }) => {

  // Check if this is backend format (camelCase) or legacy format
  const isGeminiFormat = !!(response.medicineName || response.medicine_name || response.purpose || response.dosageInstructions || response.dosage_instructions);

  // Call onRender callback when component is fully rendered
  React.useEffect(() => {
    if (onRender) {
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        onRender();
      });
    }
  }, [onRender]);


  // Create sections based on format - prioritize backend camelCase format
  const sections = isGeminiFormat ? [
    {
      id: 'dosage',
      title: 'Dosage Instructions',
      icon: <Pill className="w-5 h-5" />,
      data: (response.dosageInstructions || response.dosage_instructions) ? {
        title: 'Dosage Instructions',
        content: response.dosageInstructions || response.dosage_instructions || 'See detailed analysis below',
        details: [response.dosageInstructions || response.dosage_instructions || 'See detailed analysis below']
      } : null,
      textColor: 'text-green-400'
    },
    {
      id: 'sideEffects',
      title: 'Side Effects',
      icon: <AlertTriangle className="w-5 h-5" />,
      data: (response.sideEffects || response.side_effects) ? {
        title: 'Side Effects',
        content: response.sideEffects || response.side_effects || 'See detailed analysis',
        details: [response.sideEffects || response.side_effects || 'See detailed analysis']
      } : null,
      textColor: 'text-yellow-400'
    },
    {
      id: 'interactions',
      title: 'Drug Interactions',
      icon: <Shield className="w-5 h-5" />,
      data: (response.drugInteractions || response.drug_interactions) ? {
        title: 'Drug Interactions',
        content: response.drugInteractions || response.drug_interactions || 'See detailed analysis',
        details: [response.drugInteractions || response.drug_interactions || 'See detailed analysis']
      } : null,
      textColor: 'text-orange-400'
    },
    {
      id: 'warnings',
      title: 'Safety Notes',
      icon: <AlertCircle className="w-5 h-5" />,
      data: (response.safetyNotes || response.safety_notes) ? {
        title: 'Safety Notes',
        content: response.safetyNotes || response.safety_notes || 'See detailed analysis',
        details: [response.safetyNotes || response.safety_notes || 'See detailed analysis']
      } : null,
      textColor: 'text-red-400'
    }
  ] : [
    {
      id: 'dosage',
      title: 'Dosage & Administration',
      icon: <Pill className="w-5 h-5" />,
      data: response.dosage,
      textColor: 'text-green-400'
    },
    {
      id: 'sideEffects',
      title: 'Potential Side Effects',
      icon: <AlertTriangle className="w-5 h-5" />,
      data: response.sideEffects,
      textColor: 'text-yellow-400'
    },
    {
      id: 'interactions',
      title: 'Key Drug Interactions',
      icon: <Shield className="w-5 h-5" />,
      data: response.interactions,
      textColor: 'text-orange-400'
    },
    {
      id: 'warnings',
      title: 'Warnings & Contraindications',
      icon: <AlertCircle className="w-5 h-5" />,
      data: response.warnings,
      textColor: 'text-red-400'
    }
  ];

  // Function to clean up the text formatting
  const formatAnalysisText = (text: string): string => {
    return text
      // Remove excessive line breaks (more than 2 consecutive)
      .replace(/\n{3,}/g, '\n\n')
      // Ensure consistent spacing after colons
      .replace(/:\s*\n/g, ':\n')
      // Clean up bullet point spacing
      .replace(/•\s*\n/g, '• ')
      // Remove trailing whitespace
      .trim();
  };

  return (
    <div className="message-bubble" style={{
      background: 'rgba(255, 255, 255, 0.1)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '12px',
      padding: '8px 12px',
      margin: '4px 0',
      maxWidth: '100%',
      wordWrap: 'break-word'
    }}>
      {/* Display raw analysis text with clean formatting - prioritize backend format */}
      {(response.rawAnalysis || response.raw_analysis) && (
        <div className="raw-analysis-content" style={{
          fontSize: '14px',
          lineHeight: '1.4',
          color: '#ffffff',
          whiteSpace: 'pre-wrap',
          margin: 0,
          padding: 0
        }}>
          <div style={{
            whiteSpace: 'pre-wrap',
            lineHeight: '1.4',
            margin: 0,
            padding: 0
          }}>
            {formatAnalysisText(response.rawAnalysis || response.raw_analysis || '')}
          </div>
        </div>
      )}
    </div>
  );
};

export default StructuredMedicineReply;

// Placeholder data for testing
export const sampleMedicineData: StructuredMedicineData = {
  dosage: {
    title: 'Dosage & Administration',
    content: 'Take 500mg every 8 hours with food. Do not exceed 1500mg per day unless directed by your doctor.',
    details: [
      'For adults: 500mg three times daily',
      'Take with a full glass of water',
      'Do not crush or chew extended-release tablets',
      'Store at room temperature away from moisture'
    ]
  },
  legacySideEffects: {
    title: 'Potential Side Effects',
    content: 'Common side effects include nausea, headache, and dizziness. Contact your doctor if you experience severe reactions.',
    details: [
      'Common: Nausea, headache, dizziness, fatigue',
      'Less common: Rash, itching, stomach pain',
      'Rare but serious: Severe allergic reactions, liver problems',
      'Seek immediate medical attention for breathing difficulties'
    ]
  },
  interactions: {
    title: 'Key Drug Interactions',
    content: 'This medication may interact with blood thinners, diabetes medications, and certain antibiotics.',
    details: [
      'Blood thinners: May increase bleeding risk',
      'Diabetes medications: May affect blood sugar levels',
      'Certain antibiotics: May reduce effectiveness',
      'Always inform your doctor of all medications you take'
    ]
  },
  warnings: {
    title: 'Warnings & Contraindications',
    content: 'Do not use if you have severe kidney disease or are allergic to this medication. Pregnant women should consult their doctor.',
    details: [
      'Contraindicated in severe kidney disease',
      'Allergy warning: Stop use if rash or swelling occurs',
      'Pregnancy: Consult doctor before use',
      'Elderly patients may need dosage adjustment'
    ]
  }
};
