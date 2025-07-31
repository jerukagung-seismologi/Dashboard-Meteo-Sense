import React from 'react';

const LoadingSpinner = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
    <div className="w-12 h-12 border-8 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
    <p className="ml-4 text-gray-700 text-2xl">Memuat Halaman...</p>
  </div>
);

export default LoadingSpinner;