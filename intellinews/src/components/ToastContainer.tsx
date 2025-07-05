import React from 'react';

interface ToastContainerProps {
  toasts: { id: string; message: string }[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 flex flex-col space-y-2 z-50">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-gray-800 text-white px-4 py-2 rounded shadow-lg animate-slide-in"
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

// Tailwind animation (optional): add this to global CSS if not already defined
// @keyframes slide-in {
//   from { opacity: 0; transform: translateY(20px); }
//   to { opacity: 1; transform: translateY(0); }
// }
// .animate-slide-in { animation: slide-in 0.3s ease-out; }