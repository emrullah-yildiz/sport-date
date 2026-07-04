import type { Gender, RegistrationSport, Seeking, SexualOrientation } from "@sport-date/domain";
import { create } from "zustand";

export interface SignUpFields {
  step: number;
  email: string;
  password: string;
  dateOfBirth: string;
  firstName: string;
  lastName: string;
  location: string;
  bio: string;
  languages: string[];
  seeking: Seeking;
  sports: RegistrationSport[];
  acceptedTerms: boolean;
  // Optional, GDPR-careful identity fields (CX-20260704). Gender is optional and
  // not public by default; sexual orientation is Article 9 special-category data
  // stored ONLY with explicit opt-in (`orientationConsent`). Visibility flags
  // default to false — the member controls exposure.
  gender: Gender | null;
  genderSelfDescribe: string;
  genderVisible: boolean;
  sexualOrientation: SexualOrientation | null;
  orientationSelfDescribe: string;
  orientationVisible: boolean;
  orientationConsent: boolean;
  profilePhoto: File | null;
  additionalPhotos: File[];
}

export interface SignUpState extends SignUpFields {
  setStep: (step: number) => void;
  setField: <Key extends keyof SignUpFields>(field: Key, value: SignUpFields[Key]) => void;
  addSport: (sport: RegistrationSport) => void;
  removeSport: (sportName: string) => void;
  addLanguage: (language: string) => void;
  removeLanguage: (language: string) => void;
  setProfilePhoto: (file: File) => void;
  addAdditionalPhoto: (file: File) => void;
  removeAdditionalPhoto: (index: number) => void;
  reset: () => void;
}

const initialState: SignUpFields = {
  step: 1,
  email: "",
  password: "",
  dateOfBirth: "",
  firstName: "",
  lastName: "",
  location: "",
  bio: "",
  languages: [],
  seeking: "dating",
  sports: [],
  acceptedTerms: false,
  gender: null,
  genderSelfDescribe: "",
  genderVisible: false,
  sexualOrientation: null,
  orientationSelfDescribe: "",
  orientationVisible: false,
  orientationConsent: false,
  profilePhoto: null,
  additionalPhotos: [],
};

export const useSignUpStore = create<SignUpState>((set) => ({
  ...initialState,
  setStep: (step) => set({ step }),
  setField: (field, value) => set({ [field]: value }),
  addSport: (sport) => set((state) => (
    state.sports.length >= 5 || state.sports.some((item) => item.name === sport.name)
      ? state
      : { sports: [...state.sports, sport] }
  )),
  removeSport: (sportName) => set((state) => ({
    sports: state.sports.filter((sport) => sport.name !== sportName),
  })),
  addLanguage: (language) => set((state) => ({
    languages: state.languages.includes(language)
      ? state.languages
      : [...state.languages, language],
  })),
  removeLanguage: (language) => set((state) => ({
    languages: state.languages.filter((item) => item !== language),
  })),
  setProfilePhoto: (profilePhoto) => set({ profilePhoto }),
  addAdditionalPhoto: (file) => set((state) => ({
    additionalPhotos: [...state.additionalPhotos, file],
  })),
  removeAdditionalPhoto: (index) => set((state) => ({
    additionalPhotos: state.additionalPhotos.filter((_, itemIndex) => itemIndex !== index),
  })),
  reset: () => set(initialState),
}));

