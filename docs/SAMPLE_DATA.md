# Sample Data (15 Students)

## SQL file

- `sql/sample_seed_15_students.sql`

## What it includes

- 15 students with mixed tags (`migrant`, `korean`, `ru`, `uz`, `support_literacy`, etc.)
- 3 projects + 15 tasks (`read`, `quiz`, `text`, `audio`, `upload`, `checkin`, `guidebook`)
- Completion variance for Top/Bottom task analysis
- Weekly RU/UZ/KOR mood trend data
- Weekly RU/UZ/KOR literacy trend data
- Support logs across all kinds:
  - `mission3`
  - `mission5`
  - `buddy`
  - `frame`
- Support-effect analysis inputs (multiple literacy runs per student)

## Run

In Supabase SQL Editor, execute:

```sql
-- prerequisite migrations first
-- sql/migrations/001_add_student_tags.sql
-- sql/migrations/002_support_logs.sql

-- then seed sample dataset
-- sql/sample_seed_15_students.sql
```

## Test routes

- `/admin/sample-class-15/students/tags`
- `/admin/sample-class-15/alerts`
- `/admin/sample-class-15/class-report`
- `/admin/sample-class-15/class-report/pdf`
- `/admin/sample-class-15/students/S03`
- `/admin/sample-class-15/students/S03/report`
