"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Password strength checker ──────────────────────
interface PasswordCriteria {
  label: string;
  test: (pw: string) => boolean;
}

const passwordCriteria: PasswordCriteria[] = [
  { label: "8 caractères minimum", test: (pw) => pw.length >= 8 },
  { label: "1 majuscule", test: (pw) => /[A-Z]/.test(pw) },
  { label: "1 minuscule", test: (pw) => /[a-z]/.test(pw) },
  { label: "1 chiffre", test: (pw) => /[0-9]/.test(pw) },
];

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  const passed = passwordCriteria.filter((c) => c.test(pw)).length;
  if (passed <= 1) return { score: passed, label: "Faible", color: "bg-destructive" };
  if (passed <= 2) return { score: passed, label: "Moyen", color: "bg-yellow-500" };
  if (passed <= 3) return { score: passed, label: "Bon", color: "bg-blue-500" };
  return { score: passed, label: "Fort", color: "bg-green-500" };
}

// ── Component ──────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedCGU, setAcceptedCGU] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const allCriteriaMet = passwordCriteria.every((c) => c.test(password));
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = name.length > 0 && email.length > 0 && allCriteriaMet && passwordsMatch && acceptedCGU;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allCriteriaMet) {
      toast.error("Le mot de passe ne respecte pas tous les critères");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (!acceptedCGU) {
      toast.error("Vous devez accepter les CGU");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        const msg = result.error.message || "";
        if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exist")) {
          toast.error("Cet email est déjà utilisé. Se connecter ?", {
            action: {
              label: "Se connecter",
              onClick: () => router.push("/login"),
            },
          });
        } else {
          toast.error(msg || "Erreur lors de l'inscription");
        }
        return;
      }

      toast.success("Compte créé avec succès !");
      router.push("/onboarding");
      router.refresh();
    } catch (error) {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">🔨 QuoteForge</CardTitle>
          <CardDescription>
            Créez votre compte et votre organisation
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jean Dupont"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@entreprise.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              {password.length > 0 && (
                <div className="space-y-2 pt-1">
                  {/* Strength bar */}
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i < strength.score ? strength.color : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Force : <span className="font-medium">{strength.label}</span>
                  </p>
                  {/* Criteria checklist */}
                  <ul className="space-y-0.5">
                    {passwordCriteria.map((criterion) => {
                      const passed = criterion.test(password);
                      return (
                        <li
                          key={criterion.label}
                          className={cn(
                            "flex items-center gap-1.5 text-xs",
                            passed ? "text-green-600" : "text-muted-foreground"
                          )}
                        >
                          {passed ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                          {criterion.label}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className={cn(
                  confirmPassword.length > 0 &&
                    (passwordsMatch ? "border-green-500" : "border-destructive")
                )}
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-destructive">
                  Les mots de passe ne correspondent pas
                </p>
              )}
            </div>

            {/* CGU */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedCGU}
                onChange={(e) => setAcceptedCGU(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border"
                disabled={isLoading}
              />
              <span className="text-sm text-muted-foreground">
                J&apos;accepte les{" "}
                <Link href="/cgu" className="text-primary hover:underline">
                  conditions générales d&apos;utilisation
                </Link>
              </span>
            </label>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading || !canSubmit}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer mon compte
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Déjà un compte ?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Se connecter
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
