'use client';

import React from 'react';
import { ICONS } from '../../constants';

export interface CourseInfo {
  title: string;
  url: string;
  platform?: string;
  description?: string;
  rating?: string;
  price?: string;
}

interface CourseCardProps {
  course: CourseInfo;
}

const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
  const handleClick = () => {
    window.open(course.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      onClick={handleClick}
      className="group cursor-pointer bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 rounded-2xl p-5 hover:shadow-xl hover:border-indigo-400 hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 hover:-translate-y-1 flex-shrink-0 w-80 h-64 flex flex-col"
    >
      {/* Header with Icon and Platform */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all shadow-lg">
          <ICONS.book className="w-6 h-6 text-white" />
        </div>
        
        {course.platform && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/80 backdrop-blur-sm rounded-full border border-slate-200 shadow-sm">
            <ICONS.globe className="w-3 h-3 text-indigo-600" />
            <span className="text-xs font-bold text-slate-700">{course.platform}</span>
          </div>
        )}
      </div>

      {/* Title */}
      <h4 className="font-black text-slate-900 text-base mb-2 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-tight">
        {course.title}
      </h4>

      {/* Description */}
      <p className="text-sm text-slate-600 line-clamp-3 mb-auto leading-relaxed">
        {course.description || 'Click to learn more about this course'}
      </p>

      {/* Footer with Rating and Price */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-3">
        <div className="flex items-center gap-2">
          {course.rating && (
            <div className="flex items-center gap-1 px-2 py-1 bg-amber-50 rounded-lg">
              <ICONS.star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-amber-700">{course.rating}</span>
            </div>
          )}
          {course.price && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-lg">
              <span className="text-xs font-bold text-green-700">{course.price}</span>
            </div>
          )}
        </div>

        {/* External Link Icon */}
        <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition-colors">
          <ICONS.externalLink className="w-3.5 h-3.5 text-indigo-600 group-hover:text-white transition-colors" />
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
