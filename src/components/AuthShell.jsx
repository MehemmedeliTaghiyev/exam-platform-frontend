import PublicNav from './PublicNav';

export default function AuthShell({ children, wide = false }) {
  return (
    <div className="min-h-screen bg-[#161616] text-[#d4d4d4]">
      <PublicNav darkOnNavy />
      <div className={`mx-auto px-5 py-12 ${wide ? 'max-w-lg' : 'max-w-md'}`}>
        <div className="[&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-[#f2f2f2] [&_input]:border-[#333] [&_input]:bg-[#1f1f1f] [&_input]:text-[#f3f3f3] [&_label>span]:text-[#c8c8c8] [&_p]:text-[#bdbdbd]">
          {children}
        </div>
      </div>
    </div>
  );
}
