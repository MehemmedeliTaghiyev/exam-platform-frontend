import PublicNav from './PublicNav';

export default function AuthShell({ children, wide = false }) {
  return (
    <div className="min-h-screen bg-[#eef2ff] text-slate-900">
      <PublicNav appearance="light" />
      <div className={`mx-auto px-4 py-10 ${wide ? 'max-w-lg' : 'max-w-md'}`}>
        <div className="rounded-3xl bg-white p-8 text-slate-900 shadow-[0_24px_60px_rgba(15,23,42,0.08)] ring-1 ring-indigo-100 [&_h1]:text-slate-900 [&_input]:border-indigo-100 [&_input]:bg-white [&_input]:text-slate-900 [&_label>span]:text-slate-600">
          {children}
        </div>
      </div>
    </div>
  );
}
