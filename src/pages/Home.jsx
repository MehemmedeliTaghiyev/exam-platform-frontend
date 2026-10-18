import { useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Header from '../components/home/Header';
import Hero from '../components/home/Hero';
import RoleCards from '../components/home/RoleCards';
import Features from '../components/home/Features';
import Steps from '../components/home/Steps';
import CtaBand from '../components/home/CtaBand';
import Footer from '../components/home/Footer';
import '../components/home/home.css';

export default function Home() {
  const { enterPractice, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const id = String(location.hash || '').replace('#', '');
    if (!id) return;
    const node = document.getElementById(id);
    if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  const practice = (role) => {
    enterPractice(role);
    navigate(role === 'Teacher' ? '/teacher' : '/student');
  };

  const real = user && !user.practice;

  return (
    <div className="home-page">
      <Header />
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
        <Hero onPractice={() => practice('Student')} />
        <Features onPractice={() => practice('Student')} />
        <RoleCards onTeacher={() => practice('Teacher')} onStudent={() => practice('Student')} />
        <Steps />
        <CtaBand />
      </main>
      <Footer />
    </div>
  );
}
