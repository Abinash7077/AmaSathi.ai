import Link from "next/link";

const features = [
  { href: "/translate", title: "Translate to Odia", emoji: "🌐", desc: "Upload a topic, get a line-by-line Odia translation." },
  { href: "/questions", title: "Generate Questions", emoji: "📝", desc: "Turn any topic image/PDF into practice questions." },
  { href: "/video", title: "Video Summary", emoji: "🎬", desc: "Upload a lecture video, get a timestamped summary." },
  { href: "/chat", title: "Ask Sahayak", emoji: "💬", desc: "General doubt-solving assistant, text or file based." },
];

export default function HomePage() {
  return (
    <main>
      <header className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-brand-700">🩺 Sahayak</h1>
        <p className="text-slate-600 mt-1">
          AI study assistant for GNM Nursing & Intermediate Physics students
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {features.map((f) => (
          <Link
            key={f.href}
            href={f.href}
            className="block bg-white border rounded-xl p-5 hover:shadow-md hover:border-brand-500 transition"
          >
            <div className="text-2xl mb-2">{f.emoji}</div>
            <h3 className="font-semibold">{f.title}</h3>
            <p className="text-sm text-slate-600 mt-1">{f.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
