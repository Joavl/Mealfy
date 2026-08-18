import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info } from 'lucide-react';
import './Toast.css';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    // Local cleanup just in case, but Context handles the timeout usually
  }, []);

  const Icon = type === 'success' ? CheckCircle : type === 'error' ? XCircle : Info;

  return (
    <div className={`toast-item toast-${type}`} onClick={onClose}>
      <Icon size={18} className="toast-icon" />
      <span className="toast-message">{message}</span>
    </div>
  );
};

export default Toast;
