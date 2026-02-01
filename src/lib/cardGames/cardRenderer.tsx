"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, Suit, SUIT_SYMBOLS, SUIT_COLORS, RANK_DISPLAY } from "./types";

// Card dimensions (base size, can be scaled)
export const CARD_WIDTH = 70;
export const CARD_HEIGHT = 100;
export const CARD_RADIUS = 6;

type CardSize = "xs" | "sm" | "md" | "lg";

const SIZE_SCALES: Record<CardSize, number> = {
  xs: 0.5,
  sm: 0.7,
  md: 1,
  lg: 1.3,
};

interface PlayingCardProps {
  card: Card;
  onClick?: () => void;
  onDoubleClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  size?: CardSize;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Single playing card component
 */
export function PlayingCard({
  card,
  onClick,
  onDoubleClick,
  draggable = false,
  onDragStart,
  onDragEnd,
  selected = false,
  disabled = false,
  small = false,
  size,
  className = "",
  style,
}: PlayingCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  
  // Size prop takes precedence, then small prop, then default to md
  const scale = size ? SIZE_SCALES[size] : (small ? 0.7 : 1);
  const width = CARD_WIDTH * scale;
  const height = CARD_HEIGHT * scale;
  
  const suitColor = card.faceUp ? SUIT_COLORS[card.suit] : "gray";
  const textColor = suitColor === "red" ? "#dc2626" : "#1f2937";
  
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    onDragStart?.(e);
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    setIsDragging(false);
    onDragEnd?.(e);
  };
  
  return (
    <div
      className={`relative select-none ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      draggable={draggable && !disabled && card.faceUp}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <motion.div
        className="w-full h-full"
        initial={false}
        animate={{
          rotateY: card.faceUp ? 0 : 180,
          scale: selected ? 1.05 : isDragging ? 1.1 : 1,
          y: selected ? -8 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        onClick={disabled ? undefined : onClick}
        onDoubleClick={disabled ? undefined : onDoubleClick}
      >
      {/* Card container with 3D perspective */}
      <div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          transform: card.faceUp ? "rotateY(0deg)" : "rotateY(180deg)",
        }}
      >
        {/* Card Front */}
        <div
          className={`absolute inset-0 rounded-lg border-2 bg-white flex flex-col justify-between p-1.5 cursor-pointer transition-shadow ${
            selected ? "border-[var(--color-main-1)] shadow-lg shadow-[var(--color-main-1)]/30" : "border-gray-300"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-md"}`}
          style={{
            backfaceVisibility: "hidden",
            borderRadius: CARD_RADIUS,
          }}
        >
          {/* Top left corner */}
          <div className="flex flex-col items-start leading-none">
            <span
              className="font-bold"
              style={{
                fontSize: small ? 10 : 14,
                color: textColor,
              }}
            >
              {RANK_DISPLAY[card.rank]}
            </span>
            <span
              style={{
                fontSize: small ? 10 : 14,
                color: textColor,
              }}
            >
              {SUIT_SYMBOLS[card.suit]}
            </span>
          </div>
          
          {/* Center suit */}
          <div className="flex-1 flex items-center justify-center">
            <span
              style={{
                fontSize: small ? 24 : 32,
                color: textColor,
              }}
            >
              {SUIT_SYMBOLS[card.suit]}
            </span>
          </div>
          
          {/* Bottom right corner (rotated) */}
          <div className="flex flex-col items-end leading-none rotate-180">
            <span
              className="font-bold"
              style={{
                fontSize: small ? 10 : 14,
                color: textColor,
              }}
            >
              {RANK_DISPLAY[card.rank]}
            </span>
            <span
              style={{
                fontSize: small ? 10 : 14,
                color: textColor,
              }}
            >
              {SUIT_SYMBOLS[card.suit]}
            </span>
          </div>
        </div>
        
        {/* Card Back */}
        <div
          className="absolute inset-0 rounded-lg border-2 border-[var(--color-dark-4)] bg-gradient-to-br from-[var(--color-main-1)] to-purple-700 cursor-pointer"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            borderRadius: CARD_RADIUS,
          }}
        >
          {/* Pattern on card back */}
          <div className="absolute inset-2 rounded border border-white/20 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white/30 rounded-full flex items-center justify-center">
              <div className="w-4 h-4 bg-white/20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
      </motion.div>
    </div>
  );
}

