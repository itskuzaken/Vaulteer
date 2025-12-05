"use client";

import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // News carousel data
  const newsItems = [
    {
      id: 1,
      title: "2Q 2025 Volunteer Orientation",
      description: "Join us for our upcoming volunteer orientation program. Learn about our mission, services, and how you can make a difference in the LGBTQIA+ community.",
      date: "Upcoming Event",
      category: "Volunteer",
    },
    {
      id: 2,
      title: "Community Outreach Success",
      description: "Our recent community outreach program reached over 500 individuals, providing free HIV testing, counseling, and health education across Negros Island.",
      date: "Recent Success",
      category: "Impact",
    },
    {
      id: 3,
      title: "New Strategic Partnerships",
      description: "We're proud to announce new partnerships with local organizations to expand our services and reach more communities in need.",
      date: "Partnership",
      category: "Growth",
    },
    {
      id: 4,
      title: "Milestone: 5,000+ Clients Served",
      description: "Since 2020, Bagani has served over 5,000 clients and is currently treating 300+ PLHIVs with compassionate, accessible care.",
      date: "Achievement",
      category: "Milestone",
    },
  ];

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % newsItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, newsItems.length]);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const nextNews = () => {
    setIsAutoPlaying(false);
    setCurrentNewsIndex((prev) => (prev + 1) % newsItems.length);
  };

  const prevNews = () => {
    setIsAutoPlaying(false);
    setCurrentNewsIndex((prev) => (prev - 1 + newsItems.length) % newsItems.length);
  };

  return (
    <div className="w-full mx-auto font-sans" suppressHydrationWarning>

      {/* 1. HERO SECTION - Above the Fold */}
      <section
        id="home"
        className="relative flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 py-12 overflow-hidden"
        style={{
          backgroundImage: 'url(/baganibcd_background.svg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black/20" />
        
        {/* Content Container */}
        <div className="relative z-10 flex flex-col items-center text-center max-w-7xl mx-auto">

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-black text-white mb-4 sm:mb-6 leading-tight drop-shadow-2xl tracking-tight">
            BAGANI COMMUNITY CENTER
          </h1>
          
          {/* Tagline */}
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl text-bagani-yellow font-bold mb-6 sm:mb-8 drop-shadow-lg italic">
            BY LOVEYOURSELF
          </h2>

          {/* Bisaya Tagline */}
          <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white max-w-4xl mb-10 sm:mb-14 leading-relaxed drop-shadow-md font-semibold">
            NAGA TATAP, NAGA AREGLAR, NAGA HALONG
          </p>

          {/* Primary & Secondary CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full sm:w-auto px-4 sm:px-0 mb-12">
            <button
              onClick={() => scrollToSection('services')}
              className="group inline-flex items-center justify-center bg-bagani-red hover:bg-bagani-red-dark text-white font-bold text-lg sm:text-xl px-10 sm:px-14 py-4 sm:py-5 rounded-full shadow-2xl hover:shadow-bagani-red/50 hover:scale-105 transition-all duration-300"
            >
              <span>View Services / Get Help Now</span>
              <svg className="w-6 h-6 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
            <button
              onClick={() => scrollToSection('volunteer')}
              className="group inline-flex items-center justify-center bg-white hover:bg-gray-50 text-bagani-red font-bold text-base sm:text-lg px-8 sm:px-12 py-4 sm:py-5 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border-2 border-white"
            >
              <span>Join Our Community / Volunteer Signup</span>
              <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
            <svg
              className="w-8 h-8 text-white drop-shadow-lg"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
            </svg>
          </div>
        </div>
      </section>

      {/* 2. NEWS & UPDATES SECTION - Carousel */}
      <section
        id="news"
        className="relative bg-gradient-to-br from-gray-50 to-white py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8"
        aria-labelledby="news-header"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 bg-bagani-red/10 text-bagani-red rounded-full text-sm font-bold uppercase mb-4">
              Latest Updates
            </span>
            <h2
              id="news-header"
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4"
            >
              News & <span className="text-bagani-blue">Updates</span>
            </h2>
            <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
              Stay informed about our recent activities and community initiatives
            </p>
          </div>

          {/* Carousel Container */}
          <div className="relative max-w-5xl mx-auto">
            {/* Main Carousel Card */}
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
              <div className="grid md:grid-cols-2">
                {/* Image Side */}
                <div className="relative h-64 md:h-auto bg-gradient-to-br from-bagani-red via-bagani-blue to-bagani-yellow">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white p-8">
                      <div className="w-24 h-24 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                        </svg>
                      </div>
                      <span className="inline-block px-4 py-2 bg-white/30 backdrop-blur-md rounded-full text-sm font-bold uppercase">
                        {newsItems[currentNewsIndex].category}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content Side */}
                <div className="p-8 sm:p-10 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-3 py-1 bg-bagani-yellow/20 text-bagani-red rounded-full text-xs font-bold uppercase">
                      {newsItems[currentNewsIndex].date}
                    </span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                    {newsItems[currentNewsIndex].title}
                  </h3>
                  <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6">
                    {newsItems[currentNewsIndex].description}
                  </p>
                  
                  {/* Carousel Indicators */}
                  <div className="flex items-center gap-2 mt-4">
                    {newsItems.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setCurrentNewsIndex(index);
                          setIsAutoPlaying(false);
                        }}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          index === currentNewsIndex
                            ? 'w-8 bg-bagani-red'
                            : 'w-2 bg-gray-300 hover:bg-gray-400'
                        }`}
                        aria-label={`Go to news item ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevNews}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white hover:bg-gray-50 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 z-10"
              aria-label="Previous news"
            >
              <svg className="w-6 h-6 text-bagani-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextNews}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white hover:bg-gray-50 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 z-10"
              aria-label="Next news"
            >
              <svg className="w-6 h-6 text-bagani-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* 3. MISSION SECTION - Who We Are & Why We Exist */}
      <section
        id="mission"
        className="relative py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-white"
        aria-labelledby="mission-header"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-bagani-yellow/20 text-bagani-red rounded-full text-sm font-bold uppercase mb-4">
              Our Impact
            </span>
            <h2
              id="mission-header"
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4"
            >
              Who We Are & <span className="text-bagani-red">Why We Exist</span>
            </h2>
          </div>

          {/* Who We Are - Impact Statistics */}
          <div className="mb-16">
            <div className="bg-gradient-to-br from-bagani-red via-bagani-blue to-bagani-yellow p-1 rounded-3xl mb-8">
              <div className="bg-white rounded-3xl p-8 sm:p-12">
                <h3 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-8">
                  Making a Difference Since 2020
                </h3>
                <p className="text-base sm:text-lg text-gray-700 leading-relaxed mb-10 text-center max-w-4xl mx-auto">
                  <strong>Bagani Community Center</strong> is a community-based organization dedicated to providing 
                  accessible and quality HIV testing, counseling, and treatment in <strong>Bacolod City and Negros Island</strong>. 
                  We are powered by passionate volunteers comprised of youth, students, artists, and professionals.
                </p>

                {/* Impact Counter */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-gray-900">
                  {/* Stat 1 */}
                  <div className="text-center p-6 bg-gradient-to-br from-bagani-red/10 to-bagani-red/5 rounded-2xl border-2 border-bagani-red/20 hover:scale-105 transition-transform duration-300">
                    <div className="text-5xl sm:text-6xl font-black text-bagani-red mb-2 ">
                      5,000+
                    </div>
                    <div className="text-sm sm:text-base font-semibold text-gray-700 uppercase tracking-wide">
                      Clients Served
                    </div>
                  </div>

                  {/* Stat 2 */}
                  <div className="text-center p-6 bg-gradient-to-br from-bagani-blue/10 to-bagani-blue/5 rounded-2xl border-2 border-bagani-blue/20 hover:scale-105 transition-transform duration-300">
                    <div className="text-5xl sm:text-6xl font-black text-bagani-blue mb-2">
                      300+
                    </div>
                    <div className="text-sm sm:text-base font-semibold text-gray-700 uppercase tracking-wide">
                      PLHIVs Currently Treating
                    </div>
                  </div>

                  {/* Stat 3 */}
                  <div className="text-center p-6 bg-gradient-to-br from-bagani-yellow/10 to-bagani-yellow/5 rounded-2xl border-2 border-bagani-yellow/20 hover:scale-105 transition-transform duration-300">
                    <div className="text-5xl sm:text-6xl font-black text-bagani-yellow mb-2">
                      160+
                    </div>
                    <div className="text-sm sm:text-base font-semibold text-gray-700 uppercase tracking-wide">
                      Active Volunteers
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Why We Exist - Problem & Solution */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Problem Statement */}
            <div className="bg-gray-50 rounded-3xl p-8 sm:p-10 border border-gray-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-bagani-red rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold text-gray-900">The Challenge</h3>
              </div>
              
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-bagani-red rounded-full mt-2 flex-shrink-0" />
                  <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                    <strong>Rising HIV Cases:</strong> Bacolod and Negros face increasing HIV infection rates
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-bagani-red rounded-full mt-2 flex-shrink-0" />
                  <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                    <strong>Stigma Barrier:</strong> Social stigma prevents people from seeking help and testing
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-bagani-red rounded-full mt-2 flex-shrink-0" />
                  <p className="text-base sm:text-lg text-gray-700 leading-relaxed">
                    <strong>Limited Access:</strong> Lack of accessible community-based testing and treatment options
                  </p>
                </li>
              </ul>
            </div>

            {/* Solution Statement */}
            <div className="bg-gradient-to-br from-bagani-blue to-bagani-blue-dark rounded-3xl p-8 sm:p-10 text-white shadow-2xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-2xl sm:text-3xl font-bold">Our Solution</h3>
              </div>
              
              <p className="text-xl sm:text-2xl font-bold mb-6 leading-relaxed">
                Bagani bridges the gap between awareness and action.
              </p>
              
              <p className="text-base sm:text-lg leading-relaxed opacity-95 mb-6">
                We provide a safe, welcoming, and stigma-free environment where community members can access 
                vital health services, receive support, and find empowerment.
              </p>

              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
                  Free Testing
                </span>
                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
                  Confidential Counseling
                </span>
                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
                  Community Support
                </span>
                <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold">
                  Empowerment Programs
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. SERVICES SECTION */}
      <section
        id="services"
        className="relative py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-gray-50 to-white"
        aria-labelledby="services-header"
      >
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-2 bg-bagani-blue/10 text-bagani-blue rounded-full text-sm font-bold uppercase mb-4">
              What We Offer
            </span>
            <h2
              id="services-header"
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4"
            >
              OUR <span className="text-bagani-red">SERVICES</span>
            </h2>
            <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
              Comprehensive care and support for the LGBTQIA+ community
            </p>
          </div>

          {/* Services Grid - 3x2 Layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Service 1: HIV Education */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-bagani-red">
              <div className="w-16 h-16 bg-gradient-to-br from-bagani-red to-bagani-red-dark rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-3">
                HIV Education
              </h3>
              <p className="text-center text-gray-600 text-sm leading-relaxed">
                Comprehensive education on HIV prevention, treatment, and living positively
              </p>
            </div>

            {/* Service 2: Life Coaching */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-bagani-blue">
              <div className="w-16 h-16 bg-gradient-to-br from-bagani-blue to-bagani-blue-dark rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-3">
                Life Coaching
              </h3>
              <p className="text-center text-gray-600 text-sm leading-relaxed">
                Personal development and wellness coaching for holistic health
              </p>
            </div>

            {/* Service 3: Legal Services */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-bagani-yellow">
              <div className="w-16 h-16 bg-gradient-to-br from-bagani-yellow to-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-3">
                Legal Services
              </h3>
              <p className="text-center text-gray-600 text-sm leading-relaxed">
                Legal assistance and advocacy for LGBTQIA+ rights and protections
              </p>
            </div>

            {/* Service 4: Counselling */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-purple-500">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-3">
                Counselling
              </h3>
              <p className="text-center text-gray-600 text-sm leading-relaxed">
                Professional mental health and peer counseling services
              </p>
            </div>

            {/* Service 5: HIV Prevention Services */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-green-500">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-3">
                HIV Prevention Services
              </h3>
              <p className="text-center text-gray-600 text-sm leading-relaxed">
                Free testing, counseling, and PrEP/PEP access
              </p>
            </div>

            {/* Service 6: A Community */}
            <div className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border-2 border-transparent hover:border-pink-500">
              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-700 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-center text-gray-900 mb-3">
                A Community
              </h3>
              <p className="text-center text-gray-600 text-sm leading-relaxed">
                Safe spaces, support groups, and belonging for everyone
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VOLUNTEER & CONTACT SECTION */}
      {/* Volunteer Signup with Lead Capture Form */}
      <section
        id="volunteer"
        className="relative py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-bagani-red/5 via-bagani-blue/5 to-bagani-yellow/5"
        aria-labelledby="volunteer-header"
      >
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 bg-bagani-red/10 text-bagani-red rounded-full text-sm font-bold uppercase mb-4">
              Make a Difference
            </span>
            <h2
              id="volunteer-header"
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4"
            >
              Become a <span className="text-bagani-red">Volunteer</span>
            </h2>
            <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
              Join 160+ volunteers making an impact in the LGBTQIA+ community
            </p>
          </div>

          {/* Volunteer Registration Form */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-200">
            <div className="grid md:grid-cols-2">
              {/* Left Side - Form */}
              <div className="p-8 sm:p-10">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Register Your Interest</h3>
                <p className="text-gray-600 mb-6 text-sm">
                  Fill out this form and we'll contact you about upcoming orientation dates
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="vol-name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="vol-name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-bagani-red focus:border-bagani-red transition-colors"
                      placeholder="Juan Dela Cruz"
                    />
                  </div>

                  <div>
                    <label htmlFor="vol-email" className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="vol-email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-bagani-red focus:border-bagani-red transition-colors"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="vol-message" className="block text-sm font-semibold text-gray-700 mb-2">
                      Why do you want to volunteer? *
                    </label>
                    <textarea
                      id="vol-message"
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      required
                      rows="4"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-bagani-red focus:border-bagani-red transition-colors resize-none"
                      placeholder="Tell us about your interest in volunteering..."
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-bagani-red hover:bg-bagani-red-dark text-white font-bold py-4 rounded-xl shadow-lg hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <span>Submit Application</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </button>
                </form>

                {submitted && (
                  <div className="mt-6 p-4 bg-green-100 border-2 border-green-500 rounded-xl">
                    <div className="flex items-center gap-3">
                      <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-green-800 font-medium">
                        Thank you! We'll be in touch soon.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side - Info */}
              <div className="bg-gradient-to-br from-bagani-red to-bagani-red-dark p-8 sm:p-10 text-white flex flex-col justify-center">
                <h4 className="text-2xl font-bold mb-6">What to Expect</h4>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">📅</span>
                    </div>
                    <div>
                      <h5 className="font-bold mb-1">2-Day Orientation</h5>
                      <p className="text-sm opacity-90">Weekend training program (Sat-Sun)</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">📍</span>
                    </div>
                    <div>
                      <h5 className="font-bold mb-1">Location</h5>
                      <p className="text-sm opacity-90">Bacolod City / Dumaguete City</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">📞</span>
                    </div>
                    <div>
                      <h5 className="font-bold mb-1">Interview Process</h5>
                      <p className="text-sm opacity-90">Expect a call within 1-2 weeks</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl">ℹ️</span>
                    </div>
                    <div>
                      <h5 className="font-bold mb-1">Next Batch</h5>
                      <p className="text-sm opacity-90">Details announced by May 2025</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-white/20">
                  <p className="text-sm opacity-90">
                    Questions? Email us at{" "}
                    <a href="mailto:info@baganiph.org" className="font-bold underline hover:opacity-80">
                      info@baganiph.org
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer/Contact Section */}
      <footer
        id="contact"
        className="relative bg-white text-gray-900 py-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-200"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
            {/* Column 1: About */}
            <div>
              <div className="mb-6">
                <Image
                  src="/baganibcd_logo_handles.svg"
                  alt="Bagani Logo"
                  width={120}
                  height={120}
                  className="w-24 h-24"
                />
              </div>
              <h3 className="text-xl font-bold mb-4 text-gray-900">
                BAGANI COMMUNITY CENTER
              </h3>
              <p className="text-bagani-red text-sm leading-relaxed mb-4 font-semibold">
                BY LOVEYOURSELF INC.
              </p>
              <p className="text-gray-600 text-sm leading-relaxed">
                Empowering the LGBTQIA+ community through accessible health services, education, and advocacy.
              </p>
            </div>

            {/* Column 2: Quick Links */}
            <div>
              <h4 className="text-lg font-bold mb-6 text-gray-900">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <button onClick={() => scrollToSection('home')} className="text-gray-600 hover:text-bagani-red transition-colors text-sm">
                    Home
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('news')} className="text-gray-600 hover:text-bagani-red transition-colors text-sm">
                    News & Updates
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('mission')} className="text-gray-600 hover:text-bagani-red transition-colors text-sm">
                    About Us
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('services')} className="text-gray-600 hover:text-bagani-red transition-colors text-sm">
                    Our Services
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('volunteer')} className="text-gray-600 hover:text-bagani-red transition-colors text-sm">
                    Volunteer
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('contact')} className="text-gray-600 hover:text-bagani-red transition-colors text-sm">
                    Contact
                  </button>
                </li>
              </ul>
            </div>

            {/* Column 3: Contact Info */}
            <div>
              <h4 className="text-lg font-bold mb-6 text-gray-900">Contact Information</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-bagani-red flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      3F NEDF Building, 6th St. Lacson<br />
                      Bacolod City, Negros Occidental<br />
                      Philippines 6100
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-bagani-red flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href="tel:(034) 700 2034" className="text-sm text-gray-600 hover:text-bagani-red transition-colors">
                    (034) 700 2034
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-bagani-red flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href="mailto:info@baganiph.org" className="text-sm text-gray-600 hover:text-bagani-red transition-colors">
                    info@baganiph.org
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4: Social & CTA */}
            <div>
              <h4 className="text-lg font-bold mb-6 text-gray-900">Connect With Us</h4>
              <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                Follow our journey and stay updated on community events and health programs.
              </p>
              
              <div className="flex gap-3 mb-8">
                <a href="#" className="w-10 h-10 bg-gray-100 hover:bg-bagani-red hover:text-white text-gray-700 rounded-lg flex items-center justify-center transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-100 hover:bg-bagani-blue hover:text-white text-gray-700 rounded-lg flex items-center justify-center transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 bg-gray-100 hover:bg-pink-500 hover:text-white text-gray-700 rounded-lg flex items-center justify-center transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z"/>
                    <path d="M12 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zm0 10.162a4 4 0 110-8 4 4 0 010 8zm7.846-10.405a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z"/>
                  </svg>
                </a>
              </div>

              <button
                onClick={() => scrollToSection('volunteer')}
                className="w-full bg-bagani-red hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 hover:scale-105 text-sm"
              >
                Join Our Community
              </button>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-gray-200">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-600 text-sm">
                © 2020-2025 Bagani Community Center by LoveYourself Inc. All rights reserved.
              </p>
              <div className="flex gap-6">
                <a href="#" className="text-gray-600 hover:text-bagani-red transition-colors text-sm">
                  Privacy Policy
                </a>
                <a href="#" className="text-gray-600 hover:text-bagani-red transition-colors text-sm">
                  Terms of Service
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
