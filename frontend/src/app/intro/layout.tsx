// Intro page gets its own layout — no sidebar, full-screen dark canvas
export default function IntroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-[#030712] overflow-hidden">
      {children}
    </div>
  );
}
