import { Metadata } from "next";
import { GameRoomClient } from "./GameRoomClient";

interface PageProps {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  
  return {
    title: `Game Room ${code}`,
    description: "Join the card game room at Darkpoint!",
  };
}

export default async function GameRoomPage({ params }: PageProps) {
  const { code } = await params;
  
  return <GameRoomClient roomCode={code} />;
}
