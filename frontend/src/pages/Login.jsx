import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import FloatingInput from '../components/Forms/FloatingInput';

// Import all your images from src/assets/
import img1 from '../assets/img1.png';
import img2 from '../assets/img2.png';
import img3 from '../assets/img3.png';
import img4 from '../assets/img4.png';
import img5 from '../assets/img5.png';

// Fallback images in case your images don't load
const fallbackImages = {
  img1: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  img2: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  img3: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  img4: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
  img5: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
};

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Array of your images with fallbacks
  const imageSlides = [
    { src: img1, fallback: fallbackImages.img1, alt: 'Voomet Interior Design 1' },
    { src: img2, fallback: fallbackImages.img2, alt: 'Voomet Interior Design 2' },
    { src: img3, fallback: fallbackImages.img3, alt: 'Voomet Interior Design 3' },
    { src: img4, fallback: fallbackImages.img4, alt: 'Voomet Interior Design 4' },
    { src: img5, fallback: fallbackImages.img5, alt: 'Voomet Interior Design 5' },
  ];

  const navigate = useNavigate();

  // Auto-rotate images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % imageSlides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [imageSlides.length]);

  // Load saved email on component mount
  useEffect(() => {
    const savedEmail = sessionStorage.getItem('rememberedEmail');
    const savedRememberMe = sessionStorage.getItem('rememberMe') === 'true';
    if (savedEmail && savedRememberMe) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }

    // Check for existing lockout
    const lockoutEndTime = sessionStorage.getItem('lockoutEndTime');
    if (lockoutEndTime) {
      const remaining = Math.max(0, Math.ceil((parseInt(lockoutEndTime) - Date.now()) / 1000));
      if (remaining > 0) {
        setIsLocked(true);
        setLockoutTimeLeft(remaining);
      } else {
        // Lockout expired, clear it
        sessionStorage.removeItem('lockoutEndTime');
        sessionStorage.removeItem('failedAttempts');
      }
    }

    // Load failed attempts count
    const savedAttempts = sessionStorage.getItem('failedAttempts');
    if (savedAttempts) {
      setFailedAttempts(parseInt(savedAttempts));
    }
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (!isLocked) return;

    const interval = setInterval(() => {
      const lockoutEndTime = sessionStorage.getItem('lockoutEndTime');
      if (lockoutEndTime) {
        const remaining = Math.max(0, Math.ceil((parseInt(lockoutEndTime) - Date.now()) / 1000));
        setLockoutTimeLeft(remaining);
        
        if (remaining === 0) {
          setIsLocked(false);
          sessionStorage.removeItem('lockoutEndTime');
          sessionStorage.removeItem('failedAttempts');
          setFailedAttempts(0);
          clearInterval(interval);
        }
      } else {
        setIsLocked(false);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleForgotPasswordChange = (e) => {
    setForgotPasswordData({
      ...forgotPasswordData,
      [e.target.name]: e.target.value
    });
  };

  const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 30) {
      errors.push('Password must not exceed 30 characters');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one capital letter');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return errors;
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: 'None', color: 'gray' };
    
    let score = 0;
    
    if (password.length >= 8 && password.length <= 30) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    if (password.length >= 12) score++;
    
    if (score <= 2) return { strength: score, label: 'Weak', color: 'red' };
    if (score <= 3) return { strength: score, label: 'Medium', color: 'yellow' };
    if (score <= 4) return { strength: score, label: 'Strong', color: 'green' };
    return { strength: score, label: 'Very Strong', color: 'darkgreen' };
  };

  const PasswordRequirements = ({ password }) => {
    const requirements = [
      { test: password.length >= 8, text: 'At least 8 characters' },
      { test: password.length <= 30, text: 'Maximum 30 characters' },
      { test: /[A-Z]/.test(password), text: 'At least one capital letter' },
      { test: /\d/.test(password), text: 'At least one number' },
      { test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), text: 'At least one special character' }
    ];

    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</div>
        <div className="space-y-1">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center text-xs">
              {req.test ? (
                <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              )}
              <span className={req.test ? 'text-green-700' : 'text-gray-500'}>{req.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isLocked) {
      setError(`Account locked. Please try again in ${lockoutTimeLeft} seconds.`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.login(formData);
      
      sessionStorage.removeItem('failedAttempts');
      sessionStorage.removeItem('lockoutEndTime');
      setFailedAttempts(0);
      
      sessionStorage.setItem('token', response.data.token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
      
      if (rememberMe) {
        sessionStorage.setItem('rememberedEmail', formData.email);
        sessionStorage.setItem('rememberMe', 'true');
      } else {
        sessionStorage.removeItem('rememberedEmail');
        sessionStorage.removeItem('rememberMe');
      }
      
      window.history.replaceState(null, '', '/');
      navigate('/', { replace: true });
    } catch (error) {
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      sessionStorage.setItem('failedAttempts', newFailedAttempts.toString());

      if (newFailedAttempts >= 4) {
        const lockoutDuration = 30 * 1000;
        const lockoutEndTime = Date.now() + lockoutDuration;
        sessionStorage.setItem('lockoutEndTime', lockoutEndTime.toString());
        setIsLocked(true);
        setLockoutTimeLeft(30);
        setError('Too many failed attempts. Account locked for 30 seconds.');
      } else {
        const remainingAttempts = 4 - newFailedAttempts;
        setError(`${error.response?.data?.message || 'Login failed'}. ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining.`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    try {
      setIsSendingOtp(true);
      await authAPI.forgotPassword(forgotPasswordData.email);
      setForgotPasswordStep(2);
      setForgotPasswordMessage('');
      setIsSendingOtp(false);
    } catch (error) {
      setForgotPasswordMessage(error.response?.data?.message || 'Failed to send OTP');
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsVerifyingOtp(true);
    const otp = (forgotPasswordData.otp || '').trim();
    setTimeout(() => {
      if (otp.length >= 4) {
        setForgotPasswordStep(3);
        setForgotPasswordMessage('OTP verified successfully');
      } else {
        setForgotPasswordMessage('Invalid OTP');
      }
      setIsVerifyingOtp(false);
    }, 600);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
      setForgotPasswordMessage('Passwords do not match');
      return;
    }
    
    const passwordErrors = validatePassword(forgotPasswordData.newPassword);
    if (passwordErrors.length > 0) {
      setForgotPasswordMessage(passwordErrors[0]);
      return;
    }
    
    try {
      await authAPI.resetPassword({
        email: forgotPasswordData.email,
        otp: forgotPasswordData.otp,
        newPassword: forgotPasswordData.newPassword
      });
      setForgotPasswordMessage('Password reset successfully');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordStep(1);
        setForgotPasswordData({ email: '', otp: '', newPassword: '', confirmPassword: '' });
        setForgotPasswordMessage('');
      }, 2000);
    } catch (error) {
      setForgotPasswordMessage(error.response?.data?.message || 'Failed to reset password');
    }
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? imageSlides.length - 1 : prevIndex - 1
    );
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prevIndex) => 
      (prevIndex + 1) % imageSlides.length
    );
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-800 via-amber-600 to-amber-400 p-4">
        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 w-full max-w-md mx-4">
          <div className="text-center mb-6 lg:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">Forgot Password</h1>
            <p className="text-sm sm:text-base text-gray-600">Reset your account password</p>
          </div>
          
          {isSendingOtp && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 text-center animate-pulse">
                <div className="flex items-center justify-center mb-3">
                  <svg className="animate-spin -ml-1 mr-2 h-6 w-6 text-amber-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-800">Sending OTP...</p>
                <p className="text-xs text-gray-500 mt-1">Please wait</p>
              </div>
            </div>
          )}

          <form className="space-y-4 sm:space-y-5 lg:space-y-6" onSubmit={forgotPasswordStep === 1 ? handleSendOtp : (forgotPasswordStep === 2 ? handleVerifyOtp : handleResetPassword)}>
            {forgotPasswordStep === 1 && (
              <FloatingInput
                type="email"
                name="email"
                label="Email"
                required
                value={forgotPasswordData.email}
                onChange={handleForgotPasswordChange}
              />
            )}
            
            {forgotPasswordStep === 2 && (
              <FloatingInput
                type="text"
                name="otp"
                label="OTP"
                required
                value={forgotPasswordData.otp}
                onChange={handleForgotPasswordChange}
              />
            )}

            {forgotPasswordStep === 3 && (
              <>
                <FloatingInput
                  type="password"
                  name="newPassword"
                  label="New Password"
                  required
                  value={forgotPasswordData.newPassword}
                  onChange={handleForgotPasswordChange}
                />
                
                {forgotPasswordData.newPassword && (
                  <div className="mt-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">Password Strength:</span>
                      <span className={`text-xs font-medium ${
                        getPasswordStrength(forgotPasswordData.newPassword).color === 'red' ? 'text-red-600' :
                        getPasswordStrength(forgotPasswordData.newPassword).color === 'yellow' ? 'text-yellow-600' :
                        getPasswordStrength(forgotPasswordData.newPassword).color === 'green' ? 'text-green-600' :
                        'text-green-800'
                      }`}>
                        {getPasswordStrength(forgotPasswordData.newPassword).label}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          getPasswordStrength(forgotPasswordData.newPassword).strength <= 2 ? 'bg-red-500 w-1/4' :
                          getPasswordStrength(forgotPasswordData.newPassword).strength <= 3 ? 'bg-yellow-500 w-1/2' :
                          getPasswordStrength(forgotPasswordData.newPassword).strength <= 4 ? 'bg-green-500 w-3/4' :
                          'bg-green-700 w-full'
                        }`}
                      />
                    </div>
                  </div>
                )}
                
                {forgotPasswordData.newPassword && <PasswordRequirements password={forgotPasswordData.newPassword} />}
                
                <FloatingInput
                  type="password"
                  name="confirmPassword"
                  label="Confirm Password"
                  required
                  value={forgotPasswordData.confirmPassword}
                  onChange={handleForgotPasswordChange}
                />
              </>
            )}
            
            {forgotPasswordMessage && (
              <div className={`text-xs sm:text-sm p-3 rounded-lg sm:rounded-xl ${forgotPasswordMessage.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {forgotPasswordMessage}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                type="submit"
                disabled={forgotPasswordStep === 1 ? isSendingOtp : (forgotPasswordStep === 2 ? isVerifyingOtp : false)}
                className="flex-1 bg-amber-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-medium hover:bg-amber-700 transform hover:scale-105 transition-all duration-200 shadow-lg text-sm sm:text-base disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
              >
                {forgotPasswordStep === 1 ? (
                  isSendingOtp ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 sm:h-5 w-4 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : 'Send OTP'
                ) : (forgotPasswordStep === 2 ? (
                  isVerifyingOtp ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 sm:h-5 w-4 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </span>
                  ) : 'Verify OTP'
                ) : 'Reset Password')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordStep(1);
                  setForgotPasswordData({ email: '', otp: '', newPassword: '', confirmPassword: '' });
                  setForgotPasswordMessage('');
                }}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-medium hover:bg-gray-50 transition-all duration-200 text-sm sm:text-base"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile Header - Visible on small screens */}
      <div className="lg:hidden bg-gradient-to-br from-amber-800 via-amber-600 to-amber-400 p-6 text-center text-white">
        <div className="flex items-center justify-center mb-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-1">Voomet</h1>
            <p className="text-sm opacity-90">Transform your space, transform your life.</p>
          </div>
        </div>
      </div>
      
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 flex-1">
        <div className="w-full max-w-md mx-4">
          <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 border border-gray-200">
            {/* Desktop Logo */}
            <div className="hidden lg:flex items-center justify-center mb-8">
              <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Voomet</h1>
                <p className="text-gray-600">Transform your space, transform your life.</p>
              </div>
            </div>

            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Voomet Portal</h2>
              <p className="text-sm text-gray-600">Sign in to your account</p>
            </div>

            {/* Login Form */}
            <form className="space-y-4 sm:space-y-5 lg:space-y-6" onSubmit={handleSubmit}>
              <FloatingInput
                type="email"
                name="email"
                label="Email"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={isLocked}
              />

              <FloatingInput
                type="password"
                name="password"
                label="Password"
                required
                value={formData.password}
                onChange={handleChange}
                disabled={isLocked}
              />

              {error && (
                <div className={`p-3 rounded-xl text-sm ${
                  isLocked 
                    ? 'bg-orange-50 text-orange-700 border border-orange-200' 
                    : 'bg-red-50 text-red-700'
                }`}>
                  {error}
                  {isLocked && (
                    <div className="mt-2 text-xs font-semibold">
                      Please wait {lockoutTimeLeft} second{lockoutTimeLeft !== 1 ? 's' : ''} before trying again.
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-amber-600 bg-gray-100 border-gray-300 rounded focus:ring-amber-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="ml-2 text-xs sm:text-sm text-gray-700 font-medium">
                    Remember me
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs sm:text-sm text-amber-600 hover:text-amber-700 font-medium transition-colors duration-300"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || isLocked}
                className="w-full bg-amber-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-medium hover:bg-amber-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 sm:h-5 w-4 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="hidden sm:inline">Signing in...</span>
                    <span className="sm:hidden">Signing...</span>
                  </span>
                ) : 'LOGIN'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side - Image Carousel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-900/10 via-amber-700/10 to-amber-500/10">
          {/* Current Image Display */}
          <div className="relative w-full h-full">
            {imageSlides.map((slide, index) => (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <img
                  src={slide.src || slide.fallback}
                  alt={slide.alt}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = slide.fallback;
                  }}
                />
                {/* Gradient Overlay with copper/gold tint */}
                <div className="absolute inset-0 bg-gradient-to-t from-amber-900/30 via-amber-700/20 to-transparent" />
              </div>
            ))}
          </div>
          
          {/* Navigation Dots */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
            {imageSlides.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentImageIndex 
                    ? 'bg-amber-300 w-6' 
                    : 'bg-amber-200/50 hover:bg-amber-200/80'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
          
          {/* Navigation Arrows */}
          <button
            onClick={handlePrevImage}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-amber-500/40 hover:bg-amber-500/60 text-white p-2 rounded-full transition-all duration-300 backdrop-blur-sm"
            aria-label="Previous image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={handleNextImage}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-amber-500/40 hover:bg-amber-500/60 text-white p-2 rounded-full transition-all duration-300 backdrop-blur-sm"
            aria-label="Next image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {/* Content Overlay */}
          <div className="absolute inset-0 flex flex-col justify-end p-12 text-white">
            <div className="max-w-xl">
              <h2 className="text-4xl font-bold mb-4">Beautiful Interiors</h2>
              <p className="text-lg opacity-90 mb-6">
                Explore our collection of stunning interior designs that transform spaces 
                into works of art. Each image showcases our commitment to excellence.
              </p>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-amber-300 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm">Premium Quality</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-amber-200 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Expert Design</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Slide Counter */}
          <div className="absolute top-8 right-8 bg-amber-900/40 backdrop-blur-sm text-amber-100 px-4 py-2 rounded-full text-sm">
            {currentImageIndex + 1} / {imageSlides.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;