import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRight, Check, Loader2, Mic, ShieldCheck } from "./icons";
import { Button } from "./ui/button";
import DictationHotkeyHint from "./ui/DictationHotkeyHint";
import TranscriptionItem from "./ui/TranscriptionItem";
import { PAGE_CONTENT_WIDTH_CLASS } from "./ui/pageWidth";
import { cn } from "./lib/utils";
import type { TranscriptionItem as TranscriptionItemType } from "../types/electron";
import capabilities from "../config/capabilities";

interface VsluhHomeViewProps {
  history: TranscriptionItemType[];
  isLoading: boolean;
  hotkey: string;
  copyToClipboard: (text: string) => void;
  deleteTranscription: (id: number) => void;
  onShowAudioInFolder: (id: number) => void;
  onRetryTranscription: (id: number, options?: { isRecover?: boolean }) => Promise<void>;
  onOpenSettings: (section?: string) => void;
  onOpenLibrary: () => void;
  onStartDictation: () => void;
  onNewMeeting: () => void;
}

export default function VsluhHomeView({
  history,
  isLoading,
  hotkey,
  copyToClipboard,
  deleteTranscription,
  onShowAudioInFolder,
  onRetryTranscription,
  onOpenSettings,
  onOpenLibrary,
  onStartDictation,
  onNewMeeting,
}: VsluhHomeViewProps) {
  const { t } = useTranslation();
  const [showSteps, setShowSteps] = useState(false);
  const recent = history.slice(0, 3);

  return (
    <div className={cn(PAGE_CONTENT_WIDTH_CLASS, "px-6 py-6")}>
      <section
        className="relative overflow-hidden rounded-[28px] px-7 py-8 text-[#090909] sm:px-9 sm:py-10"
        style={{ background: "var(--gradient-brand-glass)" }}
      >
        <div className="absolute -end-16 -top-20 size-64 rounded-full bg-white/20 blur-3xl" />
        <div className="relative max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-[12px] bg-white/55 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
            <ShieldCheck size={15} />
            {t("vsluh.home.localBadge")}
          </div>
          <div className="mb-5 flex size-12 items-center justify-center rounded-[14px] bg-white/55 shadow-sm backdrop-blur-sm">
            <Mic size={24} />
          </div>
          <h2 className="max-w-xl font-display text-[32px] leading-[1.15] font-semibold tracking-[-0.02em]">
            {t("vsluh.home.heroTitle")}
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#090909]/75 sm:text-base">
            {t("vsluh.home.heroDescription")}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button onClick={onStartDictation}>
              <Mic size={16} />
              {t("vsluh.home.startDictation")}
            </Button>
            <Button variant="secondary" onClick={onNewMeeting}>
              {t("vsluh.home.newMeeting")}
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              variant="outline-flat"
              className="border-white/50 bg-white/55 text-[#090909] hover:bg-white/75"
              onClick={() => setShowSteps((value) => !value)}
              aria-expanded={showSteps}
            >
              {t("vsluh.home.howItWorks")}
              <ArrowRight size={15} />
            </Button>
            <DictationHotkeyHint hotkey={hotkey} className="text-[#090909]/70" />
          </div>
          {showSteps && (
            <ol className="mt-6 grid gap-3 border-t border-[#0F172A]/10 pt-5 text-sm sm:grid-cols-3">
              {["one", "two", "three"].map((step, index) => (
                <li key={step} className="flex gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0F172A] text-[11px] font-semibold text-white">
                    {index + 1}
                  </span>
                  <span className="leading-5 text-[#0F172A]/80">
                    {t(`vsluh.home.steps.${step}`)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-[-0.01em]">
              {t("vsluh.home.recentTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("vsluh.home.recentDescription")}
            </p>
          </div>
          {history.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onOpenLibrary}>
              {t("vsluh.home.openLibrary")}
              <ArrowRight size={14} />
            </Button>
          )}
        </div>

        {isLoading && history.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-[14px] border border-border bg-surface-1 py-12 text-sm text-muted-foreground">
            <Loader2 size={16} className="animate-spin" />
            {t("controlPanel.loading")}
          </div>
        ) : recent.length === 0 ? (
          <div className="rounded-[14px] border border-dashed border-border bg-surface-1/60 px-6 py-10 text-center">
            <div className="mx-auto flex size-10 items-center justify-center rounded-[10px] bg-primary/10 text-primary">
              <Mic size={20} />
            </div>
            <h3 className="mt-4 text-sm font-semibold">{t("vsluh.home.emptyTitle")}</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {t("vsluh.home.emptyDescription")}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-surface-1">
            {recent.map((item) => (
              <TranscriptionItem
                key={item.id}
                item={item}
                showAgentRecovery={capabilities.aiAgent}
                onCopy={copyToClipboard}
                onDelete={deleteTranscription}
                onShowAudioInFolder={onShowAudioInFolder}
                onRetryTranscription={onRetryTranscription}
                onOpenSettings={(section) => onOpenSettings(section ?? "transcription")}
              />
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Check size={14} className="text-success" />
          {t("vsluh.home.privacyFootnote")}
        </div>
      </section>
    </div>
  );
}
