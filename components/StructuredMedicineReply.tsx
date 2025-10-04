'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Pill, AlertTriangle, Shield, AlertCircle } from 'lucide-react';

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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['dosage']));

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  // Check if this is Gemini format (new) or legacy format
  const isGeminiFormat = !!(response.medicine_name || response.purpose || response.dosage_instructions);

  const SectionHeader: React.FC<{
    sectionId: string;
    title: string;
    icon: React.ReactNode;
    isExpanded: boolean;
    textColor?: string;
  }> = ({ sectionId, title, icon, isExpanded, textColor = 'text-blue-400' }) => (
    <button
      onClick={() => toggleSection(sectionId)}
      className={`w-full flex items-center justify-between p-4 rounded-lg transition-all duration-200 hover:bg-gray-800/50 ${textColor}`}
    >
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      {isExpanded ? (
        <ChevronDown className="w-5 h-5" />
      ) : (
        <ChevronRight className="w-5 h-5" />
      )}
    </button>
  );

  const SectionContent: React.FC<{
    content: string;
    details?: string[];
  }> = ({ content, details }) => (
    <div className="px-4 pb-4">
      <p className="text-gray-300 leading-relaxed mb-3">{content}</p>
      {details && details.length > 0 && (
        <ul className="space-y-2">
          {details.map((detail, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-400">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

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
    <div className="bg-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-xl overflow-hidden shadow-2xl">
      {/* Medicine Header - Show for Gemini format */}
      {isGeminiFormat && (response.medicine_name || response.purpose) && (
        <div className="p-4 border-b border-gray-700/30">
          {response.medicine_name && (
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-white mb-1">Medicine</h2>
              <p className="text-gray-300">{response.medicine_name}</p>
            </div>
          )}
          {response.purpose && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Purpose</h2>
              <p className="text-gray-300 leading-relaxed">{response.purpose}</p>
            </div>
          )}
        </div>
      )}
      
      {/* Expandable Sections */}
      {sections.map((section) => {
        const isExpanded = expandedSections.has(section.id);
        return (
          <div key={section.id} className="border-b border-gray-700/30 last:border-b-0">
            <SectionHeader
              sectionId={section.id}
              title={section.title}
              icon={section.icon}
              isExpanded={isExpanded}
              textColor={section.textColor}
            />
            {isExpanded && section.data && (
              <div className="border-t border-gray-700/30 bg-gray-800/30">
                <SectionContent
                  content={section.data.content}
                  details={section.data.details}
                />
              </div>
            )}
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
