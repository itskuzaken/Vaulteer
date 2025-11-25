"use client";
import { useState, useEffect } from "react";
import { signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { auth, googleProvider } from "../../../services/firebase";
import { API_BASE } from "../../../config/config";

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
    volunteerReason: "",
    declarationCommitment: "",
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

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
      return { ...prev, [field]: updatedArr };
    });
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

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "radio" ? value : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
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
    if (!form.lastName.trim()) newErrors.lastName = "Last Name is required.";
    if (!form.firstName.trim()) newErrors.firstName = "First Name is required.";
    if (!form.nickname.trim())
      newErrors.nickname = "Nickname/Alias is required.";
    if (!form.birthdate) newErrors.birthdate = "Birthdate is required.";
    if (!form.gender) newErrors.gender = "Gender is required.";
    if (form.gender === "Other" && !form.genderOther.trim())
      newErrors.genderOther = "Please specify your gender.";
    return newErrors;
  };

  const validateContact = () => {
    const newErrors = {};
    if (!form.mobileNumber.trim())
      newErrors.mobileNumber = "Mobile Number is required.";
    if (!form.city.trim())
      newErrors.city = "Current City/Municipality is required.";
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
    if (!form.position.trim()) newErrors.position = "Position is required.";
    if (!form.industry.trim()) newErrors.industry = "Industry is required.";
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
    if (!form.graduation.trim())
      newErrors.graduation = "Expected graduation is required.";
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
    if (!form.volunteerReason.trim())
      newErrors.volunteerReason = "Please write your reason for volunteering.";
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

  // Google sign-in handler for modal
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Prepare user and applicant data
      const userPayload = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName,
        email: firebaseUser.email,
      };

      // Send both user and applicant form data to backend
      await fetch("/api/volunteer/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: userPayload,
          applicant: form, // send the entire form as applicant data
        }),
      });

      setShowGoogleModal(false);
      setPendingSubmit(false);
      setGoogleSignedIn(true);
      doFinalSubmit();
    } catch (error) {
      setShowGoogleModal(false);
      setPendingSubmit(false);
      setGoogleSignedIn(false);
    }
  };

  // Final form submission logic (after Google sign-in)
  const doFinalSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Get current Firebase user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("You must be signed in to submit an application");
      }

      // Prepare user data
      const userData = {
        uid: currentUser.uid,
        name: currentUser.displayName || `${form.firstName} ${form.lastName}`,
        email: currentUser.email,
      };

      // Prepare form data
      const formData = {
        firstName: form.firstName,
        middleInitial: form.middleInitial || null,
        lastName: form.lastName,
        nickname: form.nickname,
        birthdate: form.birthdate,
        gender: form.gender,
        genderOther: form.genderOther || null,
        consent: form.consent,
        mobileNumber: form.mobileNumber,
        city: form.city,
        facebook: form.facebook || null,
        twitter: form.twitter || null,
        instagram: form.instagram || null,
        tiktok: form.tiktok || null,
        currentStatus: form.currentStatus,
        declarationCommitment: form.declarationCommitment,
        volunteerReason: form.volunteerReason,
        volunteerFrequency: form.volunteerFrequency,
        volunteerRoles: form.volunteerRoles || [],
        volunteerDays: form.volunteerDays || [],
        volunteerTrainings: form.volunteerTrainings || [],
        // Work profile fields (only if currentStatus is "Working Professional")
        position: form.position || null,
        industry: form.industry || null,
        company: form.company || null,
        workShift: form.workShift || null,
        workOtherSkills: form.workOtherSkills || null,
        workingDays: form.workingDays || [],
        // Student profile fields (only if currentStatus is "Student")
        school: form.school || null,
        course: form.course || null,
        graduation: form.graduation || null,
        studentOtherSkills: form.studentOtherSkills || null,
        schoolDays: form.schoolDays || [],
      };

      // Submit to backend
      const response = await fetch(`${API_BASE}/applicants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: userData,
          form: formData,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit application");
      }

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
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-br from-red-100 via-white to-red-200 p-6">
      {/* Header Container */}
      <div className="w-full max-w-xl mb-4">
        <h1 className="text-2xl font-extrabold text-red-700 text-center tracking-tight bg-white border-2 border-red-700 rounded-2xl shadow-2xl py-6">
          Volunteer Sign Up Form
        </h1>
      </div>

      {/* Form Container */}
      <form
        className="w-full max-w-xl bg-white border-2 border-red-700 rounded-2xl shadow-2xl p-8 space-y-8"
        onSubmit={step === 8 ? handleSubmit : handleNext}
        noValidate
      >
        {/* Step 1: Data Privacy Consent */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-red-700 mb-2">
              Data Privacy Notice
            </h2>
            <div
              className="bg-red-50 border border-red-200 rounded p-4 mb-4 text-gray-800 text-sm"
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
            <h2 className="text-xl font-bold text-red-700 mb-4">
              Personal Information
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Last Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 text-gray-900 ${
                    errors.lastName ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.lastName && (
                  <p className="text-red-600 text-sm">{errors.lastName}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  First Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 text-gray-900 ${
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
                  className={`w-full border rounded px-3 py-2 text-gray-900 ${
                    errors.birthdate ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.birthdate && (
                  <p className="text-red-600 text-sm">{errors.birthdate}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Gender Identity <span className="text-red-600">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="Male"
                      checked={form.gender === "Male"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Male
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="Female"
                      checked={form.gender === "Female"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Female
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="Prefer not to say"
                      checked={form.gender === "Prefer not to say"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Prefer not to say
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value="Other"
                      checked={form.gender === "Other"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Other
                    {form.gender === "Other" && (
                      <input
                        type="text"
                        name="genderOther"
                        value={form.genderOther}
                        onChange={handleChange}
                        placeholder="Please specify"
                        className={`ml-2 border rounded px-2 py-1 text-gray-900 ${
                          errors.genderOther
                            ? "border-red-500"
                            : "border-gray-300"
                        }`}
                      />
                    )}
                  </label>
                </div>
                {errors.gender && (
                  <p className="text-red-600 text-sm">{errors.gender}</p>
                )}
                {errors.genderOther && (
                  <p className="text-red-600 text-sm">{errors.genderOther}</p>
                )}
              </div>
            </div>
            <div className="flex justify-between mt-8 gap-4">
              {/* First column: Back button */}
              <div className=" items-center">
                <button
                  type="button"
                  className="bg-gray-300 text-gray-800 font-bold px-6 py-2 rounded hover:bg-gray-400 transition w-full"
                  onClick={handleBack}
                >
                  Back
                </button>
              </div>
              {/* Second column: Clear form and Next buttons */}
              <div className=" justify-end gap-2">
                <button
                  type="button"
                  className="text-red-700 hover:text-gray-800 px-6"
                  onClick={handleClearForm}
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  className="bg-[var(--primary-red)] text-white font-bold px-6 py-2 rounded hover:bg-red-800 transition"
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
            <h2 className="text-xl font-bold text-red-700 mb-4">
              Contact Information
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Mobile Number <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="mobileNumber"
                  value={form.mobileNumber}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 text-gray-900 ${
                    errors.mobileNumber ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="09XXXXXXXXX"
                  required
                />
                {errors.mobileNumber && (
                  <p className="text-red-600 text-sm">{errors.mobileNumber}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Current City/Municipality of Residence{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="city"
                  value={form.city}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 text-gray-900 ${
                    errors.city ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="e.g. Bacolod City"
                  required
                />
                {errors.city && (
                  <p className="text-red-600 text-sm">{errors.city}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Social Media Account: Facebook
                </label>
                <input
                  type="url"
                  name="facebook"
                  value={form.facebook}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  placeholder="https://facebook.com/yourprofile"
                  pattern="https?://.+"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Social Media Account: Twitter
                </label>
                <input
                  type="url"
                  name="twitter"
                  value={form.twitter}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  placeholder="https://twitter.com/yourprofile"
                  pattern="https?://.+"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Social Media Account: Instagram
                </label>
                <input
                  type="url"
                  name="instagram"
                  value={form.instagram}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  placeholder="https://instagram.com/yourprofile"
                  pattern="https?://.+"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Social Media Account: Tiktok
                </label>
                <input
                  type="url"
                  name="tiktok"
                  value={form.tiktok}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  placeholder="https://tiktok.com/@yourprofile"
                  pattern="https?://.+"
                />
              </div>
            </div>
            <div className="flex justify-between mt-8 gap-4">
              {/* First column: Back button */}
              <div className=" items-center">
                <button
                  type="button"
                  className="bg-gray-300 text-gray-800 font-bold px-6 py-2 rounded hover:bg-gray-400 transition w-full"
                  onClick={handleBack}
                >
                  Back
                </button>
              </div>
              {/* Second column: Clear form and Next buttons */}
              <div className=" justify-end gap-2">
                <button
                  type="button"
                  className="text-red-700 hover:text-gray-800 px-6"
                  onClick={handleClearForm}
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  className="bg-[var(--primary-red)] text-white font-bold px-6 py-2 rounded hover:bg-red-800 transition"
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
            <h2 className="text-xl font-bold text-red-700 mb-2">
              Student/Employment Profile
            </h2>
            <p className="mb-4 text-gray-800">
              We gather this information to determine to which committee or role
              you are most able to contribute.
            </p>
            <div className="flex flex-col gap-4">
              <label className="font-semibold mb-1 text-gray-900">
                Current Status: <span className="text-red-600">*</span>
              </label>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center text-gray-800 cursor-pointer">
                  <input
                    type="radio"
                    name="currentStatus"
                    value="Working Professional"
                    checked={form.currentStatus === "Working Professional"}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  Working Professional
                </label>
                <label className="inline-flex items-center text-gray-800 cursor-pointer">
                  <input
                    type="radio"
                    name="currentStatus"
                    value="Student"
                    checked={form.currentStatus === "Student"}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  Student
                </label>
                <label className="inline-flex items-center text-gray-800 cursor-pointer">
                  <input
                    type="radio"
                    name="currentStatus"
                    value="Not Applicable"
                    checked={form.currentStatus === "Not Applicable"}
                    onChange={handleChange}
                    className="mr-2"
                  />
                  Not Applicable
                </label>
              </div>
              {errors.currentStatus && (
                <p className="text-red-600 text-sm">{errors.currentStatus}</p>
              )}
            </div>
            <div className="flex justify-between mt-8 gap-4">
              {/* First column: Back button */}
              <div className=" items-center">
                <button
                  type="button"
                  className="bg-gray-300 text-gray-800 font-bold px-6 py-2 rounded hover:bg-gray-400 transition w-full"
                  onClick={handleBack}
                >
                  Back
                </button>
              </div>
              {/* Second column: Clear form and Next buttons */}
              <div className=" justify-end gap-2">
                <button
                  type="button"
                  className="text-red-700 hover:text-gray-800 px-6"
                  onClick={handleClearForm}
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  className="bg-[var(--primary-red)] text-white font-bold px-6 py-2 rounded hover:bg-red-800 transition"
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
            <h2 className="text-xl font-bold text-red-700 mb-2">
              Work Profile
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Position <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="position"
                  value={form.position}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 text-gray-900 ${
                    errors.position ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.position && (
                  <p className="text-red-600 text-sm">{errors.position}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Industry <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="industry"
                  value={form.industry}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 text-gray-900 ${
                    errors.industry ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.industry && (
                  <p className="text-red-600 text-sm">{errors.industry}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Company
                </label>
                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
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
                      className="inline-flex items-center text-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="workingDays"
                        value={day}
                        checked={form.workingDays.includes(day)}
                        onChange={(e) => handleCheckboxArray(e, "workingDays")}
                        className="mr-1"
                      />
                      {day}
                    </label>
                  ))}
                </div>
                {errors.workingDays && (
                  <p className="text-red-600 text-sm">{errors.workingDays}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  General Work Shift <span className="text-red-600">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="workShift"
                      value="Day shift"
                      checked={form.workShift === "Day shift"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Day shift (8AM - 10AM start of shift)
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="workShift"
                      value="Mid shift"
                      checked={form.workShift === "Mid shift"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Mid shift (1PM - 3PM start of shift)
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="workShift"
                      value="Night shift"
                      checked={form.workShift === "Night shift"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Night shift (6PM onwards start of shift)
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="workShift"
                      value="Not Applicable"
                      checked={form.workShift === "Not Applicable"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Not Applicable
                  </label>
                </div>
                {errors.workShift && (
                  <p className="text-red-600 text-sm">{errors.workShift}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Other Skills, Hobbies, or Passions{" "}
                  <span className="text-red-600">*</span>
                </label>
                <textarea
                  name="workOtherSkills"
                  value={form.workOtherSkills}
                  onChange={handleChange}
                  className={`w-full border border-gray-300 rounded px-3 py-2 text-gray-900${
                    errors.workOtherSkills ? " border-red-500" : ""
                  }`}
                  rows={2}
                />
                {errors.workOtherSkills && (
                  <p className="text-red-600 text-sm">
                    {errors.workOtherSkills}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-between mt-8 gap-4">
              {/* First column: Back button */}
              <div className=" items-center">
                <button
                  type="button"
                  className="bg-gray-300 text-gray-800 font-bold px-6 py-2 rounded hover:bg-gray-400 transition w-full"
                  onClick={handleBack}
                >
                  Back
                </button>
              </div>
              {/* Second column: Clear form and Next buttons */}
              <div className=" justify-end gap-2">
                <button
                  type="button"
                  className="text-red-700 hover:text-gray-800 px-6"
                  onClick={handleClearForm}
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  className="bg-[var(--primary-red)] text-white font-bold px-6 py-2 rounded hover:bg-red-800 transition"
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
            <h2 className="text-xl font-bold text-red-700 mb-2">
              Student Profile
            </h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Name of your School and Location{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="school"
                  value={form.school}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 text-gray-900 ${
                    errors.school ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.school && (
                  <p className="text-red-600 text-sm">{errors.school}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Course / Major <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="course"
                  value={form.course}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 text-gray-900 ${
                    errors.course ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {errors.course && (
                  <p className="text-red-600 text-sm">{errors.course}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Year of Expected Graduation{" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  name="graduation"
                  value={form.graduation}
                  onChange={handleChange}
                  className={`w-full border rounded px-3 py-2 text-gray-900 ${
                    errors.graduation ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="e.g. 2025"
                />
                {errors.graduation && (
                  <p className="text-red-600 text-sm">{errors.graduation}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
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
                      className="inline-flex items-center text-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="schoolDays"
                        value={day}
                        checked={form.schoolDays.includes(day)}
                        onChange={(e) => handleCheckboxArray(e, "schoolDays")}
                        className="mr-1"
                      />
                      {day}
                    </label>
                  ))}
                </div>
                {errors.schoolDays && (
                  <p className="text-red-600 text-sm">{errors.schoolDays}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  Other Skills, Hobbies, or Passions{" "}
                  <span className="text-red-600">*</span>
                </label>
                <textarea
                  name="studentOtherSkills"
                  value={form.studentOtherSkills}
                  onChange={handleChange}
                  className={`w-full border border-gray-300 rounded px-3 py-2 text-gray-900${
                    errors.studentOtherSkills ? " border-red-500" : ""
                  }`}
                  rows={2}
                />
                {errors.studentOtherSkills && (
                  <p className="text-red-600 text-sm">
                    {errors.studentOtherSkills}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-between mt-8 gap-4">
              {/* First column: Back button */}
              <div className=" items-center">
                <button
                  type="button"
                  className="bg-gray-300 text-gray-800 font-bold px-6 py-2 rounded hover:bg-gray-400 transition w-full"
                  onClick={handleBack}
                >
                  Back
                </button>
              </div>
              {/* Second column: Clear form and Next buttons */}
              <div className=" justify-end gap-2">
                <button
                  type="button"
                  className="text-red-700 hover:text-gray-800 px-6"
                  onClick={handleClearForm}
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  className="bg-[var(--primary-red)] text-white font-bold px-6 py-2 rounded hover:bg-red-800 transition"
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
            <h2 className="text-xl font-bold text-red-700 mb-2">
              Volunteer Profile
            </h2>
            <p className="mb-4 text-gray-800">
              We gather this information to determine to which committee or role
              you are most able to contribute.
            </p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
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
                      className="inline-flex items-center text-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="volunteerRoles"
                        value={role}
                        checked={form.volunteerRoles.includes(role)}
                        onChange={(e) =>
                          handleCheckboxArray(e, "volunteerRoles")
                        }
                        className="mr-2"
                      />
                      {role}
                    </label>
                  ))}
                  <label className="inline-flex items-center text-gray-800 cursor-pointer">
                    <input
                      type="checkbox"
                      name="volunteerRoles"
                      value="Other"
                      checked={form.volunteerRoles.includes("Other")}
                      onChange={(e) => handleCheckboxArray(e, "volunteerRoles")}
                      className="mr-2"
                    />
                    Other
                    {form.volunteerRoles.includes("Other") && (
                      <input
                        type="text"
                        name="volunteerOtherRole"
                        value={form.volunteerOtherRole}
                        onChange={handleChange}
                        className="ml-2 border rounded px-2 py-1 text-gray-900"
                        placeholder="Please specify"
                      />
                    )}
                  </label>
                </div>
                {errors.volunteerRoles && (
                  <p className="text-red-600 text-sm">
                    {errors.volunteerRoles}
                  </p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
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
                      className="inline-flex items-center text-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="volunteerDays"
                        value={day}
                        checked={form.volunteerDays.includes(day)}
                        onChange={(e) =>
                          handleCheckboxArray(e, "volunteerDays")
                        }
                        className="mr-1"
                      />
                      {day}
                    </label>
                  ))}
                </div>
                {errors.volunteerDays && (
                  <p className="text-red-600 text-sm">{errors.volunteerDays}</p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  How often do you have time to volunteer?{" "}
                  <span className="text-red-600">*</span>
                </label>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="volunteerFrequency"
                      value="Always"
                      checked={form.volunteerFrequency === "Always"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Always (daily)
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="volunteerFrequency"
                      value="Often"
                      checked={form.volunteerFrequency === "Often"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Often (3 or more times a week)
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="volunteerFrequency"
                      value="Seldom"
                      checked={form.volunteerFrequency === "Seldom"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Seldom (3 times a month)
                  </label>
                  <label className="inline-flex items-center text-gray-800 cursor-pointer">
                    <input
                      type="radio"
                      name="volunteerFrequency"
                      value="Rarely"
                      checked={form.volunteerFrequency === "Rarely"}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Rarely (once every few months)
                  </label>
                </div>
                <span className="text-xs text-gray-600">
                  This does not affect your application status. We value any
                  contribution of time.
                </span>
                {errors.volunteerFrequency && (
                  <p className="text-red-600 text-sm">
                    {errors.volunteerFrequency}
                  </p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
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
                  ].map((training) => (
                    <label
                      key={training}
                      className="inline-flex items-center text-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="volunteerTrainings"
                        value={training}
                        checked={form.volunteerTrainings.includes(training)}
                        onChange={(e) =>
                          handleCheckboxArray(e, "volunteerTrainings")
                        }
                        className="mr-2"
                      />
                      {training}
                    </label>
                  ))}
                </div>
                {errors.volunteerTrainings && (
                  <p className="text-red-600 text-sm">
                    {errors.volunteerTrainings}
                  </p>
                )}
              </div>
              <div>
                <label className="block font-semibold mb-1 text-gray-900">
                  In 5–10 sentences, please write the reason why you want to be
                  a volunteer of Bagani? <span className="text-red-600">*</span>
                </label>
                <textarea
                  name="volunteerReason"
                  value={form.volunteerReason}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-gray-900"
                  rows={4}
                  placeholder="Your answer..."
                />
                {errors.volunteerReason && (
                  <p className="text-red-600 text-sm">
                    {errors.volunteerReason}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-between mt-8 gap-4">
              {/* First column: Back button */}
              <div className=" items-center">
                <button
                  type="button"
                  className="bg-gray-300 text-gray-800 font-bold px-6 py-2 rounded hover:bg-gray-400 transition w-full"
                  onClick={handleBack}
                >
                  Back
                </button>
              </div>
              {/* Second column: Clear form and Next buttons */}
              <div className=" justify-end gap-2">
                <button
                  type="button"
                  className="text-red-700 hover:text-gray-800 px-6"
                  onClick={handleClearForm}
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  className="bg-[var(--primary-red)] text-white font-bold px-6 py-2 rounded hover:bg-red-800 transition"
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
            <h2 className="text-xl font-bold text-red-700 mb-2">
              Declaration of Volunteer Commitment
            </h2>
            <div className="mb-4 text-gray-800">
              In my intention to volunteer for Bagani Community Center, I commit
              to the following:
              <ul className="list-disc pl-6 mt-2 mb-2">
                <li>
                  To help the organization fulfill its goals and objectives for
                  the community.
                </li>
                <li>
                  That I intend to fulfill the minimum duties and
                  responsibilities to be a full-pledged volunteer, to the best
                  of my ability: including time commitments, adherence to safety
                  standards and protocols, code of ethics, and any of the
                  organization's rules and regulations.
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
            <div className="mb-2 font-semibold text-gray-900">
              Do you agree with the Declaration of Volunteer Commitment?
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="declarationCommitment"
                  value="agree"
                  checked={form.declarationCommitment === "agree"}
                  onChange={handleChange}
                  className="mr-2"
                  required
                />
                I Agree
              </label>
              <label className="inline-flex items-center text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="declarationCommitment"
                  value="disagree"
                  checked={form.declarationCommitment === "disagree"}
                  onChange={handleChange}
                  className="mr-2"
                />
                I Disagree
              </label>
              {errors.declarationCommitment && (
                <p className="text-red-600 text-sm">
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
            <div className="flex justify-between mt-8 gap-4">
              {/* First column: Back button */}
              <div className=" items-center">
                <button
                  type="button"
                  className="bg-gray-300 text-gray-800 font-bold px-6 py-2 rounded hover:bg-gray-400 transition w-full"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  Back
                </button>
              </div>
              {/* Second column: Clear form and Next buttons */}
              <div className=" justify-end gap-2">
                <button
                  type="button"
                  className="text-red-700 hover:text-gray-800 px-6"
                  onClick={handleClearForm}
                  disabled={isSubmitting}
                >
                  Clear form
                </button>
                <button
                  type="submit"
                  className={`bg-[var(--primary-red)] text-white font-bold px-6 py-2 rounded hover:bg-red-800 transition ${
                    form.declarationCommitment !== "agree" || isSubmitting
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  disabled={form.declarationCommitment !== "agree" || isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Progress Bar */}
        <div className="w-full max-w-xl ">
          <div className="w-full bg-gray-200 rounded-full h-2 relative">
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