import React from "react";
import OnboardingSteps, { OnboardingLayout } from "./Steps";
import { useParams, Navigate } from "react-router-dom";
import paths from "@/utils/paths";

export default function OnboardingFlow() {
  const { step } = useParams();
  const StepPage = OnboardingSteps[step || "home"];

  // Steps are addressable by URL, so a bookmark or a browser-history entry can name one
  // that a later release removed - `/onboarding/llm-preference`, for instance. Rendering
  // an undefined component would blow up the whole flow, so unknown steps start over.
  if (!StepPage) return <Navigate to={paths.onboarding.home()} replace />;

  if (step === "home" || !step) return <StepPage />;

  return (
    <OnboardingLayout>
      {(setHeader, setBackBtn, setForwardBtn) => (
        <StepPage
          setHeader={setHeader}
          setBackBtn={setBackBtn}
          setForwardBtn={setForwardBtn}
        />
      )}
    </OnboardingLayout>
  );
}
