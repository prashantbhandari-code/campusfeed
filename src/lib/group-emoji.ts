// Department → avatar emoji, shared by every surface that renders a group
// (group discovery, group detail, the Messages > Groups tab). Falls back to 👥.
export const GROUP_EMOJIS: Record<string, string> = {
  CSE: "💻",
  IT: "🌐",
  ECE: "⚡",
  EEE: "🔌",
  Mechanical: "⚙️",
  Civil: "🏗️",
  "CSE (Data Science)": "📊",
  "CSE (AI & ML)": "🤖",
  "CSE (Cyber Security)": "🔐",
  "CSE (IoT)": "📡",
  Biotechnology: "🧬",
  Chemical: "🧪",
  Aerospace: "✈️",
  Automobile: "🚗",
  Mechatronics: "🔧",
  Architecture: "🏛️",
  Law: "⚖️",
  Management: "📈",
  "Media & Communication": "📺",
  Design: "🎨",
  Electrical: "⚡",
};

export function groupEmoji(department?: string | null): string {
  return (department && GROUP_EMOJIS[department]) || "👥";
}
