import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const AzureCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const userParam = params.get('user');

    if (userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('fyp_current_user', JSON.stringify(user));
        
        // Route to the proper dashboard
        const role = user.role.toLowerCase();
        switch (role) {
          case 'student':
            navigate('/student/dashboard');
            break;
          case 'supervisor':
          case 'external_supervisor':
            navigate('/supervisor/dashboard');
            break;
          case 'pm':
            navigate('/pm/dashboard');
            break;
          case 'admin':
            navigate('/admin/dashboard');
            break;
          default:
            navigate('/');
        }
      } catch (e) {
        console.error("Error parsing user data:", e);
        navigate('/?error=Failed to parse user data');
      }
    } else {
      navigate('/?error=No user data received');
    }
  }, [location, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center">
        <div className="h-8 w-8 border-4 border-navy-200 border-t-navy-900 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-600 font-medium">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AzureCallback;
