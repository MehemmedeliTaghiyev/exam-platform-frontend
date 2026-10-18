import Header from './home/Header';
import './home/home.css';

export default function AuthShell({ children, wide = false }) {
  return (
    <div className="home-page reg-page flex min-h-screen flex-col">
      <Header hideAuth />
      <div className="reg-stage">
        <div className={`hp-card w-full p-8 sm:p-12 ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
