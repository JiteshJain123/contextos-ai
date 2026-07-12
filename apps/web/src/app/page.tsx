"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  Bot,
  Brain,
  BarChart3,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FileText,
  Kanban,
  Layers,
  Lightbulb,
  Menu,
  Sparkles,
  Target,
  TrendingUp,
  Wand2,
  X,
  Zap,
  CheckCircle2,
  Shield,
  ArrowUpRight,
  Cpu,
  GitBranch,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/cn";

// â”€â”€â”€ Design tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BG = "bg-[#09090b]";
const CARD = "bg-zinc-900";
const TEXT_MUTED = "text-zinc-500";

// â”€â”€â”€ Reusable primitives â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function GradientOrb({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute rounded-full blur-3xl opacity-20",
        className,
      )}
    />
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
      <Sparkles className="size-3 text-violet-400" />
      {children}
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
      {children}
    </h2>
  );
}

function SectionSub({ children }: { children: React.ReactNode }) {
  return (
    <p className="mx-auto max-w-2xl text-base leading-relaxed text-zinc-400">
      {children}
    </p>
  );
}

// â”€â”€â”€ Navbar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "AI Assistant", href: "#ai-assistant" },
  { label: "Documents", href: "#documents" },
  { label: "Analytics", href: "#analytics" },
  { label: "FAQ", href: "#faq" },
];

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-zinc-800/60 bg-[#09090b]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-white">
            <Bot className="size-4 text-zinc-900" />
          </div>
          <span className="text-sm font-semibold text-white">ContextOS AI</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/60 hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-2 md:flex">
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:text-white"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100"
          >
            Start free
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="flex size-9 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="border-t border-zinc-800 bg-[#09090b] px-4 pb-5 pt-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2">
            <Link
              href="/login"
              className="rounded-md border border-zinc-800 px-4 py-2.5 text-center text-sm text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-white px-4 py-2.5 text-center text-sm font-medium text-zinc-900"
            >
              Start free
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

// â”€â”€â”€ Hero â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function HeroMockup() {
  return (
    <div className="relative mx-auto w-full max-w-2xl">
      {/* Browser chrome */}
      <div className="overflow-hidden rounded-xl border border-zinc-700/60 bg-zinc-900 shadow-2xl shadow-black/60">
        {/* Tab bar */}
        <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-950/80 px-3 py-2.5">
          <div className="flex gap-1.5">
            <div className="size-2.5 rounded-full bg-red-500/70" />
            <div className="size-2.5 rounded-full bg-yellow-500/70" />
            <div className="size-2.5 rounded-full bg-green-500/70" />
          </div>
          <div className="mx-auto flex h-5 items-center gap-1 rounded border border-zinc-700/60 bg-zinc-800/60 px-2">
            <div className="size-1.5 rounded-full bg-green-400" />
            <span className="text-[10px] text-zinc-500">app.contextos.ai/projects/saas-launch</span>
          </div>
        </div>

        {/* Sidebar + content */}
        <div className="flex min-h-[240px] sm:h-[340px]">
          {/* Sidebar */}
          <div className="flex w-44 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950/60">
            <div className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2.5">
              <div className="flex size-5 items-center justify-center rounded bg-white">
                <Bot className="size-3 text-zinc-900" />
              </div>
              <span className="text-[11px] font-semibold text-white">ContextOS AI</span>
            </div>
            <nav className="flex flex-col gap-0.5 p-2">
              {[
                { icon: BarChart3, label: "Dashboard", active: false },
                { icon: Kanban, label: "Projects", active: true },
                { icon: Bot, label: "AI Assistant", active: false },
              ].map(({ icon: Icon, label, active }) => (
                <div
                  key={label}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] transition-colors",
                    active
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500",
                  )}
                >
                  <Icon className="size-3" />
                  {label}
                </div>
              ))}
            </nav>
          </div>

          {/* Main area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Project header */}
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5">
              <div>
                <p className="text-[10px] text-zinc-600">projects / saas-launch</p>
                <p className="text-xs font-semibold text-white">SaaS Launch</p>
              </div>
              <div className="flex gap-1">
                {["Board", "AI", "Planner", "Insights"].map((t, i) => (
                  <div
                    key={t}
                    className={cn(
                      "rounded px-2 py-0.5 text-[10px] font-medium",
                      i === 0 ? "bg-zinc-700 text-white" : "text-zinc-500",
                    )}
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>

            {/* Kanban board */}
            <div className="flex gap-2 overflow-x-auto overflow-y-hidden p-3">
              {[
                {
                  label: "To Do",
                  dot: "bg-zinc-500",
                  tasks: ["Write API docs", "Setup CI/CD"],
                },
                {
                  label: "In Progress",
                  dot: "bg-blue-500",
                  tasks: ["Auth flow", "Dashboard UI"],
                },
                {
                  label: "Review",
                  dot: "bg-violet-500",
                  tasks: ["Landing page"],
                },
                {
                  label: "Done",
                  dot: "bg-emerald-500",
                  tasks: ["DB schema", "API routes"],
                },
              ].map((col) => (
                <div
                  key={col.label}
                  className="flex w-[120px] shrink-0 flex-col gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2"
                >
                  <div className="flex items-center gap-1.5 border-b border-zinc-800/60 pb-1.5">
                    <div className={cn("size-1.5 rounded-full", col.dot)} />
                    <span className="text-[9px] font-medium text-zinc-400">{col.label}</span>
                    <span className="ml-auto text-[9px] text-zinc-600">{col.tasks.length}</span>
                  </div>
                  {col.tasks.map((t) => (
                    <div key={t} className="rounded border border-zinc-700/60 bg-zinc-800/60 px-2 py-1.5">
                      <p className="text-[9px] text-zinc-300 leading-tight">{t}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        className="absolute -bottom-6 -right-4 w-56 rounded-xl border border-zinc-700/60 bg-zinc-900 p-3 shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 mb-2">
          <div className="flex size-5 items-center justify-center rounded-md bg-violet-500/20">
            <Sparkles className="size-3 text-violet-400" />
          </div>
          <span className="text-[10px] font-medium text-white">AI Insight</span>
        </div>
        <p className="text-[10px] leading-relaxed text-zinc-400">
          3 tasks are overdue. Auth flow is blocking 2 downstream items.
          <span className="mt-1 block text-violet-400 font-medium">â†’ Review sprint priorities</span>
        </p>
      </motion.div>
    </div>
  );
}

function HeroSection() {
  return (
    <section className={cn("relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32", BG)}>
      {/* Background glows */}
      <GradientOrb className="left-1/4 top-1/4 size-[500px] bg-violet-600" />
      <GradientOrb className="right-1/4 top-1/3 size-[400px] bg-indigo-600" />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-8 text-center lg:gap-12">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SectionLabel>AI-Powered Project Intelligence</SectionLabel>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="max-w-4xl"
          >
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
              The AI operating
              <br />
              <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
                system for your projects
              </span>
            </h1>
          </motion.div>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="max-w-2xl text-lg leading-relaxed text-zinc-400"
          >
            ContextOS AI turns documents, tasks, and conversations into a living
            knowledge engine. Plan with AI, extract requirements automatically,
            and get intelligent insights â€” all in one workspace.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-wrap items-center justify-center gap-3"
          >
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-semibold text-zinc-900 shadow-lg transition-all hover:bg-zinc-100 hover:shadow-white/10 hover:-translate-y-px"
            >
              Start building free
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-600 hover:bg-zinc-900 hover:text-white"
            >
              See all features
            </a>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-600"
          >
            {[
              { icon: Shield, text: "No credit card required" },
              { icon: Zap, text: "5-minute setup" },
              { icon: CheckCircle2, text: "Free tier available" },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="flex items-center gap-1.5">
                <Icon className="size-3.5 text-zinc-600" />
                {text}
              </span>
            ))}
          </motion.div>

          {/* Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
            className="relative w-full max-w-3xl px-4 pb-8"
          >
            <HeroMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// â”€â”€â”€ Features â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FEATURES = [
  {
    icon: Bot,
    color: "from-violet-500/20 to-violet-500/5",
    iconColor: "text-violet-400",
    title: "AI Chat Assistant",
    description:
      "Chat with an AI that has full context of your tasks, documents, insights, and project history. Get answers, generate plans, and take action.",
  },
  {
    icon: FileText,
    color: "from-blue-500/20 to-blue-500/5",
    iconColor: "text-blue-400",
    title: "Document Intelligence",
    description:
      "Upload any PDF, DOCX, or Markdown file. AI automatically extracts requirements, deadlines, risks, and generates ready-to-import tasks.",
  },
  {
    icon: Brain,
    color: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-400",
    title: "Project Memory",
    description:
      "Semantic embeddings of all project data â€” tasks, docs, conversations, insights. Ask natural language questions and get precise, cited answers.",
  },
  {
    icon: Wand2,
    color: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-400",
    title: "AI Automation Engine",
    description:
      "Generate full project plans with milestones and timelines from a single document. AI proposes actions and you confirm them with one click.",
  },
  {
    icon: BarChart3,
    color: "from-pink-500/20 to-pink-500/5",
    iconColor: "text-pink-400",
    title: "Analytics Dashboard",
    description:
      "Real-time project health scoring (0â€“100), completion trend charts, overdue tracking, and AI-powered actionable recommendations.",
  },
  {
    icon: Kanban,
    color: "from-cyan-500/20 to-cyan-500/5",
    iconColor: "text-cyan-400",
    title: "Kanban Board",
    description:
      "Drag-drop task management with fractional ordering. AI suggests tasks, breakdown complex goals into sprints, and monitors execution velocity.",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className={cn("py-24", BG)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-14 flex flex-col items-center gap-4 text-center">
          <SectionLabel>Features</SectionLabel>
          <SectionHeading>
            Everything your project needs,
            <br />
            <span className={TEXT_MUTED}>powered by AI</span>
          </SectionHeading>
          <SectionSub>
            A full-stack AI workspace that goes beyond basic project management.
            Every feature is designed to reduce cognitive overhead and ship faster.
          </SectionSub>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07, duration: 0.5 }}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 transition-all hover:border-zinc-700",
                )}
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100", f.color)} />
                <div className="relative">
                  <div
                    className={cn(
                      "mb-4 flex size-10 items-center justify-center rounded-xl border border-zinc-700/60 bg-zinc-800",
                    )}
                  >
                    <Icon className={cn("size-5", f.iconColor)} />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-white">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-500">{f.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// â”€â”€â”€ AI Assistant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ChatMockup() {
  const messages = [
    { role: "user", text: "Which tasks are blocking the launch?" },
    {
      role: "ai",
      text: "Based on your board, **Auth flow** (IN_PROGRESS) is blocking 3 downstream tasks. It's also the critical path for the milestone on Nov 15.\n\nâ†’ Suggest: move Auth flow to top priority and assign to available dev.",
    },
    { role: "user", text: "Create the 3 downstream tasks automatically" },
    {
      role: "ai",
      text: "Created 3 tasks:\nâ€¢ Set up JWT middleware (HIGH)\nâ€¢ Protect API routes (HIGH)\nâ€¢ Add session refresh logic (MEDIUM)\n\nAll added to TODO column.",
    },
  ];

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-950", CARD)}>
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
        <div className="flex size-6 items-center justify-center rounded-md bg-violet-500/20">
          <Bot className="size-3.5 text-violet-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-white">AI Assistant</p>
          <p className="text-[10px] text-zinc-600">SaaS Launch Â· Context loaded</p>
        </div>
        <div className="ml-auto flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5">
          <div className="size-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-emerald-400">Live</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-3 p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex gap-2.5", msg.role === "user" && "flex-row-reverse")}
          >
            {msg.role === "ai" && (
              <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 mt-0.5">
                <Sparkles className="size-3 text-violet-400" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[85%] rounded-xl px-3 py-2.5 text-xs leading-relaxed",
                msg.role === "user"
                  ? "bg-zinc-800 text-zinc-300"
                  : "bg-zinc-800/60 text-zinc-300",
              )}
            >
              {msg.text.split("\n").map((line, j) => (
                <p
                  key={j}
                  className={cn(
                    j > 0 && "mt-1.5",
                    line.startsWith("â†’") && "text-violet-400",
                    line.startsWith("â€¢") && "text-zinc-300 pl-1",
                  )}
                >
                  {line.replace(/\*\*(.*?)\*\*/g, "$1")}
                </p>
              ))}
            </div>
          </div>
        ))}

        {/* Input */}
        <div className="mt-1 flex items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-800/60 px-3 py-2">
          <span className="flex-1 text-xs text-zinc-600">Ask anything about your projectâ€¦</span>
          <div className="flex size-6 items-center justify-center rounded-lg bg-violet-500 text-white">
            <ChevronRight className="size-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}

function AiAssistantSection() {
  return (
    <section id="ai-assistant" className={cn("py-24 border-t border-zinc-800/50", BG)}>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <GradientOrb className="right-0 top-1/2 size-[400px] -translate-y-1/2 bg-violet-600" />

        <div className="relative grid items-center gap-12 lg:grid-cols-2">
          {/* Text */}
          <div className="flex flex-col gap-6">
            <SectionLabel>AI Assistant</SectionLabel>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              An AI that knows your
              <br />
              <span className="text-zinc-500">entire project context</span>
            </h2>
            <p className="text-base leading-relaxed text-zinc-400">
              Unlike generic chatbots, ContextOS AI has full access to your tasks,
              documents, insights, and project history. It can reason across all
              of them to give you answers that actually matter.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                "Chat with context of all tasks, docs, and insights loaded",
                "Execute actions: create tasks, update status, reprioritize",
                "Real-time streaming responses with project citations",
                "RAG-powered memory retrieves the most relevant context per query",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-400">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-violet-400" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-violet-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-violet-600 hover:-translate-y-px"
            >
              Try AI Assistant
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          {/* Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <ChatMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// â”€â”€â”€ Document Intelligence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DocumentMockup() {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-950")}>
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
        <div className="flex size-6 items-center justify-center rounded-md bg-blue-500/20">
          <BookOpen className="size-3.5 text-blue-400" />
        </div>
        <p className="text-xs font-medium text-white">Document Intelligence</p>
      </div>

      {/* Content */}
      <div className="grid grid-cols-[160px_1fr] divide-x divide-zinc-800">
        {/* File list */}
        <div className="flex flex-col gap-1 p-3">
          {[
            { name: "PRD-v2.pdf", status: "ready", icon: FileText },
            { name: "Tech-spec.docx", status: "ready", icon: FileText },
            { name: "Q4-plan.md", status: "analyzing", icon: FileText },
          ].map((f) => (
            <div
              key={f.name}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px]",
                f.name === "PRD-v2.pdf" ? "bg-zinc-800 text-white" : "text-zinc-500",
              )}
            >
              <FileText className="size-3 shrink-0" />
              <span className="truncate">{f.name}</span>
              <div
                className={cn(
                  "ml-auto size-1.5 shrink-0 rounded-full",
                  f.status === "ready" ? "bg-emerald-500" : "bg-amber-500 animate-pulse",
                )}
              />
            </div>
          ))}
        </div>

        {/* Analysis */}
        <div className="flex flex-col gap-2 p-3">
          {[
            { label: "Summary", color: "text-blue-400", count: null, items: ["API-first SaaS platform with AI features targeting dev teams. Launch by Q1."] },
            { label: "Requirements", color: "text-violet-400", count: 4, items: ["OAuth2 + MFA authentication", "Real-time collaborative editing"] },
            { label: "Deadlines", color: "text-amber-400", count: 2, items: ["Beta launch Â· Nov 30", "GA release Â· Jan 15"] },
            { label: "Suggested Tasks", color: "text-emerald-400", count: 6, items: ["Implement OAuth flow (HIGH)", "Build document parser (HIGH)"] },
          ].map((section) => (
            <div key={section.label}>
              <div className="flex items-center gap-1.5 mb-1">
                <p className={cn("text-[10px] font-semibold uppercase tracking-wide", section.color)}>
                  {section.label}
                </p>
                {section.count && (
                  <span className="rounded bg-zinc-800 px-1 text-[9px] text-zinc-500">{section.count}</span>
                )}
              </div>
              {section.items.map((item) => (
                <p key={item} className="text-[10px] text-zinc-500 leading-relaxed pl-1 border-l border-zinc-700/60">
                  {item}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Import bar */}
      <div className="flex items-center justify-between border-t border-zinc-800 bg-zinc-900/60 px-4 py-2.5">
        <span className="text-[11px] text-zinc-500">6 tasks ready to import</span>
        <button className="rounded-lg bg-emerald-500 px-3 py-1 text-[10px] font-medium text-white">
          Add to board â†’
        </button>
      </div>
    </div>
  );
}

function DocumentIntelligenceSection() {
  return (
    <section id="documents" className={cn("py-24 border-t border-zinc-800/50", BG)}>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <GradientOrb className="left-0 top-1/2 size-[400px] -translate-y-1/2 bg-blue-600" />

        <div className="relative grid items-center gap-12 lg:grid-cols-2">
          {/* Mockup â€” left on desktop */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:order-first order-last"
          >
            <DocumentMockup />
          </motion.div>

          {/* Text */}
          <div className="flex flex-col gap-6">
            <SectionLabel>Document Intelligence</SectionLabel>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Upload a doc.
              <br />
              <span className="text-zinc-500">Get a project plan.</span>
            </h2>
            <p className="text-base leading-relaxed text-zinc-400">
              Drop in any requirements document, spec, or meeting notes. Gemini
              AI extracts structured requirements, deadlines, risks, and
              generates a full set of actionable tasks â€” all ready to import.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                "Supports PDF, DOCX, TXT, and Markdown",
                "Extracts requirements, deadlines, and risk factors",
                "Generates 8â€“20 prioritised tasks with effort estimates",
                "One-click plan generation with milestones and phases",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-400">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-400" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="inline-flex w-fit items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-blue-600 hover:-translate-y-px"
            >
              Try Document Intelligence
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// â”€â”€â”€ Memory section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MemorySection() {
  const chunks = [
    { type: "Task", label: "Implement OAuth flow", score: 0.97, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20" },
    { type: "Doc", label: "PRD: Authentication requirements section", score: 0.91, color: "bg-blue-500/20 text-blue-400 border-blue-500/20" },
    { type: "Insight", label: "Auth flow blocking 3 downstream tasks", score: 0.88, color: "bg-violet-500/20 text-violet-400 border-violet-500/20" },
    { type: "Chat", label: "Discussion: JWT vs session tokens", score: 0.82, color: "bg-amber-500/20 text-amber-400 border-amber-500/20" },
  ];

  return (
    <section className={cn("py-24 border-t border-zinc-800/50", BG)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-14 flex flex-col items-center gap-4 text-center">
          <SectionLabel>Project Memory</SectionLabel>
          <SectionHeading>
            Your project has a memory
            <br />
            <span className={TEXT_MUTED}>that never forgets</span>
          </SectionHeading>
          <SectionSub>
            Every task, document, conversation, and insight is embedded into a
            semantic vector store. Ask any question and the AI retrieves the most
            relevant context from across your entire project history.
          </SectionSub>
        </div>

        <div className="mx-auto max-w-3xl">
          {/* Search bar mock */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={cn("mb-4 overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-900")}
          >
            <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
              <Brain className="size-4 text-emerald-400 shrink-0" />
              <span className="flex-1 text-sm text-zinc-400">
                "What are the authentication requirements?"
              </span>
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">â†µ</span>
            </div>
            <div className="flex flex-col gap-2 p-3">
              <p className="text-[11px] text-zinc-600 px-1 mb-1">4 relevant chunks found</p>
              {chunks.map((c) => (
                <div
                  key={c.label}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800/60 bg-zinc-800/30 px-3 py-2.5"
                >
                  <span className={cn("rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase", c.color)}>
                    {c.type}
                  </span>
                  <p className="flex-1 text-xs text-zinc-400 truncate">{c.label}</p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="h-1 w-16 overflow-hidden rounded-full bg-zinc-700">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${c.score * 100}%` }}
                      />
                    </div>
                    <span className="w-7 text-right text-[10px] text-zinc-600 tabular-nums">
                      {c.score}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Memory sources", value: "6 types", icon: Layers },
              { label: "Embedding model", value: "768-dim", icon: Cpu },
              { label: "Search latency", value: "< 100ms", icon: Zap },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className={cn("rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center")}>
                <Icon className="mx-auto mb-2 size-4 text-emerald-400" />
                <p className="text-base font-bold text-white">{value}</p>
                <p className={cn("text-xs", TEXT_MUTED)}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// â”€â”€â”€ Automation Engine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AutomationSection() {
  const steps = [
    { icon: FileText, label: "Upload document", color: "text-blue-400 bg-blue-500/10" },
    { icon: Sparkles, label: "AI analyzes & plans", color: "text-violet-400 bg-violet-500/10" },
    { icon: GitBranch, label: "Tasks + milestones created", color: "text-amber-400 bg-amber-500/10" },
    { icon: Target, label: "Team executes", color: "text-emerald-400 bg-emerald-500/10" },
  ];

  return (
    <section className={cn("py-24 border-t border-zinc-800/50", BG)}>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <GradientOrb className="left-1/2 top-1/2 size-[500px] -translate-x-1/2 -translate-y-1/2 bg-amber-600" />

        <div className="relative flex flex-col items-center gap-14">
          <div className="flex flex-col items-center gap-4 text-center">
            <SectionLabel>Automation Engine</SectionLabel>
            <SectionHeading>
              From document to execution
              <br />
              <span className={TEXT_MUTED}>in under a minute</span>
            </SectionHeading>
            <SectionSub>
              Stop translating specs into tickets manually. Upload your PRD and
              the AI generates a full project plan with prioritised tasks,
              milestones, timeline phases, and effort estimates.
            </SectionSub>
          </div>

          {/* Pipeline */}
          <div className="flex w-full max-w-3xl flex-col items-center gap-2 sm:flex-row sm:items-start sm:gap-0">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex w-full flex-col items-center sm:flex-row">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    className="flex flex-col items-center gap-3 flex-1"
                  >
                    <div className={cn("flex size-12 items-center justify-center rounded-xl", step.color)}>
                      <Icon className={cn("size-5", step.color.split(" ")[0])} />
                    </div>
                    <p className="text-sm font-medium text-zinc-400 text-center max-w-[100px]">
                      {step.label}
                    </p>
                  </motion.div>
                  {i < steps.length - 1 && (
                    <div className="hidden h-px w-8 bg-gradient-to-r from-zinc-700 to-zinc-700 sm:block self-[40px] mt-6 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Feature grid */}
          <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-2">
            {[
              { icon: Wand2, title: "AI Plan Generation", desc: "Full project plan with tasks, milestones, and phases from any document" },
              { icon: Clock, title: "Effort Estimation", desc: "Per-task effort estimates (2h, 1d, 1w) with realistic date spreading" },
              { icon: GitBranch, title: "Milestone Creation", desc: "Auto-generated milestones map to your calendar and timeline views" },
              { icon: Lightbulb, title: "Smart Insights", desc: "21 insight types including blocker detection, sprint forecast, and critical path" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className={cn("rounded-xl border border-zinc-800 bg-zinc-900/40 p-5")}>
                <Icon className="mb-3 size-5 text-amber-400" />
                <h4 className="mb-1.5 text-sm font-semibold text-white">{title}</h4>
                <p className="text-xs leading-relaxed text-zinc-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// â”€â”€â”€ Analytics Dashboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function AnalyticsMockup() {
  const bars = [2, 5, 4, 8, 6, 10];

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-950")}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-pink-400" />
          <span className="text-xs font-semibold text-white">Analytics</span>
        </div>
        <span className="text-[10px] text-zinc-600">Real-time Â· Last 6 weeks</span>
      </div>

      <div className="p-4">
        {/* Metric cards */}
        <div className="mb-4 grid grid-cols-3 gap-2">
          {[
            { label: "Total Tasks", value: "47", icon: BarChart3, color: "text-zinc-400" },
            { label: "Completed", value: "32", icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Overdue", value: "3", icon: TrendingUp, color: "text-amber-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-800/40 p-2.5">
              <Icon className={cn("mb-1 size-3", color)} />
              <p className="text-base font-bold text-white tabular-nums">{value}</p>
              <p className="text-[9px] text-zinc-600">{label}</p>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="mb-3 rounded-lg border border-zinc-800 bg-zinc-800/30 p-3">
          <p className="mb-3 text-[10px] text-zinc-600">Completion Trend</p>
          <div className="flex h-16 items-end gap-1.5">
            {bars.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <motion.div
                  initial={{ height: 0 }}
                  whileInView={{ height: `${(h / 10) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, duration: 0.5 }}
                  className="w-full rounded-t bg-emerald-500/70"
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex justify-between">
            {["5w", "4w", "3w", "2w", "1w", "Now"].map((l) => (
              <span key={l} className="text-[8px] text-zinc-700">{l}</span>
            ))}
          </div>
        </div>

        {/* AI Insights strip */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Bot className="size-3 text-amber-400" />
            <p className="text-[10px] font-semibold text-amber-400">AI Insight Â· Warning</p>
          </div>
          <p className="text-[10px] text-zinc-500">3 tasks overdue. Completion rate dropped 12% this week.</p>
        </div>
      </div>
    </div>
  );
}

function AnalyticsDashboardSection() {
  return (
    <section id="analytics" className={cn("py-24 border-t border-zinc-800/50", BG)}>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <GradientOrb className="right-0 top-1/2 size-[400px] -translate-y-1/2 bg-pink-600" />

        <div className="relative grid items-center gap-12 lg:grid-cols-2">
          {/* Text */}
          <div className="flex flex-col gap-6">
            <SectionLabel>Analytics Dashboard</SectionLabel>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Know your project health
              <br />
              <span className="text-zinc-500">at a glance</span>
            </h2>
            <p className="text-base leading-relaxed text-zinc-400">
              A real-time analytics dashboard built from your actual project data.
              AI-generated recommendations tell you what to fix â€” no manual
              reporting required.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                "Health score (0â€“100) across 4 weighted dimensions",
                "6-week completion trend chart from real task data",
                "Smart AI insights: overdue alerts, WIP warnings, sprint forecasts",
                "Milestone tracking and delay detection",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-zinc-400">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-pink-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <AnalyticsMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// â”€â”€â”€ Screenshots / Feature gallery â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const GALLERY_ITEMS = [
  {
    tab: "Kanban Board",
    icon: Kanban,
    color: "text-cyan-400",
    desc: "Drag-drop task management with fractional ordering, status columns, and AI suggestions.",
  },
  {
    tab: "AI Planner",
    icon: Wand2,
    color: "text-violet-400",
    desc: "Generate full project roadmaps with sprints, dependencies, and effort estimates.",
  },
  {
    tab: "Memory & Search",
    icon: Brain,
    color: "text-emerald-400",
    desc: "Semantic search across all project data with relevance scores and source citations.",
  },
  {
    tab: "Calendar & Timeline",
    icon: Clock,
    color: "text-amber-400",
    desc: "Gantt timeline, FullCalendar month view, drag-to-reschedule, and milestone diamonds.",
  },
];

function ScreenshotsSection() {
  const [active, setActive] = useState(0);
  const current = GALLERY_ITEMS[active]!;
  const Icon = current.icon;

  return (
    <section className={cn("py-24 border-t border-zinc-800/50", BG)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          <SectionLabel>Product Tour</SectionLabel>
          <SectionHeading>
            See it in action
          </SectionHeading>
          <SectionSub>
            Every module is designed to work seamlessly together. Here's a
            closer look at the key views inside ContextOS AI.
          </SectionSub>
        </div>

        {/* Tab row */}
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {GALLERY_ITEMS.map((item, i) => {
            const TabIcon = item.icon;
            return (
              <button
                key={item.tab}
                onClick={() => setActive(i)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all",
                  active === i
                    ? "border-zinc-600 bg-zinc-800 text-white"
                    : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300",
                )}
              >
                <TabIcon className={cn("size-4", active === i ? item.color : "")} />
                {item.tab}
              </button>
            );
          })}
        </div>

        {/* Feature card */}
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-zinc-700/60 bg-zinc-900"
        >
          {/* Mock window */}
          <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-950/70 px-4 py-2.5">
            <div className="flex gap-1.5">
              <div className="size-2.5 rounded-full bg-red-500/50" />
              <div className="size-2.5 rounded-full bg-yellow-500/50" />
              <div className="size-2.5 rounded-full bg-green-500/50" />
            </div>
            <div className="mx-auto flex h-5 items-center gap-1.5 rounded border border-zinc-700/60 bg-zinc-800/60 px-3">
              <Icon className={cn("size-3", current.color)} />
              <span className="text-[10px] text-zinc-500">{current.tab}</span>
            </div>
          </div>

          {/* Placeholder content area */}
          <div className="flex flex-col items-center justify-center gap-4 py-24 px-8 text-center">
            <div className={cn("flex size-16 items-center justify-center rounded-2xl border border-zinc-700/60 bg-zinc-800")}>
              <Icon className={cn("size-8", current.color)} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{current.tab}</h3>
              <p className="mt-1.5 max-w-sm text-sm text-zinc-500">{current.desc}</p>
            </div>
            <Link
              href="/signup"
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 transition-colors"
            >
              Try it free
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// â”€â”€â”€ FAQ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const FAQS = [
  {
    q: "How is ContextOS AI different from tools like Linear or Jira?",
    a: "ContextOS AI is built around AI-first workflows. Instead of manually creating tickets from specs, you upload a document and get a full project plan. Instead of switching between tools, the AI assistant has full context of all your tasks, documents, and insights in one place.",
  },
  {
    q: "Which AI model powers the features?",
    a: "ContextOS AI uses Google Gemini (Flash Lite for chat/streaming, text-embedding-004 for memory). Gemini's native document understanding handles PDFs without additional parsing libraries.",
  },
  {
    q: "How does Project Memory work?",
    a: "Every task, document chunk, conversation message, insight, and plan section is embedded into 768-dimensional vectors. When you ask the AI a question, the top-4 most semantically relevant chunks are injected into the system prompt as context. Rebuilding memory takes 10â€“30 seconds per project.",
  },
  {
    q: "Can I import tasks from a Word document or PDF?",
    a: "Yes. Upload any PDF, DOCX, TXT, or Markdown file. The AI extracts requirements, deadlines, and risks, then generates 8â€“20 prioritised tasks. You review and select which ones to add to your board with one click.",
  },
  {
    q: "What does the health score (0â€“100) measure?",
    a: "The score is a weighted average of four dimensions: task completion (35%), overdue impact (30%), activity level (20%), and blocker count (15%). Each dimension is computed from live task data every time you visit the Insights page.",
  },
  {
    q: "Is there a free tier?",
    a: "Yes. The free tier includes unlimited projects and tasks, AI chat, document analysis, and analytics. Advanced AI features like AI plan generation and memory rebuild are included during the beta period.",
  },
  {
    q: "How do milestones connect to the calendar?",
    a: "Milestones created from the AI plan generator automatically appear in the FullCalendar month view and the Gantt timeline chart as diamond markers. Overdue milestones are flagged in the analytics dashboard.",
  },
  {
    q: "Can I use this as a portfolio / side project tool?",
    a: "Absolutely. ContextOS AI was designed with solo developers and small teams in mind. The single-user model means no workspace complexity â€” just sign up and start shipping.",
  },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className={cn("py-24 border-t border-zinc-800/50", BG)}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-12 flex flex-col items-center gap-4 text-center">
          <SectionLabel>FAQ</SectionLabel>
          <SectionHeading>Common questions</SectionHeading>
        </div>

        <div className="flex flex-col divide-y divide-zinc-800">
          {FAQS.map((item, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-start gap-4 py-5 text-left"
              >
                <ChevronDown
                  className={cn(
                    "mt-0.5 size-4 shrink-0 text-zinc-600 transition-transform duration-200",
                    open === i && "rotate-180",
                  )}
                />
                <span className="text-sm font-medium text-white leading-relaxed">{item.q}</span>
              </button>
              {open === i && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="pb-5 pl-8 text-sm leading-relaxed text-zinc-500">{item.a}</p>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// â”€â”€â”€ CTA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function CtaSection() {
  return (
    <section className={cn("py-24 border-t border-zinc-800/50", BG)}>
      <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl border border-zinc-700/60 bg-zinc-900 px-8 py-16 text-center sm:py-24">
        <GradientOrb className="left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 bg-violet-700" />

        <div className="relative flex flex-col items-center gap-6">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-white shadow-lg">
            <Bot className="size-7 text-zinc-900" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Start shipping smarter
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-zinc-400">
              Set up in 5 minutes. No credit card. Your first AI-generated
              project plan is one document upload away.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-zinc-900 shadow-xl transition-all hover:bg-zinc-100 hover:shadow-white/10 hover:-translate-y-px"
            >
              Create free account
              <ChevronRight className="size-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-8 py-3.5 text-base font-medium text-zinc-300 transition-all hover:border-zinc-600 hover:text-white"
            >
              Sign in
            </Link>
          </div>
          <p className="text-xs text-zinc-700">
            No credit card required Â· Free during beta Â· Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}

// â”€â”€â”€ Footer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function Footer() {
  return (
    <footer className={cn("border-t border-zinc-800/50 py-12", BG)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-white">
              <Bot className="size-3.5 text-zinc-900" />
            </div>
            <span className="text-sm font-semibold text-white">ContextOS AI</span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {[
              { label: "Features", href: "#features" },
              { label: "AI Assistant", href: "#ai-assistant" },
              { label: "Documents", href: "#documents" },
              { label: "Analytics", href: "#analytics" },
              { label: "FAQ", href: "#faq" },
              { label: "Sign in", href: "/login" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-zinc-600 transition-colors hover:text-zinc-400"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-xs text-zinc-700">
            Â© {new Date().getFullYear()} ContextOS AI
          </p>
        </div>
      </div>
    </footer>
  );
}

// â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function LandingPage() {
  return (
    <div className={cn("min-h-screen", BG)}>
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <AiAssistantSection />
        <DocumentIntelligenceSection />
        <MemorySection />
        <AutomationSection />
        <AnalyticsDashboardSection />
        <ScreenshotsSection />
        <FaqSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}

