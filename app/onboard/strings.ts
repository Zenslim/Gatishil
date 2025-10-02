// app/onboard/strings.ts
export const STRINGS = {
  en: {
    welcome: {
      title: "Welcome to the Chauṭarī",
      subtitle: "Others are already sitting under the tree. Add your voice so the circle knows you’re here.",
      begin: "Begin my circle",
      footer_privacy: "We save as you go. You decide what to show. Nothing is shared without your say."
    },
    nameFace: {
      stepTitle: "What should we call you in the circle?",
      hint: "Use your real face so neighbors recognize you. Surname is optional.",
      labels: { name: "Name*", surname: "Surname (optional)", addPhoto: "Add a photo" },
      placeholders: { name: "e.g., Nabin", surname: "e.g., Shrestha" },
      cta: { takeSelfie: "Take a selfie", chooseGallery: "Choose from gallery", confirm: "Confirm", retake: "Retake", continue: "Continue" },
      whyTitle: "Why a real face?",
      whyText: "Faces help real people connect. You control visibility.",
      toasts: { saved: "Saved.", offline: "Offline — will sync soon.", uploadFail: "Upload failed.", lowQuality: "Use a brighter, clearer photo.", cameraBlocked: "Camera blocked — pick from gallery." },
      a11y: { selfieButton: "Open camera", galleryButton: "Open gallery", cropperInstr: "Pinch/drag to center your face, then confirm." }
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
      hint: "One line today is enough. We’ll revisit together.",
      placeholder: "e.g., “Find collaborators for a neighborhood garden.”",
      cta: { back: "Back", finish: "Finish" },
      done: "All set. Welcome to the circle!"
    },
    prompts: [
      "A circle becomes real when a voice becomes visible.",
      "Trust grows when faces meet in the shade of the same tree.",
      "Your presence is the first gift to the community.",
      "A name is a knock; a face is the open door.",
      "If not you, the circle is missing one star."
    ]
  },

  np: {
    welcome: {
      title: "चौतारीमा स्वागत छ",
      subtitle: "रुखमुनि मान्छेहरू भेला भइसकेका छन्। आफ्नो स्वर थप्नुहोस् ताकि घेराले तपाईंलाई चिन्न सकोस्।",
      begin: "मेराे घेरा सुरु गरौँ",
      footer_privacy: "अहिलेदेखि नै बचत हुन्छ। के देखिने भनेर तपाईंले नै ठान्नुहुन्छ। स्वीकृतिबिना केही साझा हुँदैन।"
    },
    nameFace: {
      stepTitle: "घेरामा तपाईंलाई के भनी बोलाऔँ?",
      hint: "छिमेकीले चिनून् भनेर वास्तविक फोटो राख्नुहोस्। थर वैकल्पिक हो।",
      labels: { name: "नाम*", surname: "थर (वैकल्पिक)", addPhoto: "फोटो थप्नुहोस्" },
      placeholders: { name: "जस्तै, नबिन", surname: "जस्तै, श्रेष्ठ" },
      cta: { takeSelfie: "सेल्फी खिच्नुहोस्", chooseGallery: "ग्यालेरीबाट छान्नुहोस्", confirm: "पक्का गर्नुहोस्", retake: "फेरि खिच्नुहोस्", continue: "अगाडि बढ्नुहोस्" },
      whyTitle: "किन वास्तविक फोटो?",
      whyText: "असली अनुहारले असली भेट गराउँछ। के देखिने भन्ने तपाईंको हातमा।",
      toasts: { saved: "सेभ भयो।", offline: "अफलाइन — चाँडै सिंक हुन्छ।", uploadFail: "अपलोड असफल।", lowQuality: "अझ उज्यालो र स्पष्ट फोटो प्रयोग गर्नुहोस्।", cameraBlocked: "क्यामेरा अवरुद्ध — ग्यालेरीबाट छान्नुहोस्।" },
      a11y: { selfieButton: "क्यामेरा खोल्नुहोस्", galleryButton: "ग्यालेरी खोल्नुहोस्", cropperInstr: "अनुहार बीचमा मिलाएर पक्का गर्नुहोस्।" }
    },
    roots: {
      stepTitle: "तपाईंका जराहरू कहाँ टेकिएका छन्?",
      hint: "नेपाल वा विदेश छान्नुहोस्। पछि सजिलै मिलाउन सकिन्छ।",
      toggleAbroad: "म विदेशमा बस्छु",
      labels: { province: "प्रदेश", district: "जिल्ला", palika: "पालिका", ward: "वडा", tole: "टोल (वैकल्पिक)", country: "देश", city: "सहर" },
      cta: { back: "पछाडि", continue: "अगाडि बढ्नुहोस्" }
    },
    ikigai: {
      stepTitle: "यहाँ के हुर्काउन चाहनुहुन्छ?",
      hint: "आज एक वाक्य भए पुग्छ। पछि सँगै परिष्कृत गरौँ।",
      placeholder: "जस्तै, “टोलको बगैँचाका लागि सहयात्री खोज्ने।”",
      cta: { back: "पछाडि", finish: "सम्पन्न" },
      done: "सबै तयार। घेरामा स्वागत छ!"
    },
    prompts: [
      "स्वर देखियो भने मात्रै घेरा साँचो बन्छ।",
      "विश्वास त्यही छायाँमा बढ्छ जहाँ अनुहारहरू भेटिन्छन्।",
      "समुदायका लागि तपाईंको उपस्थिती नै पहिलो उपहार हो।",
      "नाम ढक्ढक्याउनु हो; अनुहार ढोका खोल्नु हो।",
      "तपाईं बिना घेरामा एउटा तारा कमै छ।"
    ]
  }
};
