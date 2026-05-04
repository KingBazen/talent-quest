"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import {
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  Send,
  Sparkles,
  MessageCircle,
  Instagram,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/client-api";

const schema = z.object({
  name: z.string().min(2, "Your name please"),
  email: z.string().email("Enter a valid email"),
  topic: z.enum(["contestant", "partnership", "press", "bug", "other"], {
    errorMap: () => ({ message: "Pick a topic" }),
  }),
  message: z.string().min(10, "Tell us a bit more (10+ chars)"),
});

type Values = z.infer<typeof schema>;

export default function ContactPage() {
  const [sent, setSent] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setServerError(null);
    try {
      await api.post("/api/contact", values);
      setSent(true);
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : "Could not send");
    }
  }

  return (
    <div className="container py-12 md:py-20 max-w-5xl grid lg:grid-cols-2 gap-10">
      <div>
        <Badge variant="outline" className="mb-3">Contact</Badge>
        <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight">
          Talk to a <span className="gradient-text">human</span>.
        </h1>
        <p className="mt-3 text-muted-foreground text-lg">
          Press, partnership, sponsor, or contestant question — drop us a note.
          Real humans reply within 48 hours.
        </p>

        <div className="mt-8 space-y-3 text-sm">
          <ContactRow
            icon={Mail}
            label="Email"
            value="hello@talentquest.example.com"
          />
          <ContactRow icon={Phone} label="Phone" value="+251 11 000 0000" />
          <ContactRow
            icon={MapPin}
            label="HQ"
            value="Bole, Addis Ababa, Ethiopia"
          />
          <ContactRow
            icon={MessageCircle}
            label="Stage Bot"
            value="Available 24/7 in the bottom-right corner"
          />
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold mb-2">Follow the journey</p>
          <div className="flex gap-2">
            <Link
              href="#"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:bg-muted"
              aria-label="Instagram"
            >
              <Instagram className="h-4 w-4" />
            </Link>
            <Link
              href="#"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:bg-muted"
              aria-label="YouTube"
            >
              <Youtube className="h-4 w-4" />
            </Link>
            <Link
              href="#"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:bg-muted"
              aria-label="Telegram"
            >
              <Send className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8">
        {sent ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-10"
          >
            <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold">
              Message received.
            </h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              We&apos;ll be in touch within 48 hours. Your message is logged
              and routed to the right team.
            </p>
            <Button
              variant="ghost"
              className="mt-4"
              onClick={() => setSent(false)}
            >
              Send another
            </Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Badge variant="gradient" className="mb-2">
              <Sparkles className="h-3 w-3 mr-1" /> Live form
            </Badge>
            <div>
              <Label className="text-sm font-semibold">Your name</Label>
              <Input className="mt-1.5" placeholder="Hanna" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <Label className="text-sm font-semibold">Email</Label>
              <Input className="mt-1.5" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <Label className="text-sm font-semibold">Topic</Label>
              <select
                className="mt-1.5 flex h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                {...register("topic")}
                defaultValue=""
              >
                <option value="" disabled>Pick a topic</option>
                <option value="contestant">Contestant question</option>
                <option value="partnership">Sponsorship / partnership</option>
                <option value="press">Press / media</option>
                <option value="bug">Website issue</option>
                <option value="other">Other</option>
              </select>
              {errors.topic && (
                <p className="text-xs text-destructive mt-1">{errors.topic.message}</p>
              )}
            </div>
            <div>
              <Label className="text-sm font-semibold">Message</Label>
              <Textarea
                rows={5}
                className="mt-1.5"
                placeholder="What's on your mind?"
                {...register("message")}
              />
              {errors.message && (
                <p className="text-xs text-destructive mt-1">{errors.message.message}</p>
              )}
            </div>
            {serverError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                {serverError}
              </p>
            )}
            <Button
              type="submit"
              variant="gradient"
              size="lg"
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Sending..." : "Send message"}
              <Send className="ml-2 h-4 w-4" />
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4">
      <Icon className="h-5 w-5 mt-0.5 text-brand-500" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  );
}
