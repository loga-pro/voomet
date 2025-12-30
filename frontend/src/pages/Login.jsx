import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import FloatingInput from '../components/Forms/FloatingInput';

// Assets
import img1 from '../assets/img1.png';
import img2 from '../assets/img2.png';
import img3 from '../assets/img3.png';
import img4 from '../assets/img4.png';
import img5 from '../assets/img5.png';

const fallbackImages = {
  img1: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=80',
  img2: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80',
  img3: 'https://images.unsplash.com/photo-1615876234886-fd9a39f9c5a0?auto=format&fit=crop&w=1200&q=80',
  img4: 'https://images.unsplash.com/photo-1616137422495-1e9e46e2aa77?auto=format&fit=crop&w=1200&q=80',
  img5: 'https://images.unsplash.com/photo-1617806118233-18e16208a50a?auto=format&fit=crop&w=1200&q=80',
};

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: '', otp: '', newPassword: '', confirmPassword: ''
  });
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const imageSlides = [
    { src: img1, fallback: fallbackImages.img1, alt: 'Aesthetic Interior 1' },
    { src: img2, fallback: fallbackImages.img2, alt: 'Aesthetic Interior 2' },
    { src: img3, fallback: fallbackImages.img3, alt: 'Aesthetic Interior 3' },
    { src: img4, fallback: fallbackImages.img4, alt: 'Aesthetic Interior 4' },
    { src: img5, fallback: fallbackImages.img5, alt: 'Aesthetic Interior 5' },
  ];

  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % imageSlides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [imageSlides.length]);

  useEffect(() => {
    const savedEmail = sessionStorage.getItem('rememberedEmail');
    const savedRememberMe = sessionStorage.getItem('rememberMe') === 'true';
    if (savedEmail && savedRememberMe) {
      setFormData(prev => ({ ...prev, email: savedEmail }));
      setRememberMe(true);
    }
    const lockoutEndTime = sessionStorage.getItem('lockoutEndTime');
    if (lockoutEndTime) {
      const remaining = Math.max(0, Math.ceil((parseInt(lockoutEndTime) - Date.now()) / 1000));
      if (remaining > 0) {
        setIsLocked(true);
        setLockoutTimeLeft(remaining);
      }
    }
    const savedAttempts = sessionStorage.getItem('failedAttempts');
    if (savedAttempts) setFailedAttempts(parseInt(savedAttempts));
  }, []);

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
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isLocked]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  
  const handleForgotPasswordChange = (e) => {
    setForgotPasswordData({ ...forgotPasswordData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) return;
    setIsLoading(true);
    setError('');
    try {
      const response = await authAPI.login(formData);
      sessionStorage.removeItem('failedAttempts');
      sessionStorage.removeItem('lockoutEndTime');
      sessionStorage.setItem('token', response.data.token);
      sessionStorage.setItem('user', JSON.stringify(response.data.user));
      if (rememberMe) {
        sessionStorage.setItem('rememberedEmail', formData.email);
        sessionStorage.setItem('rememberMe', 'true');
      }
      navigate('/', { replace: true });
    } catch (err) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      sessionStorage.setItem('failedAttempts', newAttempts.toString());
      if (newAttempts >= 4) {
        const end = Date.now() + 30000;
        sessionStorage.setItem('lockoutEndTime', end.toString());
        setIsLocked(true);
        setError('Security Lock: Too many attempts.');
      } else {
        setError(`Access Denied. ${4 - newAttempts} attempts left.`);
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
      setIsSendingOtp(false);
    } catch (err) {
      setForgotPasswordMessage('Failed to send OTP');
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsVerifyingOtp(true);
    setTimeout(() => {
      if (forgotPasswordData.otp.length >= 4) {
        setForgotPasswordStep(3);
        setForgotPasswordMessage('');
      } else {
        setForgotPasswordMessage('Invalid Code');
      }
      setIsVerifyingOtp(false);
    }, 800);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
      setForgotPasswordMessage('Passwords do not match'); 
      return;
    }
    try {
      await authAPI.resetPassword({
        email: forgotPasswordData.email,
        otp: forgotPasswordData.otp,
        newPassword: forgotPasswordData.newPassword
      });
      setForgotPasswordMessage('Success! Password updated.');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordStep(1);
        setForgotPasswordData({ email: '', otp: '', newPassword: '', confirmPassword: '' });
      }, 2000);
    } catch (err) { 
      setForgotPasswordMessage(err.response?.data?.message || 'Reset Failed'); 
    }
  };

  // UI Components & Styles
  const glassCard = "bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)]";
  const btnAnimation = "transition-all duration-300 active:scale-95 active:shadow-[0_0_20px_rgba(37,99,235,0.6)] active:brightness-110";

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F172A] p-4 font-sans selection:bg-blue-500/30">
        <div className={`${glassCard} rounded-[2rem] p-8 w-full max-w-md`}>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white tracking-tight uppercase">Password Reset</h1>
            <p className="text-slate-400 text-sm mt-2 font-light">Secure ID Verification</p>
          </div>
          
          <form className="space-y-6" onSubmit={forgotPasswordStep === 1 ? handleSendOtp : forgotPasswordStep === 2 ? handleVerifyOtp : handleResetPassword}>
             {forgotPasswordStep === 1 && <FloatingInput type="email" name="email" label="Email Address" required value={forgotPasswordData.email} onChange={handleForgotPasswordChange} />}
             {forgotPasswordStep === 2 && <FloatingInput type="text" name="otp" label="Verification Code" required value={forgotPasswordData.otp} onChange={handleForgotPasswordChange} />}
             {forgotPasswordStep === 3 && (
               <>
                <FloatingInput type="password" name="newPassword" label="New Password" required value={forgotPasswordData.newPassword} onChange={handleForgotPasswordChange} />
                <FloatingInput type="password" name="confirmPassword" label="Confirm New Password" required value={forgotPasswordData.confirmPassword} onChange={handleForgotPasswordChange} />
               </>
             )}

             {forgotPasswordMessage && (
               <div className={`text-xs p-3 rounded-xl border animate-pulse ${forgotPasswordMessage.includes('Success') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                 {forgotPasswordMessage}
               </div>
             )}

             <div className="flex gap-4">
                <button type="submit" disabled={isSendingOtp || isVerifyingOtp} className={`flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest ${btnAnimation} disabled:opacity-50`}>
                    {forgotPasswordStep === 1 ? (isSendingOtp ? 'Sending...' : 'Send OTP') : 
                     forgotPasswordStep === 2 ? (isVerifyingOtp ? 'Verifying...' : 'Verify OTP') : 
                     'Reset'}
                </button>
                <button type="button" onClick={() => { setShowForgotPassword(false); setForgotPasswordStep(1); }} className={`flex-1 border border-white/20 text-white py-3 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-white/5 ${btnAnimation}`}>Cancel</button>
             </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0F172A] text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden">
      
      {/* Left Section: Immersive Design Showroom */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden">
        {imageSlides.map((slide, index) => (
          <div key={index} className={`absolute inset-0 transition-all duration-[2s] ease-in-out transform ${index === currentImageIndex ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}>
            <img 
                src={slide.src || slide.fallback} 
                alt={slide.alt} 
                className="w-full h-full object-cover grayscale-[10%] brightness-[0.6]"
                onError={(e) => { e.target.src = slide.fallback; }}
            />
            {/* Dark gradient overlay matching dashboard theme */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#0F172A] via-transparent to-transparent opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F172A] via-transparent to-transparent opacity-40" />
          </div>
        ))}
        
        <div className="absolute bottom-16 left-16 z-20 max-w-lg">
          <div className="flex items-center space-x-3 mb-4">
            <span className="h-[2px] w-12 bg-blue-500" />
            <span className="text-[10px] uppercase tracking-[0.3em] text-blue-400 font-black">Voomet Design Systems</span>
          </div>
          <h2 className="text-6xl font-black text-white mb-6 leading-[1.1] tracking-tighter">FUTURE <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-400">INTERIORS.</span></h2>
          <div className="flex gap-3">
            {imageSlides.map((_, i) => (
              <div key={i} className={`h-[2px] transition-all duration-700 ${i === currentImageIndex ? 'w-12 bg-blue-500' : 'w-4 bg-white/10'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Right Section: Glass Login Interface */}
      <div className="w-full lg:w-2/5 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Futuristic background light leaks */}
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/3 left-1/4 w-[300px] h-[300px] bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />

        <div className={`${glassCard} w-full max-w-md rounded-[2.5rem] p-8 lg:p-14 z-10 relative overflow-hidden`}>
          {/* Subtle line decoration */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
          
          <div className="mb-12 text-left">
            <h1 className="text-4xl font-black text-white tracking-tighter mb-2 italic">VOOMET<span className="text-blue-500">.</span></h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Interior Design</p>
          </div>

          <form className="space-y-7" onSubmit={handleSubmit}>
            <FloatingInput type="email" name="email" label="Email ID" required value={formData.email} onChange={handleChange} disabled={isLocked} />
            <FloatingInput type="password" name="password" label="Password" required value={formData.password} onChange={handleChange} disabled={isLocked} />

            {error && (
              <div className={`p-4 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-3 border ${isLocked ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                {error} {isLocked && `[${lockoutTimeLeft}S]`}
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-widest">
              <label className="flex items-center group cursor-pointer text-slate-500 hover:text-blue-400 transition-colors">
                <div className="relative">
                    <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="sr-only" />
                    <div className={`w-3.5 h-3.5 border transition-all ${rememberMe ? 'bg-blue-600 border-blue-600' : 'border-slate-700'}`} />
                </div>
                <span className="ml-2">Keep Active</span>
              </label>
              <button type="button" onClick={() => setShowForgotPassword(true)} className="text-blue-500 hover:text-blue-300 transition-colors">Recovery</button>
            </div>

            <button type="submit" disabled={isLoading || isLocked} className={`w-full bg-blue-600 text-white py-4 rounded-2xl font-black tracking-[0.2em] text-xs uppercase shadow-xl shadow-blue-900/30 ${btnAnimation} disabled:opacity-50 disabled:scale-100`}>
              {isLoading ? 'Decrypting...' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;