export const STRINGS = {
  en: {
    welcome: {
      title: "Welcome to the Chauṭarī",
      subtitle: "Others are already under the tree. Add your voice so the circle knows you’re here.",
      begin: "Begin my circle",
      footer_privacy: "We save as you go. You control visibility."
    },
    nameFace: {
      stepTitle: "What should we call you?",
      hint: "Use a real photo so neighbors recognize you. Surname is optional.",
      labels: { name: "Name*", surname: "Surname (optional)", addPhoto: "Add a photo" },
      placeholders: { name: "e.g., Nabin", surname: "e.g., Shrestha" },
      cta: { takeSelfie: "Take a selfie", chooseGallery: "Choose from gallery", retake: "Retake", continue: "Continue" },
      toasts: { saved: "Saved.", uploadFail: "Upload failed." }
    },
    roots: {
      stepTitle: "Where do your roots touch the earth?",
      hint: "Choose Nepal or Abroad. You can refine later.",
      toggleAbroad: "I live abroad",
      labels: { province: "Province", district: "District", palika: "Palika", ward: "Ward", tole: "Tole (optional)", country: "Country", city: "City" },
      cta: { back: "Back", continue: "Continue" }
    },
    ikigai: {
      stepTitle: "What are you hoping to grow here?",
      hint: "One honest line is enough for today.",
      placeholder: "e.g., Find collaborators for a neighborhood garden.",
      cta: { back: "Back", finish: "Finish" },
      done: "All set. Welcome to the circle!"
    }
  },
  np: {
    welcome: {
      title: "चौतारीमा स्वागत छ",
      subtitle: "रुखमुनि मानिसहरू भेला भइसकेका छन्। आफ्नो स्वर थप्नुहोस्।",
      begin: "मेराे घेरा सुरु गरौँ",
      footer_privacy: "तपाईंले नै देखिने कुरा नियन्त्रण गर्नुहुन्छ।"
    },
    nameFace: {
      stepTitle: "घेरामा के भनी बोलाऔँ?",
      hint: "छिमेकीले चिन्न वास्तविक फोटो राख्नुहोस्। थर वैकल्पिक हो।",
      labels: { name: "नाम*", surname: "थर (वैकल्पिक)", addPhoto: "फोटो थप्नुहोस्" },
      placeholders: { name: "जस्तै, नबिन", surname: "जस्तै, श्रेष्ठ" },
      cta: { takeSelfie: "सेल्फी खिच्नुहोस्", chooseGallery: "ग्यालेरीबाट छान्नुहोस्", retake: "फेरि खिच्नुहोस्", continue: "अगाडि बढ्नुहोस्" },
      toasts: { saved: "सेभ भयो।", uploadFail: "अपलोड असफल।" }
    },
    roots: {
      stepTitle: "तपाईंका जराहरू कहाँ टेकिएका छन्?",
      hint: "नेपाल वा विदेश छान्नुहोस्। पछि सजिलै मिल्छ।",
      toggleAbroad: "म विदेशमा बस्छु",
      labels: { province: "प्रदेश", district: "जिल्ला", palika: "पालिका", ward: "वडा", tole: "टोल (वैकल्पिक)", country: "देश", city: "सहर" },
      cta: { back: "पछाडि", continue: "अगाडि बढ्नुहोस्" }
    },
    ikigai: {
      stepTitle: "यहाँ के हुर्काउन चाहनुहुन्छ?",
      hint: "आज एक वाक्य भए पुग्छ।",
      placeholder: "जस्तै, टोलको बगैँचाका लागि सहयात्री खोज्ने।",
      cta: { back: "पछाडि", finish: "सम्पन्न" },
      done: "सबै तयार। घेरामा स्वागत छ!"
    }
  }
} as const;
export type LangKey = keyof typeof STRINGS;
