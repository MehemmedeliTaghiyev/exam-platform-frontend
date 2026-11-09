import { Link } from 'react-router-dom';
import { CONTACT_EMAIL, CONTACT_MAILTO } from '../../lib/contact';

export default function Footer() {
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
        </p>
      </div>
    </footer>
  );
}
