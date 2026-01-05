import { Metadata } from "next";
import { PS2EmulatorPage } from "./PS2EmulatorPage";

export const metadata: Metadata = {
  title: "PlayStation 2 Emulator | Darkpoint",
  description: "Play PlayStation 2 games in your browser with our experimental PS2 emulator.",
};

export default function PS2Page() {
  return <PS2EmulatorPage />;
}

