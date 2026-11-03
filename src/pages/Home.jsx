import { useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Header from '../components/home/Header';
import Hero from '../components/home/Hero';
import RoleCards from '../components/home/RoleCards';
import CtaBand from '../components/home/CtaBand';
import Footer from '../components/home/Footer';
import MonthlyExamAd from '../components/MonthlyExamAd';
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
        <div className="mx-auto max-w-[1120px] px-5">
          <MonthlyExamAd />
        </div>
        <RoleCards />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}
