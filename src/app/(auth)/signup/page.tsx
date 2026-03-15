"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Check, X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

interface PasswordCriteria {
  label: string;
  test: (pw: string) => boolean;
  met: boolean;
}

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cguAccepted, setCguAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const [criteria, setCriteria] = useState<PasswordCriteria[]>([
    { label: "Au moins 8 caractères", test: (pw) => pw.length >= 8, met: false },
    { label: "Une majuscule", test: (pw) => /[A-Z]/.test(pw), met: false },
    { label: "Un chiffre", test: (pw) => /[0-9]/.test(pw), met: false },
  ]);

  useEffect(() => {
    setCriteria((prev) =>
      prev.map((c) => ({ ...c, met: c.test(password) }))
    );
  }, [password]);

  const isPasswordValid = criteria.every((c) => c.met);
  const passwordsMatch = confirmPassword === "" || password === confirmPassword;
  const isFormValid =
    name.trim().length >= 2 &&
    email.includes("@") &&
    isPasswordValid &&
    password === confirmPassword &&
    cguAccepted;

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      setEmailError("Format d'email invalide");
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError("");

    if (!isFormValid) return;

    setIsLoading(true);

    try {
      const result = await signUp.email({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.error) {
        if (result.error.message?.includes("already") || result.error.message?.includes("duplicate")) {
          setGeneralError("Cet email est déjà utilisé. Se connecter ?");
        } else {
          setGeneralError(result.error.message || "Erreur lors de l'inscription");
        }
        return;
      }

      toast.success("Compte créé avec succès !");
      router.push("/onboarding");
      router.refresh();
    } catch (error) {
      setGeneralError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            🔨 QuoteForge
          </CardTitle>
          <CardDescription>
            Créez votre compte et votre organisation
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Error général */}
            {generalError && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {generalError.includes("Se connecter") ? (
                  <span>
                    {generalError.split("Se connecter")[0]}
                    <Link href="/login" className="font-medium underline">
                      Se connecter
                    </Link>
                    ?
                  </span>
                ) : (
                  generalError
                )}
              </div>
            )}

            {/* Nom */}
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                onBlur={(e) => validateEmail(e.target.value)}
                required
                disabled={isLoading}
                className={emailError ? "border-destructive" : ""}
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>

            {/* Mot de passe */}
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className={password && !isPasswordValid ? "border-destructive" : ""}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Critères mot de passe */}
              {password.length > 0 && (
                <div className="space-y-1 pt-1">
                  {criteria.map((c, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 text-xs ${
                        c.met ? "text-green-600" : "text-muted-foreground"
                      }`}
                    >
                      {c.met ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      {c.label}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirmation mot de passe */}
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
                className={
                  confirmPassword && !passwordsMatch ? "border-destructive" : ""
                }
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-sm text-destructive">
                  Les mots de passe ne correspondent pas
                </p>
              )}
            </div>

            {/* CGU */}
            <div className="flex items-start gap-2">
              <input
                id="cgu"
                type="checkbox"
                checked={cguAccepted}
                onChange={(e) => setCguAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border"
                disabled={isLoading}
              />
              <label htmlFor="cgu" className="text-sm text-muted-foreground">
                J&apos;accepte les{" "}
                <Link href="/cgu" className="text-primary hover:underline">
                  conditions générales d&apos;utilisation
                </Link>
              </label>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !isFormValid}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer mon compte
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Déjà un compte ?{" "}
              <Link
                href="/login"
                className="font-medium text-primary hover:underline"
              >
                Se connecter
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
