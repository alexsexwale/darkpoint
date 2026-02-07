"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useGamificationStore } from "@/stores";
import { useBadgeSound } from "@/hooks";
import { useConfettiBurst } from "./ParticleEmitter";

interface EasterEggContextType {
  triggerEasterEgg: (type: string) => void;
  hasDiscovered: (type: string) => boolean;
  discoveredEggs: string[];
}

const EasterEggContext = createContext<EasterEggContextType | null>(null);

export function useEasterEgg() {
  const context = useContext(EasterEggContext);
  if (!context) {
    throw new Error("useEasterEgg must be used within EasterEggProvider");
  }
  return context;
}

// Konami Code sequence
const KONAMI_CODE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight",
  "KeyB", "KeyA"
];

interface EasterEggProviderProps {
  children: ReactNode;
}

export function EasterEggProvider({ children }: EasterEggProviderProps) {
  const router = useRouter();
  const { hasAnyBadge, addXP, addNotification } = useGamificationStore();
  const { playKonamiSuccess, playEasterEgg, playSecret } = useBadgeSound();
  const { triggerConfetti } = useConfettiBurst();

  const [konamiIndex, setKonamiIndex] = useState(0);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [lastLogoClick, setLastLogoClick] = useState(0);
  const [discoveredEggs, setDiscoveredEggs] = useState<string[]>([]);
  const [showReward, setShowReward] = useState<{ type: string; message: string } | null>(null);
  const [showMidnightEffect, setShowMidnightEffect] = useState(false);

  // Load discovered eggs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("discoveredEasterEggs");
    if (saved) {
      setDiscoveredEggs(JSON.parse(saved));
    }
  }, []);

  // Save discovered eggs to localStorage
  const saveDiscoveredEgg = useCallback((type: string) => {
    setDiscoveredEggs((prev) => {
      if (prev.includes(type)) return prev;
      const updated = [...prev, type];
      localStorage.setItem("discoveredEasterEggs", JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Handle Konami Code
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === KONAMI_CODE[konamiIndex]) {
        const newIndex = konamiIndex + 1;
        setKonamiIndex(newIndex);

        if (newIndex === KONAMI_CODE.length) {
          // Konami code completed!
          setKonamiIndex(0);
          triggerEasterEgg("konami");
        }
      } else {
        // Reset if wrong key
        setKonamiIndex(e.code === KONAMI_CODE[0] ? 1 : 0);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [konamiIndex]);

  // Logo click handler - attach to window for any element with data-logo-click
  useEffect(() => {
    const handleLogoClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("[data-logo-click]")) {
        const now = Date.now();
        
        // Reset if more than 1 second since last click
        if (now - lastLogoClick > 1000) {
          setLogoClickCount(1);
        } else {
          setLogoClickCount((prev) => prev + 1);
        }
        setLastLogoClick(now);

        // 5 rapid clicks triggers the easter egg
        if (logoClickCount >= 4) {
          setLogoClickCount(0);
          triggerEasterEgg("logo_clicks");
        }
      }
    };

    window.addEventListener("click", handleLogoClick);
    return () => window.removeEventListener("click", handleLogoClick);
  }, [logoClickCount, lastLogoClick]);

  // Check for midnight easter egg
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      if (hours === 0 && minutes === 0 && hasAnyBadge()) {
        triggerEasterEgg("midnight");
      }
    };

    // Check every minute
    const interval = setInterval(checkMidnight, 60000);
    checkMidnight(); // Check immediately

    return () => clearInterval(interval);
  }, [hasAnyBadge]);

  const triggerEasterEgg = useCallback((type: string) => {
    // Only reward VIP members
    if (!hasAnyBadge()) {
      // Non-VIP members just see a teaser
      addNotification({
        type: "info",
        title: "🔒 Secret Found!",
        message: "Get a badge to unlock this secret reward!",
        icon: "🔮",
      });
      return;
    }

    // Check if already discovered (no double rewards)
    const isNewDiscovery = !discoveredEggs.includes(type);

    switch (type) {
      case "konami":
        playKonamiSuccess();
        triggerConfetti();
        if (isNewDiscovery) {
          addXP(100, "bonus", "Konami Code Discovery!");
          saveDiscoveredEgg(type);
        }
        setShowReward({
          type: "konami",
          message: isNewDiscovery 
            ? "🎮 KONAMI CODE ACTIVATED! +100 XP" 
            : "🎮 KONAMI CODE! (Already discovered)",
        });
        break;

      case "logo_clicks":
        playEasterEgg();
        triggerConfetti();
        if (isNewDiscovery) {
          addXP(50, "bonus", "Secret Logo Click Discovery!");
          saveDiscoveredEgg(type);
        }
        setShowReward({
          type: "logo_clicks",
          message: isNewDiscovery 
            ? "✨ SECRET UNLOCK! +50 XP" 
            : "✨ You found this before!",
        });
        break;

      case "midnight":
        playSecret();
        setShowMidnightEffect(true);
        setTimeout(() => setShowMidnightEffect(false), 10000); // 10 second effect
        if (isNewDiscovery) {
          const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
          addXP(200, "bonus", "Midnight Visitor Bonus!", `midnight_${today}`);
          saveDiscoveredEgg(type);
        }
        setShowReward({
          type: "midnight",
          message: isNewDiscovery 
            ? "🌙 MIDNIGHT EXPLORER! +200 XP" 
            : "🌙 Welcome back, night owl!",
        });
        break;

      case "hidden_arcade":
        playEasterEgg();
        if (isNewDiscovery) {
          addXP(75, "bonus", "Hidden Arcade Discovery!");
          saveDiscoveredEgg(type);
        }
        router.push("/vip/arcade");
        break;

      case "vip_portal":
        playSecret();
        router.push("/vip");
        break;

      default:
        console.log("Unknown easter egg:", type);
    }

    // Auto-hide reward message
    setTimeout(() => setShowReward(null), 3000);
  }, [
    hasAnyBadge, 
    discoveredEggs, 
    addXP, 
    addNotification, 
    saveDiscoveredEgg, 
    playKonamiSuccess, 
    playEasterEgg, 
    playSecret, 
    triggerConfetti,
    router
  ]);

  const hasDiscovered = useCallback((type: string) => {
    return discoveredEggs.includes(type);
  }, [discoveredEggs]);

  return (
    <EasterEggContext.Provider value={{ triggerEasterEgg, hasDiscovered, discoveredEggs }}>
      {children}

      {/* Easter Egg Reward Notification */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
          >
            <div className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-sm px-8 py-4 rounded-xl shadow-2xl border border-white/20">
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: [0.5, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="text-center"
              >
                <div className="text-2xl font-heading text-white drop-shadow-lg">
                  {showReward.message}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Midnight Special Effect */}
      <AnimatePresence>
        {showMidnightEffect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="fixed inset-0 z-[9997] pointer-events-none"
          >
            {/* Dark overlay with stars */}
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/80 via-purple-950/60 to-transparent" />
            
            {/* Animated stars */}
            {[...Array(50)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 60}%`,
                }}
                animate={{
                  opacity: [0.2, 1, 0.2],
                  scale: [1, 1.5, 1],
                }}
                transition={{
                  duration: 1 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
            
            {/* Moon */}
            <motion.div
              className="absolute top-10 right-20 w-24 h-24 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200"
              animate={{
                boxShadow: [
                  "0 0 40px rgba(255, 255, 200, 0.4)",
                  "0 0 80px rgba(255, 255, 200, 0.6)",
                  "0 0 40px rgba(255, 255, 200, 0.4)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              {/* Moon craters */}
              <div className="absolute w-4 h-4 rounded-full bg-yellow-200/50 top-4 left-6" />
              <div className="absolute w-6 h-6 rounded-full bg-yellow-200/50 top-10 left-12" />
              <div className="absolute w-3 h-3 rounded-full bg-yellow-200/50 bottom-4 left-4" />
            </motion.div>
            
            {/* Shooting star */}
            <motion.div
              className="absolute w-32 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent rotate-45"
              initial={{ left: "10%", top: "10%", opacity: 0 }}
              animate={{
                left: ["10%", "80%"],
                top: ["10%", "50%"],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3,
              }}
            />
            
            {/* Midnight text */}
            <motion.div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <div className="text-6xl mb-4">🌙</div>
              <h2 className="text-4xl font-heading text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-pink-300 to-indigo-300 mb-2">
                MIDNIGHT MAGIC
              </h2>
              <p className="text-purple-200/80 text-lg">
                The witching hour has begun...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Konami Code Progress Indicator - Exciting version */}
      <AnimatePresence>
        {konamiIndex > 0 && konamiIndex < KONAMI_CODE.length && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30, scale: 0.8 }}
            className="fixed top-28 left-1/2 -translate-x-1/2 z-[9998]"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.02, 1],
                boxShadow: [
                  "0 0 20px rgba(251, 191, 36, 0.3)",
                  "0 0 40px rgba(251, 191, 36, 0.5)",
                  "0 0 20px rgba(251, 191, 36, 0.3)"
                ]
              }}
              transition={{ duration: 1, repeat: Infinity }}
              className="bg-[var(--color-dark-1)]/95 backdrop-blur-md border-2 border-amber-500/50 rounded-xl px-6 py-4 shadow-2xl"
            >
              {/* Header with encouraging message */}
              <motion.div 
                className="text-center mb-3"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span className="text-amber-400 text-sm font-semibold tracking-wider">
                  {konamiIndex <= 2 && "🎮 SECRET CODE DETECTED..."}
                  {konamiIndex > 2 && konamiIndex <= 5 && "⚡ KEEP GOING..."}
                  {konamiIndex > 5 && konamiIndex <= 7 && "🔥 ALMOST THERE!"}
                  {konamiIndex > 7 && "✨ SO CLOSE!"}
                </span>
              </motion.div>

              {/* Key indicators */}
              <div className="flex items-center gap-1.5 justify-center">
                {KONAMI_CODE.map((key, i) => {
                  const isComplete = i < konamiIndex;
                  const isCurrent = i === konamiIndex;
                  const keyLabel = key.replace("Arrow", "").replace("Key", "");
                  
                  return (
                    <motion.div
                      key={i}
                      initial={isComplete ? { scale: 0.5 } : {}}
                      animate={isComplete ? { 
                        scale: 1,
                        backgroundColor: "rgb(251 191 36)"
                      } : isCurrent ? {
                        scale: [1, 1.1, 1],
                        borderColor: ["rgba(251, 191, 36, 0.5)", "rgba(251, 191, 36, 1)", "rgba(251, 191, 36, 0.5)"]
                      } : {}}
                      transition={isCurrent ? { duration: 0.8, repeat: Infinity } : { duration: 0.3 }}
                      className={`
                        w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                        ${isComplete 
                          ? "bg-amber-400 text-black" 
                          : isCurrent 
                            ? "bg-amber-400/20 text-amber-400 border-2 border-amber-400/50" 
                            : "bg-white/10 text-white/30 border border-white/10"
                        }
                      `}
                    >
                      {keyLabel}
                    </motion.div>
                  );
                })}
              </div>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(konamiIndex / KONAMI_CODE.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Progress text */}
              <div className="mt-2 text-center text-xs text-white/50">
                {konamiIndex} / {KONAMI_CODE.length} keys
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </EasterEggContext.Provider>
  );
}

// Hidden link component for embedding secret links in content
export function HiddenLink({ 
  children, 
  to, 
  easterEggType 
}: { 
  children: ReactNode; 
  to: string; 
  easterEggType?: string;
}) {
  const { triggerEasterEgg } = useEasterEgg();
  const router = useRouter();

  const handleClick = () => {
    if (easterEggType) {
      triggerEasterEgg(easterEggType);
    }
    router.push(to);
  };

  return (
    <span
      onClick={handleClick}
      className="cursor-default hover:text-amber-400/30 transition-colors duration-1000"
    >
      {children}
    </span>
  );
}

