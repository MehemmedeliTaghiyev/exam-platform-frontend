import Header from './home/Header';
import './home/home.css';

export default function AuthShell({ children, wide = false }) {
  return (
    <div className="home-page min-h-screen">
      <Header />
      <div className={`mx-auto px-5 py-12 ${wide ? 'max-w-lg' : 'max-w-md'}`}>
        <div className="hp-card p-6 sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
