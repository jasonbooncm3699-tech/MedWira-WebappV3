/**
 * Translation Service - Frontend Translation System
 * 
 * This service provides translation capabilities for medicine analysis results
 * and UI elements across all supported languages.
 * 
 * Database stores everything in English, frontend translates based on user preference.
 */

export interface TranslationMaps {
  [language: string]: {
    [key: string]: string;
  };
}

export const SUPPORTED_LANGUAGES = [
  'English',
  'Chinese', 
  'Malay',
  'Indonesian',
  'Thai',
  'Vietnamese',
  'Filipino',
  'Myanmar',
  'Khmer',
  'Lao'
];

export const LANGUAGE_CODES = {
  'English': 'EN',
  'Chinese': '中文',
  'Malay': 'MY',
  'Indonesian': 'ID',
  'Thai': 'TH',
  'Vietnamese': 'VN',
  'Filipino': 'TL',
  'Myanmar': 'MM',
  'Khmer': 'KH',
  'Lao': 'LA'
};

// Comprehensive translation maps for medicine analysis
export const MEDICINE_TRANSLATIONS: TranslationMaps = {
  'Chinese': {
    // Section headers
    '**Medicine**': '**药品**',
    '**Purpose**': '**用途**',
    '**Dosage**': '**剂量**',
    '**Side Effects**': '**副作用**',
    '**Warnings**': '**警告**',
    '**Storage**': '**储存**',
    '**Disclaimer**': '**免责声明**',
    
    // Common terms
    'Adults': '成人',
    'Children': '儿童',
    'Common': '常见',
    'Serious': '严重',
    'Do not take': '请勿服用',
    'Consult doctor': '咨询医生',
    'Store in': '存放在',
    'dry and cool place': '干燥阴凉处',
    'as directed by doctor': '按医生指示',
    'for educational purposes only': '仅供教育目的',
    'always consult': '请务必咨询',
    'healthcare professional': '医疗专业人士',
    'if allergic': '如有过敏',
    'nausea': '恶心',
    'headache': '头痛',
    'tablets': '片剂',
    
    // Medicine types
    'Pain relief medication': '止痛药',
    'Antibiotic': '抗生素',
    'Anti-inflammatory': '抗炎药',
    'Tablet': '片剂',
    'Capsule': '胶囊',
    'Syrup': '糖浆',
    'Injection': '注射剂'
  },
  
  'Malay': {
    // Section headers
    '**Medicine**': '**Ubat**',
    '**Purpose**': '**Tujuan**',
    '**Dosage**': '**Dos**',
    '**Side Effects**': '**Kesan Sampingan**',
    '**Warnings**': '**Amaran**',
    '**Storage**': '**Penyimpanan**',
    '**Disclaimer**': '**Penafian**',
    
    // Common terms
    'Adults': 'Dewasa',
    'Children': 'Kanak-kanak',
    'Common': 'Biasa',
    'Serious': 'Serius',
    'Do not take': 'Jangan ambil',
    'Consult doctor': 'Berunding dengan doktor',
    'Store in': 'Simpan di',
    'dry and cool place': 'tempat kering dan sejuk',
    'as directed by doctor': 'seperti yang diarahkan oleh doktor',
    'for educational purposes only': 'untuk tujuan pendidikan sahaja',
    'always consult': 'sentiasa berunding',
    'healthcare professional': 'profesional penjagaan kesihatan',
    'if allergic': 'jika alah',
    'nausea': 'loya',
    'headache': 'sakit kepala',
    'tablets': 'tablet',
    
    // Medicine types
    'Pain relief medication': 'Ubat penahan sakit',
    'Antibiotic': 'Antibiotik',
    'Anti-inflammatory': 'Anti-radang',
    'Tablet': 'Tablet',
    'Capsule': 'Kapsul',
    'Syrup': 'Sirap',
    'Injection': 'Suntikan'
  },
  
  'Indonesian': {
    // Section headers
    '**Medicine**': '**Obat**',
    '**Purpose**': '**Tujuan**',
    '**Dosage**': '**Dosis**',
    '**Side Effects**': '**Efek Samping**',
    '**Warnings**': '**Peringatan**',
    '**Storage**': '**Penyimpanan**',
    '**Disclaimer**': '**Penyangkalan**',
    
    // Common terms
    'Adults': 'Dewasa',
    'Children': 'Anak-anak',
    'Common': 'Umum',
    'Serious': 'Serius',
    'Do not take': 'Jangan minum',
    'Consult doctor': 'Konsultasi dokter',
    'Store in': 'Simpan di',
    'dry and cool place': 'tempat kering dan sejuk',
    'as directed by doctor': 'sesuai petunjuk dokter',
    'for educational purposes only': 'hanya untuk tujuan pendidikan',
    'always consult': 'selalu konsultasi',
    'healthcare professional': 'profesional kesehatan',
    
    // Medicine types
    'Pain relief medication': 'Obat pereda nyeri',
    'Antibiotic': 'Antibiotik',
    'Anti-inflammatory': 'Anti-inflamasi',
    'Tablet': 'Tablet',
    'Capsule': 'Kapsul',
    'Syrup': 'Sirup',
    'Injection': 'Suntikan'
  },
  
  'Thai': {
    // Section headers
    '**Medicine**': '**ยา**',
    '**Purpose**': '**วัตถุประสงค์**',
    '**Dosage**': '**ขนาดยา**',
    '**Side Effects**': '**ผลข้างเคียง**',
    '**Warnings**': '**คำเตือน**',
    '**Storage**': '**การเก็บรักษา**',
    '**Disclaimer**': '**ข้อจำกัดความรับผิดชอบ**',
    
    // Common terms
    'Adults': 'ผู้ใหญ่',
    'Children': 'เด็ก',
    'Common': 'ทั่วไป',
    'Serious': 'ร้ายแรง',
    'Do not take': 'ห้ามรับประทาน',
    'Consult doctor': 'ปรึกษาแพทย์',
    'Store in': 'เก็บใน',
    'dry and cool place': 'ที่แห้งและเย็น',
    'as directed by doctor': 'ตามที่แพทย์แนะนำ',
    'for educational purposes only': 'เพื่อการศึกษาเท่านั้น',
    'always consult': 'ควรปรึกษา',
    'healthcare professional': 'ผู้เชี่ยวชาญด้านสุขภาพ',
    
    // Medicine types
    'Pain relief medication': 'ยาแก้ปวด',
    'Antibiotic': 'ยาปฏิชีวนะ',
    'Anti-inflammatory': 'ยาต้านการอักเสบ',
    'Tablet': 'เม็ด',
    'Capsule': 'แคปซูล',
    'Syrup': 'น้ำเชื่อม',
    'Injection': 'ฉีด'
  },
  
  'Vietnamese': {
    // Section headers
    '**Medicine**': '**Thuốc**',
    '**Purpose**': '**Mục đích**',
    '**Dosage**': '**Liều lượng**',
    '**Side Effects**': '**Tác dụng phụ**',
    '**Warnings**': '**Cảnh báo**',
    '**Storage**': '**Bảo quản**',
    '**Disclaimer**': '**Tuyên bố từ chối trách nhiệm**',
    
    // Common terms
    'Adults': 'Người lớn',
    'Children': 'Trẻ em',
    'Common': 'Thường gặp',
    'Serious': 'Nghiêm trọng',
    'Do not take': 'Không được uống',
    'Consult doctor': 'Tham khảo ý kiến bác sĩ',
    'Store in': 'Bảo quản ở',
    'dry and cool place': 'nơi khô ráo và mát mẻ',
    'as directed by doctor': 'theo chỉ định của bác sĩ',
    'for educational purposes only': 'chỉ dành cho mục đích giáo dục',
    'always consult': 'luôn tham khảo ý kiến',
    'healthcare professional': 'chuyên gia y tế',
    
    // Medicine types
    'Pain relief medication': 'Thuốc giảm đau',
    'Antibiotic': 'Kháng sinh',
    'Anti-inflammatory': 'Chống viêm',
    'Tablet': 'Viên nén',
    'Capsule': 'Viên nang',
    'Syrup': 'Xi-rô',
    'Injection': 'Tiêm'
  },
  
  'Filipino': {
    // Section headers
    '**Medicine**': '**Gamot**',
    '**Purpose**': '**Layunin**',
    '**Dosage**': '**Dosis**',
    '**Side Effects**': '**Mga Epekto**',
    '**Warnings**': '**Mga Babala**',
    '**Storage**': '**Pagtago**',
    '**Disclaimer**': '**Disclaimer**',
    
    // Common terms
    'Adults': 'Matatanda',
    'Children': 'Mga bata',
    'Common': 'Karaniwan',
    'Serious': 'Malubha',
    'Do not take': 'Huwag inumin',
    'Consult doctor': 'Kumunsulta sa doktor',
    'Store in': 'Itago sa',
    'dry and cool place': 'tuyo at malamig na lugar',
    'as directed by doctor': 'ayon sa tagubilin ng doktor',
    'for educational purposes only': 'para sa layuning pang-edukasyon lamang',
    'always consult': 'laging kumunsulta',
    'healthcare professional': 'propesyonal sa kalusugan',
    
    // Medicine types
    'Pain relief medication': 'Gamot na pampawala ng sakit',
    'Antibiotic': 'Antibiotic',
    'Anti-inflammatory': 'Anti-inflammatory',
    'Tablet': 'Tableta',
    'Capsule': 'Kapsula',
    'Syrup': 'Sirup',
    'Injection': 'Iniksyon'
  },
  
  'Myanmar': {
    // Section headers
    '**Medicine**': '**ဆေးဝါး**',
    '**Purpose**': '**ရည်ရွယ်ချက်**',
    '**Dosage**': '**ဆေးပမာဏ**',
    '**Side Effects**': '**ဘေးထွက်ဆိုးကျိုးများ**',
    '**Warnings**': '**သတိပေးချက်များ**',
    '**Storage**': '**သိမ်းဆည်းခြင်း**',
    '**Disclaimer**': '**အကြောင်းကြားချက်**',
    
    // Common terms
    'Adults': 'လူကြီးများ',
    'Children': 'ကလေးများ',
    'Common': 'အများအားဖြင့်',
    'Serious': 'ပြင်းထန်',
    'Do not take': 'မသောက်ပါနှင့်',
    'Consult doctor': 'ဆရာဝန်နှင့်တိုင်ပင်ပါ',
    'Store in': 'သိမ်းဆည်းပါ',
    'dry and cool place': 'ခြောက်သွေ့သောနေရာ',
    'as directed by doctor': 'ဆရာဝန်ညွှန်ကြားသည့်အတိုင်း',
    'for educational purposes only': 'ပညာရေးရည်ရွယ်ချက်အတွက်သာ',
    'always consult': 'အမြဲတိုင်ပင်ပါ',
    'healthcare professional': 'ကျန်းမာရေးပညာရှင်',
    
    // Medicine types
    'Pain relief medication': 'နာကျင်မှုသက်သာစေသောဆေး',
    'Antibiotic': 'ပိုးသတ်ဆေး',
    'Anti-inflammatory': 'ရောင်ရမ်းမှုကုဆေး',
    'Tablet': 'ဆေးပြား',
    'Capsule': 'ဆေးတောင့်',
    'Syrup': 'ဆေးရည်',
    'Injection': 'ဆေးထိုးခြင်း'
  },
  
  'Khmer': {
    // Section headers
    '**Medicine**': '**ថ្នាំ**',
    '**Purpose**': '**គោលបំណង**',
    '**Dosage**': '**ចំនួនថ្នាំ**',
    '**Side Effects**': '**ផលវិបាក**',
    '**Warnings**': '**ការព្រមាន**',
    '**Storage**': '**ការផ្ទុក**',
    '**Disclaimer**': '**ការបដិសេធ**',
    
    // Common terms
    'Adults': 'មនុស្សពេញវ័យ',
    'Children': 'កុមារ',
    'Common': 'ជាធម្មតា',
    'Serious': 'ធ្ងន់ធ្ងរ',
    'Do not take': 'កុំយក',
    'Consult doctor': 'ពិគ្រោះជាមួយវេជ្ជបណ្ឌិត',
    'Store in': 'ផ្ទុកនៅ',
    'dry and cool place': 'កន្លែងស្ងួតនិងត្រជាក់',
    'as directed by doctor': 'តាមការណែនាំរបស់វេជ្ជបណ្ឌិត',
    'for educational purposes only': 'សម្រាប់គោលបំណងអប់រំតែប៉ុណ្ណោះ',
    'always consult': 'តែងតែពិគ្រោះ',
    'healthcare professional': 'អ្នកជំនាញសុខភាព',
    
    // Medicine types
    'Pain relief medication': 'ថ្នាំបំបាត់ឈឺ',
    'Antibiotic': 'ថ្នាំបង្ការ',
    'Anti-inflammatory': 'ថ្នាំប្រឆាំងរោគ',
    'Tablet': 'ថ្នាំគ្រាប់',
    'Capsule': 'ថ្នាំគ្រាប់',
    'Syrup': 'ថ្នាំរាវ',
    'Injection': 'ចាក់ថ្នាំ'
  },
  
  'Lao': {
    // Section headers
    '**Medicine**': '**ຢາ**',
    '**Purpose**': '**ຈຸດປະສົງ**',
    '**Dosage**': '**ປະລິມານຢາ**',
    '**Side Effects**': '**ຜົນຂ້າງຄຽງ**',
    '**Warnings**': '**ຄຳເຕືອນ**',
    '**Storage**': '**ການເກັບມ້ຽນ**',
    '**Disclaimer**': '**ຄຳແຈ້ງ**',
    
    // Common terms
    'Adults': 'ຜູ້ໃຫຍ່',
    'Children': 'ເດັກນ້ອຍ',
    'Common': 'ທົ່ວໄປ',
    'Serious': 'ຮ້າຍແຮງ',
    'Do not take': 'ບໍ່ໃຫ້ກິນ',
    'Consult doctor': 'ປຶກສາທ່ານໝໍ',
    'Store in': 'ເກັບໃນ',
    'dry and cool place': 'ບ່ອນແຫ້ງແລະເຢັນ',
    'as directed by doctor': 'ຕາມຄຳແນະນຳຂອງທ່ານໝໍ',
    'for educational purposes only': 'ສຳລັບຈຸດປະສົງການສຶກສາເທົ່ານັ້ນ',
    'always consult': 'ປຶກສາສະເໝີ',
    'healthcare professional': 'ຜູ້ຊ່ຽວຊານສາທາລະນະສຸກ',
    
    // Medicine types
    'Pain relief medication': 'ຢາບັນເທົາປວດ',
    'Antibiotic': 'ຢາຕ້ານເຊື້ອ',
    'Anti-inflammatory': 'ຢາຕ້ານການອັກເສບ',
    'Tablet': 'ຢາເມັດ',
    'Capsule': 'ຢາແຄບຊູນ',
    'Syrup': 'ຢານ້ຳຕານ',
    'Injection': 'ການສັກຢາ'
  }
};

