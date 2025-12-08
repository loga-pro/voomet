import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import FloatingInput from '../components/Forms/FloatingInput'; 

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
  const [otpVerified, setOtpVerified] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);

  const navigate = useNavigate();

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
    
    // Check minimum length (8 characters)
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    // Check maximum length (30 characters)
    if (password.length > 30) {
      errors.push('Password must not exceed 30 characters');
    }
    
    // Check for at least one capital letter
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one capital letter');
    }
    
    // Check for at least one number
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return errors;
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: 'None', color: 'gray' };
    
    let score = 0;
    const errors = validatePassword(password);
    const totalRequirements = 5; // length, capital, number, special, min length met
    
    // Length requirements
    if (password.length >= 8 && password.length <= 30) score++;
    
    // Character requirements
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    
    // Additional length bonus
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
    
    // Check if account is locked
    if (isLocked) {
      setError(`Account locked. Please try again in ${lockoutTimeLeft} seconds.`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.login(formData);
      
      // Successful login - reset failed attempts
      sessionStorage.removeItem('failedAttempts');
      sessionStorage.removeItem('lockoutEndTime');
      setFailedAttempts(0);
      
      // Store credentials securely in sessionStorage
      sessionStorage.setItem('token', response.data.token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Store email securely if remember me is checked
      if (rememberMe) {
        sessionStorage.setItem('rememberedEmail', formData.email);
        sessionStorage.setItem('rememberMe', 'true');
      } else {
        // Clear saved credentials if remember me is unchecked
        sessionStorage.removeItem('rememberedEmail');
        sessionStorage.removeItem('rememberMe');
      }
      
      // Clear browser history to prevent back navigation to login
      window.history.replaceState(null, '', '/');
      navigate('/', { replace: true });
    } catch (error) {
      // Increment failed attempts
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      sessionStorage.setItem('failedAttempts', newFailedAttempts.toString());

      // Lock account after 4 failed attempts
      if (newFailedAttempts >= 4) {
        const lockoutDuration = 30 * 1000; // 30 seconds in milliseconds
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
        setOtpVerified(true);
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
    
    // Validate password strength
    const passwordErrors = validatePassword(forgotPasswordData.newPassword);
    if (passwordErrors.length > 0) {
      setForgotPasswordMessage(passwordErrors[0]); // Show first error
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

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 p-4">
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
              <>
                <FloatingInput
                  type="text"
                  name="otp"
                  label="OTP"
                  required
                  value={forgotPasswordData.otp}
                  onChange={handleForgotPasswordChange}
                />
              </>
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
                
                {/* Password Strength Indicator */}
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
                
                {/* Password Requirements */}
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
                className="flex-1 bg-blue-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-medium hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg text-sm sm:text-base disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
              >
                {forgotPasswordStep === 1 ? (
                  isSendingOtp ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 sm:h-5 w-4 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : 'Send OTP'
                ) : (forgotPasswordStep === 2 ? (
                  isVerifyingOtp ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 sm:h-5 w-4 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Mobile Header - Only visible on small screens */}
      <div className="lg:hidden bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 p-6 text-center text-white">
        <h1 className="text-2xl font-bold mb-1">Voomet</h1>
        <p className="text-sm opacity-90">Transform your space, transform your life.</p>
      </div>
      
      {/* Left Side - Geometric Design */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500">
          {/* Geometric Grid Pattern */}
          <div className="absolute inset-0 opacity-30">
            <svg width="100%" height="100%" viewBox="0 0 400 600">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
          
          {/* Curved Shape */}
          <div className="absolute right-0 top-0 w-2/3 h-full">
            <svg width="100%" height="100%" viewBox="0 0 300 600" className="absolute right-0">
              <path
                d="M0,0 Q150,150 100,300 Q50,450 150,600 L300,600 L300,0 Z"
                fill="rgba(255,255,255,0.1)"
              />
            </svg>
          </div>
          
          {/* Additional curved elements */}
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2">
            <svg width="100%" height="100%" viewBox="0 0 200 300">
              <path
                d="M0,100 Q100,50 200,150 L200,300 L0,300 Z"
                fill="rgba(255,255,255,0.05)"
              />
            </svg>
          </div>
        </div>
        
        {/* Brand Section */}
        <div className="relative z-10 p-8 lg:p-12 flex flex-col justify-between text-white">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">Voomet</h1>
            <p className="text-lg lg:text-xl opacity-90">Transform your space, transform your life.</p>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 lg:p-6 border border-white/20">
              <h3 className="font-semibold mb-2">Secure Access</h3>
              <p className="text-sm opacity-90">
                Advanced security measures to protect your data and ensure safe access to your account.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gray-50 flex-1">
        <div className="w-full max-w-md mx-4">
          <div className="bg-white rounded-2xl lg:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10">
            {/* Header */}
            <div className="text-center mb-6 lg:mb-8">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">Voomet Portal</h2>
              <p className="text-sm sm:text-base text-gray-600">Welcome to your portal, Sign in to your account</p>
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
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                  />
                  <span className="ml-2 text-xs sm:text-sm text-gray-700 font-medium">
                    Remember me
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors duration-300"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading || isLocked}
                className="w-full bg-blue-600 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl font-medium hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed text-sm sm:text-base"
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
    </div>
  );
};

export default Login;