import React from 'react';

const Skeleton = ({ className = '' }) => {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
  );
};

export const SkeletonText = ({ lines = 3, className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {[...Array(lines)].map((_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
};

export const SkeletonCard = ({ className = '' }) => {
  return (
    <div className={`border border-gray-200 p-4 rounded-xl shadow-sm ${className}`}>
      <Skeleton className="h-40 w-full mb-4" />
      <SkeletonText lines={2} />
    </div>
  );
};

export const SkeletonRow = ({ columns = 4, className = '' }) => {
  return (
    <div className={`flex space-x-4 items-center p-4 border-b border-gray-100 ${className}`}>
      {[...Array(columns)].map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
};

export default Skeleton;
