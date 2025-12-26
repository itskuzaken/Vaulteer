/* eslint-disable @next/next/no-img-element */
"use client";

import React from 'react';

export default function AchievementDetailModal({ achievement, onClose }) {
  if (!achievement) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={() => onClose && onClose()} />
      <div className="bg-white dark:bg-gray-800 rounded-md p-6 z-10 w-11/12 max-w-2xl">
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-semibold">{achievement.achievement_name}</h3>
          <button onClick={() => onClose && onClose()} className="text-gray-500">Close</button>
        </div>
        <div className="mt-4 flex gap-4">
          <div className="w-32 h-32 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center">
            {achievement.badge_s3_url_map?.single ? (
              <img src={achievement.badge_s3_url_map.single} alt={`${achievement.achievement_name} badge`} className="w-full h-full object-contain" />
            ) : (
              <div className="text-gray-500">No image</div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm text-gray-700 dark:text-gray-300">{achievement.achievement_description}</p>
            <div className="mt-4">
              <strong>Progress:</strong> {achievement.progressPercent}%
            </div>
            <div className="mt-4">
              <button className="btn btn-primary">How to earn</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