// UI element translations
export const UI_TRANSLATIONS: TranslationMaps = {
  'Chinese': {
    'Ask in Chinese...': '用中文提问...',
    'Upload medicine image': '上传药品图片',
    'Analysis completed successfully': '分析成功完成',
    'Analysis timed out': '分析超时',
    'Starting analysis...': '正在开始分析...',
    'Extracting text from image...': '正在从图像中提取文本...',
    'Searching medicine database...': '正在搜索药品数据库...',
    'Generating medicine report...': '正在生成药品报告...'
  },
  
  'Malay': {
    'Ask in Chinese...': 'Tanya dalam Bahasa Melayu...',
    'Upload medicine image': 'Muat naik imej ubat',
    'Analysis completed successfully': 'Analisis selesai dengan jayanya',
    'Analysis timed out': 'Analisis tamat masa',
    'Starting analysis...': 'Memulakan analisis...',
    'Extracting text from image...': 'Mengekstrak teks dari imej...',
    'Searching medicine database...': 'Mencari pangkalan data ubat...',
    'Generating medicine report...': 'Menjana laporan ubat...'
  },
  
  'Indonesian': {
    'Ask in Chinese...': 'Tanya dalam Bahasa Indonesia...',
    'Upload medicine image': 'Unggah gambar obat',
    'Analysis completed successfully': 'Analisis berhasil diselesaikan',
    'Analysis timed out': 'Analisis habis waktu',
    'Starting analysis...': 'Memulai analisis...',
    'Extracting text from image...': 'Mengekstrak teks dari gambar...',
    'Searching medicine database...': 'Mencari database obat...',
    'Generating medicine report...': 'Menghasilkan laporan obat...'
  },
  
  'Thai': {
    'Ask in Chinese...': 'ถามเป็นภาษาไทย...',
    'Upload medicine image': 'อัปโหลดรูปภาพยา',
    'Analysis completed successfully': 'การวิเคราะห์เสร็จสมบูรณ์',
    'Analysis timed out': 'การวิเคราะห์หมดเวลา',
    'Starting analysis...': 'เริ่มการวิเคราะห์...',
    'Extracting text from image...': 'ดึงข้อความจากรูปภาพ...',
    'Searching medicine database...': 'ค้นหาฐานข้อมูลยา...',
    'Generating medicine report...': 'สร้างรายงานยา...'
  },
  
  'Vietnamese': {
    'Ask in Chinese...': 'Hỏi bằng tiếng Việt...',
    'Upload medicine image': 'Tải lên hình ảnh thuốc',
    'Analysis completed successfully': 'Phân tích hoàn thành thành công',
    'Analysis timed out': 'Phân tích hết thời gian',
    'Starting analysis...': 'Bắt đầu phân tích...',
    'Extracting text from image...': 'Trích xuất văn bản từ hình ảnh...',
    'Searching medicine database...': 'Tìm kiếm cơ sở dữ liệu thuốc...',
    'Generating medicine report...': 'Tạo báo cáo thuốc...'
  },
  
  'Filipino': {
    'Ask in Chinese...': 'Magtanong sa Filipino...',
    'Upload medicine image': 'Mag-upload ng larawan ng gamot',
    'Analysis completed successfully': 'Matagumpay na natapos ang pagsusuri',
    'Analysis timed out': 'Nag-timeout ang pagsusuri',
    'Starting analysis...': 'Sinisimulan ang pagsusuri...',
    'Extracting text from image...': 'Kinukuha ang teksto mula sa larawan...',
    'Searching medicine database...': 'Naghahanap sa database ng gamot...',
    'Generating medicine report...': 'Gumagawa ng ulat ng gamot...'
  },
  
  'Myanmar': {
    'Ask in Chinese...': 'မြန်မာဘာသာဖြင့်မေးပါ...',
    'Upload medicine image': 'ဆေးဝါးပုံကိုတင်ပါ',
    'Analysis completed successfully': 'ခွဲခြမ်းစိတ်ဖြာမှုအောင်မြင်စွာပြီးဆုံးပါပြီ',
    'Analysis timed out': 'ခွဲခြမ်းစိတ်ဖြာမှုအချိန်ကုန်သွားပါပြီ',
    'Starting analysis...': 'ခွဲခြမ်းစိတ်ဖြာမှုစတင်နေပါပြီ...',
    'Extracting text from image...': 'ပုံမှစာသားများကိုထုတ်နေပါပြီ...',
    'Searching medicine database...': 'ဆေးဝါးဒေတာဘေ့စ်ကိုရှာနေပါပြီ...',
    'Generating medicine report...': 'ဆေးဝါးအစီရင်ခံစာထုတ်နေပါပြီ...'
  },
  
  'Khmer': {
    'Ask in Chinese...': 'សួរជាភាសាខ្មែរ...',
    'Upload medicine image': 'ផ្ទុករូបថ្នាំ',
    'Analysis completed successfully': 'ការវិភាគបានបញ្ចប់ដោយជោគជ័យ',
    'Analysis timed out': 'ការវិភាគអស់ពេល',
    'Starting analysis...': 'ចាប់ផ្តើមការវិភាគ...',
    'Extracting text from image...': 'ស្រង់អត្ថបទពីរូបភាព...',
    'Searching medicine database...': 'ស្វែងរកមូលដ្ឋានទិន្នន័យថ្នាំ...',
    'Generating medicine report...': 'បង្កើតរបាយការណ៍ថ្នាំ...'
  },
  
  'Lao': {
    'Ask in Chinese...': 'ຖາມເປັນພາສາລາວ...',
    'Upload medicine image': 'ອັບໂຫຼດຮູບຢາ',
    'Analysis completed successfully': 'ການວິເຄາະສຳເລັດ',
    'Analysis timed out': 'ການວິເຄາະໝົດເວລາ',
    'Starting analysis...': 'ເລີ່ມການວິເຄາະ...',
    'Extracting text from image...': 'ດຶງຂໍ້ຄວາມຈາກຮູບພາບ...',
    'Searching medicine database...': 'ຊອກຫາຖານຂໍ້ມູນຢາ...',
    'Generating medicine report...': 'ສ້າງລາຍງານຢາ...'
  }
};

