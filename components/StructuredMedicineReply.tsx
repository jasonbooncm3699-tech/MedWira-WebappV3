'use client';

import React from 'react';
import { Pill, AlertTriangle, Shield, AlertCircle } from 'lucide-react';

interface StructuredMedicineData {
  // Gemini output format
  medicine_name?: string;
  generic_name?: string;
  purpose?: string;
  dosage_instructions?: string;
  side_effects?: string;
  drug_interactions?: string;
  safety_notes?: string;
  storage?: string;
  allergy_warning?: string;
  packaging_detected?: string;
  disclaimer?: string;
  
  // Legacy format (for backward compatibility)
  dosage?: {
    title: string;
    content: string;
    details?: string[];
  };
  sideEffects?: {
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
}

const StructuredMedicineReply: React.FC<StructuredMedicineReplyProps> = ({ response }) => {

  // Check if this is Gemini format (new) or legacy format
  const isGeminiFormat = !!(response.medicine_name || response.purpose || response.dosage_instructions);


  // Create sections based on format
  const sections = isGeminiFormat ? [
    {
      id: 'dosage',
      title: 'Dosage & Administration',
      icon: <Pill className="w-5 h-5" />,
      data: response.dosage_instructions ? {
        title: 'Dosage & Administration',
        content: response.dosage_instructions,
        details: [response.dosage_instructions]
      } : null,
      textColor: 'text-green-400'
    },
    {
      id: 'sideEffects',
      title: 'Potential Side Effects',
      icon: <AlertTriangle className="w-5 h-5" />,
      data: response.side_effects ? {
        title: 'Potential Side Effects',
        content: response.side_effects,
        details: [response.side_effects]
      } : null,
      textColor: 'text-yellow-400'
    },
    {
      id: 'interactions',
      title: 'Key Drug Interactions',
      icon: <Shield className="w-5 h-5" />,
      data: response.drug_interactions ? {
        title: 'Key Drug Interactions',
        content: response.drug_interactions,
        details: [response.drug_interactions]
      } : null,
      textColor: 'text-orange-400'
    },
    {
      id: 'warnings',
      title: 'Warnings & Contraindications',
      icon: <AlertCircle className="w-5 h-5" />,
      data: response.safety_notes ? {
        title: 'Warnings & Contraindications',
        content: response.safety_notes,
        details: [response.safety_notes]
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

  return (
    <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-2xl p-4">
      {/* Medicine Header - Show for Gemini format */}
      {isGeminiFormat && (response.medicine_name || response.purpose) && (
        <div className="mb-4">
          {response.medicine_name && (
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-white mb-1">Medicine</h2>
              <p className="text-gray-300">{response.medicine_name}</p>
            </div>
          )}
          {response.purpose && (
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-white mb-1">Purpose</h2>
              <p className="text-gray-300 leading-relaxed">{response.purpose}</p>
            </div>
          )}
        </div>
      )}
      
      {/* All Information Displayed as Text - No Expandable Sections */}
      {sections.map((section) => {
        if (!section.data) return null;
        
        return (
          <div key={section.id} className="mb-4 last:mb-0">
            <div className="flex items-center gap-2 mb-2">
              {section.icon}
              <h3 className={`font-semibold text-lg ${section.textColor || 'text-white'}`}>
                {section.title}
              </h3>
            </div>
            <div className="ml-7">
              <p className="text-gray-300 leading-relaxed mb-2">{section.data.content}</p>
              {section.data.details && section.data.details.length > 0 && (
                <div className="space-y-1">
                  {section.data.details.map((detail, index) => (
                    <p key={index} className="text-sm text-gray-400 ml-4">
                      • {detail}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
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
  sideEffects: {
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
