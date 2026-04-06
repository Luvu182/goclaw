/* Shared types for skill install dialog components */

export type Tab = "file" | "url";
export type FileStatus = "validating" | "valid" | "invalid" | "uploading" | "success" | "warning" | "error";
export type URLStep = "input" | "select" | "installing" | "done";

export interface FileEntry {
  id: string;
  file: File;
  status: FileStatus;
  name?: string;
  slug?: string;
  error?: string;
}

export interface SkillPreview {
  name: string;
  slug: string;
  description: string;
  dir: string;
  has_scripts: boolean;
}

export interface InstallResult {
  installed: Array<{ name: string; slug: string; deps_warning?: string }>;
  errors?: string[];
}
