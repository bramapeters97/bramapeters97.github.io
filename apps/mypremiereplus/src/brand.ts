import { fontFamily, splashBackground } from "./appearance";
import { artworkUrl } from "./artwork";
export interface Brand {
  id: string;
  name: string;
  slogan: string;
  accent: string;
  theme: string;
  icon: string;
  background: string;
  intro: boolean;
  homepage?: string[];
  [key: string]: any;
}
export let brand: Brand = {
  id: "",
  name: "Your family cinema",
  slogan: "Our stories. Our cinema.",
  accent: "#e9c778",
  theme: "classic",
  icon: "clapperboard",
  background: artworkUrl("/artwork/lake.svg"),
  intro: true,
};
export function setBrand(next: Brand) {
  brand = { ...next, background: artworkUrl(next.background) };
  document.title = `${next.name} · MyPremierePlus`;
  document.documentElement.style.setProperty("--gold", next.accent);
  document.documentElement.style.setProperty(
    "--archive-font",
    fontFamily(next.font),
  );
  document.documentElement.style.setProperty(
    "--splash-background",
    splashBackground(next.palette),
  );
  document.documentElement.dataset.archiveTheme = next.theme;
}
