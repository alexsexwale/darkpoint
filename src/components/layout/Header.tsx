"use client";

import { Navbar } from "./Navbar";

interface HeaderProps {
  transparent?: boolean;
}

export function Header({ transparent = false }: HeaderProps) {
  return <Navbar />;
}


