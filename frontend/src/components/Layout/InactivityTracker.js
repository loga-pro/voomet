import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const INACTIVITY_TIMEOUT = 10 * 60 * 1000;

const InactivityTracker = () => {
  const navigate = useNavigate();
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef(null);

  const resetActivity = () => {
    lastActivityRef.current = Date.now();
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, resetActivity, true);
    });
    window.addEventListener('scroll', resetActivity, true);

    intervalRef.current = setInterval(() => {
      if (Date.now() - lastActivityRef.current >= INACTIVITY_TIMEOUT) {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('rememberedEmail');
        sessionStorage.removeItem('rememberMe');
        navigate('/login', { replace: true });
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      events.forEach(event => {
        window.removeEventListener(event, resetActivity, true);
      });
      window.removeEventListener('scroll', resetActivity, true);
    };
  }, [navigate]);

  return null;
};

export default InactivityTracker;

