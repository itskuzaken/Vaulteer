"use client";
import SectionHeading from '../ui/SectionHeading';
import ProgramCard from '../ui/ProgramCard';
import { 
  IoSchoolOutline, 
  IoPeopleOutline, 
  IoHeartOutline,
  IoLeafOutline,
  IoFitnessOutline,
  IoCodeSlashOutline,
  IoBusinessOutline,
  IoBrushOutline 
} from 'react-icons/io5';

export default function ProgramsSection() {
  const programs = [
    {
      icon: <IoSchoolOutline className="w-full h-full" />,
      title: 'Youth Leadership Training',
      description: 'Comprehensive leadership development program for young individuals aged 15-25, focusing on essential life skills, communication, and community engagement.',
      features: [
        'Weekly interactive workshops',
        'Mentorship opportunities',
        'Community project involvement',
        'Leadership certification'
      ],
      link: '/programs/youth-leadership',
      color: 'bagani-red'
    },
    {
      icon: <IoPeopleOutline className="w-full h-full" />,
      title: 'Family Support Services',
      description: 'Comprehensive support for families including counseling, parenting workshops, and resource assistance to strengthen family bonds.',
      features: [
        'Family counseling sessions',
        'Parenting skills workshops',
        'Emergency resource assistance',
        'Support group meetings'
      ],
      link: '/programs/family-support',
      color: 'bagani-blue'
    },
    {
      icon: <IoCodeSlashOutline className="w-full h-full" />,
      title: 'Digital Literacy Program',
      description: 'Learn essential computer skills, internet safety, and digital tools to thrive in the modern world. Perfect for all ages and skill levels.',
      features: [
        'Basic computer skills',
        'Internet and email usage',
        'Microsoft Office training',
        'Online safety education'
      ],
      link: '/programs/digital-literacy',
      color: 'bagani-yellow'
    },
    {
      icon: <IoLeafOutline className="w-full h-full" />,
      title: 'Community Garden Initiative',
      description: 'Hands-on gardening program teaching sustainable agriculture, nutrition, and environmental stewardship while building community connections.',
      features: [
        'Organic gardening workshops',
        'Community garden plots',
        'Harvest sharing program',
        'Nutrition education'
      ],
      link: '/programs/community-garden',
      color: 'bagani-red'
    },
    {
      icon: <IoFitnessOutline className="w-full h-full" />,
      title: 'Health & Wellness',
      description: 'Promoting healthy lifestyles through fitness classes, nutrition workshops, and mental health support for all community members.',
      features: [
        'Fitness classes (Yoga, Zumba)',
        'Nutrition counseling',
        'Mental health support',
        'Health screenings'
      ],
      link: '/programs/health-wellness',
      color: 'bagani-blue'
    },
    {
      icon: <IoBusinessOutline className="w-full h-full" />,
      title: 'Job Skills Training',
      description: 'Career development program offering job readiness training, resume building, interview preparation, and employment assistance.',
      features: [
        'Resume and cover letter help',
        'Interview skills training',
        'Job search assistance',
        'Career counseling'
      ],
      link: '/programs/job-skills',
      color: 'bagani-yellow'
    },
    {
      icon: <IoBrushOutline className="w-full h-full" />,
      title: 'Arts & Culture',
      description: 'Creative programs celebrating diversity through art, music, dance, and cultural events that bring our community together.',
      features: [
        'Art classes and workshops',
        'Cultural celebration events',
        'Music and dance programs',
        'Community art projects'
      ],
      link: '/programs/arts-culture',
      color: 'bagani-red'
    },
    {
      icon: <IoHeartOutline className="w-full h-full" />,
      title: 'Senior Services',
      description: 'Dedicated programs for seniors including social activities, health services, technology training, and companionship opportunities.',
      features: [
        'Social gatherings and events',
        'Technology assistance',
        'Health and wellness checks',
        'Transportation assistance'
      ],
      link: '/programs/senior-services',
      color: 'bagani-blue'
    },
  ];

  return (
    <section id="programs" className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading 
          title="Our Programs"
          subtitle="Discover our diverse range of programs designed to support, educate, and empower every member of our community"
          accent="bagani-yellow"
        />

        {/* Programs Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
          {programs.map((program, index) => (
            <ProgramCard 
              key={index}
              {...program}
            />
          ))}
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-bagani-red via-bagani-blue to-bagani-yellow rounded-2xl p-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 md:p-12 text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Don't See What You're Looking For?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-2xl mx-auto">
              We're always looking to expand our programs based on community needs. 
              Let us know what services or programs you'd like to see offered.
            </p>
            <button className="px-8 py-3 bg-bagani-red text-white rounded-lg font-semibold hover:bg-bagani-red-dark transition-colors shadow-lg hover:shadow-xl transform hover:scale-105">
              Suggest a Program
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
