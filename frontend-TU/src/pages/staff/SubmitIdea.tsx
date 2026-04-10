// ===================================================
// SUBMIT IDEA - Form for Staff to Submit New Ideas
// ===================================================

import React, { useState } from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

interface FormData {
  title: string;
  description: string;
  category: string;
  tags: string;
  isAnonymous: boolean;
  agreeTerms: boolean;
}

const CATEGORIES = [
  'Process Optimization',
  'Cost Reduction',
  'Innovation',
  'Employee Wellness',
  'Sustainability',
];

export const SubmitIdea: React.FC = () => {
  // ===================================================
  // Form State
  // ===================================================
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: '',
    tags: '',
    isAnonymous: false,
    agreeTerms: false,
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    category?: string;
    tags?: string;
    agreeTerms?: string;
  }>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // ===================================================
  // Validate Form
  // ===================================================
  const validateForm = (): boolean => {
    const newErrors: {
      title?: string;
      description?: string;
      category?: string;
      tags?: string;
      agreeTerms?: string;
    } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Title must not exceed 200 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    } else if (formData.description.length > 5000) {
      newErrors.description = 'Description must not exceed 5000 characters';
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===================================================
  // Handle Input Change
  // ===================================================
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ===================================================
  // Handle Submit - Call Real Backend API with JSON
  // ===================================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      console.log('%c[TU-STAFF] ❌ Form validation failed', 'color: #ef4444; font-weight: bold;');
      return;
    }

    setIsLoading(true);
    console.log('%c[TU-STAFF] 💾 Submitting idea...', 'color: #0ea5e9; font-weight: bold;');
    console.log('📝 Form Data:', formData);

    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('tu_jwt_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Parse tags from comma-separated string
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      let attachmentsList: string[] = [];
      if (selectedFile) {
        console.log('%c[TU-STAFF] 📤 Uploading attachment...', 'color: #0ea5e9;');
        const uploadForm = new FormData();
        uploadForm.append('file', selectedFile);
        
        const uploadRes = await axios.post(`${API_BASE}/upload`, uploadForm, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
        
        if (uploadRes.data?.file_path) {
          attachmentsList.push(uploadRes.data.file_path);
          console.log('✅ Attachment uploaded:', uploadRes.data.file_path);
        }
      }

      // Create JSON payload matching backend CreateIdeaRequest
      const submitData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        is_anonymous: formData.isAnonymous,
        terms_accepted: formData.agreeTerms,
        tags: tagsArray.length > 0 ? tagsArray : null,
        attachments: attachmentsList.length > 0 ? attachmentsList : null,
      };

      console.log('📤 Sending JSON payload:', submitData);

      // Call backend API
      const response = await axios.post(`${API_BASE}/ideas`, submitData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('%c[TU-STAFF] ✅ Idea submitted successfully!', 'color: #10b981; font-weight: bold;');
      console.log('✅ Response:', response.data);

      setIsLoading(false);
      setIsSubmitted(true);

      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          title: '',
          description: '',
          category: '',
          tags: '',
          isAnonymous: false,
          agreeTerms: false,
        });
        setSelectedFile(null);
        setIsSubmitted(false);
      }, 3000);
    } catch (error: any) {
      setIsLoading(false);
      const errorMsg = 
        error.response?.data?.error?.message || 
        error.response?.data?.message ||
        error.message || 
        'Failed to submit idea';
      console.error('%c[TU-STAFF] ❌ Submission failed:', 'color: #ef4444; font-weight: bold;', errorMsg);
      setErrors({ title: errorMsg });
    }
  };

  // ===================================================
  // Input Field Component
  // ===================================================
  const InputField: React.FC<{
    label: string;
    name: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
    error?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }> = ({ label, name, type = 'text', placeholder, required, error, value, onChange }) => (
    <div>
      <label className="block text-sm font-medium text-white mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`w-full px-4 py-2 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none transition-colors ${
          error
            ? 'border-red-500 focus:border-red-600'
            : 'border-slate-700 focus:border-purple-500'
        }`}
      />
      {error && (
        <div className="flex items-center gap-2 mt-1 text-red-400 text-xs">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );

  // ===================================================
  // Textarea Component
  // ===================================================
  const TextareaField: React.FC<{
    label: string;
    name: string;
    placeholder?: string;
    required?: boolean;
    error?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    rows?: number;
  }> = ({ label, name, placeholder, required, error, value, onChange, rows = 5 }) => (
    <div>
      <label className="block text-sm font-medium text-white mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        className={`w-full px-4 py-2 bg-slate-800 border rounded-lg text-white placeholder-slate-500 focus:outline-none transition-colors resize-none ${
          error
            ? 'border-red-500 focus:border-red-600'
            : 'border-slate-700 focus:border-purple-500'
        }`}
      />
      {error && (
        <div className="flex items-center gap-2 mt-1 text-red-400 text-xs">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );

  console.log(
    '%c[TU-STAFF-SUBMIT] 📤 Submit idea form loaded',
    'color: #a855f7; font-weight: bold;'
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Submit Your Idea</h1>
        <p className="text-slate-400">
          Share your innovative ideas with the team. Your input could make a real difference!
        </p>
      </div>

      {/* Success Message */}
      {isSubmitted && (
        <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-green-400 font-semibold">Idea submitted successfully!</h3>
            <p className="text-green-300/80 text-sm">
              Thank you for your contribution. The QA team will review your idea shortly.
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-6 space-y-6">
          {/* Title */}
          <InputField
            label="Idea Title"
            name="title"
            placeholder="Enter a concise title for your idea"
            required
            error={errors.title as string}
            value={formData.title}
            onChange={handleInputChange}
          />

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Category <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className={`w-full px-4 py-2 bg-slate-800 border rounded-lg text-white focus:outline-none transition-colors ${
                errors.category
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-slate-700 focus:border-purple-500'
              }`}
            >
              <option value="">Select a category...</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <div className="flex items-center gap-2 mt-1 text-red-400 text-xs">
                <AlertCircle size={14} />
                {errors.category as string}
              </div>
            )}
          </div>

          {/* Description */}
          <TextareaField
            label="Detailed Description"
            name="description"
            placeholder="Describe your idea in detail. What problem does it solve? How would it work?"
            required
            error={errors.description as string}
            value={formData.description}
            onChange={handleInputChange}
            rows={6}
          />

          {/* Attachments (Optional) */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Supporting Document (Optional)
            </label>
            <input
              type="file"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="w-full px-4 py-2 bg-slate-800 border-slate-700 border rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 focus:outline-none transition-colors"
            />
            <p className="mt-2 text-xs text-slate-400">
              Attach any supplementary documents, images, or presentations to support your idea (Max 50MB).
            </p>
          </div>

          {/* Tags */}
          <InputField
            label="Tags (Optional)"
            name="tags"
            placeholder="Enter tags separated by commas (e.g., innovation, efficiency, automation)"
            error={errors.tags as string}
            value={formData.tags}
            onChange={handleInputChange}
          />

          {/* Post Anonymous */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isAnonymous"
              name="isAnonymous"
              checked={formData.isAnonymous}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, isAnonymous: e.target.checked }));
              }}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="isAnonymous" className="text-sm text-slate-400">
              Post this idea anonymously
            </label>
          </div>

          {/* Terms & Conditions */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="agreeTerms"
              name="agreeTerms"
              checked={formData.agreeTerms}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, agreeTerms: e.target.checked }));
                if (errors.agreeTerms) {
                  setErrors((prev) => ({ ...prev, agreeTerms: undefined }));
                }
              }}
              className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500 cursor-pointer"
            />
            <label htmlFor="agreeTerms" className="text-sm text-slate-400">
              I agree to the terms and conditions. My idea may be used and improved by the company.
              <span className="text-red-500 ml-1">*</span>
            </label>
          </div>
          {errors.agreeTerms && (
            <div className="flex items-center gap-2 text-red-400 text-xs">
              <AlertCircle size={14} />
              {errors.agreeTerms as string}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? '💾 Submitting...' : '✅ Submit Idea'}
          </button>
          <button
            type="reset"
            onClick={() => {
              setFormData({
                title: '',
                description: '',
                category: '',
                tags: '',
                isAnonymous: false,
                agreeTerms: false,
              });
              setErrors({});
            }}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
          >
            Clear Form
          </button>
        </div>
      </form>

      {/* Tips */}
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
        <h3 className="text-blue-400 font-semibold mb-2">💡 Tips for submitting a great idea:</h3>
        <ul className="text-blue-300/80 text-sm space-y-1">
          <li>• Be specific and clear about the problem and solution</li>
          <li>• Include measurable expected benefits when possible</li>
          <li>• Provide supporting documents or examples</li>
          <li>• Consider the feasibility and implementation timeline</li>
        </ul>
      </div>
    </div>
  );
};
