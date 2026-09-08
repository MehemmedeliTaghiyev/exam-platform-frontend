import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function StudentDashboard() {
  const { user, logout } = useContext(AuthContext);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Tələbə Paneli - Xoş gəldiniz, {user?.fullName || user?.email}</h2>
        <button onClick={logout} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Çıxış Et
        </button>
      </div>
      <p style={{ marginTop: '20px' }}>Yaxında burada daxil ola biləcəyiniz imtahanlar görünəcək.</p>
    </div>
  );
}