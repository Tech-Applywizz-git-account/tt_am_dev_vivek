import React, { useState } from 'react';
import { X, User, Mail, Phone, MessageSquare, Building, MapPin, DollarSign, FileText } from 'lucide-react';
import { User as UserType } from '../../types';
import { supabase } from '../../lib/supabaseClient';
// import { useUser } from "@supabase/auth-helpers-react";

import {toast} from 'react-toastify';


interface ClientOnboardingModalProps {
  user: UserType;
  isOpen: boolean;
  onClose: () => void;
  onClientOnboarded:()=>void;
}

export const ClientOnboardingModal: React.FC<ClientOnboardingModalProps> = ({ 
  user, 
  isOpen, 
  onClose,
  onClientOnboarded
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    personalEmail: '',
    whatsappNumber: '',
    callablePhone: '',
    companyEmail: '',
    jobRolePreferences: [] as string[],
    salaryRange: '',
    locationPreferences: [] as string[],
    workAuthDetails: '',
    // New fields for external API sync
    gender: '',
    yearsExperience: '',
    country: '',
    willingToRelocate: false,
    githubUrl: '',
    linkedinUrl: '',
    workPreference: 'All',
  });
  // const user = useUser();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!user) {
    alert("User not logged in");
    return;
  }

  const { fullName, personalEmail, whatsappNumber, callablePhone, companyEmail, jobRolePreferences, salaryRange, locationPreferences, workAuthDetails, gender, yearsExperience, country, willingToRelocate, githubUrl, linkedinUrl, workPreference } = formData;

  const { error } = await supabase.from("pending_clients").insert([
    {
      full_name: fullName,
      personal_email: personalEmail,
      whatsapp_number: whatsappNumber,
      callable_phone: callablePhone,
      company_email: companyEmail,
      job_role_preferences: jobRolePreferences,
      salary_range: salaryRange,
      location_preferences: locationPreferences,
      work_auth_details: workAuthDetails,
      submitted_by: user.id,
      // New fields for external API sync
      gender: gender || null,
      years_experience: yearsExperience ? parseInt(yearsExperience) : null,
      country: country || null,
      willing_to_relocate: willingToRelocate,
      github_url: githubUrl || null,
      linkedin_url: linkedinUrl || null,
      work_preference: workPreference || 'All',
      number_of_applications: '0',
      start_date: new Date().toISOString().split('T')[0],
    },
  ]);

  if (error) {
    console.error("Error inserting pending client:", error.message);
    alert("Failed to submit client. Check console.");
    return;
  }

  // alert("Client submitted successfully.");
  toast("Client submitted successfully!", {
        position: "top-center",
        autoClose: 4000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "dark",
      });
  onClientOnboarded();
  onClose(); // close modal
};


  const handleJobRoleChange = (role: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        jobRolePreferences: [...formData.jobRolePreferences, role]
      });
    } else {
      setFormData({
        ...formData,
        jobRolePreferences: formData.jobRolePreferences.filter(r => r !== role)
      });
    }
  };

  const handleLocationChange = (location: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        locationPreferences: [...formData.locationPreferences, location]
      });
    } else {
      setFormData({
        ...formData,
        locationPreferences: formData.locationPreferences.filter(l => l !== location)
      });
    }
  };

  const jobRoles = [
    'Software Engineer',
    'Full Stack Developer',
    'Frontend Developer',
    'Backend Developer',
    'Data Scientist',
    'ML Engineer',
    'DevOps Engineer',
    'Product Manager',
    'UI/UX Designer',
    'QA Engineer'
  ];

  const locations = [
    'New York',
    'San Francisco',
    'Seattle',
    'Austin',
    'Chicago',
    'Boston',
    'Los Angeles',
    'Denver',
    'Atlanta',
    'Remote'
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Onboard New Client</h2>
            <p className="text-sm text-gray-600">Sales Representative: {user?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Personal Information */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">Personal Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Personal Email *
                </label>
                <input
                  type="email"
                  value={formData.personalEmail}
                  onChange={(e) => setFormData({...formData, personalEmail: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="john.doe@gmail.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  aria-label="Gender"
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={formData.yearsExperience}
                  onChange={(e) => setFormData({...formData, yearsExperience: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="5"
                  min="0"
                  max="50"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="United States"
                />
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.willingToRelocate}
                    onChange={(e) => setFormData({...formData, willingToRelocate: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Willing to Relocate</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GitHub URL
                </label>
                <input
                  type="url"
                  value={formData.githubUrl}
                  onChange={(e) => setFormData({...formData, githubUrl: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://github.com/username"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => setFormData({...formData, linkedinUrl: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <div className="flex items-center space-x-2 mb-4">
              <Phone className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-semibold text-green-900">Contact Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  WhatsApp Number *
                </label>
                <input
                  type="tel"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({...formData, whatsappNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="+1-555-0123"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Callable Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.callablePhone}
                  onChange={(e) => setFormData({...formData, callablePhone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="+1-555-0124"
                  required
                />
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <div className="flex items-center space-x-2 mb-4">
              <Building className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-purple-900">Company Information</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Email *
                </label>
                <input
                  type="email"
                  value={formData.companyEmail}
                  onChange={(e) => setFormData({...formData, companyEmail: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="john.doe@company.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Authorization Details *
                </label>
                <select
                  aria-label="Work Authorization Details"
                  value={formData.workAuthDetails}
                  onChange={(e) => setFormData({...formData, workAuthDetails: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">Select work authorization</option>
                  <option value="H1B Visa">H1B Visa</option>
                  <option value="Green Card">Green Card</option>
                  <option value="F1 OPT">F1 OPT</option>
                  <option value="L1 Visa">L1 Visa</option>
                  <option value="US Citizen">US Citizen</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Work Preference
                </label>
                <select
                  aria-label="Work Preference"
                  value={formData.workPreference}
                  onChange={(e) => setFormData({...formData, workPreference: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="All">All</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Onsite">Onsite</option>
                </select>
              </div>
            </div>
          </div>

          {/* Job Preferences */}
          <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
            <div className="flex items-center space-x-2 mb-4">
              <FileText className="h-5 w-5 text-orange-600" />
              <h3 className="text-lg font-semibold text-orange-900">Job Preferences</h3>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Target Job Roles * (Select all that apply)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {jobRoles.map(role => (
                    <label key={role} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.jobRolePreferences.includes(role)}
                        onChange={(e) => handleJobRoleChange(role, e.target.checked)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{role}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Salary Range *
                </label>
                <select
                  aria-label="Expected Salary Range"
                  value={formData.salaryRange}
                  onChange={(e) => setFormData({...formData, salaryRange: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Select salary range</option>
                  <option value="$50,000 - $70,000">$50,000 - $70,000</option>
                  <option value="$70,000 - $90,000">$70,000 - $90,000</option>
                  <option value="$90,000 - $120,000">$90,000 - $120,000</option>
                  <option value="$120,000 - $150,000">$120,000 - $150,000</option>
                  <option value="$150,000 - $200,000">$150,000 - $200,000</option>
                  <option value="$200,000+">$200,000+</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Preferred Locations * (Select all that apply)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {locations.map(location => (
                    <label key={location} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.locationPreferences.includes(location)}
                        onChange={(e) => handleLocationChange(location, e.target.checked)}
                        className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{location}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
            >
              Onboard Client
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};