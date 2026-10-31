import { NextResponse } from "next/server";
import { db } from "@/db";
import { manualQuestions, employeeAssessmentAttempts, employees, people } from "@/db/schema";
import { requireAuthenticatedUser } from "@/lib/authorization";
import { eq, and, sql, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/manual/exam?module=purchasing
 * Fetches 30 randomly sampled questions from the 50-question FINAL_EXAM_POOL.
 * `correctOptionId` is omitted for cheat-prevention.
 * Also returns the employee's certification history/best score.
 */
export async function GET(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const moduleName = searchParams.get("module") || "purchasing";

    // Find linked employee
    let employeeId: string | null = null;
    if (user.id) {
      const empRows = await db
        .select({ id: employees.id })
        .from(employees)
        .where(eq(employees.userId, user.id))
        .limit(1);
      employeeId = empRows[0]?.id || null;
    }

    // Check past certification attempts
    let pastAttempts: any[] = [];
    let isCertified = false;
    let bestScore = 0;

    if (employeeId) {
      pastAttempts = await db
        .select()
        .from(employeeAssessmentAttempts)
        .where(
          and(
            eq(employeeAssessmentAttempts.employeeId, employeeId),
            eq(employeeAssessmentAttempts.module, moduleName),
            eq(employeeAssessmentAttempts.assessmentType, "FINAL_CERTIFICATION")
          )
        )
        .orderBy(desc(employeeAssessmentAttempts.createdAt));

      if (pastAttempts.length > 0) {
        isCertified = pastAttempts.some((a) => a.passed === true);
        bestScore = Math.max(...pastAttempts.map((a) => Number(a.scorePercent)));
      }
    }

    // Pull 30 randomly sampled questions from the 50-question pool
    const questions = await db
      .select({
        id: manualQuestions.id,
        module: manualQuestions.module,
        questionType: manualQuestions.questionType,
        questionEn: manualQuestions.questionEn,
        questionTa: manualQuestions.questionTa,
        questionHi: manualQuestions.questionHi,
        optionsJson: manualQuestions.optionsJson,
      })
      .from(manualQuestions)
      .where(
        and(
          eq(manualQuestions.module, moduleName),
          eq(manualQuestions.questionType, "FINAL_EXAM_POOL"),
          eq(manualQuestions.isActive, true)
        )
      )
      .orderBy(sql`RANDOM()`)
      .limit(30);

    return NextResponse.json({
      questions,
      totalCount: questions.length,
      isCertified,
      bestScore,
      pastAttempts,
    });
  } catch (error) {
    console.error("Failed to generate exam session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/manual/exam
 * Evaluates the 30 submitted answers.
 * Expects: { module: "purchasing", questionIds: string[], answers: Record<string, string> }
 * Passing threshold: >= 80% (24 / 30).
 * Saves attempt to `employee_assessment_attempts`.
 */
export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { module = "purchasing", questionIds, answers } = body;

    if (!Array.isArray(questionIds) || questionIds.length === 0 || !answers) {
      return NextResponse.json({ error: "questionIds and answers are required" }, { status: 400 });
    }

    // Find linked employee and personal profile
    const empRows = await db
      .select({ 
        id: employees.id, 
        displayName: people.displayName,
        firstName: people.firstName, 
        lastName: people.lastName 
      })
      .from(employees)
      .leftJoin(people, eq(employees.personId, people.id))
      .where(eq(employees.userId, user.id))
      .limit(1);

    if (empRows.length === 0) {
      return NextResponse.json({ error: "No employee profile found for logged-in user" }, { status: 404 });
    }
    const employee = empRows[0];

    // Fetch the specific questions from DB to evaluate against correctOptionId
    const questions = await db
      .select()
      .from(manualQuestions)
      .where(
        and(
          eq(manualQuestions.module, module),
          eq(manualQuestions.questionType, "FINAL_EXAM_POOL")
        )
      );

    const questionMap = new Map(questions.map((q) => [q.id, q]));

    let correctCount = 0;
    const reviewList: any[] = [];

    for (const qId of questionIds) {
      const q = questionMap.get(qId);
      if (!q) continue;

      const selectedOptionId = answers[qId] || null;
      const isCorrect = selectedOptionId === q.correctOptionId;
      if (isCorrect) correctCount++;

      reviewList.push({
        questionId: q.id,
        questionEn: q.questionEn,
        questionTa: q.questionTa,
        questionHi: q.questionHi,
        selectedOptionId,
        correctOptionId: q.correctOptionId,
        isCorrect,
        explanationEn: q.explanationEn,
        explanationTa: q.explanationTa,
        explanationHi: q.explanationHi,
      });
    }

    const totalQuestions = questionIds.length;
    const scorePercent = Number(((correctCount / totalQuestions) * 100).toFixed(2));
    const passed = scorePercent >= 80;

    // Record assessment attempt
    await db.insert(employeeAssessmentAttempts).values({
      employeeId: employee.id,
      module,
      assessmentType: "FINAL_CERTIFICATION",
      sectionId: null,
      totalQuestions,
      correctCount,
      scorePercent: scorePercent.toString(),
      passed,
      submittedAnswers: reviewList,
    });

    const employeeName = employee.displayName || `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Valued Team Member";

    return NextResponse.json({
      success: true,
      totalQuestions,
      correctCount,
      scorePercent,
      passed,
      employeeName,
      review: reviewList,
    });
  } catch (error) {
    console.error("Failed to submit exam:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
