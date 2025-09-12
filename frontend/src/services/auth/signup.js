import { auth, googleProvider } from "../firebase";

// Optionally pass formData if you want to save extra info after sign-in
export async function signup(formData) {
  try {
    // 1. Google Sign-In
    const result = (await auth.signInWithPopup)
      ? auth.signInWithPopup(googleProvider)
      : await import("firebase/auth").then(({ signInWithPopup }) =>
          signInWithPopup(auth, googleProvider)
        );
    const user = result.user;

    // 2. Save user to backend (users/applicants table)
    const userPayload = {
      uid: user.uid,
      name: user.displayName,
      email: user.email,
    };

    // If you have form data, send it as applicant info
    const body = formData
      ? { user: userPayload, applicant: formData }
      : { user: userPayload };

    const res = await fetch("/api/volunteer/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error("Failed to save applicant");

    // 3. Redirect or return result
    window.location.href = "/dashboard/volunteer";
    return await res.json();
  } catch (error) {
    // Handle errors (show toast, etc.)
    throw error;
  }
}
