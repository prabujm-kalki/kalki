import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { employees, locations, people, roleResponsibilities, workSituationDefinitions, workSituationReminderEscalationStages } from "../../src/db/schema";

const peopleConfig = getTableConfig(people);
const locationsConfig = getTableConfig(locations);
const employeesConfig = getTableConfig(employees);
const employeeMigration = readFileSync(
  resolve(process.cwd(), "drizzle/0002_closed_dakota_north.sql"),
  "utf8",
);

function isEmploymentDateRangeValid(
  employmentStartDate: string,
  employmentEndDate: string | null,
) {
  return employmentEndDate === null || employmentEndDate >= employmentStartDate;
}

describe("employee foundation schema", () => {
  it("keeps person identity separate from organization employment", () => {
    expect(peopleConfig.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining([
        "id",
        "first_name",
        "display_name",
        "phone",
        "email",
      ]),
    );
    expect(peopleConfig.columns.map((column) => column.name)).not.toEqual(
      expect.arrayContaining(["organization_id", "location_id", "employee_code"]),
    );
    expect(employeesConfig.columns.map((column) => column.name)).toEqual(
      expect.arrayContaining(["person_id", "organization_id", "location_id"]),
    );
  });

  it("requires an employee location to belong to the employee organization", () => {
    const compositeForeignKey = employeesConfig.foreignKeys.find(
      (foreignKey) =>
        foreignKey.reference().name === "employees_organization_location_fk",
    );
    const employeeForeignKeyNames = employeesConfig.foreignKeys.map(
      (foreignKey) => foreignKey.reference().name,
    );
    const employeeForeignKeyColumns = employeesConfig.foreignKeys.map(
      (foreignKey) => ({
        columns: foreignKey.reference().columns.map((column) => column.name),
        foreignColumns: foreignKey.reference().foreignColumns.map(
          (column) => column.name,
        ),
      }),
    );

    expect(compositeForeignKey).toBeDefined();
    expect(
      compositeForeignKey?.reference().columns.map((column) => column.name),
    ).toEqual([
      "organization_id",
      "location_id",
    ]);
    expect(
      compositeForeignKey?.reference().foreignColumns.map(
        (column) => column.name,
      ),
    ).toEqual(["organization_id", "id"]);
    expect(locationsConfig.indexes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          config: expect.objectContaining({
            name: "locations_organization_id_unique",
          }),
        }),
      ]),
    );
    expect(employeeForeignKeyNames).toContain("employees_organization_location_fk");
    expect(employeeForeignKeyColumns).toEqual(
      expect.arrayContaining([
        { columns: ["person_id"], foreignColumns: ["id"] },
        { columns: ["organization_id"], foreignColumns: ["id"] },
        { columns: ["location_id"], foreignColumns: ["id"] },
      ]),
    );
  });

  it("protects employment date ordering with positive and negative cases", () => {
    expect(isEmploymentDateRangeValid("2026-01-01", null)).toBe(true);
    expect(isEmploymentDateRangeValid("2026-01-01", "2026-09-03")).toBe(true);
    expect(isEmploymentDateRangeValid("2026-09-03", "2026-01-01")).toBe(false);

    expect(employeeMigration).toContain(
      'employees_employment_dates_check" CHECK (employment_end_date IS NULL OR employment_end_date >= employment_start_date)',
    );
  });

  it("creates the referenced location key before the composite foreign key", () => {
    const uniqueIndexPosition = employeeMigration.indexOf(
      'CREATE UNIQUE INDEX "locations_organization_id_unique"',
    );
    const foreignKeyPosition = employeeMigration.indexOf(
      'ALTER TABLE "employees" ADD CONSTRAINT "employees_organization_location_fk"',
    );

    expect(uniqueIndexPosition).toBeGreaterThanOrEqual(0);
    expect(foreignKeyPosition).toBeGreaterThan(uniqueIndexPosition);
  });
});

describe("work situation trigger category integrity", () => {
  it("constrains trigger categories to the approved Work/Situations set", () => {
    const workDefinitionConfig = getTableConfig(workSituationDefinitions);
    const triggerCategoryCheck = workDefinitionConfig.checks.find(
      (item) => item.name === "work_situation_definitions_trigger_category_check",
    );
    const triggerMigration = readFileSync(
      resolve(process.cwd(), "drizzle/0009_certain_peter_quill.sql"),
      "utf8",
    );

    expect(triggerCategoryCheck).toBeDefined();
    expect(triggerMigration).toContain(
      'work_situation_definitions_trigger_category_check" CHECK ("work_situation_definitions"."trigger_category" IN (\'routine\', \'event-based\', \'item/order-triggered\'))',
    );
  });
});

describe("work situation reminder stage integrity", () => {
  it("constrains reminder and escalation stages to the approved framework sequence", () => {
    const reminderStageConfig = getTableConfig(workSituationReminderEscalationStages);
    const stageCheck = reminderStageConfig.checks.find(
      (item) => item.name === "work_situation_reminder_escalation_stages_stage_check",
    );
    const stageMigration = readFileSync(
      resolve(process.cwd(), "drizzle/0010_work_situation_reminder_stages.sql"),
      "utf8",
    );

    expect(stageCheck).toBeDefined();
    expect(stageMigration).toContain(
      'work_situation_reminder_escalation_stages_stage_check" CHECK ("work_situation_reminder_escalation_stages"."stage" IN (\'due_notification\', \'reminder\', \'strong_reminder\', \'final_reminder\', \'escalation\', \'verification\', \'exception_escalation\'))',
    );
  });
});

describe("role responsibility work definition integrity", () => {
  it("keeps the optional Work/Situation reference organization-scoped", () => {
    const responsibilityConfig = getTableConfig(roleResponsibilities);
    const workDefinitionForeignKey = responsibilityConfig.foreignKeys.find(
      (foreignKey) =>
        foreignKey.reference().name === "role_responsibilities_organization_work_definition_fk",
    );
    const responsibilityMigration = readFileSync(
      resolve(process.cwd(), "drizzle/0012_role_responsibility_work_definition.sql"),
      "utf8",
    );

    expect(responsibilityConfig.columns.map((column) => column.name)).toContain("work_situation_definition_id");
    expect(workDefinitionForeignKey).toBeDefined();
    expect(
      workDefinitionForeignKey?.reference().columns.map((column) => column.name),
    ).toEqual(["organization_id", "work_situation_definition_id"]);
    expect(
      workDefinitionForeignKey?.reference().foreignColumns.map((column) => column.name),
    ).toEqual(["organization_id", "id"]);
    expect(responsibilityMigration).toContain(
      'ADD CONSTRAINT "role_responsibilities_organization_work_definition_fk" FOREIGN KEY ("organization_id","work_situation_definition_id") REFERENCES "public"."work_situation_definitions"("organization_id","id")',
    );
  });
});
