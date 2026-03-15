"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  UserPlus,
  Trash2,
  Shield,
  Clock,
  Users,
  X,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

// ── Constants ───────────────────────────────────────
const ROLE_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  owner: { label: "Propriétaire", variant: "default" },
  admin: { label: "Admin", variant: "secondary" },
  member: { label: "Membre", variant: "outline" },
};

const INVITABLE_ROLES = [
  { value: "member", label: "Membre — peut créer des devis, pas supprimer" },
  { value: "admin", label: "Admin — accès complet sauf gestion des rôles" },
];

// ── Component ───────────────────────────────────────
export default function TeamPage() {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("member");
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);

  // Queries
  const {
    data: members,
    isLoading: membersLoading,
    refetch: refetchMembers,
  } = trpc.organization.listMembers.useQuery();

  const {
    data: invitations,
    isLoading: invitationsLoading,
    refetch: refetchInvitations,
  } = trpc.organization.listInvitations.useQuery();

  // Mutations
  const inviteMutation = trpc.organization.inviteMember.useMutation({
    onSuccess: () => {
      toast.success("Invitation envoyée ✅");
      setInviteEmail("");
      setInviteRole("member");
      setIsInviteDialogOpen(false);
      refetchInvitations();
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMemberMutation = trpc.organization.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Membre retiré");
      setRemovingMemberId(null);
      refetchMembers();
    },
    onError: (err) => {
      toast.error(err.message);
      setRemovingMemberId(null);
    },
  });

  const cancelInviteMutation = trpc.organization.cancelInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation annulée");
      setCancellingInviteId(null);
      refetchInvitations();
    },
    onError: (err) => {
      toast.error(err.message);
      setCancellingInviteId(null);
    },
  });

  const updateRoleMutation = trpc.organization.updateMemberRole.useMutation({
    onSuccess: () => {
      toast.success("Rôle mis à jour");
      refetchMembers();
    },
    onError: (err) => toast.error(err.message),
  });

  // Handlers
  const handleInvite = useCallback(async () => {
    if (!inviteEmail.trim()) {
      toast.error("Email requis");
      return;
    }
    await inviteMutation.mutateAsync({
      email: inviteEmail.trim(),
      role: inviteRole as "admin" | "member",
    });
  }, [inviteEmail, inviteRole, inviteMutation]);

  const handleRemoveMember = useCallback(
    async (memberId: string) => {
      setRemovingMemberId(memberId);
      await removeMemberMutation.mutateAsync({ memberId });
    },
    [removeMemberMutation]
  );

  const handleCancelInvite = useCallback(
    async (invitationId: string) => {
      setCancellingInviteId(invitationId);
      await cancelInviteMutation.mutateAsync({ invitationId });
    },
    [cancelInviteMutation]
  );

  const handleRoleChange = useCallback(
    async (memberId: string, newRole: string) => {
      await updateRoleMutation.mutateAsync({
        memberId,
        role: newRole as "admin" | "member",
      });
    },
    [updateRoleMutation]
  );

  // Get initials for avatar
  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Format expiry
  const formatExpiry = (date: Date) => {
    const days = Math.ceil(
      (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (days <= 0) return "Expirée";
    if (days === 1) return "Expire demain";
    return `Expire dans ${days} jours`;
  };

  const isLoading = membersLoading || invitationsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Équipe</h2>
          <p className="text-muted-foreground">
            Gérez les membres de votre organisation et leurs rôles
          </p>
        </div>

        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger
            render={
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Inviter un membre
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inviter un membre</DialogTitle>
              <DialogDescription>
                Envoyez une invitation par email pour rejoindre votre équipe.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="collegue@entreprise.fr"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-role">Rôle</Label>
                <Select value={inviteRole} onValueChange={(v) => v && setInviteRole(v)}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVITABLE_ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Plan limit info */}
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>
                    {members?.length ?? 0} / 5 membres (plan Équipe)
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsInviteDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={handleInvite}
                disabled={inviteMutation.isPending || !inviteEmail.trim()}
              >
                {inviteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 h-4 w-4" />
                )}
                Envoyer l'invitation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Loading */}
      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Membres ({members?.length ?? 0})
              </CardTitle>
              <CardDescription>
                Les membres actuels de votre organisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {members?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucun membre pour le moment
                  </p>
                ) : (
                  members?.map((member) => {
                    const roleInfo = ROLE_BADGES[member.role] ?? {
                      label: member.role,
                      variant: "outline" as const,
                    };
                    const isOwner = member.role === "owner";

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.userImage ?? undefined} />
                            <AvatarFallback>
                              {getInitials(member.userName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.userName ?? "Utilisateur"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.userEmail}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant={roleInfo.variant}>
                            {roleInfo.label}
                          </Badge>

                          {!isOwner && (
                            <>
                              <Select
                                value={member.role}
                                onValueChange={(val) =>
                                  val && handleRoleChange(member.id, val)
                                }
                                disabled={updateRoleMutation.isPending}
                              >
                                <SelectTrigger className="w-[130px] h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="member">Membre</SelectItem>
                                </SelectContent>
                              </Select>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleRemoveMember(member.id)}
                                disabled={removingMemberId === member.id}
                              >
                                {removingMemberId === member.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          {invitations && invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Invitations en attente ({invitations.length})
                </CardTitle>
                <CardDescription>
                  Invitations envoyées en attente de réponse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invitations.map((inv) => {
                    const roleInfo = ROLE_BADGES[inv.role] ?? {
                      label: inv.role,
                      variant: "outline" as const,
                    };

                    return (
                      <div
                        key={inv.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{inv.email}</p>
                            <p className="text-sm text-muted-foreground">
                              Invité par {inv.invitedByName ?? "un collègue"} •{" "}
                              {formatExpiry(inv.expiresAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                            En attente
                          </Badge>
                          <Badge variant={roleInfo.variant}>
                            {roleInfo.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleCancelInvite(inv.id)}
                            disabled={cancellingInviteId === inv.id}
                          >
                            {cancellingInviteId === inv.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Roles explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rôles et permissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="default">Propriétaire</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Accès total. Peut gérer les rôles, supprimer l'organisation,
                    et tout le reste.
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="secondary">Admin</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Accès complet aux devis, factures, clients. Peut inviter et
                    retirer des membres.
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Badge variant="outline">Membre</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Peut créer et gérer ses devis et factures. Pas d'accès aux
                    paramètres ni à la suppression.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
