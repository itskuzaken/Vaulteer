import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold text-red-700 mb-4">403 Forbidden</h1>
      <p className="text-lg text-gray-700 mb-8">
        You do not have permission to access this page.
      </p>
      <Link
        href="/"
        className="bg-red-700 text-white px-6 py-2 rounded font-semibold hover:bg-red-800 transition"
      >
        Go to Home
      </Link>
    </div>
  );
}
