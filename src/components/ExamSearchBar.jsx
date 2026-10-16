import { Input } from './ui';

export default function ExamSearchBar({ name, date, onName, onDate }) {
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2">
      <Input
        label="Ad"
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="İmtahanın adı"
      />
      <Input
        label="Tarix"
        type="date"
        value={date}
        onChange={(e) => onDate(e.target.value)}
      />
    </div>
  );
}
