export default function VolunteerOverview() {
  return (
    <div className="bg-gradient-to-br from-red-100 via-white to-red-200 border-2 border-red-700 rounded-2xl shadow-2xl p-8 transition-all duration-300">
      <div className="mb-8 bg-white border-2 bg-opacity-10 p-3 rounded-xl">
        <h2 className="text-2xl font-extrabold text-red-700 tracking-tight">
          Overview
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-red-100 p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-red-700">4</div>
          <div className="text-gray-700">Upcoming Events</div>
        </div>
        <div className="bg-red-100 p-4 rounded-lg shadow">
          <div className="text-3xl font-bold text-red-700">2</div>
          <div className="text-gray-700">Tasks</div>
        </div>
      </div>
    </div>
  );
}
