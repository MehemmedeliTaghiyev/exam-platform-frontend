export default function BrandLogo({ size = 34, className = '', nameClassName = '', showName = true }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      <svg
        className="hp-logo-svg shrink-0"
        viewBox="0 0 36 36"
        width={size}
        height={size}
        aria-hidden="true"
      >
        <path d="M18 3.5 32 11.5 18 19.5 4 11.5Z" fill="#f0b429" />
        <path d="M4 11.5V24.5L18 32.5V19.5Z" fill="#1f6f4a" />
        <path d="M32 11.5V24.5L18 32.5V19.5Z" fill="#3eae72" />
        <path d="M18 11.2 25.2 15.3 18 19.4 10.8 15.3Z" fill="#fff8e8" />
      </svg>
      {showName ? (
        <span className={`hp-brand-name truncate font-extrabold leading-tight ${nameClassName}`}>
          ExamPulse
        </span>
      ) : null}
    </span>
  );
}
