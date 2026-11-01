import fs from 'fs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/labcadence'
});

async function run() {
  const exportFile = process.argv[2] || 'labcadence_export.json';
  if (!fs.existsSync(exportFile)) {
    console.error(`Export file "${exportFile}" not found. Please provide a valid JSON export file path as an argument: npx tsx import_data.ts <path-to-export.json>`);
    process.exit(1);
  }

  await pool.query('ALTER TABLE lab_tasks ALTER COLUMN task_tag TYPE VARCHAR(255)');
  const data = JSON.parse(fs.readFileSync(exportFile, 'utf8'));

  let userCount = 0;
  for (const u of data.users) {
    try {
      await pool.query(
        `INSERT INTO lab_users 
          (user_id, name, designation, email, phone_number, research_domain, thesis_topic, roster_status, pin_code) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         ON CONFLICT (user_id) DO UPDATE SET
          name = EXCLUDED.name,
          designation = EXCLUDED.designation,
          email = EXCLUDED.email,
          phone_number = EXCLUDED.phone_number,
          research_domain = EXCLUDED.research_domain,
          thesis_topic = EXCLUDED.thesis_topic,
          roster_status = EXCLUDED.roster_status,
          pin_code = EXCLUDED.pin_code`,
        [u.userId, u.name, u.designation, u.email, u.phoneNumber || '', u.researchDomain || null, u.thesisTopic || null, u.rosterStatus, u.pinCode || null]
      );
      userCount++;
    } catch (err) {
      console.error(`Error importing user ${u.userId}:`, err);
    }
  }
  console.log(`Imported/Updated ${userCount} users`);

  let taskCount = 0;
  for (const t of data.tasks) {
    try {
      await pool.query(
        `INSERT INTO lab_tasks 
          (task_id, student_id, title, lane_category, start_date, expected_end_date, current_status, task_tag, actual_completion_date, extension_count, professor_review_status, sub_tasks, professor_comments_log) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) 
         ON CONFLICT (task_id) DO UPDATE SET
          title = EXCLUDED.title,
          lane_category = EXCLUDED.lane_category,
          current_status = EXCLUDED.current_status,
          professor_review_status = EXCLUDED.professor_review_status,
          actual_completion_date = EXCLUDED.actual_completion_date`,
        [
          t.taskId,
          t.studentId,
          t.title,
          t.laneCategory,
          t.startDate,
          t.expectedEndDate,
          t.currentStatus,
          t.taskTag || null,
          t.actualCompletionDate || null,
          t.extensionCount || 0,
          t.professorReviewStatus || 'Pending Review',
          JSON.stringify(t.subTasks || []),
          typeof t.professorCommentsLog === 'string' ? t.professorCommentsLog : JSON.stringify(t.professorCommentsLog || [])
        ]
      );
      taskCount++;
    } catch (err) {
      console.error(`Error importing task ${t.taskId}:`, err);
    }
  }
  console.log(`Imported/Updated ${taskCount} tasks`);

  await pool.end();
}

run().catch(console.error);
