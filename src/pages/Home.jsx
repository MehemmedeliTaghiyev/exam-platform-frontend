import { useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Header from '../components/home/Header';
import Hero from '../components/home/Hero';
import RepublicBanner from '../components/home/RepublicBanner';
import CtaBand from '../components/home/CtaBand';
import Footer from '../components/home/Footer';
import '../components/home/home.css';
import { scrollToHash } from '../lib/scrollToHash';

export default function Home() {
  const { enterPractice, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const id = String(location.hash || '').replace('#', '');
    if (!id) return;
    scrollToHash(id);
  }, [location.hash, location.pathname]);

  const practiceStudent = () => {
    enterPractice('Student');
    navigate('/student');
  };

  const practiceTeacher = () => {
    enterPractice('Teacher');
    navigate('/teacher');
  };

  const practiceAdmin = () => {
    enterPractice('Admin');
    navigate('/admin');
  };

  const real = user && !user.practice;

  return (
    <div className="home-page">
      <Header overlay />
      {real ? (
        <div className="mx-auto max-w-[1120px] px-5 pt-6">
          <button
            type="button"
            className="text-sm font-semibold text-[var(--hp-accent)]"
            onClick={() => navigate(user.role === 'Admin' ? '/admin' : user.role === 'Teacher' ? '/teacher' : '/student')}
          >
            Davam et: {user.fullName || user.email}
          </button>
        </div>
      ) : null}
      <main>
        <Hero onPractice={practiceStudent} onTeacherPractice={practiceTeacher} />
        <RepublicBanner />
        <CtaBand />
      </main>
      <Footer onAdminPractice={practiceAdmin} />
    </div>
  );
}
