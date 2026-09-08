import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function QuestionBuilder() {
  const { id } = useParams(); // Exam ID from URL
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Question Form State
  const [text, setText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('A');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [id]);

  const fetchQuestions = async () => {
    try {
      // Endpoint to fetch questions for this specific exam
      const response = await API.get(`/Questions/exam/${id}`);
      setQuestions(response.data || []);
    } catch (err) {
      console.error('Suallar yüklənərkən xəta:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async (e) => {
  e.preventDefault();
  setSubmitting(true);

  try {
    const payload = {
      text,
      points: 1,
      type: 0, // QuestionType.SingleChoice
      options: [
        { optionText: optionA, isCorrect: correctAnswer === 'A' },
        { optionText: optionB, isCorrect: correctAnswer === 'B' },
        { optionText: optionC, isCorrect: correctAnswer === 'C' },
        { optionText: optionD, isCorrect: correctAnswer === 'D' }
      ]
    };

    // Include /exam/${id} in the POST URL
    await API.post(`/Questions/exam/${id}`, payload);

    // Reset Form
    setText('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setCorrectAnswer('A');

    fetchQuestions();
  } catch (err) {
    console.error('Sual əlavə edilərkən xəta:', err);
    alert('Sual əlavə edərkən xəta baş verdi.');
  } finally {
    setSubmitting(false);
  }
};

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate('/teacher')} 
        style={{ marginBottom: '20px', padding: '8px 16px', cursor: 'pointer' }}
      >
        ← Geriyə (Müəllim Paneli)
      </button>

      <h2>Sual Qurucusu (İmtahan ID: {id})</h2>

      {/* Add Question Form */}
      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3>Yeni Sual Əlavə Et</h3>
        <form onSubmit={handleAddQuestion}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Sualın mətni:</label>
            <textarea
              required
              rows="3"
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              placeholder="Sualı buraya yazın..."
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
            <div>
              <label>A Varianti:</label>
              <input
                type="text"
                required
                value={optionA}
                onChange={(e) => setOptionA(e.target.value)}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label>B Varianti:</label>
              <input
                type="text"
                required
                value={optionB}
                onChange={(e) => setOptionB(e.target.value)}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label>C Varianti:</label>
              <input
                type="text"
                required
                value={optionC}
                onChange={(e) => setOptionC(e.target.value)}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label>D Varianti:</label>
              <input
                type="text"
                required
                value={optionD}
                onChange={(e) => setOptionD(e.target.value)}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Düzgün Cavab:</label>
            <select
              value={correctAnswer}
              onChange={(e) => setCorrectAnswer(e.target.value)}
              style={{ padding: '8px', width: '100px' }}
            >
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ padding: '10px 20px', backgroundColor: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {submitting ? 'Əlavə edilir...' : 'Sualı Əlavə Et'}
          </button>
        </form>
      </div>

      {/* Existing Questions List */}
      <h3>Mövcud Suallar ({questions.length})</h3>
      {loading ? (
        <p>Yüklənir...</p>
      ) : questions.length === 0 ? (
        <p>Hələ heç bir sual əlavə edilməyib.</p>
      ) : (
        <ol style={{ paddingLeft: '20px' }}>
          {questions.map((q, idx) => (
            <li key={q.id || idx} style={{ marginBottom: '15px', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
              <strong>{q.text}</strong> ({q.points} ball)
              <ul style={{ listStyleType: 'none', paddingLeft: '10px', marginTop: '5px' }}>
                {q.options?.map((opt, optIdx) => (
                  <li 
                    key={opt.id || optIdx} 
                    style={{ color: opt.isCorrect ? 'green' : 'inherit', fontWeight: opt.isCorrect ? 'bold' : 'normal' }}
                  >
                    {String.fromCharCode(65 + optIdx)}) {opt.text} {opt.isCorrect && '✓'}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}