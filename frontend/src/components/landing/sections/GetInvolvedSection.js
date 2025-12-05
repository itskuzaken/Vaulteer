"use client";
import SectionHeading from '../ui/SectionHeading';
import { 
  IoHeart, 
  IoPeople, 
  IoGift, 
  IoCalendar,
  IoCheckmarkCircle,
  IoArrowForward 
} from 'react-icons/io5';

export default function GetInvolvedSection() {
  const volunteerRoles = [
    'Event coordination and support',
    'Tutoring and mentoring youth',
    'Administrative assistance',
    'Garden maintenance',
    'Workshop facilitation',
    'Community outreach'
  ];

  const membershipBenefits = [
    'Priority event registration',
    'Exclusive member workshops',
    'Monthly newsletter',
    'Voting rights in community decisions',
    'Networking opportunities',
    'Discounted program fees'
  ];

  const ways = [
    {
      icon: <IoHeart className="w-full h-full" />,
      title: 'Volunteer',
      description: 'Share your time and skills to make a difference in our community',
      action: 'Sign Up to Volunteer',
      color: 'bagani-red',
      items: volunteerRoles
    },
    {
      icon: <IoPeople className="w-full h-full" />,
      title: 'Become a Member',
      description: 'Join our community as an official member and enjoy exclusive benefits',
      action: 'Apply for Membership',
      color: 'bagani-blue',
      items: membershipBenefits
    },
    {
      icon: <IoGift className="w-full h-full" />,
      title: 'Donate',
      description: 'Your generous contributions help us continue serving the community',
      action: 'Make a Donation',
      color: 'bagani-yellow',
      items: [
        'Support program operations',
        'Fund scholarships',
        'Maintain facilities',
        'Purchase supplies and equipment',
        'Sponsor community events',
        'Tax-deductible contributions'
      ]
    },
    {
      icon: <IoCalendar className="w-full h-full" />,
      title: 'Attend Events',
      description: 'Participate in our community events, workshops, and gatherings',
      action: 'View Event Calendar',
      color: 'bagani-red',
      items: [
        'Monthly town hall meetings',
        'Educational workshops',
        'Cultural celebrations',
        'Family fun activities',
        'Networking events',
        'Community forums'
      ]
    },
  ];

  const scrollToContact = () => {
    const element = document.getElementById('contact');
    if (element) {
      const offset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  return (
    <section id="get-involved" className="py-20 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading 
          title="Get Involved"
          subtitle="There are many ways you can contribute to building a stronger community"
          accent="bagani-red"
        />

        {/* Ways to Get Involved Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {ways.map((way, index) => (
            <div 
              key={index}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            >
              {/* Icon & Title */}
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-16 h-16 bg-${way.color} text-white rounded-xl flex items-center justify-center`}>
                  {way.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {way.title}
                </h3>
              </div>

              {/* Description */}
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {way.description}
              </p>

              {/* Items List */}
              <ul className="space-y-2 mb-6">
                {way.items.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <IoCheckmarkCircle className={`w-5 h-5 text-${way.color} flex-shrink-0 mt-0.5`} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Action Button */}
              <button 
                onClick={scrollToContact}
                className={`w-full px-6 py-3 bg-${way.color} text-white rounded-lg font-semibold hover:opacity-90 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group`}
              >
                {way.action}
                <IoArrowForward className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ))}
        </div>

        {/* Impact Statement */}
        <div className="relative bg-gradient-to-r from-bagani-red via-bagani-blue to-bagani-yellow rounded-2xl p-1 overflow-hidden">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 md:p-12 text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Your Involvement Makes a Real Difference
            </h3>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Every volunteer hour, membership, donation, and participant helps us expand our reach 
              and deepen our impact. Together, we can create lasting positive change in our community.
            </p>
            
            {/* Impact Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <div className="text-3xl font-bold text-bagani-red mb-1">200+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Volunteers</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <div className="text-3xl font-bold text-bagani-blue mb-1">500+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Community Members</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <div className="text-3xl font-bold text-bagani-yellow mb-1">$50K+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Annual Donations</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                <div className="text-3xl font-bold text-green-600 mb-1">10K+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Volunteer Hours</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
