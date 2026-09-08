import React, { useEffect, useState } from 'react';

export const ExamCard = ({ examId = 3 }) => {
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`https://localhost:7216/api/exams/${examId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP xətası: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setExam(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [examId]);

  if (loading) {
    return (
      <div className="w-80 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-80 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-600">
        <p className="font-semibold text-sm">Məlumat almaq mümkün olmadı</p>
        <p className="text-xs mt-1 text-red-500">{error}</p>
      </div>
    );
  }

  if (!exam) return null;

  return (
    <div className="w-80 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header Badge */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          {exam.status === "Live" ? "CANLI" : exam.status}
        </span>
        <span className="text-xs text-gray-400 font-mono">#{exam.id}</span>
      </div>

      {/* Body */}
      <div className="mt-4">
        <h3 className="text-lg font-bold text-gray-900">{exam.title}</h3>
        <p className="text-xs font-medium text-emerald-600 mt-0.5">{exam.subjectName}</p>
      </div>

      {/* Stats Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-500">
        <div>
          <span className="font-semibold text-gray-700">{exam.totalQuestions}</span> sual
        </div>
        <div>
          <span className="font-semibold text-gray-700">{exam.durationMinutes}</span> dəqiqə
        </div>
        <div>
          <span className="font-semibold text-gray-700">{exam.submissionsCount}</span> iştirakçı
        </div>
      </div>

      {/* Action Button */}
      <button 
        onClick={() => alert(`İmtahan #${exam.id} başlayır...`)}
        className="mt-5 w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 cursor-pointer"
      >
        İmtahana başla
      </button>
    </div>
  );
};