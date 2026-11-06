import { resolveUniversity } from '../lib/azerbaijanUniversities';

function GenericCampus({ title }) {
  return (
    <div className="relative h-44 w-full overflow-hidden bg-[linear-gradient(180deg,#4eb3e8_0%,#7ec8f0_42%,#b7e3a8_78%,#8fbf6a_100%)]">
      <div className="absolute left-6 top-6 h-10 w-10 rounded-full bg-[#f6d36b]" />
      <div className="absolute right-8 top-8 h-16 w-10 rounded-sm bg-white shadow-sm">
        <div className="h-1/2 bg-[#00af66]" />
        <div className="h-1/2 bg-[#e4002b]" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-[var(--accent)]/25" />
      <div className="absolute bottom-10 left-[8%] h-24 w-28 rounded-t-lg bg-[#d9c4a0]" />
      <div className="absolute bottom-10 right-[10%] h-28 w-20 rounded-t-md bg-[#cbb89a]" />
      <p className="sr-only">{title}</p>
    </div>
  );
}

export default function UniversityBanner({ dream, university, className = '' }) {
  const uni = resolveUniversity(dream) || resolveUniversity({ university });
  const full = uni?.name || String(university || dream?.university || '').trim();

  return (
    <div className={`overflow-hidden ${className}`}>
      {uni?.image ? (
        <img src={uni.image} alt={full} className="h-52 w-full object-cover object-[center_35%] sm:h-56" />
      ) : (
        <GenericCampus title={full || 'Universitet'} />
      )}
    </div>
  );
}
