"use client";
import SectionHeading from '../ui/SectionHeading';
import { 
  IoHeartOutline, 
  IoPeopleOutline, 
  IoRibbonOutline, 
  IoSchoolOutline,
  IoLeafOutline,
  IoShieldCheckmarkOutline 
} from 'react-icons/io5';

export default function AboutSection() {
  const features = [
    {
      icon: <IoHeartOutline className="w-8 h-8" />,
      title: 'Community Care',
      description: 'Providing support and resources to families and individuals in need',
    },
    {
      icon: <IoSchoolOutline className="w-8 h-8" />,
      title: 'Education First',
      description: 'Empowering through knowledge with workshops, training, and learning programs',
    },
    {
      icon: <IoPeopleOutline className="w-8 h-8" />,
      title: 'Inclusive Community',
      description: 'Creating a welcoming space for everyone regardless of background',
    },
    {
      icon: <IoRibbonOutline className="w-8 h-8" />,
      title: 'Youth Development',
      description: 'Investing in the future through youth programs and mentorship',
    },
    {
      icon: <IoLeafOutline className="w-8 h-8" />,
      title: 'Sustainable Growth',
      description: 'Building programs that create lasting positive change',
    },
    {
      icon: <IoShieldCheckmarkOutline className="w-8 h-8" />,
      title: 'Safe Environment',
      description: 'Maintaining a secure and supportive space for all community members',
    },
  ];

  return (
    <section id="about" className="py-20 bg-white dark:bg-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading 
          title="About Bagani Community"
          subtitle="Building stronger communities through collaboration, education, and empowerment"
          accent="bagani-red"
        />

        {/* Mission & Vision */}
        <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-5xl mx-auto">
          {/* Mission */}
          <div className="bg-gradient-to-br from-bagani-red to-bagani-red-dark text-white rounded-2xl p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <IoHeartOutline className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold">Our Mission</h3>
            </div>
            <p className="text-white/90 leading-relaxed">
              To empower individuals and families by providing accessible education, resources, and support services 
              that foster personal growth, community engagement, and social development in a safe and inclusive environment.
            </p>
          </div>

          {/* Vision */}
          <div className="bg-gradient-to-br from-bagani-blue to-bagani-blue-dark text-white rounded-2xl p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <IoRibbonOutline className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold">Our Vision</h3>
            </div>
            <p className="text-white/90 leading-relaxed">
              A thriving, resilient community where every individual has the opportunity to reach their full potential 
              through access to quality education, meaningful connections, and comprehensive support services.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group bg-gray-50 dark:bg-gray-700 rounded-xl p-6 hover:bg-bagani-red hover:text-white transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl"
            >
              <div className="w-16 h-16 bg-white dark:bg-gray-600 rounded-xl flex items-center justify-center mb-4 text-bagani-red group-hover:bg-white/20 group-hover:text-white transition-all">
                {feature.icon}
              </div>
              <h4 className="text-xl font-bold mb-2 text-gray-900 dark:text-white group-hover:text-white">
                {feature.title}
              </h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm group-hover:text-white/90">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-16 bg-gradient-to-r from-bagani-blue via-bagani-red to-bagani-yellow rounded-2xl p-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-4xl font-bold text-bagani-red mb-2">15+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Years Serving</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-bagani-blue mb-2">5,000+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Community Members</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-bagani-yellow mb-2">50+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Programs Offered</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-green-600 mb-2">200+</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Volunteers</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
