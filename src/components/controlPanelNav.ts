import type React from "react";
import { useTranslation } from "react-i18next";
import {
  Home,
  BarChart3,
  MessageSquare,
  NotebookPen,
  BookOpen,
  Upload,
  Blocks,
  ScrollText,
} from "./icons";
import { isAgentAllowed, isPolicyActionAllowed } from "../stores/policyRules";
import { usePolicyStore } from "../stores/policyStore";
import capabilities from "../config/capabilities";

export type ControlPanelView =
  | "home"
  | "insights"
  | "chat"
  | "personal-notes"
  | "library"
  | "dictionary"
  | "upload"
  | "integrations";

export interface ControlPanelNavItem {
  id: ControlPanelView;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export function useControlPanelNavItems(): ControlPanelNavItem[] {
  const { t } = useTranslation();
  const agentAllowed = usePolicyStore(isAgentAllowed) && capabilities.aiAgent;
  const policyActionsAllowed = usePolicyStore((state) => isPolicyActionAllowed(state));

  return [
    { id: "home", label: t("vsluh.nav.home"), icon: Home },
    { id: "personal-notes", label: t("vsluh.nav.meetings"), icon: NotebookPen },
    { id: "library", label: t("vsluh.nav.library"), icon: ScrollText },
    { id: "dictionary", label: t("vsluh.nav.dictionary"), icon: BookOpen },
    ...(capabilities.advancedSettings
      ? [{ id: "insights" as const, label: t("sidebar.insights"), icon: BarChart3 }]
      : []),
    ...(agentAllowed
      ? [{ id: "chat" as const, label: t("sidebar.chat"), icon: MessageSquare }]
      : []),
    ...(capabilities.audioImport && policyActionsAllowed
      ? [{ id: "upload" as const, label: t("sidebar.upload"), icon: Upload }]
      : []),
    ...(capabilities.advancedSettings
      ? [{ id: "integrations" as const, label: t("sidebar.integrations"), icon: Blocks }]
      : []),
  ];
}
