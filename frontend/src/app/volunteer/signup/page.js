"use client";
import { useState, useEffect } from "react";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { auth, googleProvider } from "../../../services/firebase";
import { API_BASE } from "../../../config/config";
import { submitVolunteerApplication } from "../../../services/applicantsService";
import { apiCall } from "../../../utils/apiUtils";
import { getApplicationSettings } from "@/services";
import {
  isValidName,
  isValidMiddleInitial,
  isValidNickname,
  isValidMobile,
  isValidCity,
  isValidSocialUrl,
  isValidGraduation,
  isNotFutureDate,
  isValidSmallText,
  isAlpha,
  countSentences,
  isSentenceCountInRange,
  normalizeMobile,
} from "../../../utils/formValidation";

export default function VolunteerSignupPage() {
  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    middleInitial: "",
    nickname: "",
    birthdate: "",
    gender: "",
    genderOther: "",
    consent: "",
    mobileNumber: "",
    city: "",
    facebook: "",
    twitter: "",
    instagram: "",
    tiktok: "",
    currentStatus: "",
    position: "",
    industry: "",
    company: "",
    workingDays: [],
    workShift: "",
    workOtherSkills: "",
    school: "",
    course: "",
    graduation: "",
    schoolDays: [],
    studentOtherSkills: "",
    // Volunteer Profile fields
    volunteerRoles: [],
    volunteerOtherRole: "",
    volunteerDays: [],
    volunteerFrequency: "",
    volunteerTrainings: [],
    trainingCertificates: [],
    volunteerReason: "",
    declarationCommitment: "",
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [applicationSettings, setApplicationSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState("");

  // Check Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("volunteerForm");
      if (saved) {
        try {
          setForm((prev) => ({ ...prev, ...JSON.parse(saved) }));
        } catch {}
      }
    }
  }, []);

  // Fetch application settings
  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoadingSettings(true);
        const result = await getApplicationSettings();
        if (result?.success) setApplicationSettings(result.data);
      } catch (err) {
        console.error("Failed to fetch application settings:", err);
      } finally {
        setLoadingSettings(false);
      }
    }
    fetchSettings();
  }, []);

  // Calculate time remaining until deadline (for open applications)
  useEffect(() => {
    if (!applicationSettings?.is_open || !applicationSettings?.deadline) {
      setTimeRemaining("");
      return;
    }

    const calculateTimeRemaining = () => {
      const now = new Date();
      const deadline = new Date(applicationSettings.deadline);
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeRemaining("Deadline passed");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h remaining`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else {
        if (minutes <= 0) {
          setTimeRemaining("Less than a minute");
        } else {
          setTimeRemaining(`${minutes}m remaining`);
        }
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [applicationSettings]);

  // Save to localStorage on every form change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("volunteerForm", JSON.stringify(form));
    }
  }, [form]);

  // Helper for checkbox arrays
  const handleCheckboxArray = (e, field) => {
    const { value, checked } = e.target;
    setForm((prev) => {
      const arr = prev[field] || [];
      let updatedArr;
      if (checked) {
        updatedArr = [...arr, value];
      } else {
        updatedArr = arr.filter((v) => v !== value);
      }
      // If the checkbox is a training being unchecked, remove any uploaded certificate
      if (field === 'volunteerTrainings' && !checked) {
        return { ...prev, [field]: updatedArr, trainingCertificates: (prev.trainingCertificates || []).filter(c => c.trainingName !== value) };
      }
      return { ...prev, [field]: updatedArr };
    });
  };

  // Upload helpers
  const updateCertificateState = (trainingName, patch) => {
    setForm(prev => {
      const list = Array.isArray(prev.trainingCertificates) ? [...prev.trainingCertificates] : [];
      const idx = list.findIndex(c => c.trainingName === trainingName);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...patch };
      } else {
        list.push({ trainingName, ...patch });
      }
      return { ...prev, trainingCertificates: list };
    });
  };

  // Memory-only attachment: store selected File in state and defer upload until final submit
  const handleFileSelect = (e, trainingName) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // clear any certificate errors
    setErrors(prev => ({ ...prev, trainingCertificates: undefined }));

    // basic client-side checks
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setErrors(prev => ({ ...prev, trainingCertificates: `File too large for ${trainingName} (max 10MB)` }));
      return;
    }
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      setErrors(prev => ({ ...prev, trainingCertificates: `Invalid file type for ${trainingName}` }));
      return;
    }

    // Save file object in trainingCertificates state; mark as 'attached'
    updateCertificateState(trainingName, {
      filename: file.name,
      mime: file.type,
      size: file.size,
      file, // actual File object in memory
      uploadStatus: 'attached',
      lastError: undefined,
    });
  };

  const removeCertificate = (trainingName) => {
    // clear any certificate validation errors when user removes a certificate
    setErrors(prev => ({ ...prev, trainingCertificates: undefined }));
    setForm(prev => ({ ...prev, trainingCertificates: (prev.trainingCertificates || []).filter(c => c.trainingName !== trainingName)}));
  }; 

  // Today's date for date inputs (yyyy-mm-dd)
  const today = typeof window !== "undefined" ? new Date().toISOString().split("T")[0] : "";

  // Validate a specific field and set/remove error for that field
  const validateField = (fieldName, value) => {
    const newErrors = { ...errors };
    const val = value !== undefined ? value : form[fieldName];

    switch (fieldName) {
            case "genderOther":
              if (form.gender === "Other" && (!val || !val.trim())) {
                newErrors[fieldName] = "Please specify your gender.";
              } else if (form.gender === "Other" && val && !isAlpha(val)) {
                newErrors[fieldName] = "Please use only letters for gender specification.";
              } else {
                delete newErrors[fieldName];
              }
              break;
      case "lastName":
      case "firstName":
        if (!val || !isValidName(val)) {
          newErrors[fieldName] = `${fieldName === "lastName" ? "Last" : "First"} name is required and must contain only letters, spaces or basic punctuation.`;
        } else {
          delete newErrors[fieldName];
        }
        break;
      case "middleInitial":
        if (val && !isValidMiddleInitial(val)) {
          newErrors[fieldName] = "Middle initial must be a single letter.";
        } else {
          delete newErrors[fieldName];
        }
        break;
      case "nickname":
        if (!val || !isValidNickname(val)) {
          newErrors[fieldName] = "Nickname is required and may contain letters, numbers, spaces and -_.";
        } else {
          delete newErrors[fieldName];
        }
        break;
      case "birthdate":
        if (!val) {
          newErrors[fieldName] = "Birthdate is required.";
        } else if (!isNotFutureDate(val)) {
          newErrors[fieldName] = "Birthdate cannot be a future date.";
        } else {
          delete newErrors[fieldName];
        }
        break;
      case "mobileNumber":
        if (!val || !isValidMobile(val)) {
          newErrors[fieldName] = "Mobile number is required and must be 11 digits starting with 09.";
        } else {
          delete newErrors[fieldName];
        }
        break;
      case "city":
        if (!val || !isValidCity(val)) {
          newErrors[fieldName] = "Current city is required and must be a valid place name.";
        } else {
          delete newErrors[fieldName];
        }
        break;
      case "facebook":
      case "twitter":
      case "instagram":
      case "tiktok":
        if (val && !isValidSocialUrl(val, fieldName)) {
          newErrors[fieldName] = `Please enter a valid ${fieldName} URL (https://...).`;
        } else {
          delete newErrors[fieldName];
        }
        break;
      case "graduation":
        if (!val || !isValidGraduation(val)) {
          newErrors[fieldName] = "Enter a valid graduation year (e.g. 2025).";
        } else {
          delete newErrors[fieldName];
        }
        break;
      case "position":
      case "industry":
        if (!val || !isValidSmallText(val, 100)) {
          newErrors[fieldName] = "This field is required and must be concise.";
        } else {
          delete newErrors[fieldName];
        }
        break;
      case "volunteerReason":
        if (!val || !isValidSmallText(val, 600)) {
          newErrors[fieldName] = "Please provide a short reason (max 600 characters).";
        } else if (!isSentenceCountInRange(val, 5, 10)) {
          const count = countSentences(val);
          newErrors[fieldName] = `Please write between 5 and 10 sentences (currently ${count}).`;
        } else {
          delete newErrors[fieldName];
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return newErrors[fieldName] === undefined;
  };

  // Clear form and localStorage for all sections
  const handleClearForm = () => {
    setForm({
      lastName: "",
      firstName: "",
      middleInitial: "",
      nickname: "",
      birthdate: "",
      gender: "",
      genderOther: "",
      consent: "",
      mobileNumber: "",
      city: "",
      facebook: "",
      twitter: "",
      instagram: "",
      tiktok: "",
      currentStatus: "",
      position: "",
      industry: "",
      company: "",
      workingDays: [],
      workShift: "",
      workOtherSkills: "",
      school: "",
      course: "",
      graduation: "",
      schoolDays: [],
      studentOtherSkills: "",
      volunteerRoles: [],
      volunteerOtherRole: "",
      volunteerDays: [],
      volunteerFrequency: "",
      volunteerTrainings: [],
      volunteerReason: "",
      declarationCommitment: "",
    });
    if (typeof window !== "undefined") {
      localStorage.removeItem("volunteerForm");
    }
    setErrors({});
    setStep(1);
  };

  // Google sign-in handler
  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      // User state will be updated by onAuthStateChanged
    } catch (error) {
      console.error("Google sign-in error:", error);
      alert("Failed to sign in with Google. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    
    // Handle mobile number with normalization
    if (name === "mobileNumber") {
      const normalized = normalizeMobile(value);
      setForm((prev) => ({ ...prev, [name]: normalized }));
      setErrors((prev) => ({ ...prev, [name]: undefined }));
      return;
    }

    // Handle graduation field to accept only digits and max length 4
    if (name === "graduation") {
      const numericValue = value.replace(/\D/g, "");
      if (numericValue.length <= 4) {
        setForm((prev) => ({ ...prev, [name]: numericValue }));
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
      return;
    }
    
    setForm((prev) => ({
      ...prev,
      [name]: type === "radio" ? value : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));

    // run inline validation for some fields as the user types
    const inlineFields = [
      "lastName",
      "firstName",
      "middleInitial",
      "nickname",
      "birthdate",
      "genderOther",
      "mobileNumber",
      "city",
      "facebook",
      "twitter",
      "instagram",
      "tiktok",
      "graduation",
      "position",
      "industry",
      "volunteerReason",
    ];
    if (inlineFields.includes(name)) {
      // if we updated the mobile number earlier in this handler, pass the sanitized value
      const v = name === "mobileNumber" ? (value ? value.replace(/\D/g, "") : value) : value;
      validateField(name, v);
    }

    // Special handling for gender selection: if 'Other' is selected, validate the genderOther field
    if (name === "gender") {
      if (value === "Other") {
        // If there's already a genderOther value, validate it; otherwise set error
        const currentOther = form.genderOther || "";
        validateField("genderOther", currentOther);
      } else {
        // Clear genderOther error if user selects a non-Other gender
        setErrors((prev) => ({ ...prev, genderOther: undefined }));
      }
    }
  };

  const handleConsentChange = (e) => {
    setForm((prev) => ({
      ...prev,
      consent: e.target.value,
    }));
    setErrors((prev) => ({ ...prev, consent: undefined }));
  };

  const validateConsent = () => {
    const newErrors = {};
    if (form.consent !== "agree")
      newErrors.consent = "You must agree to the Data Privacy Notice.";
    return newErrors;
  };

  const validatePersonal = () => {
    const newErrors = {};
    if (!form.lastName.trim() || !isValidName(form.lastName)) newErrors.lastName = "Last Name is required and must be valid.";
    if (!form.firstName.trim() || !isValidName(form.firstName)) newErrors.firstName = "First Name is required and must be valid.";
    if (!form.nickname.trim() || !isValidNickname(form.nickname))
      newErrors.nickname = "Nickname/Alias is required and must be valid.";
    if (!form.birthdate) newErrors.birthdate = "Birthdate is required.";
    if (!form.gender) newErrors.gender = "Gender is required.";
    if (form.gender === "Other") {
      if (!form.genderOther.trim())
        newErrors.genderOther = "Please specify your gender.";
      else if (!isAlpha(form.genderOther))
        newErrors.genderOther = "Please use letters only for gender specification.";
    }
    // Validate birthdate not in future
    if (form.birthdate && !isNotFutureDate(form.birthdate)) {
      newErrors.birthdate = "Birthdate cannot be a future date.";
    }
    // Validate middle initial if present
    if (form.middleInitial && !isValidMiddleInitial(form.middleInitial)) {
      newErrors.middleInitial = "Middle initial must be a single letter.";
    }
    return newErrors;
  };

  const validateContact = () => {
    const newErrors = {};
    if (!form.mobileNumber.trim() || !isValidMobile(form.mobileNumber)) {
      newErrors.mobileNumber = "Mobile Number is required and must be 11 digits starting with 09.";
    }
    if (!form.city.trim() || !isValidCity(form.city))
      newErrors.city = "Current City/Municipality is required and must be a valid place.";
    // validate social URLs if provided
    if (form.facebook && !isValidSocialUrl(form.facebook, "facebook")) {
      newErrors.facebook = "Please provide a valid Facebook URL.";
    }
    if (form.twitter && !isValidSocialUrl(form.twitter, "twitter")) {
      newErrors.twitter = "Please provide a valid Twitter URL.";
    }
    if (form.instagram && !isValidSocialUrl(form.instagram, "instagram")) {
      newErrors.instagram = "Please provide a valid Instagram URL.";
    }
    if (form.tiktok && !isValidSocialUrl(form.tiktok, "tiktok")) {
      newErrors.tiktok = "Please provide a valid Tiktok URL.";
    }
    return newErrors;
  };

  // Validation for Student/Employment Profile
  const validateStatus = () => {
    const newErrors = {};
    if (!form.currentStatus)
      newErrors.currentStatus = "Current Status is required.";
    return newErrors;
  };

  const validateWorkProfile = () => {
    const newErrors = {};
    if (!form.position.trim() || !isValidSmallText(form.position, 100)) newErrors.position = "Position is required and must be concise.";
    if (!form.industry.trim() || !isValidSmallText(form.industry, 100)) newErrors.industry = "Industry is required and must be concise.";
    if (!form.workingDays.length)
      newErrors.workingDays = "Select at least one working day.";
    if (!form.workShift)
      newErrors.workShift = "Select your general work shift.";
    if (!form.workOtherSkills.trim())
      newErrors.workOtherSkills = "This field is required.";
    return newErrors;
  };

  const validateStudentProfile = () => {
    const newErrors = {};
    if (!form.school.trim())
      newErrors.school = "School and location is required.";
    if (!form.course.trim()) newErrors.course = "Course/Major is required.";
    if (!form.graduation.trim() || !isValidGraduation(form.graduation))
      newErrors.graduation = "Expected graduation is required and must be a 4-digit year (e.g. 2025).";
    if (!form.schoolDays.length)
      newErrors.schoolDays = "Select at least one school day.";
    if (!form.studentOtherSkills.trim())
      newErrors.studentOtherSkills = "This field is required.";
    return newErrors;
  };

  // Validation for Volunteer Profile
  const validateVolunteerProfile = () => {
    const newErrors = {};
    if (!form.volunteerRoles.length && !form.volunteerOtherRole.trim())
      newErrors.volunteerRoles =
        "Please select at least one role or specify other.";
    if (!form.volunteerDays.length)
      newErrors.volunteerDays = "Please select your available days.";
    if (!form.volunteerFrequency)
      newErrors.volunteerFrequency =
        "Please select how often you can volunteer.";
    if (!form.volunteerTrainings.length)
      newErrors.volunteerTrainings = "Please select at least one training.";

    // Ensure required trainings have uploaded certificates (excluding 'None in the list')
    const requiredTrainings = (form.volunteerTrainings || []).filter(t => t !== 'None in the list');
    if (requiredTrainings.length) {
      const certs = form.trainingCertificates || [];
      // Consider a training satisfied if it has an s3Key (already uploaded) or has an attached File in memory
      const missing = requiredTrainings.filter(t => !certs.find(c => c.trainingName === t && ((c.s3Key && c.uploadStatus === 'done') || c.file)));
      if (missing.length) {
        newErrors.trainingCertificates = `Please attach certificates for: ${missing.join(', ')}`;
      }
    }
    if (!form.volunteerReason.trim() || !isValidSmallText(form.volunteerReason, 600))
      newErrors.volunteerReason = "Please write your reason for volunteering (max 600 characters).";
    else if (!isSentenceCountInRange(form.volunteerReason, 5, 10)) {
      const c = countSentences(form.volunteerReason);
      newErrors.volunteerReason = `Please write between 5 and 10 sentences (currently ${c}).`;
    }
    return newErrors;
  };

  // Add validation for Declaration of Volunteer Commitment
  const validateDeclaration = () => {
    const newErrors = {};
    if (form.declarationCommitment !== "agree")
      newErrors.declarationCommitment =
        "You must agree to the Declaration of Volunteer Commitment.";
    return newErrors;
  };

  // Navigation logic
  const handleNext = (e) => {
    e.preventDefault();
    if (step === 1) {
      // Data Privacy Notice
      const newErrors = validateConsent();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      // Personal Information
      const newErrors = validatePersonal();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setStep(3);
    } else if (step === 3) {
      // Contact Information
      const newErrors = validateContact();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setErrors({}); // Clear errors before proceeding
      setStep(4);
    } else if (step === 4) {
      // Student/Employment Profile
      const newErrors = validateStatus();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      if (form.currentStatus === "Working Professional") {
        setStep(5);
      } else if (form.currentStatus === "Student") {
        setStep(6);
      } else {
        setStep(7); // Not Applicable → Volunteer Profile
      }
    } else if (step === 5) {
      // Work Profile
      const newErrors = validateWorkProfile();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setStep(7);
    } else if (step === 6) {
      // Student Profile
      const newErrors = validateStudentProfile();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setStep(7);
    } else if (step === 7) {
      // Volunteer Profile
      const newErrors = validateVolunteerProfile();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      setStep(8);
    }
  };

  const handleBack = (e) => {
    e.preventDefault();
    if (step === 8) setStep(7);
    else if (step === 7) setStep(4);
    // Always go back to Student/Employment Profile from Volunteer Profile
    else if (step === 6)
      setStep(4); // Student Profile: back to Student/Employment Profile
    else if (step === 5)
      setStep(4); // Work Profile: back to Student/Employment Profile
    else if (step === 4)
      setStep(3); // Student/Employment Profile: back to Contact Information
    else if (step === 3)
      setStep(2); // Contact Information: back to Personal Information
    else if (step === 2) setStep(1); // Personal Information: back to Consent
    setErrors({});
  };

  // Final form submission logic (after Google sign-in)
  const doFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Prevent submission if applications closed
      if (applicationSettings && !applicationSettings.is_open) {
        throw new Error(
          "Applications are currently closed. Please check for future openings."
        );
      }
      // Get current Firebase user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("You must be signed in to submit an application");
      }

      // Run final validation for all steps to ensure no invalid input
      const personalErrors = validatePersonal();
      const contactErrors = validateContact();
      const statusErrors = validateStatus();
      const workErrors = form.currentStatus === "Working Professional" ? validateWorkProfile() : {};
      const studentErrors = form.currentStatus === "Student" ? validateStudentProfile() : {};
      const volunteerErrors = validateVolunteerProfile();

      const combinedErrors = {
        ...personalErrors,
        ...contactErrors,
        ...statusErrors,
        ...workErrors,
        ...studentErrors,
        ...volunteerErrors,
      };

      if (Object.keys(combinedErrors).length > 0) {
        setErrors(combinedErrors);
        setIsSubmitting(false);
        return;
      }

      // Use the applicantsService instead of direct fetch
      const result = await submitVolunteerApplication(
        {
          uid: currentUser.uid,
          name: currentUser.displayName || `${form.firstName} ${form.lastName}`,
          email: currentUser.email,
        },
        form
      );

      // Clear localStorage on success
      if (typeof window !== "undefined") {
        localStorage.removeItem("volunteerForm");
      }

      // Show success message
      setSubmitted(true);
    } catch (error) {
      console.error("Error submitting application:", error);
      setSubmitError(error.message);
      setIsSubmitting(false);
    }
  };

  // Only show modal on final submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validateDeclaration();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    // Submit application
    await doFinalSubmit();
  };

  const progressPercent = ((step - 1) / (8 - 1)) * 100;

  // Show loading spinner while checking auth
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-100 via-white to-red-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-700 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading...</p>
        </div>
      </div>
    );
  }

  // Show Google sign-in prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-100 via-white to-red-200 p-6">
        <div className="max-w-xl w-full bg-white border-2 border-red-700 rounded-2xl shadow-2xl p-8 text-center">
          <h1 className="text-2xl font-bold text-red-700 mb-4">
            Volunteer Sign Up
          </h1>
          <p className="text-gray-700 mb-6">
            Please sign in with your Google account to continue with the
            volunteer application.
          </p>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className={`bg-white border-2 border-gray-300 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-3 mx-auto ${
              isSigningIn ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isSigningIn ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700"></div>
                Signing in...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </button>
          <p className="text-sm text-gray-500 mt-4">
            You need to sign in to submit a volunteer application
          </p>
        </div>
      </div>
    );
  }

  // Show full-page closed message if applications are closed
  if (!loadingSettings && applicationSettings && !applicationSettings.is_open) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-red-100 via-white to-red-200 p-6">
        <div className="max-w-xl w-full bg-white border-2 border-red-700 rounded-2xl shadow-2xl p-8 text-center">
          <div className="mb-6">
            <svg
              className="w-20 h-20 mx-auto text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-red-700 mb-4">
            Applications Closed
          </h1>
          <p className="text-gray-700 text-lg mb-4">
            Volunteer applications are currently not being accepted.
          </p>
          <p className="text-gray-600 text-sm">
            Please check back later for future volunteer opportunities. We appreciate your interest in joining Bagani Community Center!
          </p>
          {applicationSettings.deadline && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Last application deadline:{" "}
                <span className="font-medium text-gray-700">
                  {new Date(applicationSettings.deadline).toLocaleString()}
                </span>
              </p>
            </div>
          )}
          <div className="mt-8">
            <Link
              href="/"
              className="inline-block bg-red-700 text-white font-semibold px-6 py-3 rounded-lg hover:bg-red-800 transition"
            >
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto mt-12 bg-white border-2 border-red-700 rounded-2xl shadow-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-red-700 mb-4">
          Thank you for signing up!
        </h1>
        <p className="text-gray-700">
          Your application has been received. We will contact you soon.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-red-100 via-white to-red-200 p-3 sm:p-6">
      

      {/* Applications Status Banner - Only show when OPEN */}
      {!loadingSettings && applicationSettings && applicationSettings.is_open && (
        <div className="w-full max-w-xl mb-3 sm:mb-4 px-0">
          {/* Applications Open with Deadline */}
          {applicationSettings.deadline && (
            <div className="bg-green-50 border border-green-500 text-green-800 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold">Applications are OPEN!</div>
                  <div className="text-xs text-gray-700 mt-1">
                    Deadline:{" "}
                    {new Date(applicationSettings.deadline).toLocaleString()}
                  </div>
                </div>
                {timeRemaining && (
                  <div className="text-right">
                    <div className="font-bold text-green-700">
                      {timeRemaining}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Applications Open without Deadline */}
          {!applicationSettings.deadline && (
            <div className="bg-green-50 border border-green-500 text-green-800 px-4 py-3 rounded-lg text-sm">
              <div className="font-semibold">Applications are OPEN!</div>
              <div className="text-xs text-gray-700 mt-1">
                No deadline set - apply anytime!
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header Container */}
      <div className="w-full max-w-xl mb-3 sm:mb-4px-0">
        <h1 className="text-xl sm:text-2xl font-extrabold text-red-700 text-center tracking-tight bg-white border-2 border-red-700 rounded-xl sm:rounded-2xl shadow-2xl py-4 sm:py-6">
          Volunteer Sign Up Form
        </h1>
      </div>
      <form
        className="w-full max-w-xl bg-white border-2 border-red-700 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-8 space-y-6 sm:space-y-8 mx-2 sm:mx-0"
        onSubmit={step === 8 ? handleSubmit : handleNext}
        noValidate
      >

        
        {/* Step 1: Data Privacy Consent */}
        {step === 1 && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-red-700 mb-2">
              Data Privacy Notice
            </h2>
            <div
              className="bg-red-50 border border-red-200 rounded p-3 sm:p-4 mb-4 text-gray-800 text-xs sm:text-sm "
              dangerouslySetInnerHTML={{
                __html: `
                Bagani Community Center, as a registered community-based and Non-Government Organization (NGO) in Negros Island Region (NIR), aims to continuously recruit and train volunteers who will whole-heartedly devote their precious time and effort in community-building.<br>
                <br>
                To achieve this goal of recruitment, we require prospective volunteers to provide personal data (collectively known as "Personally Identifiable Information"). Bagani Community Center will store and process any information we collect from you with the strictest confidentiality, pursuant to Republic Act 10173 or the Data Privacy Act of 2012 and the implementing rules, regulations and issuances by the National Privacy Commission, and other applicable Philippine Laws.<br>
                <br>
                What Personal Data do we Collect, Store, and Process?<br>
                <br>
                1. Basic Personal Information (Name, nickname, birthdate, age, gender identity)<br>
                2. Contact Information (Mobile Number, Gmail address)<br>
                3. Student/Employment Profile<br>
                4. City/Municipality of Residence<br>
                5. Social Media Accounts (Facebook, Twitter, Instagram)<br>
                6. General Schedule of availability for volunteering<br>
                7. Trainings/Seminars attended<br>
                <br>
                Purposes for Personal Data Collection:<br>
                <br>
                1. Notifications on trainings, orientation, and organization activities.<br>
                2. Determine possible fit for different functions and roles within the organization.<br>
                3. Invitation to social media groups, where members or prospective members communicate.<br>
                4. Sharing of online documents & collaterals.<br>
                5. Determine common schedule for group activities, trainings, and orientation.<br>
                6. Filing of official membership information<br>
                <br>
                To whom is your Personal Data Disclosed?<br>
                <br>
                Your personal data has limited access within the Bagani Community Recruitment and Membership Committee. However, your personal data may also be shared to the following official affiliates of Bagani Community Center, for the sole purpose of documentation of volunteer recruitment and membership information:<br>
                1. LoveYourself, Inc.<br>
                2. Family Planning Organization of the Philippines (FPOP)<br>
                3. AIDS Healthcare Foundation (AHF)<br>
                4. Pilipinas Shell Foundation, Inc.<br>
                <br>
                Personal Data Storage and Retention<br>
                <br>
                The personal data you choose to disclose using this online form are stored in a paid subscription of GSuite Google Drive, providing the same security parameters that Google assures its customers. The file where your information is stored has also been restricted access to only members of Bagani Community Center directly involved in recruitment. Data retention of your personal information is a maximum of 1 year, or shorter provided that you explicitly request in writing to delete all your personal data in the organization's storage drive.<br>
                <br>
                Correction, Request for Deletion, and Access to your Personal Data:<br>
                <br>
                Bagani Community Center maintains, in compliance with Philippine laws, that you own any of your Personal Data. Should you have any requests with respect to the handling, processing, rectifying, and deleting your personal data, you may contact:<br>
                <br>
                info@baganiph.org<br>
                (034) 700 2034<br>
                <br>
                Please allow us 3-5 working days from receipt of your requests regarding your personal data, or we will inform you if a longer time period is needed to accomplish your request.<br>
                 `,
              }}
            />
            <div className="mb-2 font-semibold text-gray-900">
              Do you agree and give consent to Bagani Community Center to
              gather, store, and process your Personal Data?
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="consent"
                  value="agree"
                  checked={form.consent === "agree"}
                  onChange={handleConsentChange}
                  className="mr-2"
                  required
                />
                I Agree
              </label>
              <label className="inline-flex items-center text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="consent"
                  value="disagree"
                  checked={form.consent === "disagree"}
                  onChange={handleConsentChange}
                  className="mr-2"
                />
                I Disagree
              </label>
              {errors.consent && (
                <p className="text-red-600 text-sm">{errors.consent}</p>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button
                type="button"
                className=" text-red-700 hover:text-gray-800 px-6"
                onClick={handleClearForm}
              >
                Clear form
              </button>
              <button
                type="submit"
                className={`bg-[var(--primary-red)] text-white font-bold px-6 py-2 rounded hover:bg-red-800 transition ${
                  form.consent !== "agree"
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                disabled={form.consent !== "agree"}
              >
                Next
              </button>
            </div>
          </div>
        )}
        {/* Step 2: Personal Information */}
        {step === 2 && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-red-700 mb-3 sm:mb-4">
              Personal Information
            </h2>
            <div className="flex flex-col gap-3 sm:gap-4">
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Last Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className={`w-full border rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation ${
                    errors.lastName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.lastName && (
                  <p className="text-red-600 text-xs sm:text-sm">{errors.lastName}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  First Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className={`w-full border rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation ${
                    errors.firstName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.firstName && (
                  <p className="text-red-600 text-sm">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Middle Initial
                </label>
                <input
                  type="text"
                  name="middleInitial"
                  value={form.middleInitial}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  maxLength={1}
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Nickname / Alias <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="nickname"
                  value={form.nickname}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className={`w-full border rounded px-3 py-2 text-gray-900 ${
                    errors.nickname ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.nickname && (
                  <p className="text-red-600 text-sm">{errors.nickname}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Birthdate <span className="text-red-600">*</span>
                </label>
                <input
                  type="date"
                  name="birthdate"
                  value={form.birthdate}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  max={today}
                  className={`w-full border rounded px-3 py-2 text-gray-900 ${
                    errors.birthdate ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.birthdate && (
                  <p className="text-red-600 text-sm">{errors.birthdate}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Gender Identity <span className="text-red-600">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                    <input
                      type="radio"
                      name="gender"
                      value="Male"
                      checked={form.gender === "Male"}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4"
                    />
                    Male
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                    <input
                      type="radio"
                      name="gender"
                      value="Female"
                      checked={form.gender === "Female"}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4"
                    />
                    Female
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                    <input
                      type="radio"
                      name="gender"
                      value="Prefer not to say"
                      checked={form.gender === "Prefer not to say"}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4"
                    />
                    Prefer not to say
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                    <input
                      type="radio"
                      name="gender"
                      value="Other"
                      checked={form.gender === "Other"}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4"
                    />
                    Other
                    {form.gender === "Other" && (
                      <>
                      <input
                        type="text"
                        name="genderOther"
                        value={form.genderOther}
                        onChange={handleChange}
                        onBlur={(e) => validateField(e.target.name, e.target.value)}
                        placeholder="Please specify (letters only)"
                        pattern="[A-Za-z ]+"
                        title="Use letters and spaces only"
                        className={`ml-2 border rounded px-2 py-1 text-gray-900 text-sm sm:text-base touch-manipulation ${
                          errors.genderOther
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {errors.genderOther && (
                        <p className="text-red-600 text-xs sm:text-sm mt-1">
                          {errors.genderOther}
                        </p>
                      )}
                      </>
                    )}
                  </label>
                </div>
                {errors.gender && (
                  <p className="text-red-600 text-xs sm:text-sm">{errors.gender}</p>
                )}
                {/* genderOther error is shown inline next to the input when visible */}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between mt-6 sm:mt-8 gap-2 sm:gap-4">
              {/* First column: Back button */}
              <div className="w-full sm:w-auto">
                <button
                  type="button"
                  className="bg-gray-300 text-gray-800 font-bold px-4 sm:px-6 py-2.5 sm:py-2 rounded hover:bg-gray-400 transition w-full text-sm sm:text-base touch-manipulation"
                  onClick={handleBack}
                >
                  Back
                </button>
              </div>
              {/* Second column: Clear form and Next buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  className="text-red-700 hover:text-gray-800 px-4 sm:px-6 py-2 sm:py-0 text-sm sm:text-base order-2 sm:order-1 touch-manipulation"
                  onClick={handleClearForm}
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  className="bg-[var(--primary-red)] text-white font-bold px-4 sm:px-6 py-2.5 sm:py-2 rounded hover:bg-red-800 transition text-sm sm:text-base order-1 sm:order-2 touch-manipulation"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Step 3: Contact Information */}
        {step === 3 && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-red-700 mb-3 sm:mb-4">
              Contact Information
            </h2>
            <div className="flex flex-col gap-3 sm:gap-4">
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Mobile Number <span className="text-red-600">*</span>
                </label>
                <input
                  type="tel"
                  name="mobileNumber"
                  value={form.mobileNumber}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className={`w-full border rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation ${
                    errors.mobileNumber ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="09XXXXXXXXX"
                  maxLength="11"
                  inputMode="numeric"
                  pattern="^09\d{9}$"
                  required
                />
                
                {errors.mobileNumber && (
                  <p className="text-red-600 text-xs sm:text-sm">{errors.mobileNumber}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Current City/Municipality of Residence{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className={`w-full border rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation ${
                    errors.city ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="e.g. Bacolod City"
                  required
                />
                {errors.city && (
                  <p className="text-red-600 text-xs sm:text-sm">{errors.city}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Social Media Account: Facebook
                </label>
                <input
                  type="url"
                  name="facebook"
                  value={form.facebook}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation"
                  placeholder="https://facebook.com/yourprofile"
                  pattern="https?://.+"
                />
                {errors.facebook && (
                  <p className="text-red-600 text-xs sm:text-sm mt-1">{errors.facebook}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Social Media Account: Twitter
                </label>
                <input
                  type="url"
                  name="twitter"
                  value={form.twitter}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation"
                  placeholder="https://twitter.com/yourprofile"
                  pattern="https?://.+"
                />
                {errors.twitter && (
                  <p className="text-red-600 text-xs sm:text-sm mt-1">{errors.twitter}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Social Media Account: Instagram
                </label>
                <input
                  type="url"
                  name="instagram"
                  value={form.instagram}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation"
                  placeholder="https://instagram.com/yourprofile"
                  pattern="https?://.+"
                />
                {errors.instagram && (
                  <p className="text-red-600 text-xs sm:text-sm mt-1">{errors.instagram}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Social Media Account: Tiktok
                </label>
                <input
                  type="url"
                  name="tiktok"
                  value={form.tiktok}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation"
                  placeholder="https://tiktok.com/@yourprofile"
                  pattern="https?://.+"
                />
                {errors.tiktok && (
                  <p className="text-red-600 text-xs sm:text-sm mt-1">{errors.tiktok}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between mt-6 sm:mt-8 gap-2 sm:gap-4">
              {/* First column: Back button */}
              <div className="w-full sm:w-auto">
                <button
                  type="button"
                  className="bg-gray-300 text-gray-800 font-bold px-4 sm:px-6 py-2.5 sm:py-2 rounded hover:bg-gray-400 transition w-full text-sm sm:text-base touch-manipulation"
                  onClick={handleBack}
                >
                  Back
                </button>
              </div>
              {/* Second column: Clear form and Next buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  className="text-red-700 hover:text-gray-800 px-4 sm:px-6 py-2 sm:py-0 text-sm sm:text-base order-2 sm:order-1 touch-manipulation"
                  onClick={handleClearForm}
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  className="bg-[var(--primary-red)] text-white font-bold px-4 sm:px-6 py-2.5 sm:py-2 rounded hover:bg-red-800 transition text-sm sm:text-base order-1 sm:order-2 touch-manipulation"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Step 4: Student/Employment Profile */}
        {step === 4 && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-red-700 mb-2">
              Student/Employment Profile
            </h2>
            <p className="mb-3 sm:mb-4 text-gray-800 text-sm sm:text-base">
              We gather this information to determine to which committee or role
              you are most able to contribute.
            </p>
            <div className="flex flex-col gap-3 sm:gap-4">
              <label className="font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                Current Status: <span className="text-red-600">*</span>
              </label>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                  <input
                    type="radio"
                    name="currentStatus"
                    value="Working Professional"
                    checked={form.currentStatus === "Working Professional"}
                    onChange={handleChange}
                    className="mr-2 w-4 h-4"
                  />
                  Working Professional
                </label>
                <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                  <input
                    type="radio"
                    name="currentStatus"
                    value="Student"
                    checked={form.currentStatus === "Student"}
                    onChange={handleChange}
                    className="mr-2 w-4 h-4"
                  />
                  Student
                </label>
                <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                  <input
                    type="radio"
                    name="currentStatus"
                    value="Not Applicable"
                    checked={form.currentStatus === "Not Applicable"}
                    onChange={handleChange}
                    className="mr-2 w-4 h-4"
                  />
                  Not Applicable
                </label>
              </div>
              {errors.currentStatus && (
                <p className="text-red-600 text-xs sm:text-sm">{errors.currentStatus}</p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row justify-between mt-6 sm:mt-8 gap-2 sm:gap-4">
              {/* First column: Back button */}
              <div className="w-full sm:w-auto">
                <button
                  type="button"
                  className="bg-gray-300 text-gray-800 font-bold px-4 sm:px-6 py-2.5 sm:py-2 rounded hover:bg-gray-400 transition w-full text-sm sm:text-base touch-manipulation"
                  onClick={handleBack}
                >
                  Back
                </button>
              </div>
              {/* Second column: Clear form and Next buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  className="text-red-700 hover:text-gray-800 px-4 sm:px-6 py-2 sm:py-0 text-sm sm:text-base order-2 sm:order-1 touch-manipulation"
                  onClick={handleClearForm}
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  className="bg-[var(--primary-red)] text-white font-bold px-4 sm:px-6 py-2.5 sm:py-2 rounded hover:bg-red-800 transition text-sm sm:text-base order-1 sm:order-2 touch-manipulation"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Step 5: Working Professional Section */}
        {step === 5 && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-red-700 mb-2">
              Work Profile
            </h2>
            <div className="flex flex-col gap-3 sm:gap-4">
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Position <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="position"
                  value={form.position}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className={`w-full border rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation ${
                    errors.position ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.position && (
                  <p className="text-red-600 text-xs sm:text-sm">{errors.position}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Industry <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="industry"
                  value={form.industry}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className={`w-full border rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation ${
                    errors.industry ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.industry && (
                  <p className="text-xs-red-600 text-xs sm:text-sm">{errors.industry}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Company
                </label>
                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Working Days <span className="text-red-600">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((day) => (
                    <label
                      key={day}
                      className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation"
                    >
                      <input
                        type="checkbox"
                        name="workingDays"
                        value={day}
                        checked={form.workingDays.includes(day)}
                        onChange={(e) => handleCheckboxArray(e, "workingDays")}
                        className="mr-2 w-4 h-4"
                      />
                      {day}
                    </label>
                  ))}
                </div>
                {errors.workingDays && (
                  <p className="text-red-600 text-xs sm:text-sm">{errors.workingDays}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  General Work Shift <span className="text-red-600">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                    <input
                      type="radio"
                      name="workShift"
                      value="Day shift"
                      checked={form.workShift === "Day shift"}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4"
                    />
                    Day shift (8AM - 10AM start of shift)
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                    <input
                      type="radio"
                      name="workShift"
                      value="Mid shift"
                      checked={form.workShift === "Mid shift"}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4"
                    />
                    Mid shift (1PM - 3PM start of shift)
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                    <input
                      type="radio"
                      name="workShift"
                      value="Night shift"
                      checked={form.workShift === "Night shift"}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4"
                    />
                    Night shift (6PM onwards start of shift)
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                    <input
                      type="radio"
                      name="workShift"
                      value="Not Applicable"
                      checked={form.workShift === "Not Applicable"}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4"
                    />
                    Not Applicable
                  </label>
                </div>
                {errors.workShift && (
                  <p className="text-red-600 text-xs sm:text-sm">{errors.workShift}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Other Skills, Hobbies, or Passions{" "}
                  <span className="text-red-600">*</span>
                </label>
                <textarea
                  name="workOtherSkills"
                  value={form.workOtherSkills}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className={`w-full border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation${
                    errors.workOtherSkills ? " border-red-500" : ""
                  }`}
                  rows={3}
                />
                {errors.workOtherSkills && (
                  <p className="text-red-600 text-xs sm:text-sm">
                    {errors.workOtherSkills}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between mt-6 sm:mt-8 gap-2 sm:gap-4">
              {/* First column: Back button */}
              <div className="w-full sm:w-auto">
                <button
                  type="button"
                  className="bg-gray-300 text-gray-800 font-bold px-4 sm:px-6 py-2.5 sm:py-2 rounded hover:bg-gray-400 transition w-full text-sm sm:text-base touch-manipulation"
                  onClick={handleBack}
                >
                  Back
                </button>
              </div>
              {/* Second column: Clear form and Next buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  className="text-red-700 hover:text-gray-800 px-4 sm:px-6 py-2 sm:py-0 text-sm sm:text-base order-2 sm:order-1 touch-manipulation"
                  onClick={handleClearForm}
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  className="bg-[var(--primary-red)] text-white font-bold px-4 sm:px-6 py-2.5 sm:py-2 rounded hover:bg-red-800 transition text-sm sm:text-base order-1 sm:order-2 touch-manipulation"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Step 6: Student Profile Section */}
        {step === 6 && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-red-700 mb-2">
              Student Profile
            </h2>
            <div className="flex flex-col gap-3 sm:gap-4">
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Name of your School and Location{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="school"
                  value={form.school}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation ${
                    errors.school ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.school && (
                  <p className="text-red-600 text-xs sm:text-sm">{errors.school}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Course / Major <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="course"
                  value={form.course}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation ${
                    errors.course ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.course && (
                  <p className="text-red-600 text-xs sm:text-sm">{errors.course}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Year of Expected Graduation{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="graduation"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  value={form.graduation}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className={`w-full border rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation ${
                    errors.graduation ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="e.g. 2025"
                  title="Enter a 4-digit year, e.g. 2025"
                />
                {errors.graduation && (
                  <p className="text-red-600 text-xs sm:text-sm">{errors.graduation}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  School Days <span className="text-red-600">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((day) => (
                    <label
                      key={day}
                      className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation"
                    >
                      <input
                        type="checkbox"
                        name="schoolDays"
                        value={day}
                        checked={form.schoolDays.includes(day)}
                        onChange={(e) => handleCheckboxArray(e, "schoolDays")}
                        className="mr-2 w-4 h-4"
                      />
                      {day}
                    </label>
                  ))}
                </div>
                {errors.schoolDays && (
                  <p className="text-red-600 text-xs sm:text-sm">{errors.schoolDays}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Other Skills, Hobbies, or Passions{" "}
                  <span className="text-red-600">*</span>
                </label>
                <textarea
                  name="studentOtherSkills"
                  value={form.studentOtherSkills}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className={`w-full border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation${
                    errors.studentOtherSkills ? " border-red-500" : ""
                  }`}
                  rows={3}
                />
                {errors.studentOtherSkills && (
                  <p className="text-red-600 text-xs sm:text-sm">
                    {errors.studentOtherSkills}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between mt-6 sm:mt-8 gap-2 sm:gap-4">
              {/* First column: Back button */}
              <div className="w-full sm:w-auto">
                <button
                  type="button"
                  className="bg-gray-300 text-gray-800 font-bold px-4 sm:px-6 py-2.5 sm:py-2 rounded hover:bg-gray-400 transition w-full text-sm sm:text-base touch-manipulation"
                  onClick={handleBack}
                >
                  Back
                </button>
              </div>
              {/* Second column: Clear form and Next buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  className="text-red-700 hover:text-gray-800 px-4 sm:px-6 py-2 sm:py-0 text-sm sm:text-base order-2 sm:order-1 touch-manipulation"
                  onClick={handleClearForm}
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  className="bg-[var(--primary-red)] text-white font-bold px-4 sm:px-6 py-2.5 sm:py-2 rounded hover:bg-red-800 transition text-sm sm:text-base order-1 sm:order-2 touch-manipulation"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Step 7: Volunteer Profile Section */}
        {step === 7 && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-red-700 mb-2">
              Volunteer Profile
            </h2>
            <p className="mb-3 sm:mb-4 text-gray-800 text-sm sm:text-base">
              We gather this information to determine to which committee or role
              you are most able to contribute.
            </p>
            <div className="flex flex-col gap-3 sm:gap-4">
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  What aspect / role in the organization are you most inclined
                  to contribute to? <span className="text-red-600">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    "Events & Sponsorships",
                    "Communications",
                    "Clinic Operations",
                    "Organization Development",
                    "Information Technology",
                  ].map((role) => (
                    <label
                      key={role}
                      className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation"
                    >
                      <input
                        type="checkbox"
                        name="volunteerRoles"
                        value={role}
                        checked={form.volunteerRoles.includes(role)}
                        onChange={(e) =>
                          handleCheckboxArray(e, "volunteerRoles")
                        }
                        className="mr-2 w-4 h-4"
                      />
                      {role}
                    </label>
                  ))}
                  <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                    <input
                      type="checkbox"
                      name="volunteerRoles"
                      value="Other"
                      checked={form.volunteerRoles.includes("Other")}
                      onChange={(e) => handleCheckboxArray(e, "volunteerRoles")}
                      className="mr-2 w-4 h-4"
                    />
                    Other
                    {form.volunteerRoles.includes("Other") && (
                      <input
                        type="text"
                        name="volunteerOtherRole"
                        value={form.volunteerOtherRole}
                        onChange={handleChange}
                        onBlur={(e) => validateField(e.target.name, e.target.value)}
                        className="ml-2 border rounded px-2 py-1 text-gray-900 text-sm sm:text-base touch-manipulation"
                        placeholder="Please specify"
                      />
                    )}
                  </label>
                </div>
                {errors.volunteerRoles && (
                  <p className="text-red-600 text-xs sm:text-sm">
                    {errors.volunteerRoles}
                  </p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  Which Days are you most available for volunteering?{" "}
                  <span className="text-red-600">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ].map((day) => (
                    <label
                      key={day}
                      className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation"
                    >
                      <input
                        type="checkbox"
                        name="volunteerDays"
                        value={day}
                        checked={form.volunteerDays.includes(day)}
                        onChange={(e) =>
                          handleCheckboxArray(e, "volunteerDays")
                        }
                        className="mr-2 w-4 h-4"
                      />
                      {day}
                    </label>
                  ))}
                </div>
                {errors.volunteerDays && (
                  <p className="text-red-600 text-xs sm:text-sm">{errors.volunteerDays}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  How often do you have time to volunteer?{" "}
                  <span className="text-red-600">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                    <input
                      type="radio"
                      name="volunteerFrequency"
                      value="Always"
                      checked={form.volunteerFrequency === "Always"}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4"
                    />
                    Always (daily)
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                    <input
                      type="radio"
                      name="volunteerFrequency"
                      value="Often"
                      checked={form.volunteerFrequency === "Often"}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4"
                    />
                    Often (3 or more times a week)
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                    <input
                      type="radio"
                      name="volunteerFrequency"
                      value="Seldom"
                      checked={form.volunteerFrequency === "Seldom"}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4"
                    />
                    Seldom (3 times a month)
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                    <input
                      type="radio"
                      name="volunteerFrequency"
                      value="Rarely"
                      checked={form.volunteerFrequency === "Rarely"}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4"
                    />
                    Rarely (once every few months)
                  </label>
                </div>
                <span className="text-xs text-gray-600">
                  This does not affect your application status. We value any
                  contribution of time.
                </span>
                {errors.volunteerFrequency && (
                  <p className="text-red-600 text-xs sm:text-sm">
                    {errors.volunteerFrequency}
                  </p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  What kind of trainings were you able to complete?{" "}
                  <span className="text-red-600">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  {[
                    "None in the list",
                    "Peer Counseling",
                    "HIV Testing",
                    "Community-Based HIV Screening",
                    "Case Management / Life Coaching",
                  ].map((training) => {
                    const selected = form.volunteerTrainings.includes(training);
                    const slug = String(training).toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    const cert = (form.trainingCertificates || []).find(c => c.trainingName === training);
                    return (
                      <div key={training} className="mb-1">
                        <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                          <input
                            type="checkbox"
                            name="volunteerTrainings"
                            value={training}
                            checked={selected}
                            onChange={(e) => handleCheckboxArray(e, "volunteerTrainings")}
                            className="mr-2 w-4 h-4"
                          />
                          {training}
                        </label>
                        {selected && training !== 'None in the list' && (
                          <div className="ml-6 mt-1">
                            {cert && cert.s3Key ? (
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-700">{cert.filename}</span>
                                <span className="text-green-600 text-sm">Uploaded</span>
                                <button type="button" className="text-red-600 text-sm" onClick={() => removeCertificate(training)}>Remove</button>
                              </div>
                            ) : cert && cert.file ? (
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-700">Selected: {cert.filename} ({Math.round((cert.size||0)/1024)} KB)</span>
                                <button type="button" className="text-red-600 text-sm" onClick={() => removeCertificate(training)}>Remove</button>
                              </div>
                            ) : cert && cert.uploadStatus === 'failed' ? (
                              <div className="flex items-center gap-3">
                                <div className="text-sm text-red-600">Upload failed: {cert.lastError || 'Please try again.'}</div>
                                <button
                                  type="button"
                                  className="text-blue-600 text-sm"
                                  onClick={() => { setErrors(prev => ({ ...prev, trainingCertificates: undefined })); updateCertificateState(training, { uploadStatus: undefined, lastError: undefined, filename: undefined, s3Key: undefined }); }}
                                >
                                  Retry
                                </button>
                              </div>
                            ) : (
                              <input
                                data-testid={`upload-${slug}`}
                                id={`file-${slug}`}
                                type="file"
                                accept="application/pdf,image/*"
                                onChange={(e) => handleFileSelect(e, training)}
                                className="mt-1 dark:text-gray-900 text-sm dark:border-gray-600 border border-gray-300 rounded px-2 py-1 touch-manipulation"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {errors.volunteerTrainings && (
                  <p className="text-red-600 text-xs sm:text-sm">
                    {errors.volunteerTrainings}
                  </p>
                )}
                {errors.trainingCertificates && (
                  <p role="alert" className="text-red-600 text-xs sm:text-sm mt-2">
                    {errors.trainingCertificates}
                  </p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900 text-sm sm:text-base">
                  In 5–10 sentences, please write the reason why you want to be
                  a volunteer of Bagani? <span className="text-red-600">*</span>
                </label>
                <textarea
                  name="volunteerReason"
                  value={form.volunteerReason}
                  onChange={handleChange}
                  onBlur={(e) => validateField(e.target.name, e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900 text-sm sm:text-base touch-manipulation"
                  rows={4}
                  placeholder="Your answer..."
                />
                {errors.volunteerReason && (
                  <p className="text-red-600 text-xs sm:text-sm">
                    {errors.volunteerReason}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between mt-6 sm:mt-8 gap-2 sm:gap-4">
              {/* First column: Back button */}
              <div className="w-full sm:w-auto">
                <button
                  type="button"
                  className="bg-gray-300 text-gray-800 font-bold px-4 sm:px-6 py-2.5 sm:py-2 rounded hover:bg-gray-400 transition w-full text-sm sm:text-base touch-manipulation"
                  onClick={handleBack}
                >
                  Back
                </button>
              </div>
              {/* Second column: Clear form and Next buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  className="text-red-700 hover:text-gray-800 px-4 sm:px-6 py-2 sm:py-0 text-sm sm:text-base order-2 sm:order-1 touch-manipulation"
                  onClick={handleClearForm}
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  className="bg-[var(--primary-red)] text-white font-bold px-4 sm:px-6 py-2.5 sm:py-2 rounded hover:bg-red-800 transition text-sm sm:text-base order-1 sm:order-2 touch-manipulation"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Step 8: Declaration of Volunteer Commitment */}
        {step === 8 && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-red-700 mb-2">
              Declaration of Volunteer Commitment
            </h2>
            <div className="mb-3 sm:mb-4 text-gray-800 text-sm sm:text-base max-h-60 sm:max-h-96 overflow-y-auto border border-gray-200 rounded p-3 sm:p-4">
              In my intention to volunteer for Bagani Community Center, I commit
              to the following:
              <ul className="list-disc pl-5 sm:pl-6 mt-2 mb-2">
                <li>
                  To help the organization fulfill its goals and objectives for
                  the community.
                </li>
                <li>
                  That I intend to fulfill the minimum duties and
                  responsibilities to be a full-pledged volunteer, to the best
                  of my ability: including time commitments, adherence to safety
                  standards and protocols, code of ethics, and any of the
                  organization&apos;s rules and regulations.
                </li>
                <li>
                  To maintain with the strictest confidentiality any information
                  about the organization and any of its clients.
                </li>
                <li>
                  To inform the organization of my period of inactivity, for
                  whatever reason, and to notify them of my intention when I
                  wish to be active again.
                </li>
              </ul>
              This declaration of commitment is binding in honour only, and is
              not intended to be legally binding, except for cases that breach
              any laws within the jurisdiction of the Philippines.
            </div>
            <div className="mb-2 font-semibold text-gray-900 text-sm sm:text-base">
              Do you agree with the Declaration of Volunteer Commitment?
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                <input
                  type="radio"
                  name="declarationCommitment"
                  value="agree"
                  checked={form.declarationCommitment === "agree"}
                  onChange={handleChange}
                  className="mr-2 w-4 h-4"
                  required
                />
                I Agree
              </label>
              <label className="inline-flex items-center text-gray-800 cursor-pointer text-sm sm:text-base touch-manipulation">
                <input
                  type="radio"
                  name="declarationCommitment"
                  value="disagree"
                  checked={form.declarationCommitment === "disagree"}
                  onChange={handleChange}
                  className="mr-2 w-4 h-4"
                />
                I Disagree
              </label>
              {errors.declarationCommitment && (
                <p className="text-red-600 text-xs sm:text-sm">
                  {errors.declarationCommitment}
                </p>
              )}
            </div>
            {/* Show submission error if any */}
            {submitError && (
              <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
                <p className="text-red-700 font-semibold">Error:</p>
                <p className="text-red-600">{submitError}</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between mt-6 sm:mt-8 gap-2 sm:gap-4">
              {/* First column: Back button */}
              <div className="w-full sm:w-auto">
                <button
                  type="button"
                  className="bg-gray-300 text-gray-800 font-bold px-4 sm:px-6 py-2.5 sm:py-2 rounded hover:bg-gray-400 transition w-full text-sm sm:text-base touch-manipulation"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  Back
                </button>
              </div>
              {/* Second column: Clear form and Next buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  className="text-red-700 hover:text-gray-800 px-4 sm:px-6 py-2 sm:py-0 text-sm sm:text-base order-2 sm:order-1 touch-manipulation"
                  onClick={handleClearForm}
                  disabled={isSubmitting}
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  className={`bg-[var(--primary-red)] text-white font-bold px-4 sm:px-6 py-2.5 sm:py-2 rounded hover:bg-red-800 transition text-sm sm:text-base order-1 sm:order-2 touch-manipulation ${
                    form.declarationCommitment !== "agree" || isSubmitting
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  disabled={
                    form.declarationCommitment !== "agree" || isSubmitting
                  }
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Progress Bar */}
        <div className="w-full max-w-xl px-2 sm:px-0">
          <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2 relative">
            <div
              className="bg-[var(--primary-red)] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </form>
    </div>
  );
}
