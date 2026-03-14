"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Send, Mail } from "lucide-react";
import { toast } from "sonner";

interface SendEmailModalProps {
  quoteId: string;
  quoteNumber: string;
  clientEmail?: string | null;
  clientName: string;
  total: string;
  onSuccess: () => void;
  isDisabled?: boolean;
}

export function SendEmailModal({
  quoteId,
  quoteNumber,
  clientEmail,
  clientName,
  total,
  onSuccess,
  isDisabled,
}: SendEmailModalProps) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState(clientEmail ?? "");
  const [customMessage, setCustomMessage] = useState("");

  const sendEmail = trpc.quotes.sendEmail.useMutation({
    onSuccess: (data) => {
      const message = data.statusUpdated
        ? "Devis envoyé par email — statut mis à jour en « Envoyé »"
        : "Email de relance envoyé avec succès";
      toast.success(message);
      setOpen(false);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSend = () => {
    sendEmail.mutate({
      id: quoteId,
      to: to || undefined,
      customMessage: customMessage || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={(props) => (
          <Button variant="outline" disabled={isDisabled} {...props}>
            <Mail className="mr-2 h-4 w-4" />
            Envoyer par email
          </Button>
        )}
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer le devis par email</DialogTitle>
          <DialogDescription>
            Le PDF du devis <strong>{quoteNumber}</strong> sera joint à l'email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Recipient */}
          <div className="space-y-2">
            <Label htmlFor="email-to">Destinataire</Label>
            <Input
              id="email-to"
              type="email"
              placeholder={clientEmail ?? "email@exemple.com"}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
            {clientEmail && to !== clientEmail && (
              <p className="text-xs text-muted-foreground">
                Email par défaut du client : {clientEmail}
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium">{clientName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Montant</span>
              <span className="font-medium">{total} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pièce jointe</span>
              <span className="font-medium font-mono text-xs">
                devis-{quoteNumber}.pdf
              </span>
            </div>
          </div>

          {/* Custom message */}
          <div className="space-y-2">
            <Label htmlFor="email-message">
              Message personnalisé{" "}
              <span className="text-muted-foreground font-normal">(optionnel)</span>
            </Label>
            <Textarea
              id="email-message"
              placeholder="Ajoutez un message personnel à l'email..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              maxLength={500}
              rows={3}
            />
            <p className="text-xs text-muted-foreground text-right">
              {customMessage.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={sendEmail.isPending}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={sendEmail.isPending || !to}
          >
            {sendEmail.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Envoyer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
