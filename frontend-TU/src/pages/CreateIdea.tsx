// ===================================================
// CreateIdea.tsx - Page Form nộp bài chuyên nghiệp
// Tú tạo trang này với validation đầy đủ
// ===================================================

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { tuApiService } from '../api/tu-service';
import clsx from 'clsx';

interface FormData {
  title: string;
  description: string;
  content: string;
  category: string;
  department: string;
  file: File | null;
  agreeTerms: boolean;
  isAnonymous: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

export const CreateIdea: React.FC = () => {
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    content: '',
    category: '',
    department: '',
    file: null,
    agreeTerms: false,
    isAnonymous: false,
  });

  // UI state
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Load categories và departments từ API
   */
  useEffect(() => {
    const loadOptions = async () => {
      console.log(
        '%c[TU-CREATE] 📥 Loading categories và departments...',
        'color: #0ea5e9; font-weight: bold;'
      );

      setLoading(true);
      try {
        // Load categories
        const catResponse = await tuApiService.get<CategoryOption[]>('/categories');
        if (catResponse.success && catResponse.data) {
          console.log(
            `%c[TU-CREATE] ✅ Loaded ${catResponse.data.length} categories`,
            'color: #10b981;'
          );
          setCategories(catResponse.data);
        }

        // Load departments
        const deptResponse = await tuApiService.get<DepartmentOption[]>('/departments');
        if (deptResponse.success && deptResponse.data) {
          console.log(
            `%c[TU-CREATE] ✅ Loaded ${deptResponse.data.length} departments`,
            'color: #10b981;'
          );
          setDepartments(deptResponse.data);
        }
      } catch (err: any) {
        console.error(
          '%c[TU-CREATE] ❌ Error loading options:',
          'color: #ff0000;',
          err
        );
        setError('Failed to load categories and departments');
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, []);

  /**
   * Validate form
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    console.log('%c[TU-VALIDATE] 🔍 Validating form data...', 'color: #ffa500;');

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
      console.warn('  ⚠️ Title validation failed');
    } else if (formData.title.length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
      console.warn('  ⚠️ Title too short');
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
      console.warn('  ⚠️ Description validation failed');
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
      console.warn('  ⚠️ Description too short');
    }

    if (!formData.category) {
      newErrors.category = 'Please select a category';
      console.warn('  ⚠️ Category validation failed');
    }

    if (!formData.department) {
      newErrors.department = 'Please select a department';
      console.warn('  ⚠️ Department validation failed');
    }

    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the Terms';
      console.warn('  ⚠️ Terms validation failed');
    }

    setErrors(newErrors);

    const isValid = Object.keys(newErrors).length === 0;
    console.log(
      `%c[TU-VALIDATE] ${isValid ? '✅ Form valid' : '❌ Form has errors'} (${Object.keys(newErrors).length} errors)`,
      isValid ? 'color: #10b981;' : 'color: #ff0000;'
    );

    return isValid;
  };

  /**
   * Handle input change
   */
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      console.log(
        `%c[TU-FORM] ☑️ ${name} changed to: ${checked}`,
        'color: #0ea5e9;'
      );
      setFormData(prev => ({
        ...prev,
        [name]: checked,
      }));

      // Clear error for this field
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    } else {
      console.log(
        `%c[TU-FORM] ✏️ ${name} changed`,
        'color: #0ea5e9;'
      );
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));

      // Clear error for this field
      if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
      }
    }
  };

  /**
   * Handle file upload
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (file) {
      console.log(
        `%c[TU-FILE] 📎 File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`,
        'color: #0ea5e9; font-weight: bold;'
      );

      if (file.size > 10 * 1024 * 1024) {
        console.warn('%c[TU-FILE] ⚠️ File too large! Max 10MB', 'color: #ff8800;');
        setErrors(prev => ({
          ...prev,
          file: 'File size cannot exceed 10MB',
        }));
        return;
      }

      setFormData(prev => ({ ...prev, file }));
      setErrors(prev => ({ ...prev, file: '' }));
    }
  };

  /**
   * Handle form submit
   */
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    console.log(
      '%c[TU-FORM] 📤 Starting form submission...',
      'color: #00ff00; font-weight: bold; font-size: 14px;'
    );

    if (!validateForm()) {
      alert('❌ Form has validation errors. Please check and try again.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      console.log(
        '%c[TU-FORM] 📝 Chuẩn bị dữ liệu bài...',
        'color: #00ff00; font-weight: bold;'
      );

      // Prepare form data for upload
      const uploadData = new FormData();
      uploadData.append('title', formData.title);
      uploadData.append('description', formData.description);
      uploadData.append('content', formData.content);
      uploadData.append('category', formData.category);
      uploadData.append('department', formData.department);
      uploadData.append('isAnonymous', String(formData.isAnonymous));

      if (formData.file) {
        uploadData.append('attachment', formData.file);
        console.log(
          `%c[TU-FORM] 📎 File đưới vào: ${formData.file.name}`,
          'color: #ffa500;'
        );
      }

      console.log(
        '%c[TU-FORM] 🚀 Đang gửi bài lên kho của Tú, chờ tí nhé!',
        'color: #00ff00; font-weight: bold; font-size: 14px;'
      );

      // Send to API using FormData (multipart)
      const response = await tuApiService.getClient().post('/ideas', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        console.log(
          '%c[TU-SUCCESS] 🎉 Bài được tạo thành công!!! Tú chúc mừng bạn!',
          'color: #00ff00; font-weight: bold; font-size: 14px;'
        );
        console.log('📌 Idea ID:', response.data.data?.id);

        setSuccess(true);
        alert(
          '✅ Idea submitted successfully! Thank you for sharing your brilliant idea with us! 🚀'
        );

        // Redirect sau 2 seconds
        setTimeout(() => {
          navigate('/ideas');
        }, 2000);
      } else {
        const errorMsg = response.data.error?.message || 'Không thể gửi bài';
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Lỗi khi gửi bài';
      console.error(
        '%c[TU-ERROR] 🔥 Lỗi gửi bài: ' + errorMsg,
        'color: #ff0000; font-weight: bold;',
        err
      );
      setError(errorMsg);
      alert(`❌ Tú gửi bài không được: ${errorMsg}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Disable submit button nếu chưa tick điều khoản
  const isSubmitDisabled = !formData.agreeTerms || submitting || loading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            💡 Share Your Brilliant Idea
          </h1>
          <p className="text-slate-400">
            Submit your amazing idea to our system! 🚀
          </p>
        </div>

        {/* Success message */}
        {success && (
          <div className="bg-green-500/10 border border-green-500 rounded-lg p-4 mb-6">
            <p className="text-green-400 font-semibold">
              ✅ Idea submitted successfully!
            </p>
            <p className="text-green-300 text-sm mt-1">
              We are processing your idea. Redirecting in 2 seconds...
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-400 font-semibold">❌ Error</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border border-slate-700 p-8 space-y-6"
        >
          {/* Title Input */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              📝 Idea Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter your idea title..."
              className={clsx(
                'w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400',
                'border-2 transition-all duration-200',
                errors.title
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-slate-600 focus:border-blue-500',
                'focus:outline-none focus:ring-2 focus:ring-opacity-30',
                errors.title ? 'focus:ring-red-500' : 'focus:ring-blue-500'
              )}
              disabled={submitting}
            />
            {errors.title && (
              <p className="text-red-400 text-sm mt-1">❌ {errors.title}</p>
            )}
          </div>

          {/* Description Textarea */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              📋 Idea Description <span className="text-red-400">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your idea in detail..."
              rows={4}
              className={clsx(
                'w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400',
                'border-2 transition-all duration-200 resize-none',
                errors.description
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-slate-600 focus:border-blue-500',
                'focus:outline-none focus:ring-2 focus:ring-opacity-30',
                errors.description ? 'focus:ring-red-500' : 'focus:ring-blue-500'
              )}
              disabled={submitting}
            />
            {errors.description && (
              <p className="text-red-400 text-sm mt-1">❌ {errors.description}</p>
            )}
            <p className="text-slate-400 text-xs mt-1">
              {formData.description.length}/500 ký tự
            </p>
          </div>

          {/* Content (optional) */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              📄 Additional Details (Optional)
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              placeholder="Add more details or improvements..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 border-2 border-slate-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 transition-all duration-200 resize-none"
              disabled={submitting}
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              🏷️ Category <span className="text-red-400">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              disabled={loading || submitting}
              className={clsx(
                'w-full px-4 py-3 rounded-lg bg-slate-700 text-white',
                'border-2 transition-all duration-200',
                errors.category
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-slate-600 focus:border-blue-500',
                'focus:outline-none focus:ring-2 focus:ring-opacity-30',
                errors.category ? 'focus:ring-red-500' : 'focus:ring-blue-500',
                (loading || submitting) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <option value="">-- Select a category --</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="text-red-400 text-sm mt-1">❌ {errors.category}</p>
            )}
          </div>

          {/* Department Dropdown */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              🏢 Department <span className="text-red-400">*</span>
            </label>
            <select
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              disabled={loading || submitting}
              className={clsx(
                'w-full px-4 py-3 rounded-lg bg-slate-700 text-white',
                'border-2 transition-all duration-200',
                errors.department
                  ? 'border-red-500 focus:border-red-600'
                  : 'border-slate-600 focus:border-blue-500',
                'focus:outline-none focus:ring-2 focus:ring-opacity-30',
                errors.department ? 'focus:ring-red-500' : 'focus:ring-blue-500',
                (loading || submitting) && 'opacity-50 cursor-not-allowed'
              )}
            >
              <option value="">-- Select a department --</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            {errors.department && (
              <p className="text-red-400 text-sm mt-1">❌ {errors.department}</p>
            )}
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              📎 Upload Attachment (Optional)
            </label>
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                onChange={handleFileChange}
                disabled={submitting}
                className="hidden"
                id="file-input"
              />
              <label
                htmlFor="file-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <span className="text-2xl">📂</span>
                <span className="text-slate-300 font-semibold">
                  Drag & drop file or click to select
                </span>
                <span className="text-slate-400 text-sm">
                  Max 10MB (PDF, DOC, XLS)
                </span>
              </label>
              {formData.file && (
                <div className="mt-3 text-sm text-blue-400">
                  ✅ Selected: <span className="font-semibold">{formData.file.name}</span>
                </div>
              )}
            </div>
            {errors.file && (
              <p className="text-red-400 text-sm mt-1">❌ {errors.file}</p>
            )}
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 bg-slate-700/50 p-4 rounded-lg border border-slate-600">
            {/* Anonymous checkbox */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="isAnonymous"
                checked={formData.isAnonymous}
                onChange={handleInputChange}
                disabled={submitting}
                className="w-5 h-5 rounded cursor-pointer accent-blue-500"
              />
              <span className="text-slate-300">
                🕵️ Submit Anonymously
              </span>
            </label>

            {/* Terms checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleInputChange}
                disabled={submitting}
                className="w-5 h-5 rounded cursor-pointer accent-blue-500 mt-1 flex-shrink-0"
              />
              <span className="text-slate-300 text-sm">
                ✅ I agree to the <span className="font-semibold underline">Terms and Conditions</span> and 
                <span className="font-semibold underline"> Privacy Policy</span>. 💼
              </span>
            </label>
            {errors.agreeTerms && (
              <p className="text-red-400 text-sm">❌ {errors.agreeTerms}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className={clsx(
              'w-full py-3 rounded-lg font-bold text-lg transition-all duration-200',
              'flex items-center justify-center gap-2',
              isSubmitDisabled
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/50 cursor-pointer'
            )}
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                📤 Submitting...
              </>
            ) : (
              <>
                🚀 Submit Idea
              </>
            )}
          </button>

          {/* Info text */}
          {!formData.agreeTerms && (
            <p className="text-sm text-slate-400 text-center">
              ⚠️ You must agree to the Terms before submitting
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default CreateIdea;
