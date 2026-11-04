import AccessUsersPanel from '../components/AccessUsersPanel';

export default function AdminUsers() {
  return (
    <AccessUsersPanel
      title="Hesablar"
      toggleAccessRoles={['Teacher']}
      descriptions={{
        Teacher: 'Qeydiyyat avtomatik açılır. İstəmədiyiniz müəllimi kənarlaşdıra və ya hesabı silə bilərsiniz.',
        Student: 'Qeydiyyat avtomatik açılır. Tələbəyə admin icazəsi yoxdur.',
      }}
      roles={[
        { id: 'Teacher', label: 'Müəllimlər' },
        { id: 'Student', label: 'Tələbələr' },
      ]}
    />
  );
}