interface CardPileProps {
  cards: Card[];
  spread?: "none" | "vertical" | "horizontal" | "fan";
  offset?: number;
  maxVisible?: number;
  onCardClick?: (card: Card, index: number) => void;
  onCardDoubleClick?: (card: Card, index: number) => void;
  onDragStart?: (e: React.DragEvent, card: Card, index: number) => void;
  draggableFrom?: number; // Index from which cards are draggable
  selectedCards?: Card[];
  emptyPlaceholder?: boolean;
  className?: string;
}

/**
 * Stack of cards with various spread options
 */
export function CardPile({
  cards,
  spread = "none",
  offset = 25,
  maxVisible,
  onCardClick,
  onCardDoubleClick,
  onDragStart,
  draggableFrom = -1,
  selectedCards = [],
  emptyPlaceholder = true,
  className = "",
}: CardPileProps) {
  const visibleCards = maxVisible ? cards.slice(-maxVisible) : cards;
  
  const getOffset = (index: number) => {
    switch (spread) {
      case "vertical":
        return { top: index * offset, left: 0 };
      case "horizontal":
        return { top: 0, left: index * offset };
      case "fan":
        const fanAngle = 5;
        const rotation = (index - visibleCards.length / 2) * fanAngle;
        return { 
          top: Math.abs(index - visibleCards.length / 2) * 5,
          left: index * (offset * 0.8),
          rotate: rotation,
        };
      default:
        return { top: 0, left: 0 };
    }
  };
  
  const calculateDimensions = () => {
    if (cards.length === 0 || spread === "none") {
      return { width: CARD_WIDTH, height: CARD_HEIGHT };
    }
    
    const lastOffset = getOffset(visibleCards.length - 1);
    
    switch (spread) {
      case "vertical":
        return { 
          width: CARD_WIDTH, 
          height: CARD_HEIGHT + (visibleCards.length - 1) * offset,
        };
      case "horizontal":
      case "fan":
        return { 
          width: CARD_WIDTH + (visibleCards.length - 1) * (offset * (spread === "fan" ? 0.8 : 1)), 
          height: CARD_HEIGHT + (spread === "fan" ? 20 : 0),
        };
      default:
        return { width: CARD_WIDTH, height: CARD_HEIGHT };
    }
  };
  
  const dimensions = calculateDimensions();
  
  return (
    <div
      className={`relative ${className}`}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        minWidth: CARD_WIDTH,
        minHeight: CARD_HEIGHT,
      }}
    >
      {/* Empty placeholder */}
      {cards.length === 0 && emptyPlaceholder && (
        <div
          className="absolute inset-0 rounded-lg border-2 border-dashed border-[var(--color-dark-4)] bg-[var(--color-dark-3)]/30"
          style={{ borderRadius: CARD_RADIUS }}
        />
      )}
      
      {/* Cards */}
      <AnimatePresence>
        {visibleCards.map((card, index) => {
          const offsetStyle = getOffset(index);
          const isSelected = selectedCards.some(c => c.id === card.id);
          const isDraggable = draggableFrom >= 0 && index >= draggableFrom;
          
          return (
            <motion.div
              key={card.id}
              className="absolute"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                top: offsetStyle.top,
                left: offsetStyle.left,
                rotate: (offsetStyle as { rotate?: number }).rotate || 0,
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              style={{ zIndex: index }}
            >
              <PlayingCard
                card={card}
                onClick={() => onCardClick?.(card, index)}
                onDoubleClick={() => onCardDoubleClick?.(card, index)}
                draggable={isDraggable}
                onDragStart={(e) => onDragStart?.(e, card, index)}
                selected={isSelected}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

interface CardHandProps {
  cards: Card[];
  onCardClick?: (card: Card, index: number) => void;
  onCardDoubleClick?: (card: Card, index: number) => void;
  selectedCards?: Card[];
  sortCards?: boolean;
  fanned?: boolean;
  hidden?: boolean; // Show card backs
  className?: string;
}

/**
 * Player's hand of cards
 */
export function CardHand({
  cards,
  onCardClick,
  onCardDoubleClick,
  selectedCards = [],
  sortCards = true,
  fanned = true,
  hidden = false,
  className = "",
}: CardHandProps) {
  const displayCards = cards.map(c => hidden ? { ...c, faceUp: false } : c);
  const offset = fanned ? Math.max(25, Math.min(40, 300 / cards.length)) : 0;
  
  return (
    <div className={`flex justify-center ${className}`}>
      <CardPile
        cards={displayCards}
        spread={fanned ? "horizontal" : "none"}
        offset={offset}
        onCardClick={onCardClick}
        onCardDoubleClick={onCardDoubleClick}
        selectedCards={selectedCards}
        draggableFrom={hidden ? -1 : 0}
        emptyPlaceholder={false}
      />
    </div>
  );
}

interface DropZoneProps {
  onDrop: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  isValidDrop?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Drop zone for drag and drop
 */
export function DropZone({
  onDrop,
  onDragOver,
  isValidDrop = true,
  children,
  className = "",
}: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    onDragOver?.(e);
  };
  
  const handleDragLeave = () => {
    setIsDragOver(false);
  };
  
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isValidDrop) {
      onDrop(e);
    }
  };
  
  return (
    <div
      className={`transition-all duration-200 ${
        isDragOver && isValidDrop 
          ? "ring-2 ring-[var(--color-main-1)] ring-offset-2 ring-offset-[var(--color-dark-2)]" 
          : ""
      } ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
    </div>
  );
}

/**
 * Empty card slot placeholder
 */
export function CardSlot({ 
  label, 
  suit,
  onClick,
  className = "",
}: { 
  label?: string; 
  suit?: Suit;
  onClick?: () => void;
  className?: string;
}) {
  const suitColor = suit ? SUIT_COLORS[suit] : "gray";
  
  return (
    <div
      className={`rounded-lg border-2 border-dashed border-[var(--color-dark-4)] bg-[var(--color-dark-3)]/30 flex items-center justify-center cursor-pointer hover:border-[var(--color-dark-5)] transition-colors ${className}`}
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: CARD_RADIUS,
      }}
      onClick={onClick}
    >
      {suit && (
        <span 
          className="text-2xl opacity-30"
          style={{ color: suitColor === "red" ? "#dc2626" : "#1f2937" }}
        >
          {SUIT_SYMBOLS[suit]}
        </span>
      )}
      {label && (
        <span className="text-xs text-[var(--muted-foreground)] opacity-50">
          {label}
        </span>
      )}
    </div>
  );
}

/**
 * Deck/stock pile (clickable)
 */
export function DeckPile({
  cardsRemaining,
  onClick,
  disabled = false,
  className = "",
}: {
  cardsRemaining: number;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      onClick={disabled ? undefined : onClick}
    >
      {cardsRemaining > 0 ? (
        <>
          {/* Stacked effect */}
          {cardsRemaining > 4 && (
            <div 
              className="absolute rounded-lg bg-[var(--color-main-1)]/60 border border-[var(--color-dark-4)]"
              style={{ 
                width: CARD_WIDTH, 
                height: CARD_HEIGHT, 
                top: -4, 
                left: 2,
                borderRadius: CARD_RADIUS,
              }} 
            />
          )}
          {cardsRemaining > 2 && (
            <div 
              className="absolute rounded-lg bg-[var(--color-main-1)]/80 border border-[var(--color-dark-4)]"
              style={{ 
                width: CARD_WIDTH, 
                height: CARD_HEIGHT, 
                top: -2, 
                left: 1,
                borderRadius: CARD_RADIUS,
              }} 
            />
          )}
          {/* Top card */}
          <div
            className="absolute rounded-lg border-2 border-[var(--color-dark-4)] bg-gradient-to-br from-[var(--color-main-1)] to-purple-700 hover:from-[var(--color-main-1)]/90 hover:to-purple-600 transition-colors"
            style={{
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              borderRadius: CARD_RADIUS,
            }}
          >
            <div className="absolute inset-2 rounded border border-white/20 flex items-center justify-center">
              <span className="text-white/70 text-xs font-medium">
                {cardsRemaining}
              </span>
            </div>
          </div>
        </>
      ) : (
        <CardSlot label="Empty" onClick={onClick} />
      )}
    </div>
  );
}
