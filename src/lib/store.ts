"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { QuizAnswers, DestinationRecommendation, Trip } from "@/types";

interface AppState {
  // Quiz
  quizAnswers: QuizAnswers;
  currentQuizStep: number;

  // Flight selection
  selectedDestination: DestinationRecommendation | null;

  // Trip / plan
  currentTrip: Trip | null;
  isGeneratingPlan: boolean;

  // Actions
  setQuizAnswer: <K extends keyof QuizAnswers>(key: K, value: QuizAnswers[K]) => void;
  toggleStyle: (style: QuizAnswers["styles"][number]) => void;
  nextQuizStep: () => void;
  prevQuizStep: () => void;
  resetQuiz: () => void;

  selectDestination: (dest: DestinationRecommendation) => void;
  setCurrentTrip: (trip: Trip) => void;
  setIsGeneratingPlan: (val: boolean) => void;
}

const defaultQuizAnswers: QuizAnswers = {
  budget: null,
  vibe: null,
  styles: [],
  placeType: null,
  month: null,
  duration: null,
  airports: ["WRO"],
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      quizAnswers: defaultQuizAnswers,
      currentQuizStep: 0,
      selectedDestination: null,
      currentTrip: null,
      isGeneratingPlan: false,

      setQuizAnswer: (key, value) =>
        set((state) => ({
          quizAnswers: { ...state.quizAnswers, [key]: value },
        })),

      toggleStyle: (style) =>
        set((state) => {
          const styles = state.quizAnswers.styles;
          const exists = styles.includes(style);
          return {
            quizAnswers: {
              ...state.quizAnswers,
              styles: exists
                ? styles.filter((s) => s !== style)
                : [...styles, style],
            },
          };
        }),

      nextQuizStep: () =>
        set((state) => ({ currentQuizStep: state.currentQuizStep + 1 })),

      prevQuizStep: () =>
        set((state) => ({
          currentQuizStep: Math.max(0, state.currentQuizStep - 1),
        })),

      resetQuiz: () =>
        set({
          quizAnswers: defaultQuizAnswers,
          currentQuizStep: 0,
          selectedDestination: null,
          currentTrip: null,
        }),

      selectDestination: (dest) => set({ selectedDestination: dest }),

      setCurrentTrip: (trip) => set({ currentTrip: trip }),

      setIsGeneratingPlan: (val) => set({ isGeneratingPlan: val }),
    }),
    {
      name: "kacper-explores-store",
      partialize: (state) => ({
        quizAnswers: state.quizAnswers,
        currentQuizStep: state.currentQuizStep,
        selectedDestination: state.selectedDestination,
        currentTrip: state.currentTrip,
      }),
    }
  )
);
