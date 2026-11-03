import AccessUsersPanel from '../components/AccessUsersPanel';

export default function AdminUsers() {
  return (
    <AccessUsersPanel
      title="Hesablar"
      description="Qeydiyyat avtomatik açılır. İstəmədiyiniz müəllimi kənarlaşdıra və ya hesabı silə bilərsiniz. Tələbəyə admin icazəsi yoxdur."
      toggleAccessRoles={['Teacher']}
      roles={[
        { id: 'Teacher', label: 'Müəllimlər' },
        { id: 'Student', label: 'Tələbələr' },
      ]}
    />
  );
}
