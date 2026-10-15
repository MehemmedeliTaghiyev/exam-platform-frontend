import { CONTACT_EMAIL, CONTACT_MAILTO } from '../../lib/contact';

export default function Footer() {
  return (
    <footer className="border-t border-[var(--hp-line)]">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-[var(--hp-muted)]">
        <p>© 2026 ExamPulse · İmtahan platforması</p>
        <a href={CONTACT_MAILTO} className="font-semibold text-[var(--hp-text)]">{CONTACT_EMAIL}</a>
      </div>
    </footer>
  );
}
