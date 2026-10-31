import { db } from "@/db";
import { manualQuestions, userManualSections } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SECTION_1_QUESTIONS, SECTION_2_QUESTIONS, SECTION_3_QUESTIONS, SECTION_4_QUESTIONS, SECTION_5_QUESTIONS, SECTION_6_QUESTIONS } from "./seedInPageQuestions";
import { FINAL_EXAM_50_QUESTIONS } from "./seedExamQuestions";

export async function seedAllManualQuestions() {
  console.log("Starting Question Seeding for Purchasing Module...");

  // 1. Fetch section slugs to IDs
  const sections = await db
    .select({ id: userManualSections.id, slug: userManualSections.slug })
    .from(userManualSections)
    .where(eq(userManualSections.module, "purchasing"));

  const slugToIdMap: Record<string, string> = {};
  sections.forEach((s) => {
    slugToIdMap[s.slug] = s.id;
  });

  console.log(`Found ${sections.length} sections for module 'purchasing'.`);

  // Clear existing questions for purchasing module to guarantee clean seed
  await db.delete(manualQuestions).where(eq(manualQuestions.module, "purchasing"));
  console.log("Cleared existing manual questions for 'purchasing'.");

  // 2. Insert In-Page Questions (30 total = 5 x 6 sections)
  const inPageLists = [
    SECTION_1_QUESTIONS,
    SECTION_2_QUESTIONS,
    SECTION_3_QUESTIONS,
    SECTION_4_QUESTIONS,
    SECTION_5_QUESTIONS,
    SECTION_6_QUESTIONS,
  ];

  let inPageCount = 0;
  for (const list of inPageLists) {
    for (const q of list) {
      const sectionId = q.sectionSlug ? slugToIdMap[q.sectionSlug] : null;
      if (!sectionId) {
        console.warn(`Warning: Could not find sectionId for slug '${q.sectionSlug}'`);
      }

      await db.insert(manualQuestions).values({
        module: "purchasing",
        sectionId: sectionId || undefined,
        questionType: "IN_PAGE_CHECK",
        questionEn: q.questionEn,
        questionTa: q.questionTa,
        questionHi: q.questionHi,
        optionsJson: q.options,
        correctOptionId: q.correctOptionId,
        explanationEn: q.explanationEn,
        explanationTa: q.explanationTa,
        explanationHi: q.explanationHi,
        orderIndex: q.orderIndex,
        isActive: true,
      });
      inPageCount++;
    }
  }
  console.log(`Successfully seeded ${inPageCount} In-Page Check questions (5 per section).`);

  // 3. Insert Final Exam Pool Questions (50 total)
  let examPoolCount = 0;
  for (const q of FINAL_EXAM_50_QUESTIONS) {
    await db.insert(manualQuestions).values({
      module: "purchasing",
      sectionId: null,
      questionType: "FINAL_EXAM_POOL",
      questionEn: q.questionEn,
      questionTa: q.questionTa,
      questionHi: q.questionHi,
      optionsJson: q.options,
      correctOptionId: q.correctOptionId,
      explanationEn: q.explanationEn,
      explanationTa: q.explanationTa,
      explanationHi: q.explanationHi,
      orderIndex: q.orderIndex,
      isActive: true,
    });
    examPoolCount++;
  }
  console.log(`Successfully seeded ${examPoolCount} Final Certification Exam Pool questions.`);
  console.log(`TOTAL QUESTIONS SEEDED: ${inPageCount + examPoolCount}`);
}

