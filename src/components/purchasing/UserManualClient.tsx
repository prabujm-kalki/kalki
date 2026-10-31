"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  BookOpen, 
  Search, 
  CheckCircle2, 
  Circle, 
  Globe2, 
  Sparkles, 
  Award, 
  ChevronRight, 
  HelpCircle, 
  Lightbulb, 
  Layers, 
  CheckCheck,
  AlertCircle,
  FileQuestion,
  RotateCcw,
  Check,
  X,
  Trophy,
  Flame,
  Clock,
  ArrowRight
} from "lucide-react";
import { useSessionView } from "@/components/AppShell";
import { useToast } from "@/components/ui/Toast";

type Language = "en" | "ta" | "hi";

type ManualSection = {
  id: string;
  module: string;
  submodule: string;
  slug: string;
  titleEn: string;
  titleTa: string;
  titleHi: string;
  summaryEn: string;
  summaryTa: string;
  summaryHi: string;
  contentEn: string;
  contentTa: string;
  contentHi: string;
  examplesEn: string | null;
  examplesTa: string | null;
  examplesHi: string | null;
  faqJson: Array<{
    qEn: string;
    qTa: string;
    qHi: string;
    aEn: string;
    aTa: string;
    aHi: string;
  }> | null;
  targetRoles: string[] | null;
  isKpiLinked: boolean;
  orderIndex: number;
};

type QuestionOption = {
  id: string;
  textEn: string;
  textTa: string;
  textHi: string;
};

type QuizQuestion = {
  id: string;
  sectionId?: string;
  questionType: string;
  questionEn: string;
  questionTa: string;
  questionHi: string;
  optionsJson: QuestionOption[];
  orderIndex?: number;
};

type QuestionReview = {
  questionId: string;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
  explanationEn: string;
  explanationTa: string;
  explanationHi: string;
};

