import { Link } from 'react-router-dom';
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../../lib/contact';

export default function Footer({ onAdminPractice }) {
  return (
    <footer className="hp-footer">
      <div className="hp-footer-inner">
        <div>
          <p>© 2026 ExamPulse · İmtahan platforması</p>
          <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a>
        </div>
        <p className="hp-footer-links">
          <Link to="/privacy">Məxfilik</Link>
          <Link to="/terms">Şərtlər</Link>
          <Link to="/support">Dəstək</Link>
          <Link to="/delete-account">Hesabı sil</Link>
          {onAdminPractice ? (
            <button type="button" onClick={onAdminPractice}>Admin paneli</button>
          ) : (
            <Link to="/admin">Admin paneli</Link>
          )}
        </p>
      </div>
    </footer>
  );
}
