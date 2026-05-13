"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function PaymentSuccessPage() {
  return (
    <div className="flex flex-col flex-1 px-5 pb-8 justify-center items-center text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <span className="text-6xl">🎉</span>
        <h1 className="text-2xl font-bold mt-4">Płatność udana!</h1>
        <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
          Twoje kredyty zostały dodane. Możesz teraz generować plany podróży.
        </p>

        <Link href="/quiz" className="btn-primary" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "2rem" }}>
          Zaplanuj podróż →
        </Link>

        <Link href="/pricing">
          <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
            Wróć do planów
          </p>
        </Link>
      </motion.div>
    </div>
  );
}
