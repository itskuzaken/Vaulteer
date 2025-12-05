"use client";
import { useEffect } from 'react';
import NavigationBar from './sections/NavigationBar';
import HeroSection from './sections/HeroSection';
import NewsUpdatesSection from './sections/NewsUpdatesSection';
import AboutSection from './sections/AboutSection';
import ProgramsSection from './sections/ProgramsSection';
import EventsSection from './sections/EventsSection';
import GetInvolvedSection from './sections/GetInvolvedSection';
import ContactSection from './sections/ContactSection';
import Footer from './sections/Footer';

export default function BaganiLandingPage() {
  useEffect(() => {
    // Smooth scroll behavior
    document.documentElement.style.scrollBehavior = 'smooth';
    
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Navigation */}
      <NavigationBar />

      {/* Main Content */}
      <main>
        <HeroSection />
        <NewsUpdatesSection />
        <AboutSection />
        <ProgramsSection />
        <EventsSection />
        <GetInvolvedSection />
        <ContactSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
