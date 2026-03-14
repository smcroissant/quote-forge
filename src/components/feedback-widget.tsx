"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare, X, ExternalLink, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const FEEDBACK_URL = "https://forms.gle/feedback-croissantdevis"; // TODO: remplacer par le vrai lien

export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors"
        aria-label="Donner mon feedback"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
    );
  }

  return (
    <>
      {/* Floating button */}
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
        <button
          onClick={() => setIsMinimized(true)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
          aria-label="Réduire"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-indigo-700 transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">Donner mon feedback</span>
          <span className="sm:hidden">Feedback</span>
        </button>
      </div>

      {/* Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              Votre feedback compte !
            </DialogTitle>
            <DialogDescription>
              Vous faites partie des premiers utilisateurs de CroissantDevis.
              Vos retours nous aident à améliorer le produit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Quick NPS */}
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-medium mb-3">
                Recommanderiez-vous CroissantDevis ?
              </p>
              <div className="flex justify-between gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      // Track NPS score (could send to analytics)
                      window.open(
                        `${FEEDBACK_URL}?nps=${n}`,
                        "_blank"
                      );
                    }}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md text-xs font-medium transition-colors",
                      n <= 6
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : n <= 8
                          ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                          : "bg-green-50 text-green-600 hover:bg-green-100"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Pas du tout</span>
                <span>Totalement</span>
              </div>
            </div>

            {/* Link to full form */}
            <a
              href={FEEDBACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Star className="h-4 w-4" />
              Remplir le formulaire complet
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>

            {/* Quick message */}
            <p className="text-xs text-center text-muted-foreground">
              💡 Astuce : Vous pouvez aussi utiliser <kbd className="px-1 py-0.5 rounded bg-muted font-mono">Cmd+K</kbd> pour naviguer rapidement
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
