"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { IoChevronDown, IoArrowForward } from 'react-icons/io5';

export default function HeroSection() {
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);

  // Sample news ticker items (replace with API data later)
  const newsItems = [
    "🎉 New Community Program: Youth Leadership Training starts Feb 15!",
    "📢 Town Hall Meeting: Join us this Saturday at 3 PM",
    "🌟 Volunteer Appreciation Day: Thank you to all our amazing volunteers!",
    "📚 Free Skills Workshop: Digital Literacy - Register now!"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentNewsIndex((prev) => (prev + 1) % newsItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [newsItems.length]);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  return (
    <section 
      id="home"
      className="relative min-h-screen flex flex-col bg-gradient-to-br from-bagani-red via-bagani-red-dark to-gray-900"
    >
      {/* Background Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Main Content */}
      <div className="relative flex-1 flex items-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white text-sm font-medium mb-6 animate-fade-in">
              <span className="w-2 h-2 bg-bagani-yellow rounded-full mr-2 animate-pulse" />
              Building Stronger Communities Together
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Welcome to
              <br />
              <span className="text-bagani-yellow">Bagani Community</span>
              <br />
              <span className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium">Development Center</span>
            </h1>

            {/* Mission Statement */}
            <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto leading-relaxed">
              Empowering individuals, strengthening families, and building resilient communities through 
              education, support, and collaboration.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <button
                onClick={() => scrollToSection('about')}
                className="w-full sm:w-auto group px-8 py-4 bg-white text-bagani-red rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Learn More About Us
                <IoArrowForward className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              
              <button
                onClick={() => scrollToSection('get-involved')}
                className="w-full sm:w-auto group px-8 py-4 bg-bagani-yellow text-gray-900 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Get Involved Today
                <IoArrowForward className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Scroll Indicator */}
            <button
              onClick={() => scrollToSection('news')}
              className="inline-flex flex-col items-center text-white/80 hover:text-white transition-colors group"
              aria-label="Scroll to news"
            >
              <span className="text-sm font-medium mb-2">Latest News</span>
              <IoChevronDown className="w-6 h-6 animate-bounce" />
            </button>
          </div>
        </div>
      </div>

      {/* News Ticker */}
      <div className="relative bg-bagani-blue/90 backdrop-blur-sm border-t border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <span className="flex-shrink-0 px-3 py-1 bg-bagani-red text-white text-xs font-bold rounded uppercase">
              Latest
            </span>
            <div className="flex-1 overflow-hidden">
              <div 
                className="text-white text-sm sm:text-base font-medium whitespace-nowrap transition-all duration-500"
                style={{ 
                  transform: `translateX(${currentNewsIndex * -100}%)`,
                }}
              >
                {newsItems.map((news, index) => (
                  <span 
                    key={index}
                    className="inline-block w-full"
                  >
                    {news}
                  </span>
                ))}
              </div>
            </div>
            <button
              onClick={() => scrollToSection('news')}
              className="flex-shrink-0 text-white hover:text-bagani-yellow text-sm font-medium transition-colors hidden sm:block"
            >
              View All →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
