"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Image from "next/image";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="w-full mx-auto font-sans bg-white" suppressHydrationWarning>
      {/* Home / Hero Section */}
      <section
        id="home"
        className="relative flex flex-col items-center justify-center min-h-[60vh] md:min-h-[70vh] px-2 md:px-4 py-10 md:py-16 bg-gradient-to-br from-white via-white to-red-100"
      >
        <Image
          src="/bagani-logo.png"
          alt="Bagani Logo"
          width={210}
          height={50}
          className="h-20 md:h-24 mb-4 drop-shadow-lg"
          priority
        />
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-extrabold text-center text-[var(--primary-red)] mb-4">
          Welcome to Bagani Community Center
        </h1>
        <p className="text-base md:text-xl lg:text-2xl text-center text-red-800 max-w-xl md:max-w-2xl mb-6">
          Empowering the LGBTQIA+ community in Negros Island through health,
          education, and advocacy.
        </p>
        <a
          href="#services"
          className="inline-block bg-[var(--primary-red)] text-white font-bold px-6 md:px-8 py-2 md:py-3 rounded-full shadow-lg hover:scale-105 transition"
        >
          Explore Our Services
        </a>
        <Image
          src="/hero-banner.jpg"
          alt="LGBTQ+ Hero Banner"
          width={800}
          height={320}
          className="w-full max-w-xs md:max-w-lg lg:max-w-3xl mt-8 md:mt-10 rounded-2xl shadow-xl object-cover"
          style={{ minHeight: "120px" }}
          priority
        />
      </section>

      {/* News Section */}
      <section
        id="news"
        className="bg-white py-8 md:py-12 px-2 md:px-4 lg:px-12"
        aria-labelledby="news-header"
      >
        <h2
          id="news-header"
          className="text-xl md:text-2xl lg:text-3xl font-bold text-center text-[var(--primary-red)] mb-6 md:mb-8"
        >
          Latest News & Updates
        </h2>
        <div className="flex flex-col gap-4 md:gap-6 lg:flex-row lg:gap-6 justify-center">
          {/* News Card 1 */}
          <div className="bg-gradient-to-br from-white to-red-100 border border-red-200 rounded-xl shadow-md p-4 md:p-6 flex-1 min-w-[220px] max-w-md mx-auto">
            <h3 className="text-base md:text-lg font-bold text-[var(--primary-red)] mb-2">
              2Q 2025 Volunteer Orientation
            </h3>
            <p className="mb-2 text-sm md:text-base">
              Join our next orientation in Dumaguete! Meet fellow volunteers,
              learn about our mission, and get involved.
            </p>
            <span className="inline-block text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
              May 2025
            </span>
          </div>
          {/* News Card 2 */}
          <div className="bg-gradient-to-br from-white to-red-100 border border-red-200 rounded-xl shadow-md p-4 md:p-6 flex-1 min-w-[220px] max-w-md mx-auto">
            <h3 className="text-base md:text-lg font-bold text-[var(--primary-red)] mb-2">
              Community Outreach
            </h3>
            <p className="mb-2 text-sm md:text-base">
              Our team recently held a health education drive in Bacolod City,
              reaching over 200 youth and families.
            </p>
            <span className="inline-block text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
              April 2025
            </span>
          </div>
          {/* News Card 3 */}
          <div className="bg-gradient-to-br from-white to-red-100 border border-red-200 rounded-xl shadow-md p-4 md:p-6 flex-1 min-w-[220px] max-w-md mx-auto">
            <h3 className="text-base md:text-lg font-bold text-[var(--primary-red)] mb-2">
              New Partnerships
            </h3>
            <p className="mb-2 text-sm md:text-base">
              Bagani partners with LoveYourself, FPOP, and AHF to expand HIV
              testing and counseling services.
            </p>
            <span className="inline-block text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
              March 2025
            </span>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section
        id="services"
        className="py-8 md:py-12 px-2 md:px-4 lg:px-12 bg-gradient-to-br from-white via-white to-red-50"
        aria-labelledby="services-header"
      >
        <h2
          id="services-header"
          className="text-xl md:text-2xl lg:text-3xl font-bold text-center text-[var(--primary-red)] mb-6 md:mb-8"
        >
          Our Core Services
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-5xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <span className="text-3xl md:text-4xl mb-2 text-[var(--primary-red)]">
              🩺
            </span>
            <h3 className="font-bold text-base md:text-lg mb-1 text-[var(--primary-red)]">
              HIV Testing & Counseling
            </h3>
            <p className="text-xs md:text-sm text-red-800">
              Free, confidential HIV testing and counseling for all.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-3xl md:text-4xl mb-2 text-[var(--primary-red)]">
              📚
            </span>
            <h3 className="font-bold text-base md:text-lg mb-1 text-[var(--primary-red)]">
              Health Education
            </h3>
            <p className="text-xs md:text-sm text-red-800">
              Workshops and seminars on sexual health, SOGIE, and wellness.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-3xl md:text-4xl mb-2 text-[var(--primary-red)]">
              🤝
            </span>
            <h3 className="font-bold text-base md:text-lg mb-1 text-[var(--primary-red)]">
              Community Outreach
            </h3>
            <p className="text-xs md:text-sm text-red-800">
              Grassroots programs for LGBTQIA+ empowerment and support.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-3xl md:text-4xl mb-2 text-[var(--primary-red)]">
              🏳️‍🌈
            </span>
            <h3 className="font-bold text-base md:text-lg mb-1 text-[var(--primary-red)]">
              LGBTQIA+ Empowerment
            </h3>
            <p className="text-xs md:text-sm text-red-800">
              Safe spaces, advocacy, and leadership development.
            </p>
          </div>
        </div>
      </section>

      {/* Volunteer Sign-Up Section */}
      <section
        id="volunteer"
        className="py-8 md:py-12 px-2 md:px-4 lg:px-12 bg-white"
        aria-labelledby="volunteer-header"
      >
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <div className="flex-1">
            <h2
              id="volunteer-header"
              className="text-xl md:text-2xl lg:text-3xl font-bold text-[var(--primary-red)] mb-2"
            >
              We&apos;re looking for Volunteers! Sign up now!
            </h2>
            <p className="text-red-800 mb-2 text-sm md:text-base">
              If you intend to volunteer for Bagani Community Center, kindly
              fill out this online form.
            </p>
            <div className="mb-2 text-sm md:text-base">
              <span className="font-semibold">Location:</span> Dumaguete City,
              Negros Oriental
            </div>
            <div className="mb-2 text-sm md:text-base">
              <span className="font-semibold">Duration:</span> 2-day orientation
              (Sat-Sun)
            </div>
            <div className="mb-2 text-sm md:text-base">
              <span className="font-semibold">Interview:</span> Please expect a
              call for an interview after filling out the form.
            </div>
            <div className="mb-2 text-sm md:text-base">
              <span className="font-semibold">Note:</span> Final venue and dates
              will be announced by May 2025.
            </div>
            <a
              href="https://forms.gle/your-google-form-link"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 bg-[var(--primary-red)] text-white font-bold px-6 md:px-8 py-2 md:py-3 rounded-full shadow-lg hover:scale-105 transition"
            >
              Apply Now
            </a>
          </div>
          <div className="flex-1 flex justify-center w-full">
            <Image
              src="/VOLUINTEERS.png"
              alt="Volunteers with rainbow flags and raised fists"
              width={256}
              height={256}
              className="w-40 md:w-64 lg:w-full max-w-xs rounded-xl shadow-lg object-cover"
              style={{ minHeight: "120px" }}
              priority
            />
          </div>
        </div>
      </section>
      {/* Contact Section */}
      <section
        id="contact"
        className="py-8 md:py-12 px-2 md:px-4 lg:px-12 bg-gradient-to-br from-white via-white to-red-50"
        aria-labelledby="contact-header"
      >
        <h2
          id="contact-header"
          className="text-xl md:text-2xl lg:text-3xl font-bold text-center text-[var(--primary-red)] mb-6 md:mb-8"
        >
          Contact Us
        </h2>
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Contact Form */}
          <form
            className="flex-1 bg-white rounded-xl shadow-md p-4 md:p-6 flex flex-col gap-4 border border-red-200"
            onSubmit={handleSubmit}
            autoComplete="off"
          >
            <label className="font-semibold text-[var(--primary-red)]">
              Name
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="block w-full border border-black rounded px-3 py-2 mt-1"
              />
            </label>
            <label className="font-semibold text-[var(--primary-red)]">
              Email
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
                className="block w-full border border-black rounded px-3 py-2 mt-1"
              />
            </label>
            <label className="font-semibold text-[var(--primary-red)]">
              Message
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                rows={4}
                className="block w-full border border-black rounded px-3 py-2 mt-1"
              />
            </label>
            <button
              type="submit"
              className="bg-[var(--primary-red)] text-white font-bold px-6 py-2 rounded-full shadow hover:scale-105 transition"
            >
              {submitted ? "Message Sent!" : "Send Message"}
            </button>
            {submitted && (
              <span className="text-green-600 font-semibold text-center">
                Thank you for reaching out!
              </span>
            )}
          </form>
          {/* Contact Info */}
          <div className="flex-1 flex flex-col gap-4 justify-center">
            <div>
              <span className="font-semibold text-[var(--primary-red)]">
                Email:
              </span>{" "}
              <a
                href="mailto:info@baganiph.org"
                className="text-[var(--primary-red)] underline"
              >
                info@baganiph.org
              </a>
            </div>
            <div>
              <span className="font-semibold text-[var(--primary-red)]">
                Phone:
              </span>{" "}
              <a
                href="tel:0967 451 0044"
                className="text-[var(--primary-red)] underline"
              >
                (+63)967 451 0044
              </a>
            </div>
            <div>
              <span className="font-semibold text-[var(--primary-red)]">
                Location:
              </span>{" "}
              3/F NEDF Bldg, 6th Street, Barangay 7, Bacolod City, Negros
              Occidental, Philippines 6100, Bacolod City, Philippines
            </div>
            {/* Embed Google Map */}
            <div className="rounded-xl overflow-hidden shadow mt-2 border border-red-200">
              <iframe
                title="Bagani Community Center Map"
                src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d240.18820273016635!2d122.955058643839!3d10.674742847465673!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x33aed109092c42e3%3A0x6861e87796f36bb4!2sBagani%20Community%20Center%20by%20LoveYourself%20Inc.%20%3A%20HIV%20Treatment%20Center!5e1!3m2!1sen!2sus!4v1748707702835!5m2!1sen!2sus"
                width="100%"
                height="180"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
