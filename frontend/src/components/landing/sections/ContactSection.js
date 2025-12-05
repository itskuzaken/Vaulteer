"use client";
import { useState } from 'react';
import SectionHeading from '../ui/SectionHeading';
import { 
  IoLocationOutline, 
  IoCallOutline, 
  IoMailOutline, 
  IoTimeOutline,
  IoLogoFacebook,
  IoLogoInstagram,
  IoLogoTwitter,
  IoSend 
} from 'react-icons/io5';

export default function ContactSection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission (replace with actual API call)
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitStatus('success');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
      
      setTimeout(() => setSubmitStatus(null), 5000);
    }, 2000);
  };

  const contactInfo = [
    {
      icon: <IoLocationOutline className="w-6 h-6" />,
      title: 'Visit Us',
      details: ['123 Community Drive', 'Bagani City, BC 12345'],
      color: 'bagani-red'
    },
    {
      icon: <IoCallOutline className="w-6 h-6" />,
      title: 'Call Us',
      details: ['Main: (555) 123-4567', 'Programs: (555) 123-4568'],
      color: 'bagani-blue'
    },
    {
      icon: <IoMailOutline className="w-6 h-6" />,
      title: 'Email Us',
      details: ['info@baganicommunitycenter.org', 'programs@baganicommunitycenter.org'],
      color: 'bagani-yellow'
    },
    {
      icon: <IoTimeOutline className="w-6 h-6" />,
      title: 'Hours',
      details: ['Mon-Fri: 9:00 AM - 6:00 PM', 'Sat: 10:00 AM - 4:00 PM', 'Sun: Closed'],
      color: 'bagani-red'
    },
  ];

  const socialLinks = [
    { icon: <IoLogoFacebook className="w-6 h-6" />, url: '#', label: 'Facebook' },
    { icon: <IoLogoInstagram className="w-6 h-6" />, url: '#', label: 'Instagram' },
    { icon: <IoLogoTwitter className="w-6 h-6" />, url: '#', label: 'Twitter' },
  ];

  return (
    <section id="contact" className="py-20 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading 
          title="Contact Us"
          subtitle="We'd love to hear from you. Reach out with questions, feedback, or to learn more about our programs"
          accent="bagani-blue"
        />

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Send Us a Message
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-bagani-blue focus:border-transparent transition-all"
                  placeholder="John Doe"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-bagani-blue focus:border-transparent transition-all"
                    placeholder="john@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-bagani-blue focus:border-transparent transition-all"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Subject *
                </label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-bagani-blue focus:border-transparent transition-all"
                >
                  <option value="">Select a subject...</option>
                  <option value="general">General Inquiry</option>
                  <option value="programs">Program Information</option>
                  <option value="volunteer">Volunteer Opportunities</option>
                  <option value="membership">Membership</option>
                  <option value="donation">Donation</option>
                  <option value="feedback">Feedback</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-bagani-blue focus:border-transparent transition-all resize-none"
                  placeholder="Tell us how we can help..."
                />
              </div>

              {/* Submit Status */}
              {submitStatus === 'success' && (
                <div className="p-4 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg">
                  Thank you for your message! We'll get back to you soon.
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-4 bg-bagani-blue text-white rounded-lg font-semibold hover:bg-bagani-blue-dark transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <IoSend className="w-5 h-5" />
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Get in Touch
              </h3>
              
              <div className="grid sm:grid-cols-2 gap-6">
                {contactInfo.map((info, index) => (
                  <div 
                    key={index}
                    className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6"
                  >
                    <div className={`w-12 h-12 bg-${info.color} bg-opacity-10 rounded-lg flex items-center justify-center text-${info.color} mb-4`}>
                      {info.icon}
                    </div>
                    <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                      {info.title}
                    </h4>
                    {info.details.map((detail, idx) => (
                      <p key={idx} className="text-sm text-gray-600 dark:text-gray-300">
                        {detail}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Map Placeholder */}
            <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl h-64 flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">
                [Interactive Map Placeholder]
              </p>
            </div>

            {/* Social Media */}
            <div className="bg-gradient-to-r from-bagani-red via-bagani-blue to-bagani-yellow rounded-2xl p-1">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
                <h4 className="font-bold text-gray-900 dark:text-white mb-4 text-center">
                  Follow Us on Social Media
                </h4>
                <div className="flex justify-center gap-4">
                  {socialLinks.map((social, index) => (
                    <a
                      key={index}
                      href={social.url}
                      aria-label={social.label}
                      className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-bagani-red hover:text-white transition-all transform hover:scale-110"
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
