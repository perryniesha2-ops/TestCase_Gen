export type ProjectStatus = "active" | "archived" | "completed" | "on_hold";

export type ProjectColor =
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "red"
  | "pink"
  | "indigo"
  | "yellow"
  | "gray";

export interface ProjectFormData {
  name: string;
  description: string;
  status: ProjectStatus;
  color: ProjectColor;
  icon: string;
  start_date: string;
  target_end_date: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  color: ProjectColor;
  icon: string;
  test_suites_count?: number;
  requirements_count?: number;
  templates_count?: number;
}
