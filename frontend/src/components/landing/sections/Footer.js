"use client";
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  IoLogoFacebook, 
  IoLogoInstagram, 
  IoLogoTwitter,
  IoMailOutline,
  IoCallOutline,
  IoLocationOutline,
  IoChevronUp,
  IoSend
} from 'react-icons/io5';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribeStatus, setSubscribeStatus] = useState(null);

  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    setIsSubscribing(true);
    
    // Simulate newsletter subscription (replace with actual API call)
    setTimeout(() => {
      setIsSubscribing(false);
      setSubscribeStatus('success');
      setEmail('');
      
      setTimeout(() => setSubscribeStatus(null), 5000);
    }, 1500);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  const quickLinks = [
    { label: 'Home', id: 'home' },
    { label: 'News & Updates', id: 'news' },
    { label: 'About Us', id: 'about' },
    { label: 'Programs', id: 'programs' },
    { label: 'Events', id: 'events' },
    { label: 'Get Involved', id: 'get-involved' },
    { label: 'Contact', id: 'contact' },
  ];

  const programs = [
    'Youth Leadership Training',
    'Family Support Services',
    'Digital Literacy',
    'Community Garden',
    'Health & Wellness',
    'Job Skills Training',
  ];

  const socialLinks = [
    { icon: <IoLogoFacebook className="w-5 h-5" />, url: '#', label: 'Facebook', color: 'hover:bg-blue-600' },
    { icon: <IoLogoInstagram className="w-5 h-5" />, url: '#', label: 'Instagram', color: 'hover:bg-pink-600' },
    { icon: <IoLogoTwitter className="w-5 h-5" />, url: '#', label: 'Twitter', color: 'hover:bg-sky-500' },
  ];

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* About Column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative w-12 h-12">
                <Image
                  src="/baganibcd_logo_handles.svg"
                  alt="Bagani Community Center"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h3 className="font-bold text-lg">Bagani Community</h3>
                <p className="text-xs text-gray-400">Development Center</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Empowering individuals, strengthening families, and building resilient communities since 2009.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2 text-sm">
              <a href="tel:5551234567" className="flex items-center gap-2 text-gray-400 hover:text-bagani-red transition-colors">
                <IoCallOutline className="w-4 h-4" />
                (555) 123-4567
              </a>
              <a href="mailto:info@baganicommunitycenter.org" className="flex items-center gap-2 text-gray-400 hover:text-bagani-red transition-colors">
                <IoMailOutline className="w-4 h-4" />
                info@baganicommunitycenter.org
              </a>
              <div className="flex items-start gap-2 text-gray-400">
                <IoLocationOutline className="w-4 h-4 mt-1 flex-shrink-0" />
                <span>123 Community Drive<br />Bagani City, BC 12345</span>
              </div>
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 className="font-bold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {quickLinks.map((link, index) => (
                <li key={index}>
                  <button
                    onClick={() => scrollToSection(link.id)}
                    className="text-gray-400 hover:text-bagani-red transition-colors text-sm"
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Programs Column */}
          <div>
            <h4 className="font-bold text-lg mb-4">Our Programs</h4>
            <ul className="space-y-2">
              {programs.map((program, index) => (
                <li key={index}>
                  <button
                    onClick={() => scrollToSection('programs')}
                    className="text-gray-400 hover:text-bagani-red transition-colors text-sm text-left"
                  >
                    {program}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter Column */}
          <div>
            <h4 className="font-bold text-lg mb-4">Stay Updated</h4>
            <p className="text-gray-400 text-sm mb-4">
              Subscribe to our newsletter for the latest news and updates.
            </p>
            
            <form onSubmit={handleNewsletterSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-bagani-red focus:border-transparent transition-all text-sm"
                />
                <button
                  type="submit"
                  disabled={isSubscribing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-bagani-red rounded-lg hover:bg-bagani-red-dark transition-colors disabled:opacity-50"
                >
                  {isSubscribing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <IoSend className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              {subscribeStatus === 'success' && (
                <p className="text-green-400 text-xs">
                  Thank you for subscribing!
                </p>
              )}
            </form>

            {/* Social Media */}
            <div className="mt-6">
              <h5 className="font-semibold text-sm mb-3">Follow Us</h5>
              <div className="flex gap-3">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    aria-label={social.label}
                    className={`w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 ${social.color} hover:text-white transition-all transform hover:scale-110`}
                  >
                    {social.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 my-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
          <p>
            © {new Date().getFullYear()} Bagani Community Development Center. All rights reserved.
          </p>
          
          <div className="flex gap-6">
            <button className="hover:text-bagani-red transition-colors">
              Privacy Policy
            </button>
            <button className="hover:text-bagani-red transition-colors">
              Terms of Service
            </button>
            <button className="hover:text-bagani-red transition-colors">
              Accessibility
            </button>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <button
        onClick={scrollToTop}
        className="fixed bottom-8 right-8 w-12 h-12 bg-bagani-red text-white rounded-full shadow-lg hover:bg-bagani-red-dark transition-all transform hover:scale-110 flex items-center justify-center z-40"
        aria-label="Scroll to top"
      >
        <IoChevronUp className="w-6 h-6" />
      </button>
    </footer>
  );
}
