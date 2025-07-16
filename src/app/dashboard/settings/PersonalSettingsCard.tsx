"use client";

import React, { useRef, useState, ChangeEvent, useEffect } from "react";
import { useUser } from '@/app/UserProvider';

const defaultAvatar = "/avatar-placeholder.png";

type PersonalSettingsCardProps = {
  initialFirstName?: string;
  initialLastName?: string;
  initialAvatarUrl?: string;
  onSave?: (data: { firstName: string; lastName: string; avatar: File | null }) => Promise<void>;
};

const PersonalSettingsCard: React.FC<PersonalSettingsCardProps> = ({
  initialFirstName = "",
  initialLastName = "",
  initialAvatarUrl = defaultAvatar,
  onSave,
}) => {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useUser();

  // Update local state when props change (after successful save)
  useEffect(() => {
    setFirstName(initialFirstName);
    setLastName(initialLastName);
    setAvatarUrl(initialAvatarUrl);
    setAvatarFile(null); // Reset avatar file
    setError(""); // Clear any previous errors
    setSuccess(""); // Clear success message
  }, [initialFirstName, initialLastName, initialAvatarUrl]);

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
      setError(""); // Clear error when user makes changes
      setSuccess(""); // Clear success message
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleSave = async () => {
    if (!onSave) {
      setError("Save handler not available");
      return;
    }

    if (!user?.user) {
      setError("User not authenticated");
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required");
      return;
    }

    setError("");
    setSuccess("");
    setSaving(true);

    try {
      await onSave({ firstName, lastName, avatar: avatarFile });
      setSuccess("Profile updated successfully!");
      setAvatarFile(null); // Reset file after successful save
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess("");
      }, 3000);
    } catch (err: any) {
      console.error('Profile save error:', err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (setter: (value: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
    setError(""); // Clear error when user makes changes
    setSuccess(""); // Clear success message
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 w-full font-inter">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 font-inter">Personal Settings</h2>
      
      <div className="flex flex-col items-center mb-6 sm:mb-8">
        <div className="relative group mb-2">
          <img
            src={avatarUrl}
            alt="Profile picture"
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-gray-200"
            tabIndex={0}
            aria-label="Profile picture"
          />
          <button
            type="button"
            onClick={handleAvatarClick}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-black bg-opacity-60 text-white rounded-full px-2 sm:px-3 py-1 text-xs opacity-80 group-hover:opacity-100 focus:outline-none font-inter"
            aria-label="Change profile picture"
            tabIndex={0}
          >
            Change
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
            aria-label="Upload profile picture"
            tabIndex={-1}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div>
          <label htmlFor="first-name" className="block text-sm font-medium mb-2 font-inter">
            First Name *
          </label>
          <input
            id="first-name"
            type="text"
            value={firstName}
            onChange={handleInputChange(setFirstName)}
            className="w-full border rounded-lg px-3 py-3 sm:py-2 bg-gray-50 focus:ring-2 focus:ring-[#FF6551] focus:border-[#FF6551] font-inter text-base sm:text-sm"
            aria-label="First Name"
            tabIndex={0}
            required
          />
        </div>
        <div>
          <label htmlFor="last-name" className="block text-sm font-medium mb-2 font-inter">
            Last Name *
          </label>
          <input
            id="last-name"
            type="text"
            value={lastName}
            onChange={handleInputChange(setLastName)}
            className="w-full border rounded-lg px-3 py-3 sm:py-2 bg-gray-50 focus:ring-2 focus:ring-[#FF6551] focus:border-[#FF6551] font-inter text-base sm:text-sm"
            aria-label="Last Name"
            tabIndex={0}
            required
          />
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-inter">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm font-inter">
          {success}
        </div>
      )}
      
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full sm:w-auto bg-[#FF6551] text-white px-6 py-3 sm:py-2 rounded-full font-semibold shadow hover:bg-[#FF4C38] focus:outline-none focus:ring-2 focus:ring-[#FF6551] disabled:opacity-50 disabled:cursor-not-allowed font-inter text-base sm:text-sm"
        aria-label="Save personal settings"
        tabIndex={0}
      >
        {saving ? "Saving..." : "Save Changes"}
      </button>
    </div>
  );
};

export default PersonalSettingsCard; 