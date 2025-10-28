// Database interfaces
export interface User {
  id: number;
  username: string;
  password: string;
  canvas_token?: string;
  email: string;
  role: string;
  join_date: string;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: number;
  user_id: number;
  name: string;
  professor?: string;
  credits?: number;
  canvas_course_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  user_id: number;
  title: string;
  description?: string;
  type:
    | "assignment"
    | "exam"
    | "project"
    | "meeting"
    | "study"
    | "deadline"
    | "other";
  course?: string;
  due_date: string;
  due_time?: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
  submitted: boolean;
  created_at: string;
  updated_at: string;
}

// Canvas API interfaces
export interface CanvasCourse {
  id: number;
  longName: string;
  shortName: string;
  courseCode: string;
  term: string | null;
  subtitle?: string;
  enrollmentState?: string;
  enrollmentType?: string;
  published?: boolean;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  description?: string;
  course_id: number;
  due_at: string | null;
  unlock_at?: string | null;
  lock_at?: string | null;
  points_possible?: number;
  submission_types: string[];
  assignment_group_id: number;
  published: boolean;
  workflow_state: string;
  html_url: string;
  has_submitted_submissions?: boolean;
  is_quiz_assignment?: boolean;
  quiz_id?: number;
  is_quiz_lti_assignment?: boolean;
  submission?: {
    id?: number;
    user_id?: number;
    workflow_state?: string;
    submitted_at?: string | null;
    grade?: string | null;
  };
}

export interface CanvasPlannerItem {
  context_type: string;
  context_name: string;
  plannable_type: string;
  plannable: {
    id: number;
    title: string;
    assignment_id?: number;
    due_at: string | null;
    points_possible?: number;
    html_url: string;
  };
  plannable_date: string;
  submissions?: any;
}

export interface CanvasModule {
  id: number;
  name: string;
  position: number;
  unlock_at?: string | null;
  require_sequential_progress?: boolean;
  publish_final_grade?: boolean;
  prerequisite_module_ids?: number[];
  state: string;
  completed_at?: string | null;
  items_count: number;
  items_url: string;
  items?: CanvasModuleItem[];
}

export interface CanvasModuleItem {
  id: number;
  module_id: number;
  position: number;
  title: string;
  indent: number;
  type: string;
  content_id?: number;
  html_url?: string;
  url?: string;
  page_url?: string;
  external_url?: string;
  new_tab?: boolean;
  quiz_lti?: boolean;
  completion_requirement?: {
    type: string;
    min_score?: number;
    completed?: boolean;
  };
  content_details?: {
    due_at?: string | null;
    points_possible?: number;
    locked_for_user?: boolean;
    lock_explanation?: string;
  };
}

export interface CanvasQuiz {
  id: number;
  title: string;
  html_url: string;
  mobile_url?: string;
  description?: string;
  quiz_type: "practice_quiz" | "assignment" | "graded_survey" | "survey";
  time_limit?: number | null;
  shuffle_answers: boolean;
  show_correct_answers: boolean;
  allowed_attempts: number;
  question_count: number;
  points_possible?: number | null;
  due_at?: string | null;
  lock_at?: string | null;
  unlock_at?: string | null;
  published: boolean;
  assignment_id?: number | null;
}

// JWT interfaces
export interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

// Express Request extension
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
      };
    }
  }
}
