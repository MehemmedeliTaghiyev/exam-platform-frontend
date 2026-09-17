import AccessUsersPanel from '../components/AccessUsersPanel';

export default function AdminUsers() {
  return (
    <AccessUsersPanel
      title="Giriş hüquqları"
      description="Müəllim ödəniş etməyəndə pəncərəni bağlayın — hesab daxil ola bilməz. Silmə yumşaqdır, sonra bərpa etmək olar."
      roles={[
        { id: 'Teacher', label: 'Müəllimlər' },
        { id: 'Student', label: 'Tələbələr' },
      ]}
    />
  );
}
