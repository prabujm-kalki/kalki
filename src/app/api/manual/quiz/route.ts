import { NextResponse } from "next/server";
import { db } from "@/db";
import { manualQuestions, employeeAssessmentAttempts, employees, employeeManualProgress } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { eq, and, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/manual/quiz?sectionId=...
 * Returns the 5 in-page check questions for a given section.
 * Note: `correctOptionId` is omitted for security so clients cannot cheat.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get("sectionId");

    if (!sectionId) {
      return NextResponse.json({ error: "sectionId is required" }, { status: 400 });
    }

    // Fetch employee if linked
    let employeeId: string | null = null;
    if (user.id) {
      const empRows = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.userId, user.id))
        .limit(1);
      employeeId = empRows[0]?.id || null;
    }

    // Fetch in-page questions for this section
    const questions = await db
      .select({
        id: manualQuestions.id,
        sectionId: manualQuestions.sectionId,
        questionType: manualQuestions.questionType,
        questionEn: manualQuestions.questionEn,
        questionTa: manualQuestions.questionTa,
        questionHi: manualQuestions.questionHi,
        optionsJson: manualQuestions.optionsJson,
        orderIndex: manualQuestions.orderIndex,
      })
      .from(manualQuestions)
      .where(
        and(
          eq(manualQuestions.sectionId, sectionId),
          eq(manualQuestions.questionType, "IN_PAGE_CHECK"),
          eq(manualQuestions.isActive, true)
        )
      )
      .orderBy(asc(manualQuestions.orderIndex));

    // Also fetch employee's latest attempt for this section if any
    let latestAttempt: any = null;
    if (employeeId) {
      const attempts = await db
        .select()
        .from(employeeAssessmentAttempts)
        .where(
          and(
            eq(employeeAssessmentAttempts.employeeId, employeeId),
            eq(employeeAssessmentAttempts.sectionId, sectionId),
            eq(employeeAssessmentAttempts.assessmentType, "PAGE_CHECK")
          )
        )
        .orderBy(asc(employeeAssessmentAttempts.createdAt));
      if (attempts.length > 0) {
        latestAttempt = attempts[attempts.length - 1];
      }
    }

    return NextResponse.json({
      questions,
      latestAttempt,
    });
  } catch (error) {
    console.error("Failed to fetch section quiz questions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/manual/quiz
 * Evaluates the 5 in-page check questions.
 * Expects: { sectionId, answers: Record<string, string> }
 * Computes score, marks chapter completed if score >= 80%, records attempt.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { sectionId, answers } = body;

    if (!sectionId || !answers) {
      return NextResponse.json({ error: "sectionId and answers are required" }, { status: 400 });
    }

    // Find employee linked to user
    const empRows = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.userId, user.id))
      .limit(1);

    if (empRows.length === 0) {
      return NextResponse.json({ error: "No employee profile found for logged-in user" }, { status: 404 });
    }
    const employeeId = empRows[0].id;

    // Fetch questions with correct answers
    const questions = await db
      .select()
      .from(manualQuestions)
      .where(
        and(
          eq(manualQuestions.sectionId, sectionId),
          eq(manualQuestions.questionType, "IN_PAGE_CHECK"),
          eq(manualQuestions.isActive, true)
        )
      );

    if (questions.length === 0) {
      return NextResponse.json({ error: "No quiz questions found for this section" }, { status: 404 });
    }

    let correctCount = 0;
    const reviewList: any[] = [];

    for (const q of questions) {
      const selectedOptionId = answers[q.id];
      const isCorrect = selectedOptionId === q.correctOptionId;
      if (isCorrect) correctCount++;

      reviewList.push({
        questionId: q.id,
        selectedOptionId,
        correctOptionId: q.correctOptionId,
        isCorrect,
        explanationEn: q.explanationEn,
        explanationTa: q.explanationTa,
        explanationHi: q.explanationHi,
      });
    }

    const totalQuestions = questions.length;
    const scorePercent = Number(((correctCount / totalQuestions) * 100).toFixed(2));
    const passed = scorePercent >= 80;

    // Record assessment attempt
    await db.insert(employeeAssessmentAttempts).values({
      employeeId,
      module: "purchasing",
      assessmentType: "PAGE_CHECK",
      sectionId,
      totalQuestions,
      correctCount,
      scorePercent: scorePercent.toString(),
      passed,
      submittedAnswers: reviewList,
    });

    // If passed (>=80%), automatically mark section completed in employeeManualProgress!
    if (passed) {
      await db
        .insert(employeeManualProgress)
        .values({
          employeeId,
          sectionId,
          completedAt: new Date(),
          timeSpentSeconds: 120,
        })
        .onConflictDoUpdate({
          target: [employeeManualProgress.employeeId, employeeManualProgress.sectionId],
          set: {
            completedAt: new Date(),
          },
        });
    }

    return NextResponse.json({
      success: true,
      totalQuestions,
      correctCount,
      scorePercent,
      passed,
      review: reviewList,
    });
  } catch (error) {
    console.error("Failed to evaluate quiz:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

