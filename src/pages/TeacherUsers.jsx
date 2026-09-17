import AccessUsersPanel from '../components/AccessUsersPanel';

export default function TeacherUsers() {
  return (
    <AccessUsersPanel
      title="Giriş hüquqları"
      description="Tələbənin girişini bağlaya və ya aça bilərsiniz. Silmə yumşaqdır, sonra bərpa etmək olar."
      roles={[{ id: 'Student', label: 'Tələbələr' }]}
    />
  );
}
