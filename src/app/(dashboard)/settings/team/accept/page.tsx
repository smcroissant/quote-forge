"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Check,
  X,
  Building2,
  Shield,
  Clock,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
};

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [done, setDone] = useState(false);

  // Fetch invitation details
  const {
    data: invitation,
    isLoading,
    error,
  } = trpc.organization.getInvitationByToken.useQuery(
    { token: token! },
    { enabled: !!token }
  );

  // Mutations
  const acceptMutation = trpc.organization.acceptInvitation.useMutation({
    onSuccess: () => {
      toast.success("Bienvenue dans l&apos;équipe ! 🎉");
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    },
    onError: (err) => {
      toast.error(err.message);
      setIsAccepting(false);
    },
  });

  const rejectMutation = trpc.organization.rejectInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation refusée");
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    },
    onError: (err) => {
      toast.error(err.message);
      setIsRejecting(false);
    },
  });

  // Check expiry
  const isExpired = invitation?.expiresAt
    ? new Date(invitation.expiresAt) < new Date()
    : false;

  if (!token) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <X className="mx-auto mb-4 h-12 w-12 text-destructive" />
              <h2 className="mb-2 text-xl font-bold">Lien invalide</h2>
              <p className="text-muted-foreground">
                Ce lien d&apos;invitation n&apos;est pas valide.
              </p>
              <Button className="mt-4" onClick={() => router.push("/dashboard")}>
                Retour au dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <X className="mx-auto mb-4 h-12 w-12 text-destructive" />
              <h2 className="mb-2 text-xl font-bold">Invitation introuvable</h2>
              <p className="text-muted-foreground">
                Cette invitation n&apos;existe pas ou a expiré.
              </p>
              <Button className="mt-4" onClick={() => router.push("/dashboard")}>
                Retour au dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status !== "pending" || isExpired) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-bold">Invitation expirée</h2>
              <p className="text-muted-foreground">
                Cette invitation n&apos;est plus valide. Demandez une nouvelle invitation à l&apos;administrateur.
              </p>
              <Button className="mt-4" onClick={() => router.push("/dashboard")}>
                Retour au dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Check className="mx-auto mb-4 h-12 w-12 text-green-600" />
              <h2 className="mb-2 text-xl font-bold">C&apos;est fait !</h2>
              <p className="text-muted-foreground">
                Redirection en cours...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleLabel = ROLE_LABELS[invitation.role] ?? invitation.role;

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Invitation à rejoindre l&apos;équipe</CardTitle>
          <CardDescription>
            Vous êtes invité(e) à rejoindre une organisation sur QuoteForge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Org info */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">{invitation.orgName}</p>
                <p className="text-sm text-muted-foreground">
                  Invité par {invitation.invitedByName ?? "un collègue"}
                </p>
              </div>
            </div>
          </div>

          {/* Role */}
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Rôle :</span>
            <Badge>{roleLabel}</Badge>
          </div>

          {/* Expiry */}
          <p className="text-center text-xs text-muted-foreground">
            Cette invitation expire dans 7 jours.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => rejectMutation.mutate({ token })}
              disabled={rejectMutation.isPending || acceptMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Refuser
            </Button>
            <Button
              className="flex-1"
              onClick={() => acceptMutation.mutate({ token })}
              disabled={acceptMutation.isPending || rejectMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Accepter
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