export default function UserManualClient() {
  const { selected } = useSessionView();
  const { addToast } = useToast();

  const [lang, setLang] = useState<Language>("en");
  const [sections, setSections] = useState<ManualSection[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean>>({});
  const [activeSectionId, setActiveSectionId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [savingProgress, setSavingProgress] = useState(false);

  // In-Page Quiz State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState<{
    totalQuestions: number;
    correctCount: number;
    scorePercent: number;
    passed: boolean;
    review: QuestionReview[];
  } | null>(null);

  // Final Certification Assessment State
  const [examOpen, setExamOpen] = useState(false);
  const [examLoading, setExamLoading] = useState(false);
  const [examQuestions, setExamQuestions] = useState<QuizQuestion[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examCurrentIndex, setExamCurrentIndex] = useState(0);
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [examResult, setExamResult] = useState<{
    totalQuestions: number;
    correctCount: number;
    scorePercent: number;
    passed: boolean;
    employeeName: string;
    review: any[];
  } | null>(null);
  const [isCertified, setIsCertified] = useState(false);
  const [bestScore, setBestScore] = useState<number>(0);

  // Load language preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("kalki_manual_lang") as Language;
    if (saved && ["en", "ta", "hi"].includes(saved)) {
      setLang(saved);
    }
  }, []);

  const changeLanguage = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("kalki_manual_lang", newLang);
  };

  // Fetch manual sections
  const loadManual = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/manual?module=purchasing&organizationId=${selected?.organizationId || ""}`);
      if (res.ok) {
        const data = await res.json();
        setSections(data.sections || []);
        setProgress(data.progress || {});
        if (data.sections?.length > 0 && !activeSectionId) {
          setActiveSectionId(data.sections[0].id);
        }
      }
    } catch (err) {
      console.error("Error loading manual:", err);
    } finally {
      setLoading(false);
    }
  };

  // Check certification status
  const checkCertStatus = async () => {
    try {
      const res = await fetch(`/api/manual/exam?module=purchasing`);
      if (res.ok) {
        const data = await res.json();
        setIsCertified(data.isCertified || false);
        setBestScore(data.bestScore || 0);
      }
    } catch (e) {
      console.error("Failed to check cert status:", e);
    }
  };

  useEffect(() => {
    loadManual();
    checkCertStatus();
  }, [selected?.organizationId]);

  // Load in-page check questions when activeSectionId changes
  useEffect(() => {
    if (!activeSectionId) return;
    setQuizLoading(true);
    setQuizResult(null);
    setQuizAnswers({});

    fetch(`/api/manual/quiz?sectionId=${activeSectionId}`)
      .then((res) => res.json())
      .then((data) => {
        setQuizQuestions(data.questions || []);
        if (data.latestAttempt) {
          setQuizResult({
            totalQuestions: data.latestAttempt.totalQuestions,
            correctCount: data.latestAttempt.correctCount,
            scorePercent: Number(data.latestAttempt.scorePercent),
            passed: data.latestAttempt.passed,
            review: data.latestAttempt.submittedAnswers || [],
          });
        }
      })
      .catch((err) => console.error("Error loading chapter quiz:", err))
      .finally(() => setQuizLoading(false));
  }, [activeSectionId]);

  const activeSection = useMemo(() => {
    return sections.find((s) => s.id === activeSectionId) || sections[0];
  }, [sections, activeSectionId]);

  const completedCount = useMemo(() => {
    return Object.values(progress).filter(Boolean).length;
  }, [progress]);

  const progressPercentage = useMemo(() => {
    if (sections.length === 0) return 0;
    return Math.round((completedCount / sections.length) * 100);
  }, [completedCount, sections.length]);

  const toggleComplete = async (sectionId: string, currentStatus: boolean) => {
    setSavingProgress(true);
    try {
      const res = await fetch("/api/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId,
          completed: !currentStatus,
        }),
      });

      if (res.ok) {
        setProgress((prev) => ({
          ...prev,
          [sectionId]: !currentStatus,
        }));
        addToast({
          message: !currentStatus 
            ? (lang === "ta" ? "அத்தியாயம் முடிந்தது!" : lang === "hi" ? "अध्याय पूरा हुआ!" : "Chapter Completed!") 
            : (lang === "ta" ? "முன்னேற்றம் புதுப்பிக்கப்பட்டது" : lang === "hi" ? "प्रगति अद्यतन की गई" : "Progress Updated"),
          type: "success",
        });
      } else {
        const err = await res.json();
        addToast({
          message: err.error || "Failed to update progress",
          type: "error",
        });
      }
    } catch (err) {
      console.error(err);
      addToast({ message: "Network error", type: "error" });
    } finally {
      setSavingProgress(false);
    }
  };

  // Submit in-page quiz
  const handleInPageQuizSubmit = async () => {
    if (Object.keys(quizAnswers).length < quizQuestions.length) {
      addToast({
        message: lang === "ta" ? "அனைத்து 5 கேள்விகளுக்கும் பதிலளிக்கவும்" : lang === "hi" ? "कृपया सभी 5 प्रश्नों के उत्तर दें" : "Please answer all 5 questions before submitting",
        type: "error",
      });
      return;
    }

    setQuizSubmitting(true);
    try {
      const res = await fetch("/api/manual/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: activeSectionId,
          answers: quizAnswers,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setQuizResult(data);
        if (data.passed) {
          setProgress((prev) => ({ ...prev, [activeSectionId]: true }));
          addToast({
            message: lang === "ta" ? `வாழ்த்துகள்! ${data.scorePercent}% மதிப்பெண்ணுடன் தேர்ச்சி பெற்றீர்கள்!` : lang === "hi" ? `बधाई! आपने ${data.scorePercent}% अंकों के साथ उत्तीर्ण किया!` : `Awesome! Passed with ${data.scorePercent}% score!`,
            type: "success",
          });
        } else {
          addToast({
            message: lang === "ta" ? `மதிப்பெண்: ${data.scorePercent}%. தேர்ச்சி பெற குறைந்தது 80% தேவை.` : lang === "hi" ? `प्राप्तांक: ${data.scorePercent}%. उत्तीर्ण होने के लिए कम से कम 80% अंक चाहिए।` : `Scored ${data.scorePercent}%. At least 80% is required to pass.`,
            type: "error",
          });
        }
      }
    } catch (err) {
      console.error("Quiz submit error:", err);
      addToast({ message: "Failed to submit quiz", type: "error" });
    } finally {
      setQuizSubmitting(false);
    }
  };

  // Start Final Certification Assessment
  const startFinalExam = async () => {
    setExamOpen(true);
    setExamLoading(true);
    setExamResult(null);
    setExamAnswers({});
    setExamCurrentIndex(0);

    try {
      const res = await fetch(`/api/manual/exam?module=purchasing`);
      if (res.ok) {
        const data = await res.json();
        setExamQuestions(data.questions || []);
      }
    } catch (err) {
      console.error("Exam load error:", err);
      addToast({ message: "Failed to load examination questions", type: "error" });
    } finally {
      setExamLoading(false);
    }
  };

  // Submit Final Certification Assessment
  const handleFinalExamSubmit = async () => {
    const answeredCount = Object.keys(examAnswers).length;
    if (answeredCount < examQuestions.length) {
      if (!confirm(`You have answered ${answeredCount} of ${examQuestions.length} questions. Unanswered questions will be marked incorrect. Do you want to submit anyway?`)) {
        return;
      }
    }

    setExamSubmitting(true);
    try {
      const res = await fetch("/api/manual/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: "purchasing",
          questionIds: examQuestions.map((q) => q.id),
          answers: examAnswers,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setExamResult(data);
        if (data.passed) {
          setIsCertified(true);
          setBestScore((prev) => Math.max(prev, data.scorePercent));
          addToast({
            message: "🎉 Congratulations! You are now Certified in Kalki Purchasing SOP!",
            type: "success",
          });
        }
      }
    } catch (err) {
      console.error("Submit exam error:", err);
      addToast({ message: "Error submitting assessment", type: "error" });
    } finally {
      setExamSubmitting(false);
    }
  };

  // Filter sections by search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter((s) => {
      return (
        s.titleEn.toLowerCase().includes(q) ||
        s.titleTa.toLowerCase().includes(q) ||
        s.titleHi.toLowerCase().includes(q) ||
        s.summaryEn.toLowerCase().includes(q) ||
        s.contentEn.toLowerCase().includes(q) ||
        s.contentTa.toLowerCase().includes(q)
      );
    });
  }, [sections, searchQuery]);

  // Smart Instant Search Result
  const searchDirectMatch = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 3) return null;
    const q = searchQuery.toLowerCase();

    for (const sec of sections) {
      if (sec.faqJson && Array.isArray(sec.faqJson)) {
        for (const item of sec.faqJson) {
          if (
            item.qEn.toLowerCase().includes(q) || 
            item.qTa.toLowerCase().includes(q) || 
            item.qHi.toLowerCase().includes(q) ||
            item.aEn.toLowerCase().includes(q) ||
            item.aTa.toLowerCase().includes(q) ||
            item.aHi.toLowerCase().includes(q)
          ) {
            return {
              sectionTitle: lang === "ta" ? sec.titleTa : lang === "hi" ? sec.titleHi : sec.titleEn,
              sectionId: sec.id,
              question: lang === "ta" ? item.qTa : lang === "hi" ? item.qHi : item.qEn,
              answer: lang === "ta" ? item.aTa : lang === "hi" ? item.aHi : item.aEn,
            };
          }
        }
      }
    }
    return null;
  }, [searchQuery, sections, lang]);

  const getTitle = (s: ManualSection) => {
    return lang === "ta" ? s.titleTa : lang === "hi" ? s.titleHi : s.titleEn;
  };

  const getSummary = (s: ManualSection) => {
    return lang === "ta" ? s.summaryTa : lang === "hi" ? s.summaryHi : s.summaryEn;
  };

  const getContent = (s: ManualSection) => {
    return lang === "ta" ? s.contentTa : lang === "hi" ? s.contentHi : s.contentEn;
  };

  const getExamples = (s: ManualSection) => {
    return lang === "ta" ? s.examplesTa : lang === "hi" ? s.examplesHi : s.examplesEn;
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
        Loading interactive training manual...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", paddingBottom: "3rem" }}>
      {/* Top Banner & Language Selector */}
      <div 
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1.25rem",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "white",
          padding: "1.25rem 1.75rem",
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: 0 }}>
          <div 
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#38bdf8",
              flexShrink: 0
            }}
          >
            <BookOpen size={24} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "nowrap" }}>
              <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                {lang === "ta" ? "கொள்முதல் பயனர் கையேடு & SOP" : lang === "hi" ? "खरीद उपयोगकर्ता नियमावली और मानक प्रक्रिया (SOP)" : "Purchasing Operations Manual & SOP"}
              </h1>
              <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "999px", background: "rgba(56, 189, 248, 0.2)", color: "#38bdf8", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>
                Kalki Standard v2.0
              </span>
            </div>
            <p style={{ margin: "3px 0 0 0", fontSize: "0.82rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {lang === "ta" 
                ? "பணியாளர் பயிற்சி, செயல்பாட்டு நெறிமுறைகள் மற்றும் மதிப்பீட்டுத் தணிக்கை கையேடு" 
                : lang === "hi" 
                ? "कर्मचारी ऑनबोर्डिंग, परिचालन मानक और मूल्यांकन हेतु आधिकारिक दिशानिर्देश" 
                : "Standard Operating Procedures, Onboarding Manual & Employee Appraisal KPI Compliance"}
            </p>
          </div>
        </div>

        {/* Right side: Language Selector & Final Exam Button */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          {/* Language Toggle Pills */}
          <div 
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.08)",
              padding: "4px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.12)"
            }}
          >
            <Globe2 size={16} style={{ margin: "0 6px 0 6px", color: "#94a3b8" }} />
            <button
              onClick={() => changeLanguage("en")}
              style={{
                background: lang === "en" ? "#0284c7" : "transparent",
                color: lang === "en" ? "white" : "#cbd5e1",
                border: "none",
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: lang === "en" ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              English
            </button>
            <button
              onClick={() => changeLanguage("ta")}
              style={{
                background: lang === "ta" ? "#0284c7" : "transparent",
                color: lang === "ta" ? "white" : "#cbd5e1",
                border: "none",
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: lang === "ta" ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              தமிழ்
            </button>
            <button
              onClick={() => changeLanguage("hi")}
              style={{
                background: lang === "hi" ? "#0284c7" : "transparent",
                color: lang === "hi" ? "white" : "#cbd5e1",
                border: "none",
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "0.82rem",
                fontWeight: lang === "hi" ? 600 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
            >
              हिन्दी
            </button>
          </div>

          {/* Final Exam Trigger Button */}
          <button
            onClick={startFinalExam}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: isCertified ? "#10b981" : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
              color: "white",
              border: "none",
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
            }}
          >
            {isCertified ? <Trophy size={16} /> : <Flame size={16} />}
            <span>
              {isCertified 
                ? (lang === "ta" ? "சான்றிதழ் பெறப்பட்டது (Best: " + bestScore + "%)" : lang === "hi" ? "प्रमाणित (Best: " + bestScore + "%)" : `Certified (${bestScore}%)`)
                : (lang === "ta" ? "இறுதித் தேர்வு எழுதுங்கள்" : lang === "hi" ? "अंतिम परीक्षा दें" : "Take Final Exam (30 Qs)")}
            </span>
          </button>
        </div>
      </div>

      {/* Progress & Compliance Bar */}
      <div 
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "10px",
          padding: "1rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: "280px" }}>
          <div 
            style={{ 
              width: "40px", 
              height: "40px", 
              borderRadius: "50%", 
              background: progressPercentage === 100 ? "#ecfdf5" : "#f0f9ff", 
              color: progressPercentage === 100 ? "#059669" : "#0284c7",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: "0.85rem"
            }}
          >
            {progressPercentage}%
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
              <span style={{ fontWeight: 600, color: "#1e293b" }}>
                {lang === "ta" ? "கையேடு முடித்தல் நிலை" : lang === "hi" ? "मॉड्यूल पूर्णता स्थिति" : "SOP Reading & In-Page Quiz Completion"}
              </span>
              <span style={{ color: "#64748b", fontWeight: 500 }}>
                {completedCount} / {sections.length} {lang === "ta" ? "அத்தியாயங்கள்" : lang === "hi" ? "अध्याय" : "Chapters"}
              </span>
            </div>
            <div style={{ height: "7px", width: "100%", background: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
              <div 
                style={{
                  height: "100%",
                  width: `${progressPercentage}%`,
                  background: progressPercentage === 100 ? "#10b981" : "#0284c7",
                  transition: "width 0.4s ease"
                }}
              />
            </div>
          </div>
        </div>

        {/* KPI Tracking Badge */}
        <div 
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.5rem 0.85rem",
            background: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: "8px",
            color: "#92400e",
            fontSize: "0.82rem",
            fontWeight: 500
          }}
        >
          <Award size={16} />
          <span>
            {lang === "ta" 
              ? "பணியாளர் செயல்திறன் மதிப்பீட்டுடன் (KPI Appraisal) இணைக்கப்பட்டுள்ளது" 
              : lang === "hi" 
              ? "कर्मचारी प्रदर्शन मूल्यांकन (KPI Appraisal) से जुड़ा हुआ है" 
              : "Directly linked to Employee Onboarding & Annual Appraisal KPIs"}
          </span>
        </div>
      </div>

      {/* Smart Search Bar */}
      <div style={{ position: "relative" }}>
        <div 
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            background: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "10px",
            padding: "0.65rem 1rem",
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
          }}
        >
          <Search size={18} color="#64748b" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              lang === "ta"
                ? "கையேட்டில் தேடவும் (உதா: '3-way match', 'வெப்பநிலை', 'Spot Purchase', 'தானியங்கி PO')..."
                : lang === "hi"
                ? "दिशानिर्देशों में खोजें (जैसे: '3-way match', 'तापमान', 'Spot Purchase', 'PO approval')..."
                : "Ask or search SOPs (e.g., 'How to do 3-way match?', 'chiller temperature', 'spot purchase limit')..."
            }
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: "0.92rem",
              color: "#1e293b"
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                border: "none",
                background: "transparent",
                color: "#94a3b8",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 600
              }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Instant Q&A Match Preview */}
        {searchDirectMatch && (
          <div 
            style={{
              marginTop: "0.5rem",
              background: "#f0f9ff",
              border: "1px solid #bae6fd",
              borderRadius: "8px",
              padding: "0.85rem 1rem",
              display: "flex",
              alignItems: "flex-start",
              gap: "0.75rem"
            }}
          >
            <Sparkles size={20} color="#0284c7" style={{ marginTop: "2px", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Instant FAQ Answer &bull; {searchDirectMatch.sectionTitle}
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.92rem", color: "#0f172a", marginTop: "2px" }}>
                {searchDirectMatch.question}
              </div>
              <div style={{ fontSize: "0.88rem", color: "#334155", marginTop: "4px", lineHeight: 1.5 }}>
                {searchDirectMatch.answer}
              </div>
              <button
                onClick={() => {
                  setActiveSectionId(searchDirectMatch.sectionId);
                  setSearchQuery("");
                }}
                style={{
                  marginTop: "6px",
                  padding: "4px 8px",
                  fontSize: "0.78rem",
                  background: "#0284c7",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: 500
                }}
              >
                Read full module chapter &rarr;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div 
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        {/* Left Column: Chapters / Table of Contents */}
        <div 
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "10px",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}
        >
          <div 
            style={{
              padding: "1rem 1.25rem",
              borderBottom: "1px solid #e2e8f0",
              background: "#f8fafc",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {lang === "ta" ? "பாடப் பொருளடக்கம்" : lang === "hi" ? "विषय सूची" : "Chapters & Modules"}
            </div>
            <span style={{ fontSize: "0.75rem", background: "#e2e8f0", padding: "2px 8px", borderRadius: "999px", color: "#475569", fontWeight: 600 }}>
              {filteredSections.length}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {filteredSections.map((sec) => {
              const isActive = sec.id === activeSectionId;
              const isDone = !!progress[sec.id];
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSectionId(sec.id)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "0.9rem 1.15rem",
                    border: "none",
                    borderBottom: "1px solid #f1f5f9",
                    background: isActive ? "#f0f9ff" : "#ffffff",
                    textAlign: "left",
                    cursor: "pointer",
                    borderLeft: isActive ? "4px solid #0284c7" : "4px solid transparent",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ marginTop: "2px", flexShrink: 0 }}>
                    {isDone ? (
                      <CheckCircle2 size={18} color="#10b981" />
                    ) : (
                      <Circle size={18} color="#94a3b8" />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div 
                      style={{ 
                        fontSize: "0.88rem", 
                        fontWeight: isActive ? 700 : 500, 
                        color: isActive ? "#0369a1" : "#1e293b",
                        lineHeight: 1.3
                      }}
                    >
                      {getTitle(sec)}
                    </div>
                    {sec.targetRoles && sec.targetRoles.length > 0 && (
                      <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                        {sec.targetRoles.map((role) => (
                          <span 
                            key={role} 
                            style={{ 
                              fontSize: "0.68rem", 
                              padding: "1px 6px", 
                              borderRadius: "4px", 
                              background: "#f1f5f9", 
                              color: "#64748b" 
                            }}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Chapter Content, Examples & In-Page Quiz */}
        {activeSection ? (
          <div 
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "2rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
            }}
          >
            {/* Chapter Header */}
            <div style={{ borderBottom: "1px solid #e2e8f0", paddingBottom: "1.25rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Chapter {activeSection.orderIndex} &bull; {activeSection.submodule}
                    </span>
                    {activeSection.isKpiLinked && (
                      <span style={{ fontSize: "0.7rem", padding: "1px 6px", borderRadius: "4px", background: "#fef3c7", color: "#92400e", fontWeight: 600 }}>
                        KPI Mandated
                      </span>
                    )}
                  </div>
                  <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.3 }}>
                    {getTitle(activeSection)}
                  </h2>
                </div>

                {/* Mark as Completed Button */}
                <button
                  onClick={() => toggleComplete(activeSection.id, !!progress[activeSection.id])}
                  disabled={savingProgress}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 1rem",
                    borderRadius: "8px",
                    border: !!progress[activeSection.id] ? "1px solid #10b981" : "1px solid #cbd5e1",
                    background: !!progress[activeSection.id] ? "#ecfdf5" : "#ffffff",
                    color: !!progress[activeSection.id] ? "#059669" : "#475569",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  {!!progress[activeSection.id] ? (
                    <>
                      <CheckCheck size={16} color="#059669" />
                      <span>{lang === "ta" ? "முடிக்கப்பட்டது" : lang === "hi" ? "पूर्ण हुआ" : "Completed"}</span>
                    </>
                  ) : (
                    <>
                      <Circle size={16} />
                      <span>{lang === "ta" ? "முடிந்ததாகக் குறிக்கவும்" : lang === "hi" ? "पूर्ण चिन्हित करें" : "Mark as Completed"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Summary Callout */}
              <div 
                style={{
                  marginTop: "1.25rem",
                  padding: "0.85rem 1.15rem",
                  background: "#f8fafc",
                  borderLeft: "4px solid #0284c7",
                  borderRadius: "6px",
                  fontSize: "0.92rem",
                  color: "#334155",
                  lineHeight: 1.5
                }}
              >
                {getSummary(activeSection)}
              </div>
            </div>

            {/* Core Markdown Body */}
            <div 
              style={{
                fontSize: "0.95rem",
                color: "#1e293b",
                lineHeight: 1.7,
                whiteSpace: "pre-line"
              }}
            >
              {getContent(activeSection)}
            </div>

            {/* Real-World Industry Examples Callout */}
            {getExamples(activeSection) && (
              <div 
                style={{
                  marginTop: "1.75rem",
                  background: "#fffbeb",
                  border: "1px solid #fef3c7",
                  borderRadius: "8px",
                  padding: "1.25rem",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.92rem", color: "#92400e", marginBottom: "0.5rem" }}>
                  <Lightbulb size={18} color="#d97706" />
                  {lang === "ta" ? "நடைமுறை உதாரணம் & தீர்வு:" : lang === "hi" ? "व्यावहारिक उदाहरण और समाधान:" : "Real-World Industry Case Study & Best Practice:"}
                </div>
                <div style={{ fontSize: "0.88rem", color: "#78350f", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                  {getExamples(activeSection)}
                </div>
              </div>
            )}

            {/* FAQ Accordion Section */}
            {activeSection.faqJson && activeSection.faqJson.length > 0 && (
              <div style={{ marginTop: "1.75rem", borderTop: "1px solid #f1f5f9", paddingTop: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: "1rem" }}>
                  <HelpCircle size={18} color="#0284c7" />
                  {lang === "ta" ? "அடிக்கடி கேட்கப்படும் கேள்விகள் (FAQ)" : lang === "hi" ? "अक्सर पूछे जाने वाले प्रश्न (FAQ)" : "Frequently Asked Questions"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                  {activeSection.faqJson.map((f, i) => (
                    <div 
                      key={i} 
                      style={{ 
                        background: "#f8fafc", 
                        border: "1px solid #e2e8f0", 
                        borderRadius: "8px", 
                        padding: "0.85rem 1rem" 
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#1e293b" }}>
                        Q: {lang === "ta" ? f.qTa : lang === "hi" ? f.qHi : f.qEn}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#475569", marginTop: "4px", lineHeight: 1.5 }}>
                        A: {lang === "ta" ? f.aTa : lang === "hi" ? f.aHi : f.aEn}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ============================================================== */}
            {/* IN-PAGE FORMATIVE ASSESSMENT (5 QUESTIONS PER CHAPTER)           */}
            {/* ============================================================== */}
            <div 
              style={{
                marginTop: "2rem",
                borderTop: "2px dashed #e2e8f0",
                paddingTop: "1.75rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <FileQuestion size={20} color="#0284c7" />
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                    {lang === "ta" ? "அத்தியாயப் புரிதல் தேர்வு (5 கேள்விகள்)" : lang === "hi" ? "अध्याय समझ जाँच (5 प्रश्न)" : "Chapter Mastery Check (5 Questions)"}
                  </h3>
                </div>
                <span style={{ fontSize: "0.75rem", background: "#f0f9ff", color: "#0284c7", padding: "3px 10px", borderRadius: "999px", fontWeight: 600 }}>
                  {lang === "ta" ? "தேர்ச்சி வரம்பு: 80% (4/5)" : lang === "hi" ? "उत्तीर्ण सीमा: 80% (4/5)" : "Passing Threshold: 80% (4/5)"}
                </span>
              </div>

              <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.85rem", color: "#64748b" }}>
                {lang === "ta" 
                  ? "இந்த அத்தியாயத்தைப் புரிந்துகொண்டதை உறுதிசெய்ய கீழ்க்கண்ட 5 கேள்விகளுக்கு பதிலளிக்கவும். 80% பெற்றால் அத்தியாயம் நிறைவடைந்ததாக உறுதி செய்யப்படும்." 
                  : lang === "hi" 
                  ? "यह सुनिश्चित करने के लिए कि आपने अध्याय को ध्यान से पढ़ा है, नीचे दिए गए 5 प्रश्नों के उत्तर दें। 80% अंक प्राप्त करने पर अध्याय पूरा माना जाएगा।" 
                  : "Answer these 5 formative check questions to verify comprehension. Scoring ≥ 80% automatically certifies and marks this chapter completed."}
              </p>

              {quizLoading ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8" }}>
                  Loading chapter assessment questions...
                </div>
              ) : quizQuestions.length === 0 ? (
                <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", background: "#f8fafc", borderRadius: "8px" }}>
                  No quiz questions configured for this section yet.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {quizQuestions.map((q, idx) => {
                    const selected = quizAnswers[q.id];
                    const reviewItem = quizResult?.review?.find((r) => r.questionId === q.id);

                    return (
                      <div 
                        key={q.id}
                        style={{
                          background: "#f8fafc",
                          border: reviewItem 
                            ? (reviewItem.isCorrect ? "1px solid #86efac" : "1px solid #fca5a5") 
                            : "1px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "1.25rem",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.85rem" }}>
                          <span 
                            style={{ 
                              background: "#0284c7", 
                              color: "white", 
                              borderRadius: "50%", 
                              width: "22px", 
                              height: "22px", 
                              display: "inline-flex", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              fontSize: "0.75rem", 
                              fontWeight: 700,
                              flexShrink: 0
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: "0.92rem", color: "#1e293b", lineHeight: 1.4 }}>
                            {lang === "ta" ? q.questionTa : lang === "hi" ? q.questionHi : q.questionEn}
                          </span>
                        </div>

                        {/* Options */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.5rem" }}>
                          {q.optionsJson.map((opt) => {
                            const isChosen = selected === opt.id;
                            const isRevealedCorrect = reviewItem && reviewItem.correctOptionId === opt.id;
                            const isRevealedWrong = reviewItem && !reviewItem.isCorrect && reviewItem.selectedOptionId === opt.id;

                            let optBg = "#ffffff";
                            let optBorder = "#e2e8f0";
                            let optColor = "#1e293b";

                            if (isRevealedCorrect) {
                              optBg = "#ecfdf5";
                              optBorder = "#10b981";
                              optColor = "#065f46";
                            } else if (isRevealedWrong) {
                              optBg = "#fef2f2";
                              optBorder = "#ef4444";
                              optColor = "#991b1b";
                            } else if (isChosen) {
                              optBg = "#e0f2fe";
                              optBorder = "#0284c7";
                              optColor = "#0369a1";
                            }

                            return (
                              <label
                                key={opt.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.75rem",
                                  padding: "0.65rem 0.85rem",
                                  borderRadius: "6px",
                                  background: optBg,
                                  border: `1px solid ${optBorder}`,
                                  color: optColor,
                                  fontSize: "0.85rem",
                                  cursor: quizResult ? "default" : "pointer",
                                  transition: "all 0.15s ease"
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`question_${q.id}`}
                                  value={opt.id}
                                  checked={isChosen}
                                  disabled={!!quizResult && quizResult.passed}
                                  onChange={() => {
                                    setQuizAnswers((prev) => ({ ...prev, [q.id]: opt.id }));
                                  }}
                                  style={{ cursor: "pointer" }}
                                />
                                <span style={{ fontWeight: 600, width: "16px", textTransform: "uppercase" }}>{opt.id}.</span>
                                <span style={{ flex: 1 }}>
                                  {lang === "ta" ? opt.textTa : lang === "hi" ? opt.textHi : opt.textEn}
                                </span>
                                {isRevealedCorrect && <Check size={16} color="#10b981" />}
                                {isRevealedWrong && <X size={16} color="#ef4444" />}
                              </label>
                            );
                          })}
                        </div>

                        {/* Explanation Callout if reviewed */}
                        {reviewItem && (
                          <div 
                            style={{ 
                              marginTop: "0.75rem", 
                              padding: "0.65rem 0.85rem", 
                              borderRadius: "6px", 
                              background: reviewItem.isCorrect ? "#f0fdf4" : "#fff1f2", 
                              fontSize: "0.82rem",
                              color: reviewItem.isCorrect ? "#166534" : "#9f1239",
                              lineHeight: 1.4
                            }}
                          >
                            <strong>{lang === "ta" ? "விளக்கம்:" : lang === "hi" ? "स्पष्टीकरण:" : "Explanation:"} </strong>
                            {lang === "ta" ? reviewItem.explanationTa : lang === "hi" ? reviewItem.explanationHi : reviewItem.explanationEn}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Quiz Results Summary & Submit Actions */}
                  <div 
                    style={{ 
                      marginTop: "0.5rem", 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "1rem",
                      background: quizResult ? (quizResult.passed ? "#ecfdf5" : "#fef2f2") : "#ffffff",
                      border: quizResult ? (quizResult.passed ? "1px solid #10b981" : "1px solid #ef4444") : "none",
                      padding: quizResult ? "1rem 1.25rem" : "0",
                      borderRadius: "8px"
                    }}
                  >
                    {quizResult ? (
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: quizResult.passed ? "#065f46" : "#991b1b" }}>
                          {quizResult.passed 
                            ? (lang === "ta" ? `வெற்றி! ${quizResult.correctCount}/${quizResult.totalQuestions} சரியானவை (${quizResult.scorePercent}%)` : lang === "hi" ? `सफल! ${quizResult.correctCount}/${quizResult.totalQuestions} सही (${quizResult.scorePercent}%)` : `Passed! ${quizResult.correctCount}/${quizResult.totalQuestions} Correct (${quizResult.scorePercent}%)`)
                            : (lang === "ta" ? `மறுபரிசீலனை தேவை: ${quizResult.correctCount}/${quizResult.totalQuestions} (${quizResult.scorePercent}%). தேவை 80%.` : lang === "hi" ? `पुनः प्रयास करें: ${quizResult.correctCount}/${quizResult.totalQuestions} (${quizResult.scorePercent}%). उत्तीर्ण सीमा 80% है।` : `Review Needed: ${quizResult.correctCount}/${quizResult.totalQuestions} (${quizResult.scorePercent}%). Need ≥ 80%.`)}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "#475569", marginTop: "2px" }}>
                          {quizResult.passed 
                            ? (lang === "ta" ? "இந்த அத்தியாயம் நிறைவடைந்து பணியாளர் சுயவிவரத்தில் பதிவு செய்யப்பட்டது." : lang === "hi" ? "अध्याय पूरा हुआ और आपकी कर्मचारी प्रोफ़ाइल में दर्ज हो गया है।" : "Chapter successfully marked completed in employee KPI log.")
                            : (lang === "ta" ? "பாடக்குறிப்புகளை மீண்டும் படித்துவிட்டு மறுபடியும் சமர்ப்பிக்கவும்." : lang === "hi" ? "कृपया अध्याय को पुनः पढ़ें और फिर से उत्तर दें।" : "Please reread the chapter above and submit again to pass.")}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
                        {Object.keys(quizAnswers).length} / {quizQuestions.length} {lang === "ta" ? "கேள்விகளுக்கு விடையளிக்கப்பட்டுள்ளது" : lang === "hi" ? "प्रश्नों के उत्तर दिए गए" : "questions answered"}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {quizResult && !quizResult.passed && (
                        <button
                          onClick={() => {
                            setQuizResult(null);
                            setQuizAnswers({});
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.5rem 0.85rem",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            background: "white",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            color: "#475569"
                          }}
                        >
                          <RotateCcw size={14} />
                          <span>{lang === "ta" ? "மீண்டும் முயற்சி செய்" : lang === "hi" ? "पुनः प्रयास करें" : "Try Again"}</span>
                        </button>
                      )}

                      {(!quizResult || !quizResult.passed) && (
                        <button
                          onClick={handleInPageQuizSubmit}
                          disabled={quizSubmitting || Object.keys(quizAnswers).length < quizQuestions.length}
                          style={{
                            padding: "0.55rem 1.25rem",
                            borderRadius: "6px",
                            background: Object.keys(quizAnswers).length === quizQuestions.length ? "#0284c7" : "#94a3b8",
                            color: "white",
                            border: "none",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            cursor: Object.keys(quizAnswers).length === quizQuestions.length ? "pointer" : "not-allowed",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {quizSubmitting 
                            ? (lang === "ta" ? "சரிபார்க்கிறது..." : lang === "hi" ? "जाँच हो रही है..." : "Checking...") 
                            : (lang === "ta" ? "விடைகளைச் சமர்ப்பிக்கவும்" : lang === "hi" ? "उत्तर सबमिट करें" : "Submit Chapter Quiz")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Footer Navigation */}
            <div 
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "2rem",
                borderTop: "1px solid #f1f5f9",
                paddingTop: "1.25rem"
              }}
            >
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                Chapter {activeSection.orderIndex} of {sections.length}
              </div>

              {/* Next Chapter Button */}
              {(() => {
                const currentIndex = sections.findIndex((s) => s.id === activeSection.id);
                const nextSection = sections[currentIndex + 1];
                if (!nextSection) {
                  return (
                    <button
                      onClick={startFinalExam}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.6rem 1.25rem",
                        borderRadius: "6px",
                        background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                        color: "white",
                        border: "none",
                        fontSize: "0.88rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      <Trophy size={16} />
                      <span>{lang === "ta" ? "இறுதித் தேர்வு எழுத செல்லவும்" : lang === "hi" ? "अंतिम परीक्षा की ओर बढ़ें" : "Proceed to Final Certification Exam"}</span>
                    </button>
                  );
                }
                return (
                  <button
                    onClick={() => setActiveSectionId(nextSection.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.55rem 1rem",
                      borderRadius: "6px",
                      background: "#0284c7",
                      color: "white",
                      border: "none",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <span>{lang === "ta" ? "அடுத்த அத்தியாயம்" : lang === "hi" ? "अगला अध्याय" : "Next Chapter"}</span>
                    <ChevronRight size={16} />
                  </button>
                );
              })()}
            </div>
          </div>
        ) : (
          <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
            Select a manual chapter to read.
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* FINAL CERTIFICATION ASSESSMENT MODAL (30 RANDOMIZED QUESTIONS) */}
      {/* ============================================================== */}
      {examOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1.5rem",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "850px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)"
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                color: "white",
                padding: "1.25rem 1.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div style={{ padding: "8px", background: "rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f59e0b" }}>
                  <Award size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
                    {lang === "ta" ? "கல்கி கொள்முதல் இறுதிச் சான்றிதழ் தேர்வு" : lang === "hi" ? "कल्कि खरीद अंतिम प्रमाणन परीक्षा" : "Kalki Purchasing Official Certification Exam"}
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "2px" }}>
                    30 Randomized Questions from Master 50-Question Bank &bull; 80% (24/30) Required to Pass
                  </div>
                </div>
              </div>

              <button
                onClick={() => setExamOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  fontSize: "1.25rem",
                  padding: "4px"
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
              {examLoading ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                  Generating 30 randomized questions from official 50-question pool...
                </div>
              ) : examResult ? (
                /* Exam Result / Certificate View */
                <div style={{ textAlign: "center", padding: "1.5rem 1rem" }}>
                  <div 
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "50%",
                      background: examResult.passed ? "#ecfdf5" : "#fef2f2",
                      color: examResult.passed ? "#059669" : "#dc2626",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "1rem"
                    }}
                  >
                    {examResult.passed ? <Trophy size={36} /> : <AlertCircle size={36} />}
                  </div>

                  <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.6rem", color: "#0f172a" }}>
                    {examResult.passed 
                      ? (lang === "ta" ? "சான்றிதழ் தகுதி பெற்றீர்கள்!" : lang === "hi" ? "बधाई! आप प्रमाणित हो गए हैं!" : "Assessment Successfully Passed!")
                      : (lang === "ta" ? "தேர்ச்சி பெறவில்லை - மறுபரிசீலனை தேவை" : lang === "hi" ? "उत्तीर्ण नहीं हुए - पुनः प्रयास की आवश्यकता" : "Did Not Meet Passing Threshold")}
                  </h2>

                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: examResult.passed ? "#059669" : "#dc2626", marginBottom: "0.75rem" }}>
                    Score: {examResult.scorePercent}% ({examResult.correctCount} / {examResult.totalQuestions} Correct)
                  </div>

                  {examResult.passed ? (
                    <div 
                      style={{
                        margin: "1.5rem auto",
                        maxWidth: "550px",
                        padding: "1.5rem",
                        background: "#fffbeb",
                        border: "2px solid #fde68a",
                        borderRadius: "12px",
                        textAlign: "center"
                      }}
                    >
                      <div style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#b45309", fontWeight: 700 }}>
                        Official Kalki BOS Certificate of Competency
                      </div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#1e293b", margin: "0.75rem 0 0.25rem 0" }}>
                        Awarded to: {examResult.employeeName}
                      </div>
                      <div style={{ fontSize: "0.9rem", color: "#475569", lineHeight: 1.5 }}>
                        Has successfully demonstrated thorough proficiency in Kalki BOS Purchasing Operations, 3-Way Matching, Cold Storage SOPs, and Gate Quality Control.
                      </div>
                      <div style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#92400e", fontWeight: 600 }}>
                        Recorded into Employee Performance Appraisal Profile &bull; {new Date().toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    <p style={{ maxWidth: "500px", margin: "0 auto 1.5rem auto", color: "#64748b", fontSize: "0.9rem", lineHeight: 1.5 }}>
                      {lang === "ta"
                        ? "சான்றிதழ் பெற குறைந்தபட்சம் 80% (30-க்கு 24 கேள்விகள்) பெற வேண்டும். கையேட்டின் அத்தியாயங்களை மீண்டும் படித்து புதிய வினாத்தாள் மூலம் மீண்டும் தேர்வு எழுதலாம்."
                        : lang === "hi"
                        ? "प्रमाणित होने के लिए कम से कम 80% (30 में से 24) अंक आवश्यक हैं। कृपया पाठ दोबारा पढ़ें और नए यादृच्छिक प्रश्नों के साथ पुनः प्रयास करें।"
                        : "To qualify for certification, an 80% threshold (at least 24/30) is required. You can review the manual chapters and retake the randomized exam at any time."}
                    </p>
                  )}

                  {/* Review incorrect questions accordion */}
                  <div style={{ marginTop: "2rem", textAlign: "left" }}>
                    <h4 style={{ margin: "0 0 1rem 0", color: "#1e293b", fontSize: "1rem", fontWeight: 700 }}>
                      Detailed Question Review ({examResult.totalQuestions} Questions):
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {examResult.review.map((item: any, i: number) => (
                        <div 
                          key={item.questionId}
                          style={{
                            padding: "0.85rem 1rem",
                            borderRadius: "8px",
                            background: item.isCorrect ? "#f0fdf4" : "#fff1f2",
                            border: item.isCorrect ? "1px solid #bbf7d0" : "1px solid #fecdd3",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                            <span style={{ fontWeight: 700, color: item.isCorrect ? "#15803d" : "#b91c1c" }}>
                              {i + 1}.
                            </span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#1e293b" }}>
                                {lang === "ta" ? item.questionTa : lang === "hi" ? item.questionHi : item.questionEn}
                              </div>
                              <div style={{ marginTop: "4px", fontSize: "0.82rem", color: item.isCorrect ? "#166534" : "#991b1b" }}>
                                {item.isCorrect ? "✓ Answered Correctly" : `✗ Selected: (${item.selectedOptionId?.toUpperCase() || "None"}) | Correct Answer: (${item.correctOptionId.toUpperCase()})`}
                              </div>
                              <div style={{ marginTop: "4px", fontSize: "0.8rem", color: "#475569" }}>
                                <em>{lang === "ta" ? item.explanationTa : lang === "hi" ? item.explanationHi : item.explanationEn}</em>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{ marginTop: "2rem", display: "flex", justifyContent: "center", gap: "1rem" }}>
                    {!examResult.passed && (
                      <button
                        onClick={startFinalExam}
                        style={{
                          padding: "0.65rem 1.5rem",
                          borderRadius: "8px",
                          background: "#0284c7",
                          color: "white",
                          border: "none",
                          fontWeight: 700,
                          cursor: "pointer",
                          fontSize: "0.9rem"
                        }}
                      >
                        Retake Assessment with New Random Questions
                      </button>
                    )}
                    <button
                      onClick={() => setExamOpen(false)}
                      style={{
                        padding: "0.65rem 1.5rem",
                        borderRadius: "8px",
                        background: "#64748b",
                        color: "white",
                        border: "none",
                        fontWeight: 600,
                        cursor: "pointer",
                        fontSize: "0.9rem"
                      }}
                    >
                      Close Window
                    </button>
                  </div>
                </div>
              ) : examQuestions.length === 0 ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                  No questions available in the final exam pool.
                </div>
              ) : (
                /* Question-by-Question Assessment Flow */
                <div>
                  {/* Progress Header */}
                  <div 
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                      paddingBottom: "0.75rem",
                      borderBottom: "1px solid #e2e8f0"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>
                        Question {examCurrentIndex + 1} of {examQuestions.length}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#64748b" }}>
                      <span>Answered: {Object.keys(examAnswers).length} / {examQuestions.length}</span>
                    </div>
                  </div>

                  {/* Question Grid Pills for Fast Navigation */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "1.25rem" }}>
                    {examQuestions.map((q, idx) => {
                      const isAnswered = !!examAnswers[q.id];
                      const isCurrent = idx === examCurrentIndex;
                      return (
                        <button
                          key={q.id}
                          onClick={() => setExamCurrentIndex(idx)}
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "6px",
                            border: isCurrent ? "2px solid #0284c7" : "1px solid #cbd5e1",
                            background: isCurrent ? "#0284c7" : isAnswered ? "#dcfce7" : "#ffffff",
                            color: isCurrent ? "white" : isAnswered ? "#166534" : "#64748b",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  {/* Current Active Question Card */}
                  {(() => {
                    const currentQ = examQuestions[examCurrentIndex];
                    if (!currentQ) return null;
                    const selected = examAnswers[currentQ.id];

                    return (
                      <div 
                        style={{
                          background: "#f8fafc",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "1.5rem",
                          marginBottom: "1.5rem"
                        }}
                      >
                        <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                          {lang === "ta" ? currentQ.questionTa : lang === "hi" ? currentQ.questionHi : currentQ.questionEn}
                        </div>

                        {/* Options */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                          {currentQ.optionsJson.map((opt) => {
                            const isChosen = selected === opt.id;
                            return (
                              <label
                                key={opt.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.75rem",
                                  padding: "0.85rem 1rem",
                                  borderRadius: "8px",
                                  background: isChosen ? "#e0f2fe" : "#ffffff",
                                  border: isChosen ? "2px solid #0284c7" : "1px solid #cbd5e1",
                                  color: isChosen ? "#0369a1" : "#1e293b",
                                  fontSize: "0.92rem",
                                  fontWeight: isChosen ? 600 : 400,
                                  cursor: "pointer",
                                  transition: "all 0.15s ease"
                                }}
                              >
                                <input
                                  type="radio"
                                  name={`exam_q_${currentQ.id}`}
                                  value={opt.id}
                                  checked={isChosen}
                                  onChange={() => {
                                    setExamAnswers((prev) => ({ ...prev, [currentQ.id]: opt.id }));
                                  }}
                                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                                />
                                <span style={{ fontWeight: 700, width: "18px", textTransform: "uppercase" }}>{opt.id}.</span>
                                <span style={{ flex: 1 }}>
                                  {lang === "ta" ? opt.textTa : lang === "hi" ? opt.textHi : opt.textEn}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Navigation Controls */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <button
                      onClick={() => setExamCurrentIndex((prev) => Math.max(0, prev - 1))}
                      disabled={examCurrentIndex === 0}
                      style={{
                        padding: "0.6rem 1.2rem",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        background: "white",
                        color: "#475569",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        cursor: examCurrentIndex === 0 ? "not-allowed" : "pointer"
                      }}
                    >
                      &larr; Previous
                    </button>

                    <div style={{ display: "flex", gap: "0.75rem" }}>
                      {examCurrentIndex < examQuestions.length - 1 ? (
                        <button
                          onClick={() => setExamCurrentIndex((prev) => Math.min(examQuestions.length - 1, prev + 1))}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.6rem 1.25rem",
                            borderRadius: "6px",
                            background: "#0284c7",
                            color: "white",
                            border: "none",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            cursor: "pointer"
                          }}
                        >
                          <span>Next</span>
                          <ChevronRight size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={handleFinalExamSubmit}
                          disabled={examSubmitting}
                          style={{
                            padding: "0.65rem 1.5rem",
                            borderRadius: "6px",
                            background: "#10b981",
                            color: "white",
                            border: "none",
                            fontWeight: 700,
                            fontSize: "0.9rem",
                            cursor: examSubmitting ? "not-allowed" : "pointer"
                          }}
                        >
                          {examSubmitting ? "Submitting Exam..." : "Submit All 30 Answers & Get Certified"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
