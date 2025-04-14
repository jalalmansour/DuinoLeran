import React from 'react';
import Image from 'next/image';

const LoadingPage: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 text-white">
      <div className="relative w-64 h-64">
        <Image
          src="/duino.png" // Path to your resized logo
          alt="Wowduino Logo"
          layout="fill"
          objectFit="contain"
          className="animate-float" // Apply a custom animation
        />
        {/* Add subtle, futuristic elements around the logo */}
        <div className="absolute inset-0 rounded-full border-2 border-purple-500 opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-purple-500 rounded-full animate-ping"></div>
      </div>
      {/* Optional loading text */}
      {/* <p className="mt-4 text-lg font-semibold">Loading Wowduino...</p> */}
    </div>
  );
};

export default LoadingPage;