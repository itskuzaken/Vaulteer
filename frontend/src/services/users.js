// client-side service used by components
export async function fetchUsers() {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const res = await fetch(`${base}/api/users`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}
