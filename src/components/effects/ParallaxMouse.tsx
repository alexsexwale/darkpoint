"use client";

import { useEffect, useRef, type ReactNode, useCallback } from "react";
import gsap from "gsap";

interface ParallaxMouseProps {
  children: ReactNode;
  className?: string;
}

interface ParallaxElement {
  element: HTMLElement;
  z: number;
  speed: number;
}

// Container component that enables mouse parallax for child elements with data-mouse-parallax-z attribute
export function ParallaxMouse({ children, className }: ParallaxMouseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const elementsRef = useRef<ParallaxElement[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  const updateParallax = useCallback(() => {
    const { x, y } = mouseRef.current;
    const wndW = window.innerWidth;
    const wndH = window.innerHeight;

    elementsRef.current.forEach((item) => {
      const { element, z, speed } = item;
      const rect = element.getBoundingClientRect();

      // Check if element is in viewport
      const isInViewport =
        rect.top < wndH &&
        rect.bottom > 0 &&
        rect.left < wndW &&
        rect.right > 0;

      if (!isInViewport) return;

      // Calculate center of element
      const itemCenterLeft = rect.left + rect.width / 2;
      const itemCenterTop = rect.top + rect.height / 2;

      // Calculate offset based on mouse position relative to element center
      const itemX =
        (itemCenterLeft - x) /
        (x > itemCenterLeft ? wndW - itemCenterLeft : itemCenterLeft);
      const itemY =
        (itemCenterTop - y) /
        (y > itemCenterTop ? wndH - itemCenterTop : itemCenterTop);

      // Apply parallax effect - magic number 5 matches Godlike
      const maxOffset = 5 * z;
      gsap.to(element, {
        x: itemX * maxOffset,
        y: itemY * maxOffset,
        duration: speed,
        ease: "power2.out",
      });
    });
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(updateParallax);
    },
    [updateParallax]
  );

  const initParallaxElements = useCallback(() => {
    if (!containerRef.current) return;

    const elements = containerRef.current.querySelectorAll<HTMLElement>(
      "[data-mouse-parallax-z]"
    );

    elementsRef.current = Array.from(elements).map((element) => ({
      element,
      z: parseFloat(element.getAttribute("data-mouse-parallax-z") || "1"),
      speed: parseFloat(element.getAttribute("data-mouse-parallax-speed") || "1"),
    }));
  }, []);

  useEffect(() => {
    // Check if mobile device
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

    if (isMobile) return;

    // Initialize elements after a short delay to ensure DOM is ready
    const initTimer = setTimeout(initParallaxElements, 100);

    // Add event listeners
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", initParallaxElements);
    window.addEventListener("scroll", initParallaxElements);

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", initParallaxElements);
      window.removeEventListener("scroll", initParallaxElements);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleMouseMove, initParallaxElements]);

  // Re-initialize when children change
  useEffect(() => {
    const timer = setTimeout(initParallaxElements, 100);
    return () => clearTimeout(timer);
  }, [children, initParallaxElements]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}

// Individual parallax item wrapper component
interface ParallaxItemProps {
  children: ReactNode;
  z?: number;
  speed?: number;
  className?: string;
}

export function ParallaxItem({
  children,
  z = 5,
  speed = 1,
  className,
}: ParallaxItemProps) {
  return (
    <div
      data-mouse-parallax-z={z}
      data-mouse-parallax-speed={speed}
      className={className}
    >
      {children}
    </div>
  );
}
