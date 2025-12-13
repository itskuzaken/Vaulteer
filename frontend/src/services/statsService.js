import { getAuth } from "firebase/auth";
import { API_BASE } from "../config/config";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || API_BASE;

async function getAuthToken() {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  return await user.getIdToken();
}

export async function getParticipationStats() {
  try {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}/stats/participation`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch participation stats");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching participation stats:", error);
    throw error;
  }
}

export default { getParticipationStats };
