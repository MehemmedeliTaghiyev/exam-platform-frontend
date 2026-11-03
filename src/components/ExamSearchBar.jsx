import { Input } from './ui';

export default function ExamSearchBar({ name, date, onName, onDate }) {
  return (
    <div className="exam-search-bar mb-4 grid grid-cols-2 gap-2 min-[640px]:gap-3">
      <Input
        label="Ad"
        value={name}
        onChange={(e) => onName(e.target.value)}
        placeholder="İmtahanın adı"
        className="h-11 min-[640px]:h-[52px]"
      />
      <Input
        label="Tarix"
        type="date"
        value={date}
        onChange={(e) => onDate(e.target.value)}
        className="h-11 min-[640px]:h-[52px]"
      />
    </div>
  );
}
