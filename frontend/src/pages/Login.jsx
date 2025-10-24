import React, { useState } from 'react';
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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: '',
    otp: '',
    newPassword: ''
  });
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');

  const navigate = useNavigate();

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.login(formData);
      sessionStorage.setItem('token', response.data.token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Clear browser history to prevent back navigation to login
      window.history.replaceState(null, '', '/dashboard');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    try {
      await authAPI.forgotPassword(forgotPasswordData.email);
      setForgotPasswordStep(2);
      setForgotPasswordMessage('OTP sent to your email');
    } catch (error) {
      setForgotPasswordMessage(error.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await authAPI.resetPassword(forgotPasswordData);
      setForgotPasswordMessage('Password reset successfully');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordStep(1);
        setForgotPasswordData({ email: '', otp: '', newPassword: '' });
        setForgotPasswordMessage('');
      }, 2000);
    } catch (error) {
      setForgotPasswordMessage(error.response?.data?.message || 'Failed to reset password');
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500">
        <div className="bg-white rounded-3xl shadow-2xl p-10 w-full max-w-md mx-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Forgot Password</h1>
            <p className="text-gray-600">Reset your account password</p>
          </div>
          
          <form className="space-y-6" onSubmit={forgotPasswordStep === 1 ? handleSendOtp : handleResetPassword}>
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
                <FloatingInput
                  type="password"
                  name="newPassword"
                  label="New Password"
                  required
                  value={forgotPasswordData.newPassword}
                  onChange={handleForgotPasswordChange}
                />
              </>
            )}
            
            {forgotPasswordMessage && (
              <div className={`text-sm p-3 rounded-xl ${forgotPasswordMessage.includes('successfully') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {forgotPasswordMessage}
              </div>
            )}
            
            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                {forgotPasswordStep === 1 ? 'Send OTP' : 'Reset Password'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordStep(1);
                  setForgotPasswordData({ email: '', otp: '', newPassword: '' });
                  setForgotPasswordMessage('');
                }}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-50 transition-all duration-200"
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
        <div className="relative z-10 p-12 flex flex-col justify-between text-white">
          <div>
            <h1 className="text-4xl font-bold mb-2">Voomet</h1>
            <p className="text-xl opacity-90">Transform your space, transform your life.</p>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h3 className="font-semibold mb-2">Secure Access</h3>
              <p className="text-sm opacity-90">
                Advanced security measures to protect your data and ensure safe access to your account.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-10">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Voomet Portal</h2>
              <p className="text-sm sm:text-base text-gray-600">Welcome to your portal,Sign in to your account</p>
            </div>

            {/* Login Form */}
            <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
              <FloatingInput
                type="email"
                name="email"
                label="Email"
                required
                value={formData.email}
                onChange={handleChange}
              />

              <FloatingInput
                type="password"
                name="password"
                label="Password"
                required
                value={formData.password}
                onChange={handleChange}
              />

              {error && (
                <div className="bg-red-50 text-red-700 p-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors duration-300"
                >
                  Forgot Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-medium hover:bg-blue-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:transform-none"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing in...
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