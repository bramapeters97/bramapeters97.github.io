export const palettes = [
  { id: "midnight", name: "Midnight Cinema", base: "#020711", glow: "#193964" },
  { id: "ocean", name: "Deep Ocean", base: "#020a13", glow: "#145674" },
  { id: "aurora", name: "Northern Lights", base: "#070917", glow: "#434a87" },
  { id: "plum", name: "Velvet Plum", base: "#0b0612", glow: "#583a70" },
  { id: "forest", name: "Forest Night", base: "#030b0b", glow: "#28584c" },
  { id: "slate", name: "Silver Screen", base: "#070a0e", glow: "#3f5265" },
  {
    id: "burgundy",
    name: "Burgundy Theatre",
    base: "#10060b",
    glow: "#663246",
  },
  { id: "amber", name: "Golden Hour", base: "#0c0906", glow: "#67502d" },
  { id: "teal", name: "After Hours", base: "#020b10", glow: "#235b63" },
  { id: "starlight", name: "Starlight", base: "#060713", glow: "#393e78" },
] as const;
export const fonts = [
  { id: "inter", name: "Inter", family: '"Inter", system-ui, sans-serif' },
  {
    id: "manrope",
    name: "Manrope",
    family: '"Manrope", system-ui, sans-serif',
  },
  {
    id: "dm-sans",
    name: "DM Sans",
    family: '"DM Sans", system-ui, sans-serif',
  },
  {
    id: "jakarta",
    name: "Plus Jakarta Sans",
    family: '"Plus Jakarta Sans", system-ui, sans-serif',
  },
  { id: "outfit", name: "Outfit", family: '"Outfit", system-ui, sans-serif' },
  { id: "sora", name: "Sora", family: '"Sora", system-ui, sans-serif' },
  { id: "lora", name: "Lora", family: '"Lora", Georgia, serif' },
  {
    id: "playfair",
    name: "Playfair Display",
    family: '"Playfair Display", Georgia, serif',
  },
  {
    id: "cormorant",
    name: "Cormorant Garamond",
    family: '"Cormorant Garamond", Georgia, serif',
  },
  {
    id: "baskerville",
    name: "Libre Baskerville",
    family: '"Libre Baskerville", Georgia, serif',
  },
] as const;
export function splashBackground(id = "midnight"): string {
  const p = palettes.find((p) => p.id === id) ?? palettes[0];
  return `radial-gradient(ellipse at 50% 48%, ${p.glow}b3 0%, ${p.glow}55 24%, transparent 60%), linear-gradient(135deg, ${p.base}, #020409 85%)`;
}
export const fontFamily = (id = "inter"): string =>
  (fonts.find((f) => f.id === id) ?? fonts[0]).family;
