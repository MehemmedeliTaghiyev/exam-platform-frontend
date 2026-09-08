import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function TeacherDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [subjectId, setSubjectId] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTeacherExams();
  }, []);

  const fetchTeacherExams = async () => {
    try {
      const response = await API.get('/Exams');
      const examData = response.data?.items || (Array.isArray(response.data) ? response.data : []);
      setExams(examData);
    } catch (err) {
      console.error('İmtahanlar yüklənərkən xəta:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExam = async (examId) => {
  if (!window.confirm('Bu imtahanı silməyə əminsiniz?')) return;

  try {
    await API.delete(`/Exams/${examId}`);
    fetchTeacherExams(); // Refresh list
  } catch (err) {
    console.error('İmtahan silinərkən xəta:', err);
    alert('İmtahanı silmək mümkün olmadı.');
  }
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await API.post('/Exams', {
        title,
        durationMinutes: Number(durationMinutes),
        totalQuestions: Number(totalQuestions),
        subjectId: Number(subjectId)
      });

      // Reset form and close modal
      setTitle('');
      setDurationMinutes(30);
      setTotalQuestions(10);
      setSubjectId(1);
      setIsModalOpen(false);

      // Refresh list
      fetchTeacherExams();
    } catch (err) {
      console.error('İmtahan yaradılanda xəta:', err);
      const serverMessage = err.response?.data?.errors?.TotalQuestions?.[0] 
        || err.response?.data?.title 
        || 'İmtahan yaradılarkən xəta baş verdi.';
      alert(serverMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h2>Müəllim Paneli - Xoş gəldiniz, {user?.fullName || user?.email}</h2>
        <button onClick={logout} style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#ff4d4d', color: '#fff', border: 'none', borderRadius: '4px' }}>
          Çıxış Et
        </button>
      </div>

      {/* Action Button */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{ padding: '10px 20px', cursor: 'pointer', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px' }}
        >
          + Yeni İmtahan Yarat
        </button>
      </div>

      {/* Exam List */}
      <h3>Mövcud İmtahanlar</h3>
      {loading ? (
        <p>Yüklənir...</p>
      ) : exams.length === 0 ? (
        <p>Hələ heç bir imtahan yaradılmayıb.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2', textAlign: 'left' }}>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>İmtahan Adı</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Müddət (dəq)</th>
              <th style={{ padding: '10px', border: '1px solid #ddd' }}>Əməliyyatlar</th>
            </tr>
          </thead>
          <tbody>
            {exams.map((exam) => (
              <tr key={exam.id}>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{exam.title}</td>
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>{exam.durationMinutes}</td>

                {/* UPDATED ACTION BUTTONS */}
                <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                  <button 
                    onClick={() => navigate(`/teacher/exams/${exam.id}`)} 
                    style={{ marginRight: '10px', cursor: 'pointer' }}
                  >
                    Bax / Suallar
                  </button>
                  <button 
                    onClick={() => handleDeleteExam(exam.id)} 
                    style={{ color: 'red', cursor: 'pointer' }}
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal Overlay */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '400px' }}>
            <h3>Yeni İmtahan Yarat</h3>
            <form onSubmit={handleCreateExam}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>İmtahan Adı:</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                  placeholder="Məs: C# / .NET Midterm"
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Sual Sayı (1 - 200):</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="200"
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(e.target.value)}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>Müddət (Dəqiqə):</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#ccc', border: 'none', borderRadius: '4px' }}
                >
                  Ləğv Et
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '8px 16px', cursor: 'pointer', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px' }}
                >
                  {submitting ? 'Yaradılır...' : 'Yarat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}