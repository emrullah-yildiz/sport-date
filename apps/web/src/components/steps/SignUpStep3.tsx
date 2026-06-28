"use client";

import { motion } from "framer-motion";
import { useSignUpStore } from "@/lib/sign-up-store";

const sports = [
  { name: "Tennis", symbol: "T" }, { name: "Running", symbol: "R" },
  { name: "Bouldering", symbol: "B" }, { name: "Basketball", symbol: "BB" },
  { name: "Yoga", symbol: "Y" },
];

export default function SignUpStep3() {
  const selected = useSignUpStore((state) => state.sports);
  const addSport = useSignUpStore((state) => state.addSport);
  const removeSport = useSignUpStore((state) => state.removeSport);

  const toggleSport = (name: string) => {
    if (selected.some((sport) => sport.name === name)) removeSport(name);
    else addSport({ name, skillLevel: "intermediate", frequency: "weekly" });
  };

  return (
    <motion.div className="signup-step">
      <h2>What sports do you play?</h2>
      <p>Choose between one and five. You can refine skill levels later.</p>
      <div className="sports-grid">
        {sports.map((sport) => {
          const active = selected.some((item) => item.name === sport.name);
          return <button type="button" key={sport.name} aria-pressed={active} className={`sport-card ${active ? "active" : ""}`} onClick={() => toggleSport(sport.name)}><span className="sport-emoji">{sport.symbol}</span><span>{sport.name}</span></button>;
        })}
      </div>
    </motion.div>
  );
}

