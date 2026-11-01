CREATE TABLE IF NOT EXISTS lab_users (
    user_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    designation VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    research_domain VARCHAR(255),
    thesis_topic VARCHAR(255),
    roster_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    pin_code VARCHAR(4)
);

CREATE TABLE IF NOT EXISTS lab_tasks (
    task_id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) NOT NULL REFERENCES lab_users(user_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    lane_category VARCHAR(20) NOT NULL,
    start_date BIGINT NOT NULL,
    expected_end_date BIGINT NOT NULL,
    revised_end_date BIGINT,
    actual_completion_date BIGINT,
    current_status VARCHAR(10) NOT NULL,
    professor_review_status VARCHAR(30) NOT NULL DEFAULT 'Pending Review',
    professor_comments_log TEXT NOT NULL DEFAULT '[]',
    sub_tasks TEXT NOT NULL DEFAULT '[]',
    extension_count INT DEFAULT 0,
    attachments TEXT NOT NULL DEFAULT '[]',
    task_tag VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS lab_meetings (
    meeting_id VARCHAR(50) PRIMARY KEY,
    associated_task_id VARCHAR(50) NOT NULL REFERENCES lab_tasks(task_id) ON DELETE CASCADE,
    organizer_id VARCHAR(50) NOT NULL REFERENCES lab_users(user_id) ON DELETE CASCADE,
    scheduled_timestamp BIGINT NOT NULL,
    agenda_notes TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lab_documents (
    doc_id VARCHAR(50) PRIMARY KEY,
    associated_task_id VARCHAR(50) REFERENCES lab_tasks(task_id) ON DELETE SET NULL,
    associated_student_id VARCHAR(50) REFERENCES lab_users(user_id) ON DELETE SET NULL,
    doc_class VARCHAR(50) NOT NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    file_storage_url VARCHAR(500) NOT NULL,
    tagged_users_raw TEXT NOT NULL,
    ai_summary_snippet TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS peer_notifications (
    id VARCHAR(50) PRIMARY KEY,
    target_user_id VARCHAR(50) NOT NULL REFERENCES lab_users(user_id) ON DELETE CASCADE,
    doc_id VARCHAR(50) NOT NULL REFERENCES lab_documents(doc_id) ON DELETE CASCADE,
    source_task_id VARCHAR(50) NOT NULL REFERENCES lab_tasks(task_id) ON DELETE CASCADE,
    sender_name VARCHAR(100) NOT NULL,
    doc_title VARCHAR(255) NOT NULL,
    summary_snippet TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS lab_email_alerts (
    id VARCHAR(50) PRIMARY KEY,
    recipient_email VARCHAR(100) NOT NULL,
    sender_name VARCHAR(100) NOT NULL,
    sender_user_id VARCHAR(50),
    keyword VARCHAR(255) NOT NULL,
    task_id VARCHAR(50),
    task_title VARCHAR(255),
    details TEXT,
    delivery_status VARCHAR(50) NOT NULL DEFAULT 'SENT',
    delivery_channel VARCHAR(50) NOT NULL DEFAULT 'SMTP',
    error_message TEXT,
    created_at BIGINT NOT NULL
);
