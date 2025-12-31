import React, { useState, useEffect, useRef } from 'react';
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
  const [showModal, setShowModal] = useState(false);

  const [modalContent, setModalContent] = useState({
    title: 'Welcome to Voomet',
    description: 'Voomet is your premier interior design solution. Transform your space into a work of art with our expert design services. We create beautiful, functional interiors that reflect your personal style and enhance your quality of life.'
  });

  // Animation refs
  const animationRef = useRef(null);
  const gradientRef = useRef(null);

  // Array of your images with fallbacks
  const imageSlides = [
    { src: img1, fallback: fallbackImages.img1, alt: 'Voomet Interior Design 1' },
    { src: img2, fallback: fallbackImages.img2, alt: 'Voomet Interior Design 2' },
    { src: img3, fallback: fallbackImages.img3, alt: 'Voomet Interior Design 3' },
    { src: img4, fallback: fallbackImages.img4, alt: 'Voomet Interior Design 4' },
    { src: img5, fallback: fallbackImages.img5, alt: 'Voomet Interior Design 5' },
  ];

  const navigate = useNavigate();

  // Smooth gradient animation for login side
  useEffect(() => {
    let angle = 0;
    let frameId = null;

    const animateGradient = () => {
      if (gradientRef.current) {
        angle = (angle + 0.5) % 360;
        const gradient = `linear-gradient(${angle}deg, 
          rgba(59, 130, 246, 0.8) 0%,
          rgba(168, 85, 247, 0.6) 25%,
          rgba(236, 72, 153, 0.4) 50%,
          rgba(168, 85, 247, 0.6) 75%,
          rgba(59, 130, 246, 0.8) 100%)`;
        gradientRef.current.style.background = gradient;
      }
      frameId = requestAnimationFrame(animateGradient);
    };

    animateGradient();

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, []);

  // Floating particle animation
  useEffect(() => {
    const particles = [];
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'absolute rounded-full bg-white/20';
      particle.style.width = `${Math.random() * 20 + 5}px`;
      particle.style.height = particle.style.width;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.opacity = `${Math.random() * 0.5 + 0.1}`;
      animationRef.current?.appendChild(particle);
      particles.push({
        element: particle,
        x: parseFloat(particle.style.left),
        y: parseFloat(particle.style.top),
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        size: parseFloat(particle.style.width)
      });
    }

    let animationId = null;

    const animateParticles = () => {
      particles.forEach(particle => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Bounce off edges
        if (particle.x <= 0 || particle.x >= 100) particle.speedX *= -1;
        if (particle.y <= 0 || particle.y >= 100) particle.speedY *= -1;

        // Keep within bounds
        particle.x = Math.max(0, Math.min(100, particle.x));
        particle.y = Math.max(0, Math.min(100, particle.y));

        particle.element.style.left = `${particle.x}%`;
        particle.element.style.top = `${particle.y}%`;
      });

      animationId = requestAnimationFrame(animateParticles);
    };

    animateParticles();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      particles.forEach(particle => {
        particle.element.remove();
      });
    };
  }, []);

  // Auto-rotate images every 5 seconds (FOR IMAGE SIDE ONLY)
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

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prevIndex) => 
      prevIndex === 0 ? imageSlides.length - 1 : prevIndex - 1
    );
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prevIndex) => 
      (prevIndex + 1) % imageSlides.length
    );
  };

  const handleImageClick = () => {
    setShowModal(true);
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-4">
        <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 w-full max-w-md mx-4">
          <div className="text-center mb-6 lg:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">Forgot Password</h1>
            <p className="text-sm sm:text-base text-gray-600">Reset your account password</p>
          </div>
          
          {isSendingOtp && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 text-center animate-pulse">
                <div className="flex items-center justify-center mb-3">
                  <svg className="animate-spin -ml-1 mr-2 h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-medium hover:opacity-90 transform hover:scale-105 transition-all duration-200 shadow-lg text-sm sm:text-base disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
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
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-white">
      {/* Left Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 flex-1 relative overflow-hidden">
        {/* Animated Gradient Background */}
        <div 
          ref={gradientRef}
          className="absolute inset-0 z-0 transition-all duration-300"
        />
        
        {/* Floating Particles Animation */}
        <div 
          ref={animationRef}
          className="absolute inset-0 z-1 overflow-hidden"
        />
        
        {/* Subtle pattern overlay - Fixed SVG syntax */}
        <div className="absolute inset-0 z-2 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%239C92AC%22 fill-opacity=%220.05%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
        
        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        
        {/* Curved Right Edge Divider for Desktop */}
        <div className="hidden lg:block absolute top-0 bottom-0 right-0 z-20 overflow-hidden">
          <div className="relative h-full w-32">
            {/* Main curve */}
            <div className="absolute inset-y-0 -right-16 w-64 bg-gradient-to-l from-white via-white to-transparent"></div>
            {/* Inner glow effect */}
            <div className="absolute inset-y-0 -right-8 w-32 bg-gradient-to-l from-blue-100/30 to-transparent"></div>
            {/* Shadow for depth */}
            <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-gray-200/50 to-transparent"></div>
          </div>
        </div>
        
        {/* Curved Corner SVG for smoother transition */}
        <div className="hidden lg:block absolute top-0 right-0 w-32 h-32 z-20">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path 
              d="M0,0 Q100,0 100,100 L100,0 Z" 
              fill="white"
              opacity="0.98"
            />
          </svg>
        </div>
        
        <div className="hidden lg:block absolute bottom-0 right-0 w-32 h-32 z-20">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path 
              d="M0,100 Q100,100 100,0 L100,100 Z" 
              fill="white"
              opacity="0.98"
            />
          </svg>
        </div>

        {/* Voomet Branding - ABOVE the login modal on desktop */}
       <div className="hidden lg:flex flex-col items-center mb-8 relative z-30">
  <div className="text-center transform transition-all duration-500 hover:scale-105">
    <h1 className="text-4xl font-bold text-white mb-3">
      Voomet
    </h1>
    <p className="text-lg text-white/90 animate-pulse">Transform your space, transform your life.</p>
  </div>
</div>

        <div className="w-full max-w-md mx-4 relative z-30">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl lg:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 border border-white/20 transform transition-all duration-300 hover:shadow-3xl">
            {/* Login Title - Replacing the Voomet branding inside the modal */}
            <div className="text-center mb-6 lg:mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Login</h2>
              <p className="text-sm text-gray-600 mt-2">Sign in to your account</p>
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
                <div className={`p-3 rounded-xl text-sm animate-shake ${
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
                <label className="flex items-center cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer opacity-0 absolute"
                    />
                    <div className={`w-4 h-4 border rounded flex items-center justify-center transition-all duration-300 ${
                      rememberMe 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-transparent' 
                        : 'border-gray-300 group-hover:border-blue-500'
                    }`}>
                      {rememberMe && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="ml-2 text-xs sm:text-sm text-gray-700 font-medium group-hover:text-blue-600 transition-colors duration-300">
                    Remember me
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium transition-all duration-300 hover:underline"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Login Button with Enhanced Animation */}
              <button
                type="submit"
                disabled={isLoading || isLocked}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-medium hover:opacity-90 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed text-sm sm:text-base relative overflow-hidden group"
              >
                <span className="relative z-10 flex items-center justify-center">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 sm:mr-3 h-4 sm:h-5 w-4 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="hidden sm:inline">Signing in...</span>
                      <span className="sm:hidden">Signing...</span>
                    </>
                  ) : 'LOGIN'}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Side - Image Carousel */}
      <div className="hidden lg:flex lg:w-1/2 relative z-10">
        {/* Curved Left Edge Divider for Desktop */}
        <div className="absolute top-0 bottom-0 left-0 z-20 overflow-hidden">
          <div className="relative h-full w-32">
            {/* Main curve */}
            <div className="absolute inset-y-0 -left-16 w-64 bg-gradient-to-r from-blue-900/5 via-blue-900/3 to-transparent"></div>
            {/* Inner glow effect */}
            <div className="absolute inset-y-0 -left-8 w-32 bg-gradient-to-r from-blue-900/10 to-transparent"></div>
            {/* Shadow for depth */}
            <div className="absolute inset-y-0 left-0 w-2 bg-gradient-to-r from-black/20 to-transparent"></div>
          </div>
        </div>
        
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-purple-900/10 to-pink-900/10 backdrop-blur-[1px]">
          {/* Current Image Display */}
          <div className="relative w-full h-full" onClick={handleImageClick}>
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
                  className="w-full h-full object-cover cursor-pointer"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = slide.fallback;
                  }}
                />
                {/* Gradient Overlay to match theme */}
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 via-purple-900/30 to-transparent" />
              </div>
            ))}
          </div>
          
          {/* Navigation Dots */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
            {imageSlides.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentImageIndex 
                    ? 'bg-blue-300 w-6' 
                    : 'bg-blue-200/50 hover:bg-blue-200/80'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
          
          {/* Navigation Arrows */}
          <button
            onClick={handlePrevImage}
            className="absolute left-8 top-1/2 transform -translate-y-1/2 bg-blue-500/40 hover:bg-blue-500/60 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm z-20 shadow-lg hover:shadow-xl"
            aria-label="Previous image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={handleNextImage}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 bg-blue-500/40 hover:bg-blue-500/60 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm z-20 shadow-lg hover:shadow-xl"
            aria-label="Next image"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {/* Content Overlay */}
          <div className="absolute inset-0 flex flex-col justify-end p-12 text-white">
            <div className="max-w-xl">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-300 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-sm">Premium Quality</span>
                </div>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-purple-200 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm">Expert Design</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Slide Counter */}
          <div 
            className="absolute top-8 right-8 bg-blue-900/40 backdrop-blur-sm text-blue-100 px-4 py-2 rounded-full text-sm cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {currentImageIndex + 1} / {imageSlides.length}
          </div>
        </div>
      </div>

      {/* Modal Popup */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl lg:rounded-3xl shadow-2xl max-w-lg w-full mx-auto animate-fadeIn">
            <div className="p-6 sm:p-8 lg:p-10">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-white">{modalContent.title}</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:text-blue-200 transition-colors duration-200"
                  aria-label="Close modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-8">
                <p className="text-blue-100 leading-relaxed">{modalContent.description}</p>
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border-2 border-white text-white rounded-xl font-medium hover:bg-blue-700/30 transition-all duration-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setShowModal(false);
                    // You can add additional action here
                  }}
                  className="px-6 py-3 bg-white text-blue-600 rounded-xl font-medium hover:bg-blue-50 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;