/**
 * Translate medicine analysis text to target language
 */
export function translateMedicineAnalysis(text: string, targetLanguage: string): string {
  if (!text || targetLanguage === 'English') {
    return text;
  }

  const translations = MEDICINE_TRANSLATIONS[targetLanguage];
  if (!translations) {
    console.warn(`No translations found for language: ${targetLanguage}`);
    return text;
  }

  let translatedText = text;

  // Apply translations in order of specificity (longer phrases first)
  const sortedKeys = Object.keys(translations).sort((a, b) => b.length - a.length);
  
  for (const key of sortedKeys) {
    const translation = translations[key];
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    translatedText = translatedText.replace(regex, translation);
  }

  return translatedText;
}

/**
 * Translate UI text to target language
 */
export function translateUIText(text: string, targetLanguage: string): string {
  if (!text || targetLanguage === 'English') {
    return text;
  }

  const translations = UI_TRANSLATIONS[targetLanguage];
  if (!translations) {
    return text;
  }

  return translations[text] || text;
}

/**
 * Get language code for a language name
 */
export function getLanguageCode(language: string): string {
  return LANGUAGE_CODES[language as keyof typeof LANGUAGE_CODES] || 'EN';
}

/**
 * Get language name from language code
 */
export function getLanguageFromCode(code: string): string {
  const entry = Object.entries(LANGUAGE_CODES).find(([_, langCode]) => langCode === code);
  return entry ? entry[0] : 'English';
}

/**
 * Check if a language is supported
 */
export function isLanguageSupported(language: string): boolean {
  return SUPPORTED_LANGUAGES.includes(language);
}

/**
 * Translate all text in a medicine analysis result
 */
export function translateAnalysisResult(result: any, targetLanguage: string): any {
  if (!result || targetLanguage === 'English') {
    return result;
  }

  const translated = { ...result };

  // Translate main analysis text
  if (translated.rawAnalysis) {
    translated.rawAnalysis = translateMedicineAnalysis(translated.rawAnalysis, targetLanguage);
  }

  // Translate structured fields if they exist
  if (translated.message) {
    translated.message = translateMedicineAnalysis(translated.message, targetLanguage);
  }

  return translated;
}
